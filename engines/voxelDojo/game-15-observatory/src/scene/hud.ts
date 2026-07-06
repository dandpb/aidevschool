import type { GameController, GameState } from "../game/controller"
import { N_BUCKETS } from "../sim/levels"

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
    node.textContent = `Sample ${state.pendingIndex + 1}/${state.level.sampleCount} — click the bucket you predict it lands in.`
  else if (state.level.id === "L2")
    node.textContent = "The histogram is filled. Click the bucket the p95 contour sits in."
  else if (state.level.id === "L3")
    node.textContent = "Drag the SLO plane, then predict whether the alert fires."
  else node.textContent = "Two distributions, same mean. Click the one you predict alerts."
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
  if (state.level.id === "L3") {
    const label = document.createElement("label")
    label.textContent = `SLO plane: ${state.setSlo !== null ? state.setSlo.toFixed(2) : "—"}`
    const slider = document.createElement("input")
    slider.type = "range"
    slider.min = "0"
    slider.max = "1"
    slider.step = "0.01"
    slider.value = String(state.setSlo ?? state.level.slo ?? 0.5)
    slider.dataset.testid = "slo-dial"
    slider.addEventListener("input", () => game.setSloValue(Number(slider.value)))
    node.append(label, slider)
    button(node, "predict-fires", "Predict: ALERT FIRES", () => game.predictFiring(true))
    button(node, "predict-silent", "Predict: stays SILENT", () => game.predictFiring(false))
  }
  if (state.level.id === "L4") {
    for (const d of state.distributions) {
      button(node, `dist-${d.id}`, `Predict: ${d.label} alerts`, () => game.pickDistribution(d.id))
    }
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // bucket buttons (L1 click-to-predict; L2 click-to-predict-percentile-bucket)
  const row = document.createElement("div")
  row.style.display = "grid"
  row.style.gridTemplateColumns = "repeat(4, 1fr)"
  row.style.gap = "4px"
  for (let i = 0; i < N_BUCKETS; i++) {
    const b = document.createElement("button")
    b.dataset.testid = `bucket-${i}`
    const lo = i === 0 ? 0 : i / N_BUCKETS
    const hi = (i + 1) / N_BUCKETS
    const count =
      state.level.id === "L4"
        ? state.distributions.flatMap((d) => d.histogram.counts).length
        : (state.histogram.counts[i] ?? 0)
    b.innerHTML = `<span class="bucket-label">b${i}</span><br/><span class="bucket-range">${lo.toFixed(2)}–${hi.toFixed(
      2,
    )}</span><br/><span class="bucket-count">${count}</span>`
    b.addEventListener("click", () => {
      if (state.level.id === "L1") game.predictBucket(i)
      if (state.level.id === "L2") game.predictPercentileBucket(i)
    })
    row.append(b)
  }
  node.append(row)

  const readout = document.createElement("p")
  readout.dataset.testid = "percentile-readout"
  if (state.level.id === "L4") {
    readout.textContent = state.distributions.map((d) => `${d.label}: mean ≈ same`).join(" · ")
  } else {
    const p = game.watchedPercentile()
    readout.textContent = Number.isNaN(p) ? "" : `p${state.level.watchP} ≈ ${p.toFixed(3)}`
  }
  node.append(readout)
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset.testid = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
