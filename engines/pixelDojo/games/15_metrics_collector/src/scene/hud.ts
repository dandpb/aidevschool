// HUD for the Metrics Observatory. Pure DOM, reads from the WaveController.

import type { WaveController } from "../game/controller"
import { BUCKET_BOUNDS } from "../game/observatory"

export interface HudState {
  readonly clawIdx: number
  readonly aimIdx: number
  readonly pendingValue: number | null
}

export function mountHud(root: HTMLElement, controller: WaveController): (s: HudState) => void {
  let state: HudState = { clawIdx: 0, aimIdx: 0, pendingValue: null }

  const title = el("h1", {}, "Metrics Observatory")
  const subtitle = el("p", {}, controller.waveContract.lesson)
  const status = el("div", { class: "status" }, "Press START to begin the wave.")
  const startButton = document.createElement("button")
  startButton.setAttribute("data-testid", "start")
  startButton.textContent = "Start wave"
  const ackButton = document.createElement("button")
  ackButton.setAttribute("data-testid", "ack")
  ackButton.textContent = "V Ack resolved alert"
  ackButton.disabled = true
  const burstButton = document.createElement("button")
  burstButton.setAttribute("data-testid", "burst-tick")
  burstButton.textContent = "Tick +5s (window advance)"
  const legendHeader = el("h2", {}, "Bucket plan")
  const legend = el("div", { class: "legend" })
  const ribbon = el("div", { class: "ribbon" })
  const alertBox = el("div", { class: "alert inactive" }, "Alert: inactive")
  const metricBox = el("div", { class: "metric" })
  const keysBox = el(
    "div",
    { class: "keys" },
    [
      "<kbd>A</kbd>/<kbd>D</kbd> or <kbd>←</kbd>/<kbd>→</kbd> slide claw",
      "<kbd>↑</kbd>/<kbd>↓</kbd> raise / lower alert plane",
      "<kbd>Z</kbd> drop orb into the column under the claw",
      "<kbd>X</kbd> read ribbon / commit percentile answer",
      "<kbd>V</kbd> ack resolved alert",
      "<kbd>Space</kbd> advance the clock 1s (window slides)",
    ].join("<br/>"),
  )

  root.replaceChildren(
    title,
    subtitle,
    startButton,
    status,
    ackButton,
    burstButton,
    legendHeader,
    legend,
    ribbon,
    alertBox,
    metricBox,
    keysBox,
  )

  startButton.addEventListener("click", () => {
    startButton.disabled = true
    startButton.textContent = "Wave in progress"
    status.textContent = "Set the alert plane, then route the orbs (Z)."
  })
  ackButton.addEventListener("click", () => {
    controller.ackAlert()
  })
  burstButton.addEventListener("click", () => {
    controller.tick(5)
    controller.tryEmit()
  })

  function render(): void {
    const s = controller.snapshot
    const wave = controller.waveContract

    // Bucket legend with running counts/cumulative.
    legend.replaceChildren(
      el("span", { class: "le" }, "le"),
      el("span", {}, "count / cumulative"),
      el("span", { class: "count" }, "idx"),
    )
    for (let i = 0; i < BUCKET_BOUNDS.length; i += 1) {
      const bound = BUCKET_BOUNDS[i]
      const count = s.bucketCounts[i] ?? 0
      const cum = s.cumulativeCounts[i] ?? 0
      const leText = bound === Infinity ? "+Inf" : `le=${bound}`
      const highlight =
        i === state.clawIdx
          ? "background:#1a2030;"
          : i === state.aimIdx
            ? "background:#2a2410;"
            : ""
      legend.appendChild(el("span", { class: "le", style: highlight }, leText))
      legend.appendChild(el("span", { style: highlight }, `${count} / ${cum}`))
      legend.appendChild(el("span", { class: "count", style: highlight }, `idx ${i}`))
    }

    // Cumulative ribbon preview line.
    const nextP = s.pendingPercentileQueries[0]
    if (nextP !== undefined) {
      const expected = controller.observatoryInstance.queryPercentile(nextP)
      const rank = Math.ceil(nextP * s.total)
      ribbon.textContent = `p${Math.round(nextP * 100)} rank=${rank} -> bucket idx ${expected} (aim cursor: idx ${state.aimIdx})`
    } else {
      ribbon.textContent = `ribbon idle (all percentile queries answered)`
    }

    // Alert box.
    alertBox.className = `alert ${s.alertState}`
    const ackExpected = s.alertState === "resolved"
    ackButton.disabled = !ackExpected
    const thresholdTxt =
      s.alertThresholdLeIdx < 0
        ? "(no threshold set)"
        : `threshold le=${BUCKET_BOUNDS[s.alertThresholdLeIdx]}`
    alertBox.textContent =
      `Alert: ${s.alertState} ${thresholdTxt} · hold ${s.alertHoldSeconds}s · window ${s.windowSeconds}s` +
      (s.alertLifecycle.length > 0 ? ` · lifecycle: ${s.alertLifecycle.join(" -> ")}` : "")

    // Pending orb readout.
    const pending = controller.nextObservation
    const carrying =
      pending !== null
        ? `Orb in claw: ${pending}ms (drop into le=${BUCKET_BOUNDS[controller.observatoryInstance.bucketFor(pending)]})`
        : "Queue empty."
    const totals =
      `obs: ${s.obsBucketedCorrect}/${s.obsTotal} ok (${s.obsMisbucketed} wrong), ` +
      `percentile: ${s.percentileQueriesCorrect}/${s.percentileQueriesTotal}, ` +
      `sum: ${s.sumRecorded}/${s.sumObserved}, overflow: ${s.overflowDrops}, acked: ${s.acked}`
    metricBox.innerHTML = `<div>${carrying}</div><div><b>${totals}</b></div>`
    void wave

    if (controller.hasEmitted) {
      status.textContent = "EVIDENCE emitted — see console. Wave complete."
    } else if (pending === null && s.pendingPercentileQueries.length === 0 && s.acked) {
      status.textContent = "All orbs routed, all queries answered, alert acked — emitting..."
    } else if (pending === null) {
      status.textContent =
        "All orbs routed — answer any open percentile queries, then bring the alert to resolved and ack."
    }
  }

  controller.subscribe(() => render())

  return (next: HudState) => {
    state = next
    render()
  }
}

function el(tag: string, attrs: Record<string, string> = {}, text = ""): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (text) node.textContent = text
  return node
}
