import type { GameController, GameState } from "../game/controller"
import { PALETTE } from "./freightScene"

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
  else if (state.level.id === "L1")
    node.textContent = state.pendingKey
      ? `Incoming freight car key "${state.pendingKey.key}" (${state.pendingKey.index + 1}/${state.routeKeys.length}) — click the lane you predict it lands on.`
      : "Routing freight…"
  else if (state.level.id === "L2") node.textContent = "Click a lane, then assign it to a crew."
  else if (state.level.id === "L3")
    node.textContent = `A crew is ${state.level.event === "join" ? "joining" : "leaving"}. Predict the new owner of each lane, then resolve.`
  else
    node.textContent = "Pick a rewind point on the lane, mark the cars that replay, then resolve."
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
  if (state.level.id === "L2") {
    button(node, "auto-assign", "Auto-assign (round-robin)", () => game.autoAssign())
    button(node, "lock-in", "Lock in assignment", () => game.lockInAssignment())
  }
  if (state.level.id === "L3") {
    button(node, "resolve-rebalance", "Resolve rebalance", () => game.resolveRebalance())
  }
  if (state.level.id === "L4") {
    const label = document.createElement("label")
    label.textContent = `rewind to offset: ${state.replayRewindTo}`
    const slider = document.createElement("input")
    slider.type = "range"
    const maxTail = Math.max(1, ...game.laneTails())
    slider.min = "0"
    slider.max = String(Math.max(0, maxTail - 1))
    slider.value = String(state.replayRewindTo)
    slider.dataset.testid = "rewind-dial"
    slider.addEventListener("input", () => game.setRewindTo(Number(slider.value)))
    node.append(label, slider)
    button(node, "resolve-replay", "Resolve replay", () => game.resolveReplay())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // lanes + tails
  const tails = game.laneTails()
  for (let p = 0; p < state.level.partitionCount; p++) {
    const row = document.createElement("button")
    row.dataset.testid = `lane-${p}`
    const owner = state.group.assignment.get(p)
    const crewIdx = state.group.consumers.findIndex((c) => c.id === owner)
    const swatch = PALETTE[crewIdx >= 0 ? crewIdx % PALETTE.length : p % PALETTE.length]
    row.innerHTML = `<span class="swatch" style="background:${swatch}"></span> lane ${p} · ${tails[p] ?? 0} cars${owner ? ` · owner ${owner}` : ""}`
    row.addEventListener("click", () => {
      if (state.level.id === "L1") game.predictRoute(p)
      // L2/L3 lane assignment is driven by the crew buttons below
    })
    node.append(row)
  }
  // crews (L2/L3): click a crew to assign the selected lane, or predict its new ownership
  for (const c of state.group.consumers) {
    const crewIdx = state.group.consumers.findIndex((x) => x.id === c.id)
    const row = document.createElement("button")
    row.dataset.testid = `crew-${c.id}`
    row.innerHTML = `<span class="swatch" style="background:${PALETTE[crewIdx % PALETTE.length]}"></span> ${c.id}`
    row.addEventListener("click", () => {
      if (state.phase !== "predicting") return
      if (state.level.id === "L2") {
        // round-robin-assign the next unassigned lane to this crew; simple click flow
        const nextLane = nextLaneFor(state, (p) => state.draftAssignment.get(p) === undefined) ?? 0
        game.assignLane(nextLane, c.id)
      }
    })
    node.append(row)
  }
  if (state.phase === "predicting" && state.level.id === "L3") {
    const hint = document.createElement("p")
    hint.className = "incoming"
    const puzzle = state.rebalancePuzzle
    hint.textContent = puzzle
      ? `${state.level.event === "join" ? "Joining" : "Departing"}: ${state.level.event === "join" ? puzzle.after[puzzle.after.length - 1]?.id : "a crew"}`
      : "Rebalance pending."
    node.append(hint)
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}

/** First lane index where `pred` holds (for L2's "assign next lane" flow). */
function nextLaneFor(state: GameState, pred: (p: number) => boolean): number | undefined {
  for (let p = 0; p < state.level.partitionCount; p++) if (pred(p)) return p
  return undefined
}
