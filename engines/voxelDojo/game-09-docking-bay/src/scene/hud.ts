import type { GameController, GameState } from "../game/controller"
import { HOST_CONTRACT } from "../sim/levels"
import { PALETTE } from "./dockingScene"

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
  else if (state.level.id === "L1") {
    const done = state.dockPredictions.size
    node.textContent = `Pod ${done + 1}/${state.pods.length}: predict dock (✓) or clamp-reject (✗).`
  } else if (state.level.id === "L2") {
    const done = state.mismatchPredictions.size
    node.textContent = `Pod ${done + 1}/${state.pods.length}: pick the missing contract method.`
  } else if (state.level.id === "L3")
    node.textContent = "For each invoked method, predict allow (inside bubble) or block."
  else node.textContent = "Toggle the minimal capability set, then lock in."
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
  if (state.level.id === "L4") {
    const chosen = new Set(state.chosenCapabilities)
    for (const cap of HOST_CONTRACT) {
      button(node, `cap-${cap}`, `${cap}${chosen.has(cap) ? " ✓" : ""}`, () =>
        game.toggleCapability(cap),
      )
    }
    button(node, "lock-in", "Lock in capability set", () => game.lockInCapabilities())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.level.id === "L1") {
    state.pods.forEach((pod, i) => {
      const row = document.createElement("div")
      row.className = "pod-row"
      row.dataset.testid = `pod-${pod.id}`
      const swatch = `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>`
      row.innerHTML = `${swatch} ${pod.id} · claims [${pod.claimsContract.join(", ")}]`
      const dock = document.createElement("button")
      dock.dataset.testid = `dock-yes-${pod.id}`
      dock.textContent = "✓ dock"
      dock.addEventListener("click", () => game.predictDock(pod.id, true))
      const reject = document.createElement("button")
      reject.dataset.testid = `dock-no-${pod.id}`
      reject.textContent = "✗ reject"
      reject.addEventListener("click", () => game.predictDock(pod.id, false))
      const wrap = document.createElement("div")
      wrap.append(row, dock, reject)
      node.append(wrap)
    })
  } else if (state.level.id === "L2") {
    state.pods.forEach((pod, i) => {
      const label = document.createElement("div")
      label.className = "pod-row"
      label.dataset.testid = `pod-${pod.id}`
      label.innerHTML = `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span> ${pod.id} · claims [${pod.claimsContract.join(", ")}]`
      node.append(label)
      for (const m of [...HOST_CONTRACT, "none"] as const) {
        button(node, `missing-${pod.id}-${m}`, m, () => game.predictMissing(pod.id, m))
      }
    })
  } else if (state.level.id === "L3" && state.probe) {
    const cap = state.probe.sandboxCap.join(", ") || "(none)"
    const intro = document.createElement("p")
    intro.textContent = `docked pod cap: [${cap}]`
    node.append(intro)
    for (const m of state.probe.invokedMethods) {
      button(node, `allow-${m}`, `${m}: allow`, () => game.classifyInvoke(m, true))
      button(node, `block-${m}`, `${m}: block`, () => game.classifyInvoke(m, false))
    }
  } else if (state.level.id === "L4" && state.scenario) {
    const intro = document.createElement("p")
    intro.textContent = `required calls: [${state.scenario.requiredCalls.join(", ")}]`
    node.append(intro)
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
