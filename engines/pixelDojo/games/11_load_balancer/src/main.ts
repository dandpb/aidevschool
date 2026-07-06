// Traffic Forge — entry point. Wires the pure dispatcher + wave logic to the
// three.js scene and the DOM HUD, and handles keyboard input. The game emits
// one evidence record when the wave resolves (pass or fail); the smoke spec
// scrapes the `EVIDENCE ` console line.
//
// Phase machine:
//   idle → (Space) → flying → (scheduled death) → stalled → (R) → retrying → idle
//   flying → (no death, flight completes) → idle
//   stalled → (no retry in STALL_TIMEOUT_MS) → idle (orb lost)

import "./styles.css"
import {
  type Algorithm,
  algorithmMatchesShape,
  commitRouting,
  createDispatchState,
  type DispatchState,
  inflightSkew,
  type Orb,
  pickPillar,
  releaseInflight,
} from "./game/dispatcher"
import { buildEvidence, emitEvidence } from "./game/evidence"
import { type InflightView, type OrbView, type SceneState, TrafficForgeScene } from "./game/scene"
import {
  defaultWave,
  emptyMetrics,
  evaluatePass,
  type Metrics,
  recordAlgorithm,
  recordDeadRoute,
  recordFailoverRecovery,
  recordHeavyOverflow,
  recordLanding,
  recordOrbLost,
  recordStickyBreak,
  type Wave,
} from "./game/wave"

const FLIGHT_MS = 1500
const DEATH_AT_MS = 800 // for the scheduled failover orb only
const RETRY_FLIGHT_MS = 700
const STALL_TIMEOUT_MS = 5000

type Phase = "idle" | "flying" | "stalled" | "retrying" | "finished"

type InflightState = {
  orb: Orb
  algorithm: Algorithm
  pillarId: number
  startedAt: number
  scheduledDeath: boolean
  deadFlagged: boolean
  retrying: boolean
  stalledAt: number
} | null

type GameState = {
  dispatch: DispatchState
  wave: Wave
  orbIndex: number
  algorithm: Algorithm
  inflight: InflightState
  metrics: Metrics
  phase: Phase
  toast: string | null
  toastUntil: number
  banner: string | null
  lastFailoverRecoveredTotal: number
}

function main(): void {
  const app = document.querySelector("#app")
  if (app === null) {
    throw new Error("#app root not found")
  }
  app.setAttribute("class", "game-shell")

  const canvasHolder = document.createElement("div")
  canvasHolder.setAttribute("class", "game-canvas")
  app.appendChild(canvasHolder)

  const hud = buildHud(app)
  const scene = new TrafficForgeScene(canvasHolder)
  const wave = defaultWave()
  const state: GameState = {
    dispatch: createDispatchState(),
    wave,
    orbIndex: 0,
    algorithm: "round_robin",
    inflight: null,
    metrics: emptyMetrics(wave.orbs.length),
    phase: "idle",
    toast: null,
    toastUntil: 0,
    banner: null,
    lastFailoverRecoveredTotal: 0,
  }

  window.__trafficForgeDebug = {
    orbIndex: () => state.orbIndex,
    phase: () => state.phase,
    stalled: () => state.phase === "stalled",
    finished: () => state.phase === "finished",
  }

  const onKey = (event: KeyboardEvent) => handleKey(event.key, state)
  window.addEventListener("keydown", onKey)

  const resize = () => {
    const rect = canvasHolder.getBoundingClientRect()
    scene.resize(rect.width, rect.height)
  }
  window.addEventListener("resize", resize)

  const loop = () => {
    const now = performance.now()
    step(state, now)
    const snapshot = buildSceneState(state, now)
    scene.sync(snapshot, now)
    scene.render()
    updateHud(hud, state, now)
    if (state.toast !== null && now > state.toastUntil) {
      state.toast = null
    }
    window.requestAnimationFrame(loop)
  }
  window.requestAnimationFrame(loop)
}

function buildHud(app: Element): HudElements {
  const hud = document.createElement("div")
  hud.setAttribute("class", "hud hud-top")

  const briefing = document.createElement("div")
  briefing.setAttribute("class", "hud-panel")
  briefing.innerHTML = `
    <h1 class="hud-title">Traffic Forge</h1>
    <p class="hud-briefing">Reverse-proxy load balancing. You are the dispatcher. Route every request orb to a <strong>healthy</strong> backend via the right algorithm, then fail over on mid-flight death.</p>
    <p class="hud-briefing">Pillar <code>P2</code> starts <span class="bad">unhealthy</span>. Orb shapes: <span class="plain">plain</span> (any alg), <span class="heavy">heavy</span> (LC), <span class="sticky">sticky</span> (CH).</p>
    <p class="hud-line"><span class="label">Project:</span> <span class="value">11_load_balancer</span></p>
  `

  const opPanel = document.createElement("div")
  opPanel.setAttribute("class", "hud-panel")
  opPanel.innerHTML = `
    <p class="hud-line"><span class="label">Orb:</span> <span class="value" data-op-counter>1 / 1</span></p>
    <p class="hud-op" data-op-line>—</p>
    <p class="hud-line" data-feedback>Pick an algorithm (1/2/3), then press SPACE to fire.</p>
  `

  hud.appendChild(briefing)
  hud.appendChild(opPanel)
  app.appendChild(hud)

  const bottom = document.createElement("div")
  bottom.setAttribute("class", "hud hud-bottom")
  bottom.innerHTML = `
    <div class="hud-controls">
      <div><span class="key">1</span>RR &nbsp; <span class="key">2</span>LC &nbsp; <span class="key">3</span>CH</div>
      <div><span class="key">SPACE</span>fire &nbsp; <span class="key">R</span>retry on stall</div>
    </div>
    <div class="hud-panel">
      <div class="hud-metrics" data-metrics></div>
      <div class="hud-banner" data-banner style="display:none"></div>
      <div class="hud-toast" data-toast></div>
    </div>
  `
  app.appendChild(bottom)

  return {
    opCounter: opPanel.querySelector("[data-op-counter]"),
    opLine: opPanel.querySelector("[data-op-line]"),
    feedback: opPanel.querySelector("[data-feedback]"),
    metrics: bottom.querySelector("[data-metrics]"),
    banner: bottom.querySelector("[data-banner]"),
    toast: bottom.querySelector("[data-toast]"),
  }
}

type HudElements = {
  opCounter: Element | null
  opLine: Element | null
  feedback: Element | null
  metrics: Element | null
  banner: Element | null
  toast: Element | null
}

function handleKey(key: string, state: GameState): void {
  if (state.phase === "finished") {
    return
  }
  const lower = key.toLowerCase()
  if (lower === "1" || key === "1") {
    if (state.phase === "idle") {
      state.algorithm = "round_robin"
    }
    return
  }
  if (lower === "2" || key === "2") {
    if (state.phase === "idle") {
      state.algorithm = "least_connections"
    }
    return
  }
  if (lower === "3" || key === "3") {
    if (state.phase === "idle") {
      state.algorithm = "consistent_hash"
    }
    return
  }
  if (key === " " || lower === "space") {
    if (state.phase === "idle") {
      tryFire(state)
    }
    return
  }
  if (lower === "r") {
    if (state.phase === "stalled") {
      tryRetry(state)
    }
    return
  }
}

function tryFire(state: GameState): void {
  const orb = state.wave.orbs[state.orbIndex]
  if (orb === undefined) {
    return
  }
  const outcome = pickPillar(state.dispatch, orb, state.algorithm)
  if (outcome.kind === "no_eligible") {
    flashToast(state, "No eligible pillar — every backend is dead.")
    recordDeadRoute(state.metrics)
    state.orbIndex += 1
    advanceOrFinalize(state)
    return
  }
  // Strict correctness rule: shape must match the algorithm.
  if (!algorithmMatchesShape(orb.shape, state.algorithm)) {
    if (orb.shape === "heavy") {
      recordHeavyOverflow(state.metrics)
      flashToast(state, `Heavy orb must use LC (got ${labelFor(state.algorithm)}). Overflow!`)
    } else if (orb.shape === "sticky") {
      recordStickyBreak(state.metrics)
      flashToast(state, `Sticky orb must use CH (got ${labelFor(state.algorithm)}). Break!`)
    }
  }
  commitRouting(state.dispatch, orb, state.algorithm, outcome.pillarId)
  recordAlgorithm(state.metrics, state.algorithm)
  const isFailoverOrb = state.orbIndex === state.wave.failoverOrbIndex
  state.inflight = {
    orb,
    algorithm: state.algorithm,
    pillarId: outcome.pillarId,
    startedAt: performance.now(),
    scheduledDeath: isFailoverOrb,
    deadFlagged: false,
    retrying: false,
    stalledAt: 0,
  }
  state.phase = "flying"
}

function tryRetry(state: GameState): void {
  if (state.inflight === null) {
    return
  }
  const { orb, algorithm } = state.inflight
  const outcome = pickPillar(state.dispatch, orb, algorithm)
  if (outcome.kind === "no_eligible") {
    flashToast(state, "Retry failed — no eligible backend. Orb lost.")
    recordOrbLost(state.metrics)
    releaseInflight(state.dispatch, state.inflight.pillarId, orb.shape)
    state.inflight = null
    state.orbIndex += 1
    state.phase = "idle"
    advanceOrFinalize(state)
    return
  }
  releaseInflight(state.dispatch, state.inflight.pillarId, orb.shape)
  commitRouting(state.dispatch, orb, algorithm, outcome.pillarId)
  state.inflight.pillarId = outcome.pillarId
  state.inflight.startedAt = performance.now()
  state.inflight.retrying = true
  state.inflight.scheduledDeath = false
  state.inflight.deadFlagged = false
  state.phase = "retrying"
}

function step(state: GameState, now: number): void {
  if (state.phase === "flying" && state.inflight !== null) {
    const elapsed = now - state.inflight.startedAt
    if (state.inflight.scheduledDeath && !state.inflight.deadFlagged && elapsed >= DEATH_AT_MS) {
      const pillar = state.dispatch.pillars[state.inflight.pillarId]
      if (pillar !== undefined) {
        pillar.health = "dead"
      }
      state.inflight.deadFlagged = true
      state.inflight.stalledAt = now
      state.phase = "stalled"
      return
    }
    if (!state.inflight.scheduledDeath && elapsed >= FLIGHT_MS) {
      landInflight(state)
    }
  } else if (state.phase === "stalled" && state.inflight !== null) {
    const stalledFor = now - state.inflight.stalledAt
    if (stalledFor >= STALL_TIMEOUT_MS) {
      flashToast(state, "Orb lost — retry window expired.")
      recordOrbLost(state.metrics)
      if (state.inflight.orb !== null) {
        releaseInflight(state.dispatch, state.inflight.pillarId, state.inflight.orb.shape)
      }
      state.inflight = null
      state.orbIndex += 1
      state.phase = "idle"
      advanceOrFinalize(state)
    }
  } else if (state.phase === "retrying" && state.inflight !== null) {
    const elapsed = now - state.inflight.startedAt
    if (elapsed >= RETRY_FLIGHT_MS) {
      // Retry completed — counts as failover recovery + landing.
      const before = state.metrics.failover_recovered
      recordFailoverRecovery(state.metrics)
      recordLanding(state.metrics)
      if (state.metrics.failover_recovered > before) {
        state.lastFailoverRecoveredTotal = state.metrics.failover_recovered
      }
      releaseInflight(state.dispatch, state.inflight.pillarId, state.inflight.orb.shape)
      state.inflight = null
      state.orbIndex += 1
      state.phase = "idle"
      advanceOrFinalize(state)
    }
  }
}

function landInflight(state: GameState): void {
  if (state.inflight === null) {
    return
  }
  const pillar = state.dispatch.pillars[state.inflight.pillarId]
  if (pillar === undefined || pillar.health !== "healthy") {
    recordDeadRoute(state.metrics)
    flashToast(state, `Routed to non-healthy pillar ${state.inflight.pillarId}.`)
  } else {
    recordLanding(state.metrics)
  }
  releaseInflight(state.dispatch, state.inflight.pillarId, state.inflight.orb.shape)
  state.inflight = null
  state.orbIndex += 1
  state.phase = "idle"
  advanceOrFinalize(state)
}

function advanceOrFinalize(state: GameState): void {
  if (state.orbIndex >= state.wave.orbs.length) {
    state.metrics.rr_skew_max = Math.max(
      state.metrics.rr_skew_max,
      inflightSkew(state.dispatch.pillars),
    )
    state.metrics.wave_cleared = evaluatePass(state.metrics)
    state.phase = "finished"
    const record = buildEvidence(state.metrics, new Date())
    state.banner = record.pass ? "EVIDENCE PASS" : "EVIDENCE FAIL"
    emitEvidence(record)
  }
}

function buildSceneState(state: GameState, now: number): SceneState {
  const pillars = state.dispatch.pillars.map((p) => ({
    id: p.id,
    health: p.health,
    inflight: p.inflight,
    stickySession: null,
  }))
  const currentOrb = state.wave.orbs[state.orbIndex] ?? null
  const currentView: OrbView | null =
    currentOrb === null || state.phase === "finished"
      ? null
      : { shape: currentOrb.shape, session: currentOrb.session }
  const inflightView: InflightView | null = buildInflightView(state, now)
  const targetPillarId =
    state.phase === "idle" && currentOrb !== null
      ? previewTarget(state, currentOrb)
      : (inflightView?.pillarId ?? null)
  return {
    pillarCount: state.dispatch.pillars.length,
    pillars,
    algorithm: state.algorithm,
    currentOrb: currentView,
    inflightOrb: inflightView,
    targetPillarId,
    finished: state.phase === "finished",
  }
}

function previewTarget(state: GameState, orb: Orb): number | null {
  const outcome = pickPillar(state.dispatch, orb, state.algorithm)
  return outcome.kind === "routed" ? outcome.pillarId : null
}

function buildInflightView(state: GameState, now: number): InflightView | null {
  if (state.inflight === null) {
    return null
  }
  const inf = state.inflight
  let progress = 0
  let stalled = false
  let retrying = false
  if (state.phase === "flying") {
    const elapsed = now - inf.startedAt
    progress = Math.min(1, elapsed / FLIGHT_MS)
  } else if (state.phase === "stalled") {
    progress = Math.min(1, DEATH_AT_MS / FLIGHT_MS)
    stalled = true
  } else if (state.phase === "retrying") {
    const elapsed = now - inf.startedAt
    progress = Math.min(1, elapsed / RETRY_FLIGHT_MS)
    retrying = true
  } else {
    return null
  }
  return {
    shape: inf.orb.shape,
    session: inf.orb.session,
    pillarId: inf.pillarId,
    progress,
    stalled,
    retrying,
  }
}

function flashToast(state: GameState, message: string): void {
  state.toast = message
  state.toastUntil = performance.now() + 1500
}

function labelFor(algorithm: Algorithm): string {
  switch (algorithm) {
    case "round_robin":
      return "RR"
    case "least_connections":
      return "LC"
    case "consistent_hash":
      return "CH"
  }
}

function updateHud(hud: HudElements, state: GameState, _now: number): void {
  if (hud.opCounter !== null) {
    const total = state.wave.orbs.length
    const shown = Math.min(state.orbIndex + 1, total)
    hud.opCounter.textContent = `${shown} / ${total}`
  }
  if (hud.opLine !== null) {
    const orb = state.wave.orbs[state.orbIndex]
    if (orb === undefined) {
      hud.opLine.innerHTML = `<span class="kind">—</span> wave complete`
    } else {
      const shapeClass = orb.shape
      const detail =
        orb.session !== null
          ? `session <span class="key">${orb.session}</span>`
          : orb.shape === "heavy"
            ? "<span class='heavy'>heavy load</span>"
            : "<span class='plain'>plain</span>"
      const target = previewTarget(state, orb)
      const targetText = target === null ? "—" : `P${target}`
      hud.opLine.innerHTML = `<span class="kind ${shapeClass}">${orb.shape.toUpperCase()}</span> ${detail} → alg <span class="key">${labelFor(state.algorithm)}</span> → target <span class="shelf">${targetText}</span>`
    }
  }
  if (hud.feedback !== null) {
    if (state.phase === "stalled") {
      hud.feedback.innerHTML = `<span class="bad">Mid-flight backend death! Press R to retry on the next eligible pillar.</span>`
    } else if (state.phase === "retrying") {
      hud.feedback.innerHTML = `<span class="info">Failover in flight — retrying on a healthy backend…</span>`
    } else if (state.phase === "finished") {
      hud.feedback.innerHTML = state.metrics.wave_cleared
        ? `<span class="good">Wave cleared — every request reached a healthy backend.</span>`
        : `<span class="bad">Wave failed — review the metrics.</span>`
    } else {
      hud.feedback.textContent = `Pick an algorithm (1/2/3), then press SPACE to fire.`
    }
  }
  if (hud.metrics !== null) {
    hud.metrics.innerHTML = renderMetrics(state)
  }
  if (hud.banner !== null) {
    if (state.phase === "finished" && state.banner !== null) {
      const pass = state.metrics.wave_cleared
      hud.banner.setAttribute("class", `hud-banner ${pass ? "pass" : "fail"}`)
      hud.banner.textContent = state.banner
      hud.banner.setAttribute("style", "display:inline-block")
    }
  }
  if (hud.toast !== null) {
    hud.toast.textContent = state.toast ?? ""
  }
}

function renderMetrics(state: GameState): string {
  const m = state.metrics
  const rows: Array<[string, string]> = [
    ["algorithm", labelFor(state.algorithm)],
    ["phase", state.phase],
    ["orbs landed", `${m.orbs_landed}/${m.orbs_total}`],
    ["dead routes", `${m.dead_routes}`],
    ["sticky breaks", `${m.sticky_breaks}`],
    ["heavy overflows", `${m.heavy_overflows}`],
    ["failover recovered", `${m.failover_recovered}`],
    ["orbs lost", `${m.orbs_lost}`],
    ["algorithms used", m.algorithms_used.map(labelFor).join(",") || "—"],
  ]
  return rows
    .map(
      ([label, value]) => `<span class="label">${label}</span><span class="value">${value}</span>`,
    )
    .join("")
}

main()
