// Breaker Grid — entry point.
//
// Wires the pure CircuitBreaker state machine + the deterministic wave to the
// three.js scene and the DOM HUD, and handles keyboard input. The game emits
// one evidence record when the wave resolves (pass or fail); the smoke spec
// scrapes the `EVIDENCE ` console line.
//
// Controls (≤ 3 primary actions + a HUD crutch):
//   Z  ADMIT the front pulse -> send it through to the reactor.
//      Correct in CLOSED (always) and in HALF_OPEN when a probe slot is free.
//      Wrong in OPEN (a leak to the upstream) and over-budget in HALF_OPEN.
//   X  REJECT the front pulse -> fail-fast it to the fallback bank.
//      Correct in OPEN and in HALF_OPEN when no probe slot is free.
//      Wrong in CLOSED (needless rejection of good traffic).
//   C  CHANGE state (context-sensitive):
//      CLOSED + threshold crossed -> TRIP (CLOSED -> OPEN)
//      OPEN  + cooldown drained   -> PROBE (OPEN -> HALF_OPEN)
//      HALF_OPEN + N successes     -> CLOSE (HALF_OPEN -> CLOSED)
//   H  HUD toggle (cooldown / threshold / probe gauges — non-scoring crutch).

import "./styles.css"
import { CircuitBreaker, DEFAULT_CONFIG } from "./game/breaker"
import { buildEvidence, emitEvidence } from "./game/evidence"
import { BreakerGridScene } from "./game/scene"
import { defaultWave, emptyMetrics, type BreakerMetrics, type Pulse } from "./game/wave"

type GamePhase = "playing" | "finished"

type GameState = {
  readonly breaker: CircuitBreaker
  readonly wave: readonly Pulse[]
  pulseIndex: number
  metrics: BreakerMetrics
  phase: GamePhase
  toast: string | null
  toastUntil: number
  hudBrief: boolean
  tripCueSeen: boolean
  tripCueAtPulse: number
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
  const scene = new BreakerGridScene(canvasHolder)

  const state: GameState = {
    breaker: new CircuitBreaker(DEFAULT_CONFIG),
    wave: defaultWave(),
    pulseIndex: 0,
    metrics: emptyMetrics(),
    phase: "playing",
    toast: null,
    toastUntil: 0,
    hudBrief: true,
    tripCueSeen: false,
    tripCueAtPulse: -1,
  }

  window.__breakerDebug = {
    state: () => state.breaker.state,
    pulseIndex: () => state.pulseIndex,
    thresholdCrossed: () => state.breaker.thresholdCrossed(),
    cooldownDone: () => state.breaker.cooldownDone(performance.now()),
    finished: () => state.phase === "finished",
  }

  // Mouse parallax for the camera (lightweight mouse interaction).
  canvasHolder.addEventListener("pointermove", (event) => {
    const rect = canvasHolder.getBoundingClientRect()
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    scene.setPointer(nx, ny)
  })

  window.addEventListener("keydown", (event) => handleKey(event.key, state, scene))
  window.addEventListener("resize", () => {
    const rect = canvasHolder.getBoundingClientRect()
    scene.resize(rect.width, rect.height)
  })

  const loop = () => {
    const now = performance.now()
    const snap = state.breaker.snapshot(now)
    scene.sync(
      {
        breakerState: snap.state,
        cooldownFraction: clamp01(1 - snap.cooldownRemainingMs / DEFAULT_CONFIG.openCooldownMs),
        thresholdCrossed: snap.thresholdCrossed,
        failureRate: snap.failureRate,
        probeSlotsUsed: snap.probeSlotsUsed,
        probeSlotsTotal: DEFAULT_CONFIG.halfOpenMaxProbes,
      },
      now,
    )
    scene.render()
    updateHud(hud, state, snap, now)
    if (state.toast !== null && now > state.toastUntil) {
      state.toast = null
    }
    window.requestAnimationFrame(loop)
  }
  window.requestAnimationFrame(loop)
}

function clamp01(x: number): number {
  if (x < 0) {
    return 0
  }
  if (x > 1) {
    return 1
  }
  return x
}

function handleKey(key: string, state: GameState, scene: BreakerGridScene): void {
  if (state.phase === "finished") {
    return
  }
  if (key === "h" || key === "H") {
    state.hudBrief = !state.hudBrief
    return
  }
  if (key === "z" || key === "Z") {
    admit(state, scene)
    return
  }
  if (key === "x" || key === "X") {
    reject(state, scene)
    return
  }
  if (key === "c" || key === "C") {
    changeState(state, scene)
  }
}

function currentPulse(state: GameState): Pulse | null {
  const pulse = state.wave[state.pulseIndex]
  return pulse === undefined ? null : pulse
}

function admit(state: GameState, scene: BreakerGridScene): void {
  const pulse = currentPulse(state)
  if (pulse === null) {
    flashToast(state, "No pulse at the breaker.")
    return
  }
  const breakerState = state.breaker.state
  const now = performance.now()

  if (breakerState === "CLOSED") {
    // ADMIT in CLOSED: record the reactor outcome, count the closed admit.
    state.breaker.recordClosedOutcome(pulse.reactorResult === "FAILURE")
    state.metrics.closed_admits_total += 1
    if (pulse.expected === "ADMIT") {
      state.metrics.closed_admits_correct += 1
    }
    scene.spawnAdmitPulse(pulse.reactorResult)
    advancePulse(state)
    // Late-trip check: threshold crossed earlier but player admitted another.
    if (state.breaker.thresholdCrossed() && state.tripCueSeen) {
      state.metrics.trips_late += 1
      if (pulse.reactorResult === "FAILURE") {
        state.metrics.reactor_overloads += 1
      }
    }
    return
  }

  if (breakerState === "OPEN") {
    // ADMIT in OPEN: a leak. The request crosses the broken gap and hits the
    // upstream reactor — visibly wrong (FR-009).
    state.metrics.open_leaks += 1
    state.metrics.reactor_overloads += pulse.reactorResult === "FAILURE" ? 1 : 0
    scene.spawnAdmitPulse(pulse.reactorResult)
    flashToast(state, "LEAK! Breaker is OPEN — never contact the upstream.")
    advancePulse(state)
    return
  }

  // HALF_OPEN.
  if (state.breaker.probeSlotsRemaining() <= 0) {
    // Over-budget admit — a leak past the probe cap.
    state.metrics.halfopen_admit_leaks += 1
    scene.spawnAdmitPulse(pulse.reactorResult)
    flashToast(state, "Over-budget admit! No probe slots left.")
    advancePulse(state)
    return
  }
  // Consume a probe slot and record the outcome.
  state.breaker.consumeProbeSlot()
  const failed = pulse.reactorResult === "FAILURE"
  const before = state.breaker.snapshot(now).consecutiveProbeSuccesses
  const outcome = state.breaker.recordProbeOutcome(failed, now)
  state.metrics.probes_total += 1
  if (pulse.expected === "ADMIT") {
    state.metrics.probes_correct += 1
  }
  scene.spawnAdmitPulse(pulse.reactorResult)
  if (outcome.reopened) {
    flashToast(state, "Probe FAILED — breaker snapped back to OPEN!")
  } else if (!outcome.closed && state.breaker.snapshot(now).consecutiveProbeSuccesses > before) {
    flashToast(state, `Probe ${state.breaker.snapshot(now).consecutiveProbeSuccesses}/${DEFAULT_CONFIG.halfOpenSuccessesToClose} OK`)
  }
  if (outcome.closed) {
    state.metrics.closes_correct += 1
    flashToast(state, "CLOSED! Recovery complete.")
  }
  advancePulse(state)
}

function reject(state: GameState, scene: BreakerGridScene): void {
  const pulse = currentPulse(state)
  if (pulse === null) {
    flashToast(state, "No pulse at the breaker.")
    return
  }
  const breakerState = state.breaker.state

  if (breakerState === "CLOSED") {
    // REJECT in CLOSED: needless rejection of good traffic.
    state.metrics.closed_admits_total += 1
    // closed_admits_correct NOT incremented (the player dropped good traffic).
    scene.spawnRejectPulse()
    flashToast(state, "Needless reject — CLOSED traffic should be admitted.")
    advancePulse(state)
    return
  }

  if (breakerState === "OPEN") {
    // REJECT in OPEN: correct fail-fast to fallback.
    state.metrics.open_rejects_total += 1
    if (pulse.expected === "REJECT") {
      state.metrics.open_rejects_correct += 1
    }
    state.metrics.fallbacks_served += 1
    scene.spawnRejectPulse()
    advancePulse(state)
    return
  }

  // HALF_OPEN: REJECT is correct for non-probe / over-slot traffic.
  scene.spawnRejectPulse()
  state.metrics.fallbacks_served += 1
  flashToast(state, "Fail-fasted to fallback (no probe slot consumed).")
  advancePulse(state)
}

function changeState(state: GameState, scene: BreakerGridScene): void {
  const breakerState = state.breaker.state
  const now = performance.now()

  if (breakerState === "CLOSED") {
    // TRIP attempt.
    state.metrics.trips_total += 1
    const result = state.breaker.trip(now)
    if (result.ok) {
      state.metrics.trips_correct += 1
      state.tripCueSeen = false
      flashToast(state, "TRIPPED! Breaker OPEN — fail-fast all traffic.")
    } else if (result.reason === "threshold_not_crossed") {
      state.metrics.trips_early += 1
      flashToast(state, "False-trip! Threshold not yet crossed.")
    }
    return
  }

  if (breakerState === "OPEN") {
    // PROBE attempt.
    const result = state.breaker.probe(now)
    if (result.ok) {
      flashToast(state, "HALF-OPEN. Admit up to N probes, reject the rest.")
    } else if (result.reason === "cooldown_not_done") {
      state.metrics.probes_premature += 1
      flashToast(state, "Premature probe! Cooldown still draining.")
    }
    return
  }

  // HALF_OPEN: CLOSE attempt.
  if (state.breaker.snapshot(now).consecutiveProbeSuccesses >= DEFAULT_CONFIG.halfOpenSuccessesToClose) {
    if (state.breaker.close()) {
      flashToast(state, "CLOSED! Circuit restored.")
    }
  } else {
    flashToast(
      state,
      `Need ${DEFAULT_CONFIG.halfOpenSuccessesToClose} consecutive probe successes to close.`,
    )
  }
}

function advancePulse(state: GameState): void {
  state.pulseIndex += 1
  if (state.pulseIndex >= state.wave.length) {
    finishWave(state)
  }
}

function finishWave(state: GameState): void {
  state.phase = "finished"
  const record = buildEvidence(state.metrics, new Date())
  emitEvidence(record)
}

function flashToast(state: GameState, message: string): void {
  state.toast = message
  state.toastUntil = performance.now() + 1800
}

// --- HUD ---

type HudElements = {
  briefing: Element
  phase: Element
  pulse: Element
  feedback: Element
  metrics: Element
  banner: Element
  toast: Element
}

function buildHud(app: Element): HudElements {
  const hud = document.createElement("div")
  hud.setAttribute("class", "hud hud-top")

  const briefing = document.createElement("div")
  briefing.setAttribute("class", "hud-panel")
  briefing.innerHTML = `
    <h1 class="hud-title">Breaker Grid</h1>
    <p class="hud-briefing">Circuit-breaker state machine: <strong>CLOSED → OPEN → HALF_OPEN → CLOSED</strong>.</p>
    <p class="hud-briefing">Threshold ${DEFAULT_CONFIG.failureRateThreshold} (min ${DEFAULT_CONFIG.minimumRequests} reqs) · cooldown ${DEFAULT_CONFIG.openCooldownMs}ms · ${DEFAULT_CONFIG.halfOpenMaxProbes} probes to close.</p>
    <p class="hud-line"><span class="label">Project:</span> <span class="value">13_api_gateway_circuit_breaker</span></p>
  `

  const phasePanel = document.createElement("div")
  phasePanel.setAttribute("class", "hud-panel")
  phasePanel.innerHTML = `
    <p class="hud-line"><span class="label">State:</span> <span class="value" data-state>CLOSED</span></p>
    <p class="hud-line"><span class="label">Phase cue:</span> <span class="value" data-phase>Admit traffic (Z)</span></p>
    <p class="hud-op" data-pulse>—</p>
    <p class="hud-line" data-feedback>Admit (Z) the front pulse, reject (X) to fallback, change state (C).</p>
  `

  hud.appendChild(briefing)
  hud.appendChild(phasePanel)
  app.appendChild(hud)

  const bottom = document.createElement("div")
  bottom.setAttribute("class", "hud hud-bottom")
  bottom.innerHTML = `
    <div class="hud-controls">
      <div><span class="key">Z</span>ADMIT &nbsp; <span class="key">X</span>REJECT &nbsp; <span class="key">C</span>TRIP/PROBE/CLOSE &nbsp; <span class="key">H</span>HUD</div>
    </div>
    <div class="hud-panel">
      <div class="hud-metrics" data-metrics></div>
      <div class="hud-banner" data-banner style="display:none"></div>
      <div class="hud-toast" data-toast></div>
    </div>
  `
  app.appendChild(bottom)

  return {
    briefing,
    phase: phasePanel.querySelector("[data-phase]") ?? phasePanel,
    pulse: phasePanel.querySelector("[data-pulse]") ?? phasePanel,
    feedback: phasePanel.querySelector("[data-feedback]") ?? phasePanel,
    metrics: bottom.querySelector("[data-metrics]") ?? bottom,
    banner: bottom.querySelector("[data-banner]") ?? bottom,
    toast: bottom.querySelector("[data-toast]") ?? bottom,
  }
}

function updateHud(
  hud: HudElements,
  state: GameState,
  snap: ReturnType<CircuitBreaker["snapshot"]>,
  now: number,
): void {
  const stateEl = hud.phase.parentElement?.querySelector("[data-state]")
  if (stateEl !== null && stateEl !== undefined) {
    stateEl.textContent = snap.state
  }

  // Track trip cue: mark seen the moment threshold crosses (one-shot).
  if (snap.thresholdCrossed && !state.tripCueSeen) {
    state.tripCueSeen = true
    state.tripCueAtPulse = state.pulseIndex
  }

  if (hud.phase.getAttribute("data-phase") !== null) {
    hud.phase.textContent = phaseCue(state, snap, now)
  }

  if (hud.pulse.getAttribute("data-pulse") !== null) {
    const pulse = currentPulse(state)
    if (pulse === null) {
      hud.pulse.innerHTML = `<span class="kind">—</span> wave resolved`
    } else {
      const tag =
        pulse.reactorResult === "FAILURE"
          ? '<span class="fail">FAIL</span>'
          : '<span class="ok">ok</span>'
      hud.pulse.innerHTML = `<span class="kind">#${pulse.id}</span> ${pulse.label} ${tag}`
    }
  }

  if (hud.feedback.getAttribute("data-feedback") !== null) {
    hud.feedback.textContent = state.toast ?? defaultFeedback(snap)
  }

  if (hud.metrics.getAttribute("data-metrics") !== null) {
    hud.metrics.innerHTML = renderMetrics(state.metrics, snap)
  }

  if (hud.banner.getAttribute("data-banner") !== null) {
    if (state.phase === "finished") {
      const gates = buildEvidence(state.metrics, new Date()).gates
      const pass = gates.every((g) => g.passed)
      hud.banner.setAttribute("class", `hud-banner ${pass ? "pass" : "fail"}`)
      hud.banner.textContent = pass ? "EVIDENCE PASS" : "EVIDENCE FAIL"
      hud.banner.setAttribute("style", "display:inline-block")
    }
  }

  if (hud.toast.getAttribute("data-toast") !== null) {
    hud.toast.textContent = state.toast ?? ""
  }
}

function phaseCue(
  state: GameState,
  snap: ReturnType<CircuitBreaker["snapshot"]>,
  now: number,
): string {
  if (state.breaker.state === "CLOSED") {
    if (snap.thresholdCrossed) {
      return "TRIP NOW (C)"
    }
    return "Admit traffic (Z)"
  }
  if (state.breaker.state === "OPEN") {
    if (!snap.cooldownDone) {
      const secs = (snap.cooldownRemainingMs / 1000).toFixed(1)
      return `Cooldown ${secs}s — reject (X)`
    }
    return "PROBE (C)"
  }
  // HALF_OPEN
  if (snap.consecutiveProbeSuccesses >= DEFAULT_CONFIG.halfOpenSuccessesToClose) {
    return "CLOSE (C)"
  }
  return `Probe (${snap.consecutiveProbeSuccesses}/${DEFAULT_CONFIG.halfOpenSuccessesToClose}) — Z admit, X reject`
}

function defaultFeedback(snap: ReturnType<CircuitBreaker["snapshot"]>): string {
  switch (snap.state) {
    case "CLOSED":
      return snap.thresholdCrossed
        ? "Threshold crossed — trip NOW (C)."
        : "Traffic healthy — admit (Z)."
    case "OPEN":
      return snap.cooldownDone
        ? "Cooldown drained — probe (C) to test recovery."
        : "Breaker OPEN — reject (X) every pulse to fallback."
    case "HALF_OPEN":
      return "Admit probes (Z), reject non-probes (X)."
    default:
      return ""
  }
}

function renderMetrics(
  metrics: BreakerMetrics,
  snap: ReturnType<CircuitBreaker["snapshot"]>,
): string {
  const rows: Array<[string, string]> = [
    ["state", snap.state],
    ["failure rate", `${(snap.failureRate * 100).toFixed(0)}%`],
    ["threshold", snap.thresholdCrossed ? "CROSSED" : "—"],
    ["cooldown", snap.cooldownDone ? "drained" : `${(snap.cooldownRemainingMs / 1000).toFixed(1)}s`],
    ["probe slots", `${snap.probeSlotsUsed}/${DEFAULT_CONFIG.halfOpenMaxProbes}`],
    ["closed admits", `${metrics.closed_admits_correct}/${metrics.closed_admits_total}`],
    ["trips", `${metrics.trips_correct} (early ${metrics.trips_early}/late ${metrics.trips_late})`],
    ["open rejects", `${metrics.open_rejects_correct}/${metrics.open_rejects_total}`],
    ["open leaks", `${metrics.open_leaks}`],
    ["probes", `${metrics.probes_correct}/${metrics.probes_total}`],
    ["premature", `${metrics.probes_premature}`],
    ["closes", `${metrics.closes_correct}`],
    ["overloads", `${metrics.reactor_overloads}`],
  ]
  return rows
    .map(
      ([label, value]) => `<span class="label">${label}</span><span class="value">${value}</span>`,
    )
    .join("")
}

main()
