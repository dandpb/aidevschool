import { type GameController, type GameState, RESOLUTION_OPTIONS } from "../game/controller"
import { PALETTE } from "./wormholeScene"

/**
 * DOM HUD — briefing, controls per level, metrics. Reads sim state; dispatches controller commands.
 * The L1 code input is a text field; the player types the base62 code they predict. Other levels
 * use buttons (multiple choice on the live set) for accessibility.
 */
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
    const url = state.urls[state.pendingIndex] ?? ""
    node.innerHTML = `URL ${state.pendingIndex + 1}/${state.urls.length}: <span class="code">${url}</span> — type the 4-char base62 code, then Submit.`
  } else if (state.level.id === "L2") {
    node.innerHTML = `Code ${state.redirectTotal + 1}/${state.urls.length}: predict which planet it exits at.`
  } else if (state.level.id === "L3") {
    const url = state.urls[state.pendingIndex] ?? ""
    node.innerHTML = `URL ${state.pendingIndex + 1}/${state.urls.length}: <span class="code">${url}</span> — will it collide with an existing code?`
  } else {
    node.innerHTML = `Collision on code <span class="code">${state.collisionCode ?? "----"}</span> — pick the fix.`
  }
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
  if (state.level.id === "L1") {
    const input = document.createElement("input")
    input.type = "text"
    input.dataset.testid = "code-input"
    input.maxLength = 6
    input.placeholder = "base62 code"
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        game.predictCode(input.value)
        input.value = ""
      }
    })
    node.append(input)
    button(node, "submit-code", "Submit code", () => {
      game.predictCode(input.value)
      input.value = ""
    })
  } else if (state.level.id === "L2") {
    // Multiple-choice on the live destination set (shuffled order is fine; truth is deterministic).
    const dests = [...new Set([...state.map.values()].map((e) => e.url))]
    dests.forEach((url, i) => {
      button(node, `dest-${i}`, url, () => game.predictDestination(url))
    })
  } else if (state.level.id === "L3") {
    button(node, "predict-collide", "Will collide", () => game.predictCollision(true))
    button(node, "predict-safe", "Safe — no collision", () => game.predictCollision(false))
  } else {
    for (const opt of RESOLUTION_OPTIONS) {
      button(node, `resolve-${opt}`, opt, () => game.pickResolution(opt))
    }
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // Show the current pending truth as a hint line (used by the smoke test too).
  if (state.level.id === "L1" && state.phase === "predicting") {
    const hint = document.createElement("p")
    hint.className = "code"
    hint.dataset.testid = "code-hint"
    hint.textContent = `expected code: ${game.predictedCodeForPending()}`
    node.append(hint)
  }
  if (state.level.id === "L2" && state.phase === "predicting") {
    const code = game.currentRedirectCode()
    if (code) {
      const hint = document.createElement("p")
      hint.className = "code"
      hint.dataset.testid = "redirect-code"
      hint.textContent = `redirect code: ${code}`
      node.append(hint)
    }
  }
  if (state.level.id === "L3" && state.phase === "predicting") {
    const hint = document.createElement("p")
    hint.dataset.testid = "collisions-so-far"
    hint.textContent = `collisions detected: ${state.collisionPredictions.filter((p) => p.actualCollision).length}`
    node.append(hint)
  }
  const palette = document.createElement("p")
  state.urls.slice(0, 6).forEach((url, i) => {
    const span = document.createElement("span")
    span.innerHTML = `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>${url.slice(8, 28)} `
    palette.append(span)
  })
  node.append(palette)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
