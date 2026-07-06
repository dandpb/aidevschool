// KV Warehouse — entry point. Wires the pure KvStore + wave logic to the
// three.js scene and the DOM HUD, and handles keyboard input. The game emits
// one evidence record when the wave resolves (pass or fail); the smoke spec
// scrapes the `EVIDENCE ` console line.

import "./styles.css"
import { buildEvidence, emitEvidence } from "./game/evidence"
import { KvStore } from "./game/kvstore"
import { type ConveyorPayload, KvWarehouseScene } from "./game/scene"
import {
  defaultWave,
  emptyMetrics,
  type KvMetrics,
  type KvOp,
  type OpOutcome,
  resolveOp,
} from "./game/wave"

const BUCKET_COUNT = 8
const TTL_DRAIN_VISUAL_MS = 8000 // only used for HUD briefing text

type GamePhase = "playing" | "finished"

type GameState = {
  store: KvStore<string>
  wave: readonly KvOp[]
  opIndex: number
  targetShelf: number
  metrics: KvMetrics
  lastOutcome: OpOutcome | null
  phase: GamePhase
  toast: string | null
  toastUntil: number
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
  const scene = new KvWarehouseScene(canvasHolder)
  scene.buildPedestals(BUCKET_COUNT)

  const state: GameState = {
    store: new KvStore<string>(BUCKET_COUNT),
    wave: defaultWave(),
    opIndex: 0,
    targetShelf: 0,
    metrics: emptyMetrics(),
    lastOutcome: null,
    phase: "playing",
    toast: null,
    toastUntil: 0,
  }

  window.__kvDebug = {
    opIndex: () => state.opIndex,
    targetShelf: () => state.targetShelf,
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
    const conveyor = currentConveyor(state)
    scene.sync(
      {
        bucketCount: BUCKET_COUNT,
        targetShelf: state.targetShelf,
        crates: state.store.view(now),
        conveyor,
        finished: state.phase === "finished",
      },
      now,
    )
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
    <h1 class="hud-title">KV Warehouse</h1>
    <p class="hud-briefing">Hash-map CRUD with TTL expiration. Every key routes to shelf <code>hash(key)%${BUCKET_COUNT}</code>.</p>
    <p class="hud-briefing">Hash = sum of char codes mod ${BUCKET_COUNT}. TTL drains in ~${TTL_DRAIN_VISUAL_MS / 1000}s; expired crates are invisible to GET.</p>
    <p class="hud-line"><span class="label">Project:</span> <span class="value">02_key_value_store</span></p>
  `

  const opPanel = document.createElement("div")
  opPanel.setAttribute("class", "hud-panel")
  opPanel.innerHTML = `
    <p class="hud-line"><span class="label">Op:</span> <span class="value" data-op-counter>1 / 1</span></p>
    <p class="hud-op" data-op-line>—</p>
    <p class="hud-line" data-feedback>Route the forklift to the right shelf, then press the action key.</p>
  `

  hud.appendChild(briefing)
  hud.appendChild(opPanel)
  app.appendChild(hud)

  const bottom = document.createElement("div")
  bottom.setAttribute("class", "hud hud-bottom")
  bottom.innerHTML = `
    <div class="hud-controls">
      <div><span class="key">← →</span>cycle target shelf</div>
      <div><span class="key">Z</span>PUT (SET) &nbsp; <span class="key">X</span>GET/MISS &nbsp; <span class="key">C</span>DEL &nbsp; <span class="key">V</span>EXPIRE/PERSIST</div>
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

function currentConveyor(state: GameState): ConveyorPayload {
  if (state.phase === "finished") {
    return { kind: "EMPTY" }
  }
  const op = state.wave[state.opIndex]
  if (op === undefined) {
    return { kind: "EMPTY" }
  }
  if (op.kind === "SET") {
    return { kind: "SET", key: op.key, value: op.value }
  }
  return { kind: op.kind, key: op.key }
}

function handleKey(key: string, state: GameState): void {
  if (state.phase === "finished") {
    return
  }
  if (key === "ArrowLeft") {
    state.targetShelf = (state.targetShelf - 1 + BUCKET_COUNT) % BUCKET_COUNT
    return
  }
  if (key === "ArrowRight") {
    state.targetShelf = (state.targetShelf + 1) % BUCKET_COUNT
    return
  }
  const op = state.wave[state.opIndex]
  if (op === undefined) {
    return
  }
  const expected = expectedKey(op)
  if (expected === null || key !== expected) {
    flashToast(state, `Wrong key for ${op.kind}. Use ${expected ?? "?"}.`)
    return
  }
  const now = performance.now()
  const outcome = resolveOp(state.store, state.metrics, op, state.targetShelf, now)
  state.lastOutcome = outcome
  state.opIndex += 1
  if (state.opIndex >= state.wave.length) {
    finishWave(state)
  }
}

function expectedKey(op: KvOp): string | null {
  switch (op.kind) {
    case "SET":
      return "z"
    case "GET":
      return "x"
    case "DEL":
      return "c"
    case "EXPIRE":
      return "v"
    case "PERSIST":
      return "v"
    default:
      return null
  }
}

function flashToast(state: GameState, message: string): void {
  state.toast = message
  state.toastUntil = performance.now() + 1200
}

function finishWave(state: GameState): void {
  state.phase = "finished"
  const record = buildEvidence(state.metrics, new Date())
  emitEvidence(record)
}

function updateHud(hud: HudElements, state: GameState, _now: number): void {
  if (hud.opCounter !== null) {
    const total = state.wave.length
    const shown = Math.min(state.opIndex + 1, total)
    hud.opCounter.textContent = `${shown} / ${total}`
  }
  if (hud.opLine !== null) {
    const op = state.wave[state.opIndex]
    if (op === undefined) {
      hud.opLine.innerHTML = `<span class="kind">—</span> wave complete`
    } else {
      const shelf = hashShelf(op.key)
      const detail =
        op.kind === "SET"
          ? `= <span class="key">${op.value}</span>`
          : op.kind === "EXPIRE"
            ? `TTL ${op.ttlMs}ms`
            : ""
      hud.opLine.innerHTML = `<span class="kind">${op.kind}</span> <span class="key">${op.key}</span> ${detail} → shelf <span class="shelf">${shelf}</span>`
    }
  }
  if (hud.feedback !== null && state.lastOutcome !== null) {
    hud.feedback.textContent = feedbackMessage(state.lastOutcome)
  }
  if (hud.metrics !== null) {
    hud.metrics.innerHTML = renderMetrics(state.metrics, state.targetShelf)
  }
  if (hud.banner !== null) {
    if (state.phase === "finished") {
      const pass =
        state.metrics.puts_correct === state.metrics.puts_total &&
        state.metrics.gets_correct === state.metrics.gets_total &&
        state.metrics.misses_correct === state.metrics.misses_total &&
        state.metrics.wrong_bucket_routes === 0 &&
        state.metrics.stale_reads === 0 &&
        !state.metrics.overflow
      hud.banner.setAttribute("class", `hud-banner ${pass ? "pass" : "fail"}`)
      hud.banner.textContent = pass ? "EVIDENCE PASS" : "EVIDENCE FAIL"
      hud.banner.setAttribute("style", "display:inline-block")
    }
  }
  if (hud.toast !== null) {
    hud.toast.textContent = state.toast ?? ""
  }
}

function feedbackMessage(outcome: OpOutcome): string {
  if (outcome.result === "WRONG_ROUTE") {
    return `Wrong shelf! ${outcome.key} belongs at shelf ${outcome.shelfExpected}, you routed to ${outcome.shelfChosen}.`
  }
  switch (outcome.result) {
    case "PUT":
      return `PUT ${outcome.key} → shelf ${outcome.shelfChosen} ✓`
    case "HIT":
      return `GET ${outcome.key} → live value ✓`
    case "MISS":
      return `GET ${outcome.key} → MISS (correct) ✓`
    case "DELETED":
      return `DEL ${outcome.key} → evicted ✓`
    case "EXPIRED":
      return `EXPIRE ${outcome.key} → TTL clock started ✓`
    case "PERSISTED":
      return `PERSIST ${outcome.key} → TTL removed ✓`
    case "NOOP":
      return `${outcome.key} not live — no-op.`
    default:
      return ""
  }
}

function renderMetrics(metrics: KvMetrics, targetShelf: number): string {
  const rows: Array<[string, string]> = [
    ["target shelf", `${targetShelf}`],
    ["puts", `${metrics.puts_correct}/${metrics.puts_total}`],
    ["gets (live)", `${metrics.gets_correct}/${metrics.gets_total}`],
    ["misses", `${metrics.misses_correct}/${metrics.misses_total}`],
    ["dels", `${metrics.dels_correct}/${metrics.dels_total}`],
    ["expire", `${metrics.expire_correct}/${metrics.expire_total}`],
    ["wrong routes", `${metrics.wrong_bucket_routes}`],
    ["stale reads", `${metrics.stale_reads}`],
  ]
  return rows
    .map(
      ([label, value]) => `<span class="label">${label}</span><span class="value">${value}</span>`,
    )
    .join("")
}

function hashShelf(key: string): number {
  let sum = 0
  for (let i = 0; i < key.length; i += 1) {
    sum += key.charCodeAt(i)
  }
  return sum % BUCKET_COUNT
}

main()
