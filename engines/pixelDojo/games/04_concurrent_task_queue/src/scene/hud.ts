import type { GameController, GameState } from "../game/controller"

const KIND_LABEL: Record<string, string> = {
  clear: "clear",
  transient: "transient",
  poison: "poison",
}

const STATUS_COLOR: Record<string, string> = {
  queued: "#7bd88f",
  running: "#4fc3f7",
  retrying: "#ba68c8",
  "needs-classify": "#ffd54f",
  done: "#9aa3c0",
  dlq: "#8d6e63",
}

/** DOM HUD: briefing, controls per phase, queue readout, metrics. */
export function mountHud(root: HTMLElement, game: GameController): void {
  root.innerHTML = `
    <h1 data-testid="hud-title">TASK FORGE — L1</h1>
    <p class="lesson" data-testid="hud-lesson">
      Run the forge: predict the next ingot a free arm grabs, route cracks to the
      annealing rack or scrap chute, and reject overflow + duplicate sigils.
    </p>
    <p class="rule" data-testid="hud-rule">
      Pass: ≥80% dispatch predictions right, every retry/DLQ right, zero poison-requeue /
      overflow / dup-enqueue, and running ≤ worker_count.
    </p>
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
    node.textContent = "Hopper idle. Press Start to bring the forklifts in."
    return
  }
  if (state.phase === "cleared") {
    node.textContent = "Wave cleared — evidence emitted."
    return
  }
  if (state.phase === "failed") {
    node.textContent = "Wave failed — contract broken. Reload to retry."
    return
  }
  const bp = state.lastBackpressure
  const bpLabel = bp === "full" ? "FULL" : bp === "limited" ? "limited" : "open"
  if (state.phase === "boundary" && state.pendingArrival) {
    const def = state.pendingArrival
    node.textContent = `Forklift delivers ingot ${def.id} (sigil ${def.sigil}, prio ${def.priority}, ${KIND_LABEL[def.kind] ?? def.kind}). Hopper ${bpLabel}. Accept or Reject?`
    return
  }
  if (state.phase === "predicting") {
    node.textContent = `A forge arm is idle. Click the ingot you predict it grabs. Hopper ${bpLabel}.`
    return
  }
  if (state.phase === "classifying") {
    const id = state.pendingClassifyTaskId
    node.textContent = `Ingot ${id} finished with a failure. Route to annealing rack (retry) or scrap chute (DLQ)?`
  }
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Start wave", () => game.start())
    return
  }
  if (state.phase === "boundary") {
    button(node, "accept", "Accept (allow enqueue)", () => game.acceptArrival())
    button(node, "reject", "Reject (R / 429)", () => game.rejectArrival())
    return
  }
  if (state.phase === "predicting") {
    const queued = state.tasks.filter(
      (t) => t.status === "queued" || (t.status === "retrying" && t.scheduledFor <= state.cursor),
    )
    if (queued.length === 0) {
      const hint = document.createElement("p")
      hint.textContent = "(no eligible ingots — dispatch idle)"
      node.append(hint)
    }
    for (const t of queued) {
      const label = `${t.id} · sigil ${t.sigil} · prio ${t.priority} · ${KIND_LABEL[t.kind] ?? t.kind}`
      button(node, `ingot-${t.id}`, label, () => game.predictIngot(t.id))
    }
    return
  }
  if (state.phase === "classifying") {
    button(node, "route-retry", "Route → annealing rack (retry)", () => game.classifyRetry())
    button(node, "route-dlq", "Route → scrap chute (DLQ)", () => game.classifyDlq())
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  const sigils = game.activeSigils()
  const counts: Record<string, number> = {}
  for (const t of state.tasks) counts[t.status] = (counts[t.status] ?? 0) + 1
  const summary = document.createElement("p")
  summary.dataset["testid"] = "queue-summary"
  const queueDepth =
    (counts["queued"] ?? 0) + (counts["retrying"] ?? 0) + (counts["needs-classify"] ?? 0)
  summary.textContent =
    `queue ${queueDepth}/${state.capacity} · running ${state.runningCount}/${state.workerCount} · ` +
    `done ${counts["done"] ?? 0} · dlq ${counts["dlq"] ?? 0} · active-sigils ${sigils.size}`
  node.append(summary)

  for (const t of state.tasks) {
    const row = document.createElement("button")
    row.dataset["testid"] = `task-${t.id}`
    const color = STATUS_COLOR[t.status] ?? "#9aa3c0"
    row.innerHTML = `<span class="swatch" style="background:${color}"></span> ${t.id} sigil ${t.sigil} prio ${t.priority} · ${t.status}${t.status === "retrying" ? ` (retry ${t.retries}/${t.maxRetries}, eligible @${t.scheduledFor.toFixed(1)})` : ""}`
    if (
      state.phase === "predicting" &&
      (t.status === "queued" || (t.status === "retrying" && t.scheduledFor <= state.cursor))
    ) {
      row.addEventListener("click", () => game.predictIngot(t.id))
    } else {
      row.disabled = true
    }
    node.append(row)
  }
}

function button(parent: HTMLElement, testId: string, label: string, onClick: () => void): void {
  const b = document.createElement("button")
  b.dataset["testid"] = testId
  b.textContent = label
  b.addEventListener("click", onClick)
  parent.append(b)
}
