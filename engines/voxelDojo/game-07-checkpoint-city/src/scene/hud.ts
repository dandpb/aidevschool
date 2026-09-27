import type { GameController, GameState } from "../game/controller"
import type { PredictionTarget } from "../sim/levels"
import { PALETTE } from "./checkpointScene"

/** DOM HUD — briefing, prediction controls per level, metrics. Reads sim state. */
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

const TARGETS: PredictionTarget[] = ["reaches-handler", "logging", "auth", "rate-limit"]

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
  if (state.level.id === "L4") {
    if (state.level.reorder) {
      node.textContent =
        "Drag the wall order to logging → auth → rate-limit, then click a gate to predict the probe's reject point."
    }
    return
  }
  const pending = state.wave[state.pendingIndex]
  if (!pending) {
    node.textContent = "Resolving…"
    return
  }
  node.textContent = `Request ${state.pendingIndex + 1}/${state.wave.length}: ${pending.label}. Predict its gate.`
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
  // predicting
  if (state.level.id === "L4") {
    // reorder controls: show the current order with up/down buttons
    const head = document.createElement("p")
    head.className = "rule"
    head.textContent = "wall order (outer → inner):"
    node.append(head)
    state.order.forEach((name, i) => {
      const row = document.createElement("p")
      row.dataset.testid = `order-${i}`
      row.innerHTML = `<span class="swatch" style="background:${wallHex(name)}"></span>${i + 1}. ${name}`
      const up = document.createElement("button")
      up.dataset.testid = `move-${i}-up`
      up.textContent = "↑"
      up.addEventListener("click", () => game.moveLayer(i, i - 1))
      const down = document.createElement("button")
      down.dataset.testid = `move-${i}-down`
      down.textContent = "↓"
      down.addEventListener("click", () => game.moveLayer(i, i + 1))
      row.append(" ", up, down)
      node.append(row)
    })
    const hint = document.createElement("p")
    hint.className = "rule"
    hint.textContent = "Click a gate (in the scene or below) to predict the probe's reject point."
    node.append(hint)
  }
  // prediction buttons (one per target)
  for (const target of TARGETS) {
    button(node, `predict-${target}`, labelFor(target), () => game.predict(target))
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // gate buttons (also clickable predictions for accessibility when scene picking is hard)
  const head = document.createElement("p")
  head.className = "rule"
  head.textContent = "gates:"
  node.append(head)
  const gates: PredictionTarget[] = ["reaches-handler", "logging", "auth", "rate-limit"]
  for (const g of gates) {
    const b = document.createElement("button")
    b.dataset.testid = `gate-${g}`
    b.innerHTML = `<span class="swatch" style="background:${gateHex(g)}"></span>${labelFor(g)}`
    b.addEventListener("click", () => {
      if (state.level.id === "L4") {
        game.commitReorder(g)
      } else {
        game.predict(g)
      }
    })
    node.append(b)
  }
  // wall order summary
  const order = document.createElement("p")
  order.dataset.testid = "order-readout"
  order.textContent = `order: ${state.order.join(" → ")}`
  node.append(order)
}

function labelFor(t: PredictionTarget): string {
  if (t === "reaches-handler") return "reaches the handler"
  if (t === "rate-limit") return "rate-limit"
  return t
}

function wallHex(name: string): string {
  if (name === "logging") return PALETTE.logging
  if (name === "auth") return PALETTE.auth
  return PALETTE.rateLimit
}

function gateHex(t: PredictionTarget): string {
  if (t === "logging") return PALETTE.logging
  if (t === "auth") return PALETTE.auth
  if (t === "rate-limit") return PALETTE.rateLimit
  return PALETTE.citadel
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
