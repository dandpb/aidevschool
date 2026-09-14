import type { GameController, GameState } from "../game/controller"

/**
 * DOM HUD — briefing, controls, gauges, metrics. Reads sim state; dispatches
 * controller commands. Buttons mirror the scene interactions so the wave is
 * fully playable without WebGL (accessibility + smoke). Copy é PT-BR,
 * alinhada à projeção acessível (src/scene/accessible.ts).
 */
export function mountHud(root: HTMLElement, game: GameController): void {
  root.innerHTML = `
    <h1 data-testid="hud-title"></h1>
    <p class="lesson" data-testid="hud-lesson"></p>
    <p class="rule" data-testid="hud-rule"></p>
    <div class="status" data-testid="hud-status" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="controls" data-testid="hud-controls"></div>
    <div class="gauges" data-testid="hud-gauges"></div>
    <pre class="metrics" data-testid="hud-metrics"></pre>
  `
  const el = {
    title: q(root, "hud-title"),
    lesson: q(root, "hud-lesson"),
    rule: q(root, "hud-rule"),
    status: q(root, "hud-status"),
    controls: q(root, "hud-controls"),
    gauges: q(root, "hud-gauges"),
    metrics: q(root, "hud-metrics"),
  }

  game.subscribe((state) => {
    el.title.textContent = `${state.level.id} — TASK FORGE: ${state.level.title}`
    el.lesson.textContent = state.level.lesson
    el.rule.textContent = state.level.passRule
    renderStatus(el.status, state)
    renderControls(el.controls, state, game)
    renderGauges(el.gauges, state)
    el.metrics.textContent = state.lastMetrics ? JSON.stringify(state.lastMetrics, null, 2) : ""
  })
}

function q(root: HTMLElement, id: string): HTMLElement {
  const node = root.querySelector(`[data-testid="${id}"]`)
  if (!node) throw new Error(`missing hud node ${id}`)
  return node as HTMLElement
}

function renderStatus(node: HTMLElement, state: GameState): void {
  node.setAttribute("role", state.phase === "failed" ? "alert" : "status")
  if (state.phase === "briefing") {
    node.textContent = "Pronto para iniciar."
    return
  }
  if (state.phase === "cleared") {
    node.textContent = "Onda concluída; evidência emitida."
    return
  }
  if (state.phase === "failed") {
    node.textContent = "Critério do contrato não atendido; tente novamente."
    return
  }
  if (state.inbound) {
    const dup = state.inbound.idempotencyKey.startsWith("sigil-") === false
    node.innerHTML = `Empilhadeira <span class="code">${state.inbound.id}</span> (prio ${state.inbound.priority}${dup ? ", SIGILO DUPLICADO" : ""}) está ancorando — R rejeita (429).`
    return
  }
  node.textContent = state.status
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Acender a forja", () => game.start())
    return
  }
  if (state.phase === "cleared" || state.phase === "failed") {
    if (state.phase === "failed") button(node, "retry", "Tentar novamente", () => game.retry())
    if (state.phase === "cleared" && state.level.id !== "L4")
      button(node, "next", "Próximo nível", () => game.nextLevel())
    return
  }

  // R — reject the docking forklift
  if (state.inbound)
    button(node, "reject-inbound", "R — rejeitar empilhadeira (429)", () => game.rejectInbound())

  // classification of the oldest finished ingot
  const head = state.finished[0]
  if (head) {
    button(node, "classify-retry", "Rack de têmpera (retry)", () => game.classifyRetry())
    button(node, "classify-dlq", "Calha de sucata (DLQ)", () => game.classifyDlq())
  }

  // dispatch prediction: one button per eligible hopper ingot
  for (const task of state.queue) {
    if (task.scheduledFor > state.now) continue
    button(node, `pick-${task.id}`, `${task.id} (prio ${task.priority})`, () =>
      game.predictDispatch(task.id),
    )
  }

  // P — pause/resume workers
  button(node, "toggle-pause", state.paused ? "P — religar braços" : "P — estacionar braços", () =>
    game.togglePause(),
  )
}

function renderGauges(node: HTMLElement, state: GameState): void {
  if (state.phase === "briefing") {
    node.innerHTML = ""
    return
  }
  const waiting = state.queue.filter((t) => t.scheduledFor > state.now).length
  node.innerHTML = `
    <p data-testid="gauge-queue">funil: ${state.queue.length}/${state.level.capacity}${state.queue.length >= state.level.capacity ? " (CHEIO — 429 na próxima)" : ""}</p>
    <p data-testid="gauge-busy">braços: ${state.running.length}/${state.level.workerCount}${state.paused ? " (estacionados)" : ""}</p>
    <p data-testid="gauge-rack">rack: ${waiting} aguardando backoff</p>
    <p data-testid="gauge-out">sucesso: ${state.succeededIds.length} · DLQ: ${state.dlqIds.length}</p>
  `
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
