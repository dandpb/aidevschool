import type { GameController, GameState } from "../game/controller"

/** DOM HUD — briefing, controls per level, metrics. Reads sim state; dispatches controller commands. */
export function mountHud(root: HTMLElement, game: GameController): void {
  root.innerHTML = `
    <h1 data-testid="hud-title"></h1>
    <p class="lesson" data-testid="hud-lesson"></p>
    <p class="rule" data-testid="hud-rule"></p>
    <div class="status" data-testid="hud-status"></div>
    <div class="job" data-testid="hud-job"></div>
    <div class="controls" data-testid="hud-controls"></div>
    <pre class="metrics" data-testid="hud-metrics"></pre>
  `
  const el = {
    title: q(root, "hud-title"),
    lesson: q(root, "hud-lesson"),
    rule: q(root, "hud-rule"),
    status: q(root, "hud-status"),
    job: q(root, "hud-job"),
    controls: q(root, "hud-controls"),
    metrics: q(root, "hud-metrics"),
  }

  game.subscribe((state) => {
    el.title.textContent = `${state.level.id} — ${state.level.title}`
    el.lesson.textContent = state.level.lesson
    el.rule.textContent = state.level.passRule
    renderStatus(el.status, state)
    renderJob(el.job, state)
    renderControls(el.controls, state, game)
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
    node.textContent = "Will the buffered upload overflow the tank? Click it, or pick below."
  else if (state.level.id === "L2")
    node.textContent = "Does streaming keep peak memory bounded? Pick below."
  else if (state.level.id === "L3")
    node.textContent = "Dial the chunk size, predict the peak, then lock in."
  else node.textContent = "Under backpressure: does the buffered upload stall or overflow?"
}

function renderJob(node: HTMLElement, state: GameState): void {
  const j = state.job
  const mode = state.level.mode
  const parts = [
    `<span class="mode">${mode.toUpperCase()}</span>`,
    `<span class="metric">size: ${j.size}</span>`,
    `<span class="metric">capacity: ${j.capacity}</span>`,
  ]
  if (mode === "streaming") parts.push(`<span class="metric">chunk: ${j.chunkSize}</span>`)
  if (state.level.backpressure)
    parts.push(`<span class="metric">drain: ${j.drainRate}/ms · ${j.timeMs}ms</span>`)
  node.innerHTML = parts.join(" · ")
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
  // predicting
  if (state.level.mode === "buffered") {
    // L1 / L4 — overflow yes/no
    button(node, "predict-overflow-yes", "Overflows", () => game.predictOverflow(true))
    button(node, "predict-overflow-no", "Stays in tank", () => game.predictOverflow(false))
  }
  if (state.level.id === "L2") {
    // bounded yes/no
    button(node, "predict-bounded-yes", "Stays bounded", () => game.predictBounded(true))
    button(node, "predict-bounded-no", "Overflows", () => game.predictBounded(false))
  }
  if (state.level.id === "L3") {
    const label = document.createElement("label")
    label.textContent = `chunk size: ${state.tunedChunkSize}`
    const slider = document.createElement("input")
    slider.type = "range"
    slider.min = "10"
    slider.max = String(state.job.capacity * 2)
    slider.value = String(state.tunedChunkSize)
    slider.dataset.testid = "chunk-dial"
    slider.addEventListener("input", () => game.setChunkSize(Number(slider.value)))
    node.append(label, slider)
    // predicted peak input (= chunkSize)
    const peakLabel = document.createElement("label")
    peakLabel.textContent = "predicted peak memory:"
    const peakInput = document.createElement("input")
    peakInput.type = "number"
    peakInput.min = "0"
    peakInput.value = String(state.tunedChunkSize)
    peakInput.dataset.testid = "peak-input"
    peakLabel.append(peakInput)
    node.append(peakLabel)
    button(node, "lock-in", "Lock in", () => game.lockInPeak(Number(peakInput.value)))
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
