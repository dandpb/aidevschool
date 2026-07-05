import type { GameController, GameState } from "../game/controller"

/** DOM HUD — briefing, per-level controls, metrics. Reads sim state; dispatches controller commands. */
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
    renderStatus(el.status, state, game)
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

function renderStatus(node: HTMLElement, state: GameState, game: GameController): void {
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
  const quorum = game.quorumRequired()
  if (state.level.id === "L1") {
    const committed = state.committedValue !== null
    node.textContent = committed
      ? `COMMITTED — quorum (${quorum}) reached. Lock in your prediction.`
      : `Acks: ${state.ackedNodeIds.length}/${state.level.clusterSize}. Commit flashes at ${quorum}. Click lighthouses to ack.`
  } else if (state.level.id === "L2") {
    node.textContent =
      state.committedValue !== null
        ? "Committed — watch the buoys. Lock in your predicted watcher set."
        : `Click lighthouses to reach quorum (${quorum}), then pick which watchers light up.`
  } else if (state.level.id === "L3") {
    const left = game.currentPartition().side.length
    const right = game.currentPartition().other.length
    node.textContent = `Split: left=${left}, right=${right}, quorum=${quorum}. Which side can commit?`
  } else {
    node.textContent =
      "Partition healed. Click the stale node(s) to sync them to the committed value."
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
    const quorum = game.quorumRequired()
    const p = document.createElement("p")
    p.textContent = "How many acks does it take to commit?"
    node.append(p)
    for (let v = 1; v <= state.level.clusterSize; v++) {
      const chosen = state.predictedQuorum === v
      button(
        node,
        `quorum-${v}`,
        `${v} acks${chosen ? " ✓" : ""}`,
        () => game.setPredictedQuorum(v),
        chosen,
      )
    }
    button(node, "resolve", `Commit & lock in (need ${quorum})`, () => game.resolve())
  } else if (state.level.id === "L2") {
    button(node, "resolve", "Lock in watcher prediction", () => game.resolve())
  } else if (state.level.id === "L3") {
    button(
      node,
      "side-left",
      "Left can commit",
      () => game.setPredictedSide("left"),
      state.predictedSide === "left",
    )
    button(
      node,
      "side-right",
      "Right can commit",
      () => game.setPredictedSide("right"),
      state.predictedSide === "right",
    )
    button(node, "resolve", "Lock in", () => game.resolve())
  } else {
    button(node, "resolve", "Lock in sync", () => game.resolve())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  const acked = new Set(state.ackedNodeIds)
  for (let i = 0; i < state.level.clusterSize; i++) {
    const id = `lh-${i}`
    const isAcked = acked.has(id)
    const isWatcher = id in state.level.watchers
    const row = document.createElement("button")
    row.dataset.testid = `node-${id}`
    const tags = [
      isAcked ? '<span class="ack">ack</span>' : "",
      isWatcher ? '<span class="ack">watch</span>' : "",
    ]
      .filter(Boolean)
      .join(" ")
    row.innerHTML = `${id} ${tags}`
    row.addEventListener("click", () => {
      if (state.level.id === "L1" || state.level.id === "L2") game.ackNode(id)
      if (state.level.id === "L2") game.togglePredictedWatcher(id)
      if (state.level.id === "L4") game.toggleSynced(id)
    })
    node.append(row)
  }
  if (state.committedValue !== null) {
    const c = document.createElement("p")
    c.className = "ack"
    c.textContent = `✓ COMMITTED: ${state.level.key}=${state.committedValue}`
    node.append(c)
  }
  if (state.phase === "predicting" && state.level.id === "L3") {
    const p = document.createElement("p")
    p.dataset.testid = "partition-readout"
    const left = game.currentPartition().side.length
    const right = game.currentPartition().other.length
    p.textContent = `partition: left=${left} right=${right} | left_can_commit=${game.sideCanCommit("left")}`
    node.append(p)
  }
}

function button(
  parent: HTMLElement,
  testId: string,
  label: string,
  onClick: () => void,
  on = false,
): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  if (on) b.classList.add("on")
  b.addEventListener("click", onClick)
  parent.append(b)
}
