import { CONTRAST_OPTIONS, type GameController, type GameState } from "../game/controller"
import { PALETTE } from "./ringScene"

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
    el.metrics.textContent = state.lastMetrics ? JSON.stringify(state.lastMetrics, null, 2) : ""
  })
}

function q(root: HTMLElement, id: string): HTMLElement {
  const node = root.querySelector(`[data-testid="${id}"]`)
  if (!node) throw new Error(`missing hud node ${id}`)
  return node as HTMLElement
}

function renderStatus(node: HTMLElement, state: GameState): void {
  if (state.phase === "briefing") node.textContent = "Press start."
  else if (state.phase === "cleared") node.textContent = "Wave cleared — evidence emitted."
  else if (state.phase === "failed") node.textContent = "Wave failed — evidence emitted. Retry?"
  else if (state.level.id === "L1")
    node.textContent = `Key ${state.pendingKeyIndex + 1}/${state.keys.length}: ${state.keys[state.pendingKeyIndex] ?? ""} — click the station you predict owns it.`
  else if (state.level.id === "L2")
    node.textContent =
      "A new station is joining. Click the station you predict loses the most keys."
  else if (state.level.id === "L3")
    node.textContent = "Dial virtual nodes until the load evens out, then lock in."
  else node.textContent = "Modulo storm incoming. Answer both questions to resolve it."
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
  if (state.level.id === "L3") {
    const label = document.createElement("label")
    label.textContent = `virtual nodes: ${state.stations[0]?.vnodes ?? 1}`
    const slider = document.createElement("input")
    slider.type = "range"
    slider.min = "1"
    slider.max = "64"
    slider.value = String(state.stations[0]?.vnodes ?? 1)
    slider.dataset.testid = "vnode-dial"
    slider.addEventListener("input", () => game.setVnodes(Number(slider.value)))
    node.append(label, slider)
    button(node, "lock-in", "Lock in topology", () => game.lockIn())
  }
  if (state.level.id === "L4") {
    for (const mode of ["consistent", "modulo"] as const) {
      const p = document.createElement("p")
      p.textContent = `In ${mode} mode, adding a 5th station moves about:`
      node.append(p)
      for (const opt of CONTRAST_OPTIONS) {
        const chosen = state.contrastAnswers[mode] === opt
        button(
          node,
          `contrast-${mode}-${opt}`,
          `${Math.round(opt * 100)}%${chosen ? " ✓" : ""}`,
          () => game.answerContrast(mode, opt),
        )
      }
    }
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  const loads = game.loads()
  state.stations.forEach((s, i) => {
    const row = document.createElement("button")
    row.dataset.testid = `station-${s.id}`
    row.innerHTML = `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span> ${s.id} · ${loads.get(s.id) ?? 0} keys`
    row.addEventListener("click", () => {
      if (state.level.id === "L1") game.predictOwner(s.id)
      if (state.level.id === "L2") game.predictLoser(s.id)
    })
    node.append(row)
  })
  if (state.incoming && state.phase === "predicting") {
    const hint = document.createElement("p")
    hint.className = "incoming"
    hint.textContent = `incoming: ${state.incoming.id}`
    node.append(hint)
  }
  const skew = document.createElement("p")
  skew.dataset.testid = "skew-readout"
  skew.textContent = state.assignment.size > 0 ? `load skew: ${game.currentSkew().toFixed(2)}` : ""
  node.append(skew)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
