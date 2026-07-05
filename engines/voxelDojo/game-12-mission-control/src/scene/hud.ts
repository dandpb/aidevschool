import type { GameController, GameState } from "../game/controller"
import { PALETTE } from "./missionScene"

/** DOM HUD — briefing, status per level, station/DAG controls, metrics. Reads sim state. */
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
  const leader = state.election?.leaderId ?? null
  const term = state.election?.term ?? 0
  if (state.phase === "briefing") {
    node.textContent = "Press start."
    return
  }
  if (state.phase === "cleared") {
    node.textContent = "Mission cleared — evidence emitted."
    return
  }
  if (state.phase === "failed") {
    node.textContent = "Mission failed — evidence emitted. Retry?"
    return
  }
  // predicting
  const awaitingSuccessor = state.killedLeaderId !== null && !state.leaderPredicted
  if (awaitingSuccessor) {
    node.textContent = `Leader ${state.killedLeaderId} killed. Term ${term}: predict the new leader among survivors.`
    return
  }
  if (state.jobs.length > 0) {
    const done = state.completed.size
    const total = state.jobs.length
    if (state.level.id === "L4" && state.killedLeaderId === null) {
      node.textContent = `Term ${term} · leader ${leader} · jobs ${done}/${total}. Launch jobs, then KILL the leader to test recovery.`
    } else {
      node.textContent = `Term ${term} · leader ${leader} · jobs ${done}/${total}. Click a pulsing (ready) job to launch.`
    }
    return
  }
  // pure election levels
  if (state.level.id === "L1") {
    node.textContent = `Term ${term}: click the station you predict wins the leader election.`
  } else {
    node.textContent = state.leaderPredicted
      ? `Term ${term} · leader ${leader}. Now click the LEADER to kill it (then predict the successor).`
      : `Term ${term}: predict the leader first, then you may kill it.`
  }
}

function renderControls(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  if (state.phase === "briefing") {
    button(node, "start", "Start mission", () => game.start())
    return
  }
  if (state.phase === "cleared" || state.phase === "failed") {
    if (state.phase === "failed") button(node, "retry", "Retry level", () => game.retry())
    if (state.phase === "cleared" && state.level.id !== "L4")
      button(node, "next", "Next level", () => game.nextLevel())
    return
  }
}

function renderLegend(node: HTMLElement, state: GameState, game: GameController): void {
  node.innerHTML = ""
  // stations
  const stationsHead = document.createElement("p")
  stationsHead.className = "term"
  stationsHead.textContent = `stations · term ${state.election?.term ?? 0}`
  node.append(stationsHead)
  state.stations.forEach((s, i) => {
    const isLeader = s.id === (state.election?.leaderId ?? null)
    const row = document.createElement("button")
    row.dataset.testid = `station-${s.id}`
    row.innerHTML =
      `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span> ${s.id}` +
      (isLeader ? ' · <span class="leader">LEADER</span>' : "")
    row.addEventListener("click", () => {
      const lvl = state.level.id
      if (lvl === "L1" || lvl === "L2") {
        // predicting the leader (or successor after a kill)
        if (state.killedLeaderId !== null) game.predictLeader(s.id)
        else game.predictLeader(s.id)
      }
      if (lvl === "L4" && state.killedLeaderId !== null) game.predictLeader(s.id)
    })
    node.append(row)
  })

  // kill-leader affordance (L2/L4) — separate from station click so the intent is explicit
  if (
    state.phase === "predicting" &&
    state.level.killEnabled &&
    state.killedLeaderId === null &&
    (state.leaderPredicted || state.jobs.length > 0)
  ) {
    const leader = state.election?.leaderId ?? null
    if (leader) {
      button(node, "kill-leader", `Kill leader (${leader})`, () => game.killLeader(leader))
    }
  }

  // DAG jobs
  if (state.jobs.length > 0) {
    const jobsHead = document.createElement("p")
    jobsHead.className = "term"
    jobsHead.textContent = "job DAG (click ready jobs to launch)"
    node.append(jobsHead)
    for (const job of state.jobs) {
      const completed = state.completed.has(job.id)
      const ready = game.isReady(job.id)
      const row = document.createElement("button")
      row.dataset.testid = `job-${job.id}`
      const tag = completed ? "✓ done" : ready ? "● ready" : "✗ blocked"
      const depList = job.deps.length > 0 ? job.deps.join(",") : "—"
      row.innerHTML = `${job.id} <span class="rule">[${depList}]</span> ${tag}`
      row.addEventListener("click", () => game.launchJob(job.id))
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
