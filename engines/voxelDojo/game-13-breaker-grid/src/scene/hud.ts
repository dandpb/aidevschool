import type { GameController, GameState } from "../game/controller"
import type { CircuitState } from "../sim/breaker"
import { STATE_COLOR } from "./breakerScene"

/** DOM HUD — briefing, controls per level, metrics. Reads sim state; dispatches controller commands. */
export function mountHud(root: HTMLElement, game: GameController): void {
  root.innerHTML = `
    <h1 data-testid="hud-title"></h1>
    <p class="lesson" data-testid="hud-lesson"></p>
    <p class="rule" data-testid="hud-rule"></p>
    <div class="status" data-testid="hud-status"></div>
    <div class="controls" data-testid="hud-controls"></div>
    <div class="legend" data-testid="hud-legend"></div>
    <pre class="metrics" data-testid="hud-metrics"></pre>
  `
  const el = {
    title: q(root, "hud-title"),
    lesson: q(root, "hud-lesson"),
    rule: q(root, "hud-rule"),
    status: q(root, "hud-status"),
    controls: q(root, "hud-controls"),
    legend: q(root, "hud-legend"),
    metrics: q(root, "hud-metrics"),
  }

  game.subscribe((state) => {
    el.title.textContent = `${state.level.id} — ${state.level.title}`
    el.lesson.textContent = state.level.lesson
    el.rule.textContent = state.level.passRule
    renderStatus(el.status, state)
    renderControls(el.controls, state, game)
    renderLegend(el.legend, state, game)
    el.metrics.textContent = state.lastOutcome
      ? JSON.stringify(state.lastOutcome.metrics, null, 2)
      : ""
  })
}

function q(root: HTMLElement, id: string): HTMLElement {
  const node = root.querySelector(`[data-testid="${id}"]`)
  if (!node) throw new Error(`missing hud node ${id}`)
  return node as HTMLElement
}

function renderStatus(node: HTMLElement, state: GameState): void {
  if (state.phase === "briefing") {
    node.textContent = "Press start."
    return
  }
  if (state.phase === "cleared") {
    node.textContent = "Wave cleared — evidence emitted."
    return
  }
  if (state.phase === "failed") {
    node.textContent = "Wave failed — evidence emitted. Retry?"
    return
  }
  const sel = state.selectedDistrictId ?? "(select a district)"
  if (state.phase === "injecting") {
    node.textContent = `Inject traffic into ${sel}. Click a district pillar or legend row, then inject failures/successes. Predict when ready.`
    return
  }
  // predicting — level-specific hint
  if (state.level.id === "L1")
    node.textContent = `${sel}: predict the breaker state + which district tripped OPEN.`
  else if (state.level.id === "L2")
    node.textContent = `${sel}: advance the clock past cooldown, then predict the probe outcome.`
  else if (state.level.id === "L3")
    node.textContent = `${sel}: fire a burst, predict how many the bulkhead rejects.`
  else node.textContent = `${sel} will fail. Predict which districts KEEP serving.`
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Start wave", () => game.start())
    return
  }
  if (state.phase === "cleared" || state.phase === "failed") {
    if (state.phase === "failed") button(node, "retry", "Retry level", () => game.retry())
    if (state.phase === "cleared" && state.level.id !== "L4")
      button(node, "next", "Next level", () => game.nextLevel())
    return
  }
  // injecting — traffic injectors + advance-to-predict
  if (state.phase === "injecting") {
    button(node, "inject-failure", "Inject failure", () =>
      game.injectFailure(state.selectedDistrictId ?? state.level.districtIds[0] ?? ""),
    )
    button(node, "inject-success", "Inject success", () =>
      game.injectSuccess(state.selectedDistrictId ?? state.level.districtIds[0] ?? ""),
    )
    if (state.level.id === "L2") {
      button(node, "advance-clock", `+${state.level.cooldownMs}ms (cooldown)`, () =>
        game.advanceClock(state.level.cooldownMs + 1),
      )
    }
    button(node, "to-predict", "Predict", () => game.toPredicting())
    return
  }
  // predicting — level-specific prediction controls
  if (state.level.id === "L1") {
    for (const s of ["closed", "open", "half_open"] as CircuitState[]) {
      button(node, `pred-state-${s}`, `state: ${s}`, () =>
        game.predictTripState(s, s === "open" ? (state.selectedDistrictId ?? null) : null),
      )
    }
  } else if (state.level.id === "L2") {
    button(node, "probe-success", "probe succeeds → CLOSED", () =>
      game.predictProbeOutcome("success", "closed"),
    )
    button(node, "probe-failure", "probe fails → OPEN", () =>
      game.predictProbeOutcome("failure", "open"),
    )
  } else if (state.level.id === "L3") {
    button(node, "burst-5", "fire 5 requests", () =>
      game.predictBulkheadRejection(5, 5 - state.level.cap),
    )
    button(node, "burst-8", "fire 8 requests", () =>
      game.predictBulkheadRejection(8, 8 - state.level.cap),
    )
  } else {
    button(node, "cascade-predict", "Predict: all others keep serving", () =>
      game.predictCascade(state.level.districtIds.filter((id) => id !== state.selectedDistrictId)),
    )
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  state.districts.forEach((d, i) => {
    const row = document.createElement("button")
    const swatch = STATE_COLOR[d.breaker.state]
    row.dataset.testid = `district-${d.id}`
    const selected = state.selectedDistrictId === d.id ? " ●" : ""
    row.innerHTML =
      `<span class="swatch" style="background:${swatch}"></span>` +
      `<span class="swatch" style="background:${legendPalette(i)};opacity:.7"></span>` +
      ` ${d.id} · ${d.breaker.state} · ${d.inFlight}/${d.cap} in-flight${selected}`
    row.addEventListener("click", () => game.selectDistrict(d.id))
    node.append(row)
  })
  const hint = document.createElement("p")
  hint.className = "rule"
  hint.dataset.testid = "grid-readout"
  hint.textContent = `threshold ${state.level.failureThreshold} · cooldown ${state.level.cooldownMs}ms · ${state.districts.length} districts`
  node.append(hint)
}

function legendPalette(i: number): string {
  const P = ["#4fc3f7", "#ffb74d", "#aed581", "#f06292", "#ba68c8", "#ffd54f", "#80cbc4", "#e0e0e0"]
  return P[i % P.length] ?? "#e0e0e0"
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
