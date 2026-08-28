import { PALETTE } from "../../../shared/palette"
import { type GameController, type GameState, RESOLUTION_OPTIONS } from "../game/controller"

/**
 * DOM HUD — briefing, controls per level, metrics. Reads sim state; dispatches controller commands.
 * The L1 code input is a text field; the player types the base62 code they predict. Other levels
 * use buttons (multiple choice on the live set) for accessibility.
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
  else if (state.level.id === "L1") {
    const url = state.urls[state.pendingIndex] ?? ""
    node.innerHTML = `URL ${state.pendingIndex + 1} de ${state.urls.length}: <span class="code">${url}</span> — digite o código base62 e envie.`
  } else if (state.level.id === "L2") {
    node.innerHTML = `Código ${state.redirectTotal + 1} de ${state.urls.length}: preveja em qual planeta ele sai.`
  } else if (state.level.id === "L3") {
    const url = state.urls[state.pendingIndex] ?? ""
    node.innerHTML = `URL ${state.pendingIndex + 1} de ${state.urls.length}: <span class="code">${url}</span> — vai colidir com um código existente?`
  } else {
    node.innerHTML = `Colisão no código <span class="code">${state.collisionCode ?? "----"}</span> — escolha a correção.`
  }
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
  if (state.level.id === "L1") {
    const input = document.createElement("input")
    input.type = "text"
    input.dataset.testid = "code-input"
    input.maxLength = 6
    input.placeholder = "código base62"
    input.setAttribute("aria-label", "código base62 previsto")
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        game.predictCode(input.value)
        input.value = ""
      }
    })
    node.append(input)
    button(node, "submit-code", "Enviar código", () => {
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
    button(node, "predict-collide", "Vai colidir", () => game.predictCollision(true))
    button(node, "predict-safe", "Seguro — sem colisão", () => game.predictCollision(false))
  } else {
    for (const opt of RESOLUTION_OPTIONS) {
      button(node, `resolve-${opt}`, RESOLUTION_LABELS[opt], () => game.pickResolution(opt))
    }
  }
}

const RESOLUTION_LABELS: Record<(typeof RESOLUTION_OPTIONS)[number], string> = {
  salted: "Re-salgar (novo código)",
  increment: "Incrementar (próximo código livre)",
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // Show the current pending truth as a hint line (used by the smoke test too).
  if (state.level.id === "L1" && state.phase === "predicting") {
    const hint = document.createElement("p")
    hint.className = "code"
    hint.dataset.testid = "code-hint"
    hint.textContent = `código esperado: ${game.predictedCodeForPending()}`
    node.append(hint)
  }
  if (state.level.id === "L2" && state.phase === "predicting") {
    const code = game.currentRedirectCode()
    if (code) {
      const hint = document.createElement("p")
      hint.className = "code"
      hint.dataset.testid = "redirect-code"
      hint.textContent = `código de redirecionamento: ${code}`
      node.append(hint)
    }
  }
  if (state.level.id === "L3" && state.phase === "predicting") {
    const hint = document.createElement("p")
    hint.dataset.testid = "collisions-so-far"
    hint.textContent = `colisões detectadas: ${state.collisionPredictions.filter((p) => p.actualCollision).length}`
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
