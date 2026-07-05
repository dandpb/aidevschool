import type { GameController, GameState } from "../game/controller"
import type { OrderEvent, OrderStatus } from "../sim/sourcing"

/** DOM HUD — briefing, per-level controls, metrics. Reads sim state; dispatches controller commands. */
export function mountHud(root: HTMLElement, game: GameController): void {
  root.innerHTML = `
    <h1 data-testid="hud-title"></h1>
    <p class="lesson" data-testid="hud-lesson"></p>
    <p class="rule" data-testid="hud-rule"></p>
    <div class="status" data-testid="hud-status"></div>
    <div class="controls" data-testid="hud-controls"></div>
    <div class="log" data-testid="hud-log"></div>
    <pre class="metrics" data-testid="hud-metrics"></pre>
  `
  const el = {
    title: q(root, "hud-title"),
    lesson: q(root, "hud-lesson"),
    rule: q(root, "hud-rule"),
    status: q(root, "hud-status"),
    controls: q(root, "hud-controls"),
    log: q(root, "hud-log"),
    metrics: q(root, "hud-metrics"),
  }

  game.subscribe((state) => {
    el.title.textContent = `${state.level.id} — ${state.level.title}`
    el.lesson.textContent = state.level.lesson
    el.rule.textContent = state.level.passRule
    renderStatus(el.status, state)
    renderControls(el.controls, state, game)
    renderLog(el.log, state, game)
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
    node.textContent = `Append step ${state.appendStep + 1}/6 — pick the next event to stack as a floor.`
  else if (state.level.id === "L2")
    node.textContent = "Fold the whole stack in order. Predict the order's final status."
  else if (state.level.id === "L3") {
    if (state.replayAtCheckpoint === null)
      node.textContent = `Rewind to floor ${state.checkpointIndex}. Predict the status there.`
    else node.textContent = "Now predict the status after a full replay."
  } else node.textContent = "Same stack, two views. Predict the order_status AND the shipment_list."
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
    const choices = game.appendChoices()
    for (const type of choices) {
      button(node, `append-${type}`, type, () => game.appendNext(type))
    }
  } else if (state.level.id === "L2") {
    for (const s of game.statusChoices())
      button(node, `status-${s}`, s, () => game.predictStatus(s as OrderStatus))
  } else if (state.level.id === "L3") {
    const pickFn =
      state.replayAtCheckpoint === null
        ? (s: OrderStatus) => game.predictAtCheckpoint(s)
        : (s: OrderStatus) => game.predictAfterReplay(s)
    const prefix = state.replayAtCheckpoint === null ? "at-checkpoint-" : "after-replay-"
    for (const s of game.statusChoices())
      button(node, `${prefix}${s}`, s, () => pickFn(s as OrderStatus))
  } else if (state.level.id === "L4") {
    const p = document.createElement("p")
    p.textContent = "order_status view:"
    node.append(p)
    for (const s of game.statusChoices())
      button(node, `status-${s}`, s, () => game.pickOrderStatus(s as OrderStatus))
    const p2 = document.createElement("p")
    p2.textContent = "shipment_list view — is this order shipped?"
    node.append(p2)
    button(node, "shipped-true", "yes (shipped)", () => game.pickShipped(true))
    button(node, "shipped-false", "no (not shipped)", () => game.pickShipped(false))
  }
}

function renderLog(node: HTMLElement, state: GameState, _game: GameController): void {
  node.innerHTML = ""
  const head = document.createElement("p")
  head.className = "rule"
  head.textContent = `event log (height ${state.log.length}):`
  node.append(head)
  state.log.forEach((event: OrderEvent, i: number) => {
    const row = document.createElement("div")
    row.dataset.testid = `floor-${i}`
    const marker = i === state.checkpointIndex ? " ◀ checkpoint" : ""
    row.textContent = `[${i}] ts=${event.ts}  ${event.type}${marker}`
    node.append(row)
  })
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.className = "choice"
  b.addEventListener("click", onClick)
  parent.append(b)
}
