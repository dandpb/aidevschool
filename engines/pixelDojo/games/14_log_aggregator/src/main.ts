// Log River Delta — entry point.
//
// Wires the pure logriver model to the three.js scene + DOM HUD and routes
// keyboard input to state transitions. The game emits one evidence record
// when the wave resolves (pass or fail); the smoke spec scrapes the
// `EVIDENCE ` console line.

import "./styles.css"
import { buildEvidence, emitEvidence } from "./game/evidence"
import {
  assembleTrace,
  batchCurrentBurst,
  cycleFilterDimension,
  cycleFilterValue,
  fireQuery,
  initRiver,
  tick,
} from "./game/logriver"
import { hudView, LogRiverScene } from "./game/scene"
import { defaultContracts, defaultWave, WAVE_CONFIG, WAVE_CORRELATIONS } from "./game/wave"

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
  const scene = new LogRiverScene(canvasHolder, WAVE_CORRELATIONS)

  const state = initRiver({
    bursts: defaultWave(),
    contracts: defaultContracts(),
    weirSlotsMax: WAVE_CONFIG.weirSlotsMax,
    batchWindowMs: WAVE_CONFIG.batchWindowMs,
    retentionMs: WAVE_CONFIG.retentionMs,
    correlations: WAVE_CORRELATIONS,
  })

  window.__logRiverDebug = {
    phase: () => state.phase,
    contractPrompt: () => state.activeContract?.prompt ?? null,
    finished: () => state.phase === "finished",
  }

  const onKey = (event: KeyboardEvent) => handleKey(event.key, state)
  window.addEventListener("keydown", onKey)

  let lastNow = performance.now()
  let evidenceEmitted = false
  const loop = () => {
    const now = performance.now()
    const dt = Math.min(64, now - lastNow) // clamp huge tab-switch gaps
    lastNow = now
    tick(state, dt)
    scene.sync(state, now)
    scene.render()
    updateHud(hud, state)
    if (state.phase === "finished" && !evidenceEmitted) {
      const record = buildEvidence(state.metrics, new Date())
      emitEvidence(record)
      evidenceEmitted = true
    }
    window.requestAnimationFrame(loop)
  }
  window.requestAnimationFrame(loop)
}

type HudElements = {
  phase: Element | null
  contract: Element | null
  filter: Element | null
  metrics: Element | null
  banner: Element | null
  toast: Element | null
  burst: Element | null
}

function buildHud(app: Element): HudElements {
  const hud = document.createElement("div")
  hud.setAttribute("class", "hud hud-top")
  hud.innerHTML = `
    <div class="hud-panel">
      <h1 class="hud-title">Log River Delta — 14_log_aggregator</h1>
      <p class="hud-briefing">Structured-log aggregation: 4 services → weir (bounded buffer) → indexer → hot/warm/cold tiers + trace tower.</p>
      <p class="hud-briefing">Batch each burst with B before the timer runs out, or the weir overflows (429 backpressure). Then drive the contracts.</p>
      <p class="hud-line"><span class="label">Project:</span> <span class="value">14_log_aggregator</span></p>
      <p class="hud-line"><span class="label">Phase:</span> <span class="value" data-phase>—</span></p>
      <p class="hud-line"><span class="label">Burst timer:</span> <span class="value" data-burst>—</span></p>
    </div>
    <div class="hud-panel">
      <p class="hud-contract" data-contract>Waiting for ingest…</p>
      <div class="hud-filter" data-filter></div>
    </div>
  `
  app.appendChild(hud)

  const bottom = document.createElement("div")
  bottom.setAttribute("class", "hud hud-bottom")
  bottom.innerHTML = `
    <div class="hud-controls">
      <div><span class="key">B</span>batch burst &nbsp; <span class="key">F</span>cycle filter &nbsp; <span class="key">Q/E</span>value -/+</div>
      <div><span class="key">Z</span>fire query &nbsp; <span class="key">T</span>assemble trace</div>
    </div>
    <div class="hud-panel">
      <div class="hud-metrics" data-metrics></div>
      <div class="hud-banner" data-banner style="display:none"></div>
      <div class="hud-toast" data-toast></div>
    </div>
  `
  app.appendChild(bottom)

  return {
    phase: hud.querySelector("[data-phase]"),
    contract: hud.querySelector("[data-contract]"),
    filter: hud.querySelector("[data-filter]"),
    metrics: bottom.querySelector("[data-metrics]"),
    banner: bottom.querySelector("[data-banner]"),
    toast: bottom.querySelector("[data-toast]"),
    burst: hud.querySelector("[data-burst]"),
  }
}

function handleKey(key: string, state: ReturnType<typeof initRiver>): void {
  switch (key) {
    case "b":
    case "B":
      batchCurrentBurst(state)
      break
    case "f":
    case "F":
      cycleFilterDimension(state)
      break
    case "e":
    case "E":
      cycleFilterValue(state, 1)
      break
    case "q":
    case "Q":
      cycleFilterValue(state, -1)
      break
    case "z":
    case "Z":
      fireQuery(state)
      break
    case "t":
    case "T":
      assembleTrace(state)
      break
    default:
      // No-op: navigation keys not bound in Level 1.
      break
  }
}

function updateHud(hud: HudElements, state: ReturnType<typeof initRiver>): void {
  const view = hudView(state)
  if (hud.phase !== null) {
    hud.phase.textContent = describePhase(view.phase)
  }
  if (hud.burst !== null) {
    if (view.phase === "await_batch") {
      const sec = (view.burstRemaining / 1000).toFixed(1)
      hud.burst.textContent = `${sec}s (${view.activeSource ?? "?"} — ${view.pendingBurstCount} burst(s) left)`
      hud.burst.setAttribute("class", `value ${view.burstRemaining < 1500 ? "warn" : ""}`)
    } else {
      hud.burst.textContent = "—"
      hud.burst.setAttribute("class", "value")
    }
  }
  if (hud.contract !== null) {
    hud.contract.textContent = view.contractPrompt ?? describePhase(view.phase)
  }
  if (hud.filter !== null) {
    hud.filter.innerHTML = renderFilter(view.filter)
  }
  if (hud.metrics !== null) {
    hud.metrics.innerHTML = renderMetrics(view.metrics, view.weirUsed, view.weirMax)
  }
  if (hud.banner !== null) {
    if (view.banner !== null && view.bannerKind !== null) {
      hud.banner.setAttribute("class", `hud-banner ${view.bannerKind}`)
      hud.banner.textContent = view.banner
      hud.banner.setAttribute("style", "display:inline-block")
    } else {
      hud.banner.setAttribute("style", "display:none")
    }
  }
  if (hud.toast !== null) {
    hud.toast.textContent = view.toast ?? ""
  }
}

function describePhase(phase: string): string {
  switch (phase) {
    case "await_batch":
      return "INGEST (press B)"
    case "ingesting":
      return "INDEXING"
    case "settling":
      return "SETTLING"
    case "contract":
      return "QUERY"
    case "finished":
      return "DONE"
    default:
      return phase
  }
}

function renderFilter(filter: { dimension: string; value: string | null }): string {
  return `
    <span class="label">filter</span><span class="value">${filter.dimension}${filter.value === null ? "" : `=${filter.value}`}</span>
  `
}

function renderMetrics(
  m: {
    logs_accepted: number
    backpressure_rejects: number
    duplicates_detected: number
    queries_correct: number
    queries_run: number
    traces_reconstructed_correctly: number
    compression_ratio: number
    cold_segments: number
  },
  weirUsed: number,
  weirMax: number,
): string {
  const ratioClass = m.compression_ratio >= 3.0 ? "good" : ""
  const backClass = m.backpressure_rejects === 0 ? "good" : "bad"
  const dupClass = m.duplicates_detected > 0 ? "good" : ""
  const rows: Array<[string, string, string]> = [
    ["weir slots", `${weirUsed}/${weirMax}`, ""],
    ["logs accepted", `${m.logs_accepted}`, ""],
    ["backpressure", `${m.backpressure_rejects}`, backClass],
    ["duplicates deduped", `${m.duplicates_detected}`, dupClass],
    ["queries", `${m.queries_correct}/${m.queries_run}`, ""],
    ["traces", `${m.traces_reconstructed_correctly}`, ""],
    ["cold segments", `${m.cold_segments}`, ""],
    ["compression", `${m.compression_ratio.toFixed(2)}:1`, ratioClass],
  ]
  return rows
    .map(
      ([label, value, cls]) =>
        `<span class="label">${label}</span><span class="value ${cls}">${value}</span>`,
    )
    .join("")
}

main()
