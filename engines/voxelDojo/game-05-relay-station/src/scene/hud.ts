import { PALETTE } from "../../../shared/palette"
import type { GameController, GameState } from "../game/controller"

/**
 * DOM HUD — briefing, controls per level, metrics. Reads sim state; dispatches controller commands.
 * Copy é PT-BR, alinhada ao vocabulário da projeção acessível (src/scene/accessible.ts).
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
  // Bloqueios urgentes usam role="alert"; demais mudanças são anunciadas educadamente.
  node.setAttribute("role", state.phase === "failed" ? "alert" : "status")
  if (state.phase === "briefing") node.textContent = "Pronto para iniciar."
  else if (state.phase === "cleared") node.textContent = "Missão concluída; evidência emitida."
  else if (state.phase === "failed")
    node.textContent = "Critério ainda não atendido; tente novamente."
  else if (state.level.id === "L1")
    node.textContent = `Clique em toda estação que você prevê estar CONECTADA (${state.predicted.size} selecionadas), depois envie.`
  else if (state.level.id === "L2")
    node.textContent = `Um broadcast dispara em "${state.broadcastChannel}". Clique nas estações que vão RECEBÊ-LO (${state.predicted.size} selecionadas), depois envie.`
  else if (state.level.id === "L3")
    node.textContent = `Timeout de heartbeat de ${state.level.timeoutMs}ms. Clique nas estações cujos elos SOBREVIVEM à varredura (${state.predicted.size} selecionadas), depois envie.`
  else node.textContent = "Uma estação caiu. Clique nela para RECONECTAR e voltar à difusão."
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Iniciar onda", () => game.start())
    return
  }
  if (state.phase === "cleared" || state.phase === "failed") {
    if (state.phase === "failed") button(node, "retry", "Tentar novamente", () => game.retry())
    if (state.phase === "cleared" && state.level.id !== "L4")
      button(node, "next", "Próximo nível", () => game.nextLevel())
    return
  }
  if (state.level.id !== "L4") {
    button(node, "submit", "Enviar previsão", () => game.submit())
    button(node, "clear", "Limpar seleção", () => {
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
  hint.textContent = `canal de broadcast: ${state.broadcastChannel} · agora=${state.level.now}`
  node.append(hint)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
