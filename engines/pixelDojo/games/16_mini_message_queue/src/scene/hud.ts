// HUD for the Log Pier. Pure DOM, reads from the WaveController.

import type { WaveController } from "../game/controller"

export interface HudState {
  readonly focusedPartition: number
  readonly focusedGroup: number
}

export function mountHud(root: HTMLElement, controller: WaveController): (s: HudState) => void {
  let state: HudState = { focusedPartition: 0, focusedGroup: 0 }

  const title = el("h1", {}, "Log Pier")
  const subtitle = el("p", {}, controller.waveContract.lesson)
  const status = el("div", { class: "status" }, "Press START to begin the wave.")
  const startButton = document.createElement("button")
  startButton.setAttribute("data-testid", "start")
  startButton.textContent = "Start wave"
  const produceButton = document.createElement("button")
  produceButton.setAttribute("data-testid", "produce")
  produceButton.textContent = "Z Produce into focused lane"
  const fetchButton = document.createElement("button")
  fetchButton.setAttribute("data-testid", "fetch")
  fetchButton.textContent = "X Fetch / commit on focused group"
  const replayButton = document.createElement("button")
  replayButton.setAttribute("data-testid", "replay")
  replayButton.textContent = "C Replay (rewind) on focused group"
  const lanesHeader = el("h2", {}, "Partition lanes")
  const lanes = el("div", { class: "lanes" })
  const groupsHeader = el("h2", {}, "Consumer groups")
  const groups = el("div", { class: "groups" })
  const orbBox = el("div", { class: "orb" })
  const metricBox = el("div", { class: "metric" })
  const keysBox = el(
    "div",
    { class: "keys" },
    [
      "<kbd>←</kbd>/<kbd>→</kbd> cycle focus (lanes when routing, groups when consuming)",
      "<kbd>Z</kbd> produce platform orb into focused lane",
      "<kbd>X</kbd> fetch (1st) then commit (2nd) on focused group",
      "<kbd>C</kbd> replay — rewind focused cursor",
      "<kbd>Space</kbd> tick the clock 1s (retention + deadlines)",
    ].join("<br/>"),
  )

  root.replaceChildren(
    title,
    subtitle,
    startButton,
    status,
    produceButton,
    fetchButton,
    replayButton,
    lanesHeader,
    lanes,
    groupsHeader,
    groups,
    orbBox,
    metricBox,
    keysBox,
  )

  startButton.addEventListener("click", () => {
    startButton.disabled = true
    startButton.textContent = "Wave in progress"
    status.textContent = "Route each key-colored orb to its matching lane."
  })
  produceButton.addEventListener("click", () => {
    controller.produce(state.focusedPartition)
    controller.tryEmit()
  })
  fetchButton.addEventListener("click", () => {
    const g = state.focusedGroup
    const snap = controller.snapshot
    const group = snap.consumerGroups[g]
    if (group === undefined) return
    if (group.fetchedOffset === null) controller.fetch(g)
    else controller.commit(g)
    controller.tryEmit()
  })
  replayButton.addEventListener("click", () => {
    controller.replay(state.focusedGroup, 1)
    controller.tryEmit()
  })

  function render(): void {
    const s = controller.snapshot
    const wave = controller.waveContract

    // Lanes panel.
    lanes.replaceChildren()
    for (const p of s.partitions) {
      const focused = p.id === state.focusedPartition
      const orb = s.pendingOrb
      const expected = orb
        ? orb.explicitPartition !== null
          ? orb.explicitPartition
          : orb.keyPartition
        : -1
      const isTarget = orb !== null && expected === p.id
      const rowClass = focused ? "lane focused" : "lane"
      const meta = `next=${p.nextOffset} begin=${p.beginningOffset}${isTarget ? " ← route here" : ""}`
      lanes.appendChild(
        el(
          "div",
          { class: rowClass },
          [
            `<span class="swatch" style="background:${p.color}"></span>`,
            `<span class="meta">P${p.id} ${meta}</span>`,
            `<span class="offsets">${countSlots(p.slots)} orbs</span>`,
          ].join(""),
        ),
      )
    }

    // Consumer groups panel.
    groups.replaceChildren()
    for (const g of s.consumerGroups) {
      const focused = g.id === state.focusedGroup
      const part = s.partitions[g.partition]
      const color = part?.color ?? "#ffffff"
      const rowClass = focused ? "group focused" : "group"
      const fetchedTxt = g.fetchedOffset === null ? "" : ` (fetched=${g.fetchedOffset})`
      groups.appendChild(
        el(
          "div",
          { class: rowClass },
          [
            `<span class="swatch" style="background:${color}"></span>`,
            `<span class="meta">G${g.id} on P${g.partition} · next=${g.committedOffset}${fetchedTxt}</span>`,
            `<span class="lag">lag ${g.lag}</span>`,
          ].join(""),
        ),
      )
    }

    // Pending orb readout.
    const orb = s.pendingOrb
    if (orb === null) {
      orbBox.textContent = "Platform empty — finish committing to clear the wave."
    } else {
      orbBox.textContent = `Platform orb: key=${orb.keyColor} → expected lane P${orb.explicitPartition ?? orb.keyPartition}`
    }

    const totals =
      `produced ${s.messages_produced}/${s.messages_inbound}, ` +
      `correct ${s.correct_routes}, misroutes ${s.misroutes}, ` +
      `commits ${s.commits}/${wave.commitTarget}, lag_peak ${s.lag_peak}/${s.lag_max_tolerance}, ` +
      `replays ${s.replays} (faults ${s.replay_faults}), ` +
      `retention_faults ${s.retention_faults}, deadline_misses ${s.deadline_misses}`
    metricBox.innerHTML = `<b>${totals}</b>`

    if (controller.hasEmitted) {
      status.textContent = "EVIDENCE emitted — see console. Wave complete."
    } else if (s.messages_produced === s.messages_inbound && s.commits >= wave.commitTarget) {
      status.textContent = "All orbs produced + commits reached — emitting..."
    } else if (s.messages_produced === s.messages_inbound) {
      status.textContent =
        "All orbs routed — keep fetch+commit on each group until commits reach target."
    } else {
      status.textContent = "Route each key-colored orb to its matching lane."
    }
  }

  controller.subscribe(() => render())

  return (next: HudState) => {
    state = next
    render()
  }
}

function countSlots(slots: readonly (unknown | null)[]): number {
  let n = 0
  for (const s of slots) if (s !== null && s !== undefined) n += 1
  return n
}

function el(tag: string, attrs: Record<string, string> = {}, text = ""): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (text) node.innerHTML = text
  return node
}
