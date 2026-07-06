import type { GameController, GameState } from "../game/controller"
import { PALETTE } from "./relayScene"

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
    node.textContent = `Click every station you predict is CONNECTED (${state.predicted.size} selected), then submit.`
  else if (state.level.id === "L2")
    node.textContent = `A broadcast fires on "${state.broadcastChannel}". Click the stations that will RECEIVE it (${state.predicted.size} selected), then submit.`
  else if (state.level.id === "L3")
    node.textContent = `Heartbeat timeout ${state.level.timeoutMs}ms. Click the stations whose links SURVIVE the sweep (${state.predicted.size} selected), then submit.`
  else node.textContent = "A station was dropped. Click it to RECONNECT and rejoin the fan-out."
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
  if (state.level.id !== "L4") {
    button(node, "submit", "Submit prediction", () => game.submit())
    button(node, "clear", "Clear selection", () => {
      for (const id of [...state.predicted]) game.togglePredict(id)
    })
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  state.stations.forEach((s, i) => {
    const connected = state.state.clients.has(s.id)
    const row = document.createElement("button")
    row.dataset.testid = `station-${s.id}`
    const tint = s.channel === state.broadcastChannel && connected ? "●" : connected ? "○" : "✕"
    row.innerHTML =
      `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span> ` +
      `${s.id} ${tint} ${s.channel || "—"}`
    row.addEventListener("click", () => {
      if (state.level.id === "L4") {
        game.reconnect(s.id)
      } else if (state.phase === "predicting") {
        game.togglePredict(s.id)
      }
    })
    node.append(row)
  })
  const hint = document.createElement("p")
  hint.className = "incoming"
  hint.textContent = `broadcast channel: ${state.broadcastChannel} · now=${state.level.now}`
  node.append(hint)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
