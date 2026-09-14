import type { GameController, GameState } from "../game/controller"

/** DOM HUD — briefing, per-prompt controls, queue readouts. Reads sim state; dispatches controller commands. */
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
  const pending = state.pending
  if (state.queue.paused) {
    node.textContent = "Arms parked (P). The hopper keeps accepting — paused is not broken."
    return
  }
  if (pending?.kind === "dispatch") {
    node.textContent = "An arm is idle: click the ingot it will grab next."
    return
  }
  if (pending?.kind === "classify") {
    node.textContent = `Arm opened ${pending.task.id} (${pending.task.kind}): retry rack or scrap chute?`
    return
  }
  if (pending?.kind === "gate") {
    node.textContent =
      pending.reason === "full"
        ? "Hopper FULL — reject the forklift (R, 429) or it overflows."
        : "Duplicate sigil — reject the forklift (R) or the duplicate is enqueued."
    return
  }
  node.textContent = "Forge running…"
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Start wave", () => game.start())
    return
  }
  if (state.phase === "cleared" || state.phase === "failed") {
    if (state.phase === "failed") button(node, "retry", "Retry level", () => game.retry())
    if (state.phase === "cleared" && state.level.id !== "L4") {
      button(node, "next", "Next level", () => game.nextLevel())
    }
    return
  }
  button(node, "pause", state.queue.paused ? "Resume arms (P)" : "Park arms (P)", () =>
    game.togglePause(),
  )
  const pending = state.pending
  if (pending?.kind === "gate") {
    button(node, "reject", "Reject (R)", () => game.rejectInbound())
    button(node, "admit", "Let it in", () => game.admitInbound())
  }
  if (pending?.kind === "classify") {
    button(node, "classify-retry", "Annealing rack (retry)", () =>
      game.classifyRetry(pending.task.id),
    )
    button(node, "classify-dlq", "Scrap chute (DLQ)", () => game.classifyDlq(pending.task.id))
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  const depth = document.createElement("p")
  depth.dataset.testid = "queue-depth"
  depth.textContent = `hopper: ${game.queueDepthNow()}/${state.queue.capacity} (${game.backpressureNow()}) · arms busy: ${game.runningNow()}/${state.queue.workers.length}`
  node.append(depth)

  const pending = state.pending
  if (pending?.kind === "dispatch") {
    for (const t of pending.candidates) {
      const row = document.createElement("button")
      row.dataset.testid = `ingot-${t.id}`
      row.textContent = `${t.id} · p${t.priority} · ${t.kind}${t.scheduledFor > state.queue.now ? " · ring" : ""}`
      row.addEventListener("click", () => game.predictDispatch(t.id))
      node.append(row)
    }
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
