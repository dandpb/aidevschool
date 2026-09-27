import type { GameController, GameState } from "../game/controller"
import { PALETTE } from "./deltaScene"

/** DOM HUD — briefing, status per level, source/filter/trace controls, metrics. */
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
    el.metrics.textContent = state.lastMetrics ? JSON.stringify(state.lastMetrics, null, 2) : ""
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
  // predicting
  if (state.level.id === "L1") {
    const cur = state.prompts[state.promptIndex]
    node.textContent = `Log ${state.promptIndex + 1}/${state.prompts.length}: ${cur ?? ""} — click the tributary it entered from.`
    return
  }
  if (state.level.id === "L2") {
    const cur = state.prompts[state.promptIndex]
    node.textContent = `Log ${state.promptIndex + 1}/${state.prompts.length}: ${cur ?? ""} — does it pass the filter stage?`
    return
  }
  if (state.level.id === "L3") {
    node.textContent =
      state.injectSource === null
        ? "Click a headwater to INJECT dye (correlation id) there."
        : `Dye injected at ${state.injectSource}. Toggle the tributaries the dyed request will reach, then lock in.`
    return
  }
  node.textContent = `Trace id: ${state.level.traceId}. Click logs to collect them into the trace, then lock in.`
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
  // L2: pass/drop buttons for the current prompt
  if (state.level.id === "L2") {
    button(node, "filter-pass", "Passes filter", () => game.predictFilter(true))
    button(node, "filter-drop", "Dropped at filter", () => game.predictFilter(false))
    return
  }
  // L3: lock in the dye path
  if (state.level.id === "L3" && state.injectSource !== null) {
    button(node, "lock-in", "Lock in dye path", () => game.lockInDyePath())
    return
  }
  // L4: lock in the collected trace
  if (state.level.id === "L4") {
    button(node, "lock-in", "Lock in trace", () => game.lockInTrace())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // sources
  const head = document.createElement("p")
  head.className = "prompt"
  head.textContent = `tributaries${state.injectSource ? ` · dye at ${state.injectSource}` : ""}`
  node.append(head)
  state.level.sources.forEach((s, i) => {
    const row = document.createElement("button")
    row.dataset.testid = `source-${s}`
    const isDyePredicted = state.predictedDyeSources.includes(s)
    const tag = state.injectSource === s ? " · DYE SRC" : isDyePredicted ? " · predicted" : ""
    row.innerHTML = `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span> ${s}${tag}`
    row.addEventListener("click", () => {
      if (state.level.id === "L1") game.predictSource(s)
      if (state.level.id === "L3") {
        if (state.injectSource === null) game.injectDye(s)
        else game.togglePredictedDyeSource(s)
      }
    })
    node.append(row)
  })

  // L4: log list for collecting the trace
  if (state.level.id === "L4" && state.phase === "predicting") {
    const logsHead = document.createElement("p")
    logsHead.className = "prompt"
    logsHead.textContent = `logs (click to add to trace · collected: ${state.collectedLogIds.length})`
    node.append(logsHead)
    for (const log of state.logs) {
      const row = document.createElement("button")
      row.dataset.testid = `log-${log.logId}`
      const on = state.collectedLogIds.includes(log.logId)
      const dyed = log.correlationId === state.level.traceId
      row.innerHTML = `${log.logId} <span class="rule">[${log.source}]</span>${dyed ? ' <span class="dyed">dyed</span>' : ""}${on ? " ✓" : ""}`
      row.addEventListener("click", () => game.toggleCollectedLog(log.logId))
      node.append(row)
    }
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
