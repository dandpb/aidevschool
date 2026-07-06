import type { GameController, GameState } from "../game/controller"
import { PALETTE } from "./warehouseScene"

/**
 * DOM HUD — briefing, controls per level, metrics. Reads sim state; dispatches controller commands.
 * L1: click a shelf to predict the pending crate's hashed shelf.
 * L2/L3: answer get-probes (alive vs missing/expired). L3 then predicts the swept count.
 * L4: dial the shelf count up to fix load skew, then lock in.
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
    const key = state.keys[state.pendingIndex] ?? ""
    node.textContent = `Crate ${state.pendingIndex + 1}/${state.keys.length}: ${key} — click the shelf its key hashes to.`
  } else if (state.level.id === "L2") {
    const key = state.keys[state.crudIndex] ?? ""
    node.textContent = `get probe ${state.crudIndex + 1}/${state.keys.length}: ${key} — does it return the value?`
  } else if (state.level.id === "L3" && state.crudIndex < state.keys.length) {
    const key = state.keys[state.crudIndex] ?? ""
    node.textContent = `decay probe ${state.crudIndex + 1}/${state.keys.length}: ${key} — alive or expired?`
  } else if (state.level.id === "L3") {
    node.textContent = "Crates have decayed. How many will the sweep reclaim?"
  } else node.textContent = "Hot keyspace skewing one shelf. Dial the shelf count up, then lock in."
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
    const n = state.store.shelfCount
    for (let s = 0; s < n; s++) {
      button(node, `shelf-${s}`, `shelf ${s}`, () => game.predictShelf(s))
    }
  }
  if (state.level.id === "L2" || state.level.id === "L3") {
    if (state.crudIndex < state.keys.length) {
      button(node, "get-alive", "alive (value)", () => game.answerGet(true))
      button(node, "get-missing", "missing (null)", () => game.answerGet(false))
    } else if (state.level.id === "L3") {
      // swept-count prediction buttons: 0..keyCount
      for (let c = 0; c <= state.keys.length; c++) {
        button(node, `swept-${c}`, `sweep ${c}`, () => game.predictSwept(c))
      }
    }
  }
  if (state.level.id === "L4") {
    const label = document.createElement("label")
    const strengthLabel =
      state.store.hashStrength === "full" ? "full" : `${state.store.hashStrength} chars`
    label.textContent = `hash strength: ${strengthLabel}`
    const slider = document.createElement("input")
    slider.type = "range"
    slider.min = "1"
    slider.max = String(state.level.maxStrength)
    slider.value =
      state.store.hashStrength === "full"
        ? String(state.level.maxStrength)
        : String(state.store.hashStrength)
    slider.dataset.testid = "strength-dial"
    slider.addEventListener("input", () => game.setHashStrength(Number(slider.value)))
    node.append(label, slider)
    button(node, "lock-in", "Lock in hash", () => game.lockIn())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  const loads = game.loads()
  for (let s = 0; s < state.store.shelfCount; s++) {
    const row = document.createElement("button")
    row.dataset.testid = `station-shelf-${s}`
    row.innerHTML = `<span class="swatch" style="background:${PALETTE[s % PALETTE.length]}"></span> shelf ${s} · ${loads[s] ?? 0} crates`
    row.addEventListener("click", () => {
      if (state.level.id === "L1" && state.phase === "predicting") game.predictShelf(s)
    })
    node.append(row)
  }
  const skew = document.createElement("p")
  skew.dataset.testid = "skew-readout"
  skew.textContent =
    state.store.entries.size > 0 ? `load skew: ${game.currentSkew().toFixed(2)}` : ""
  node.append(skew)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
