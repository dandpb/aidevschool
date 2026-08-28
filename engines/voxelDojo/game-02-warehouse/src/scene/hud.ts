import { PALETTE } from "../../../shared/palette"
import type { GameController, GameState } from "../game/controller"

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
    <div class="status" data-testid="hud-status" role="status" aria-live="polite" aria-atomic="true"></div>
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
  if (state.phase === "briefing") node.textContent = "Pressione iniciar."
  else if (state.phase === "cleared") node.textContent = "Rodada concluída — evidência emitida."
  else if (state.phase === "failed")
    node.textContent = "Rodada não concluída — evidência emitida. Tentar novamente?"
  else if (state.level.id === "L1") {
    const key = state.keys[state.pendingIndex] ?? ""
    node.textContent = `Caixa ${state.pendingIndex + 1} de ${state.keys.length}: ${key} — clique na prateleira para a qual a chave é mapeada.`
  } else if (state.level.id === "L2") {
    const key = state.keys[state.crudIndex] ?? ""
    node.textContent = `sonda get ${state.crudIndex + 1} de ${state.keys.length}: ${key} — ela retorna o valor?`
  } else if (state.level.id === "L3" && state.crudIndex < state.keys.length) {
    const key = state.keys[state.crudIndex] ?? ""
    node.textContent = `sonda de decaimento ${state.crudIndex + 1} de ${state.keys.length}: ${key} — viva ou expirada?`
  } else if (state.level.id === "L3") {
    node.textContent = "As caixas decaíram. Quantas a varredura vai recuperar?"
  } else
    node.textContent =
      "Keyspace concentrado em uma prateleira. Ajuste a contagem de prateleiras e confirme."
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Iniciar rodada", () => game.start())
    return
  }
  if (state.phase === "cleared" || state.phase === "failed") {
    if (state.phase === "failed") button(node, "retry", "Tentar novamente", () => game.retry())
    if (state.phase === "cleared" && state.level.id !== "L4")
      button(node, "next", "Próximo nível", () => game.nextLevel())
    return
  }
  if (state.level.id === "L1") {
    const n = state.store.shelfCount
    for (let s = 0; s < n; s++) {
      button(node, `shelf-${s}`, `prateleira ${s}`, () => game.predictShelf(s))
    }
  }
  if (state.level.id === "L2" || state.level.id === "L3") {
    if (state.crudIndex < state.keys.length) {
      button(node, "get-alive", "viva (retorna valor)", () => game.answerGet(true))
      button(node, "get-missing", "ausente (null)", () => game.answerGet(false))
    } else if (state.level.id === "L3") {
      // swept-count prediction buttons: 0..keyCount
      for (let c = 0; c <= state.keys.length; c++) {
        button(node, `swept-${c}`, `varredura ${c}`, () => game.predictSwept(c))
      }
    }
  }
  if (state.level.id === "L4") {
    const label = document.createElement("label")
    const strengthLabel =
      state.store.hashStrength === "full" ? "completa" : `${state.store.hashStrength} caracteres`
    label.textContent = `força do hash: ${strengthLabel}`
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
    button(node, "lock-in", "Confirmar hash", () => game.lockIn())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  const loads = game.loads()
  for (let s = 0; s < state.store.shelfCount; s++) {
    const row = document.createElement("button")
    row.dataset.testid = `station-shelf-${s}`
    row.innerHTML = `<span class="swatch" style="background:${PALETTE[s % PALETTE.length]}"></span> prateleira ${s} · ${loads[s] ?? 0} caixas`
    row.addEventListener("click", () => {
      if (state.level.id === "L1" && state.phase === "predicting") game.predictShelf(s)
    })
    node.append(row)
  }
  const skew = document.createElement("p")
  skew.dataset.testid = "skew-readout"
  skew.textContent =
    state.store.entries.size > 0 ? `desequilíbrio de carga: ${game.currentSkew().toFixed(2)}` : ""
  node.append(skew)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
