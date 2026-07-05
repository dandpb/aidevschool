import type { GameController, GameState } from "../game/controller"
import type { Policy } from "../sim/balancer"
import { PALETTE } from "./airScene"

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
  const req = state.requests[state.pendingIndex]
  const idx = state.pendingIndex + 1
  const total = state.requests.length
  node.textContent = `Ship ${idx}/${total}${req ? ` (${req.id})` : ""} — policy: ${state.policy}. Click the pad you predict it lands on.`
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
  if (state.level.probesEnabled) {
    button(node, "probe", "Fire health probe", () => {
      game.fireProbe()
    })
  }
  if (state.level.policySwitchEnabled) {
    const label = document.createElement("p")
    label.textContent = `policy: ${state.policy}`
    node.append(label)
    for (const p of ["round_robin", "least_connections", "random"] as Policy[]) {
      const chosen = state.policy === p
      button(node, `policy-${p}`, `${p}${chosen ? " ✓" : ""}`, () => game.setPolicy(p))
    }
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  state.backends.forEach((b, i) => {
    const row = document.createElement("button")
    row.dataset.testid = `pad-${b.id}`
    const revealed = state.revealed.has(b.id)
    const health = revealed ? b.health : "?"
    const color = PALETTE[i % PALETTE.length]
    row.innerHTML = `<span class="swatch" style="background:${color}"></span> ${b.id} · conn ${b.connections} · routed ${b.routed} · health ${health}`
    row.addEventListener("click", () => {
      if (state.phase === "predicting") game.predictPad(b.id)
    })
    node.append(row)
  })
  const skew = document.createElement("p")
  skew.dataset.testid = "skew-readout"
  skew.textContent = `load skew: ${game.currentSkew().toFixed(2)} · errors: ${game.errors()}`
  node.append(skew)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
