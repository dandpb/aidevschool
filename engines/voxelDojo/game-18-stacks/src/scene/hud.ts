import type { GameController, GameState } from "../game/controller"

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
  if (state.phase === "briefing") {
    node.textContent = "Press start."
    return
  }
  if (state.phase === "cleared") {
    node.textContent = "Query cleared — evidence emitted."
    return
  }
  if (state.phase === "failed") {
    node.textContent = "Prediction wrong — evidence emitted. Retry?"
    return
  }
  // predicting / firing
  if (state.level.id === "L1") {
    const done = state.filingPredictions.length
    const total = state.cards.length
    const card = state.cards[done] ?? ""
    node.textContent =
      done < total
        ? `Card ${done + 1}/${total}: "${card}" — click the shelf (term) it files onto.`
        : "Filing complete."
    return
  }
  if (state.level.id === "L2") {
    node.textContent = `Query "${state.queryTerms.join(" ")}" — click the document you predict ranks #1.`
    return
  }
  if (state.level.id === "L3") {
    node.textContent = `Two-term query "${state.queryTerms.join(" ")}" — click the document with BOTH terms (it ranks #1).`
    return
  }
  // L4
  node.textContent = `Query "${state.queryTerms.join(" ")}" — click the top 3 documents in rank order (${state.predictedOrder.length}/3).`
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
  if (state.level.id === "L4" && state.phase === "predicting") {
    button(node, "undo-rank", "Undo last pick", () => game.undoRank())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // L1: list the shelves (terms) as click targets
  if (state.level.id === "L1") {
    const head = document.createElement("p")
    head.className = "term"
    head.textContent = "shelves (terms)"
    node.append(head)
    for (const term of state.shelves) {
      const row = document.createElement("button")
      row.dataset.testid = `shelf-${term}`
      row.textContent = term
      row.addEventListener("click", () => game.fileCard(term))
      node.append(row)
    }
    return
  }
  // L2/L3/L4: list the documents as click targets
  const head = document.createElement("p")
  head.className = "term"
  head.textContent = `corpus · query "${state.queryTerms.join(" ")}"`
  node.append(head)
  for (const doc of state.docs) {
    const row = document.createElement("button")
    row.dataset.testid = `doc-${doc.id}`
    const isPicked =
      state.level.id === "L4"
        ? state.predictedOrder.includes(doc.id)
        : state.predictedTop === doc.id
    row.innerHTML = `<span class="docid">${doc.id}</span> <span class="rule">${truncate(doc.text, 40)}${isPicked ? " ✓" : ""}</span>`
    row.addEventListener("click", () => {
      if (state.level.id === "L2" || state.level.id === "L3") game.predictTop(doc.id)
      if (state.level.id === "L4") game.predictRank(doc.id)
    })
    node.append(row)
  }
  // ranking preview
  if (state.ranking.length > 0 && state.phase !== "briefing") {
    const r = document.createElement("p")
    r.className = "rank"
    r.dataset.testid = "ranking-preview"
    r.textContent = `truth ranking: ${game
      .fullRanking()
      .slice(0, 5)
      .map((d) => d.docId)
      .join(",")}`
    node.append(r)
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}
