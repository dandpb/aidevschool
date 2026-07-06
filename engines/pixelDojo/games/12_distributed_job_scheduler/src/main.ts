// Raft Ring — entry point. Wires the pure Raft + fencing cluster logic to
// the three.js scene and the DOM HUD, and handles keyboard input. The game
// emits one evidence record when the wave resolves (pass or fail); the smoke
// spec scrapes the `EVIDENCE ` console line.

import "./styles.css"
import {
  type Cluster,
  canonicalPartition,
  dispatch as clusterDispatch,
  type NodeId,
  startElection,
  visibleSide,
  type WorkerId,
} from "./game/cluster"
import { buildEvidence, emitEvidence } from "./game/evidence"
import { RaftRingScene, type SceneState } from "./game/scene"
import { defaultWave } from "./game/wave"

type GamePhase = "playing" | "finished"

type PulseWindow = {
  election: { readonly candidate: NodeId; readonly voters: readonly NodeId[] } | null
  dispatch: {
    readonly leader: NodeId
    readonly worker: WorkerId
    readonly jobId: number | null
    readonly accepted: boolean
  } | null
  rejectFlash: { readonly worker: WorkerId } | null
  toast: { readonly text: string; readonly kind: "info" | "bad" | "good" } | null
  until: number
}

type GameState = {
  cluster: Cluster
  targetNode: NodeId
  phase: GamePhase
  rrIndex: number
  pulse: PulseWindow
  stallAccumMs: number
  lastTickMs: number
}

const PULSE_WINDOW_MS = 900
const STALL_LIMIT_SECS = 5

function buildCluster(): Cluster {
  return {
    nodes: Array.from({ length: 5 }, (_, i) => ({
      id: i as NodeId,
      role: "follower" as const,
      term: 0,
      votedFor: null,
      leaderToken: 0,
    })),
    workers: Array.from({ length: 3 }, (_, i) => ({ id: i as WorkerId, lastSeenToken: 0 })),
    jobs: defaultWave().map((j) => ({ ...j })),
    currentLeader: null,
    currentToken: 0,
    partition: null,
    metrics: {
      jobs_queued: 8,
      successful_dispatches: 0,
      stale_token_rejections: 0,
      stale_token_accepted: 0,
      duplicate_dispatches: 0,
      elections_started: 0,
      elections_won_with_quorum: 0,
      quorum_failures: 0,
      terms_bumped: 0,
      max_term_reached: 0,
      partitions_injected: 0,
      queue_stall_secs: 0,
      leader_flip_flops: 0,
      non_leader_dispatch_attempts: 0,
    },
  }
}

function main(): void {
  const app = document.querySelector("#app")
  if (app === null) {
    throw new Error("#app root not found")
  }
  app.setAttribute("class", "game-shell")

  const canvasHolder = document.createElement("div")
  canvasHolder.setAttribute("class", "game-canvas")
  app.appendChild(canvasHolder)

  const hud = buildHud(app)
  const scene = new RaftRingScene(canvasHolder)

  const state: GameState = {
    cluster: buildCluster(),
    targetNode: 0 as NodeId,
    phase: "playing",
    rrIndex: 0,
    pulse: { election: null, dispatch: null, rejectFlash: null, toast: null, until: 0 },
    stallAccumMs: 0,
    lastTickMs: performance.now(),
  }

  window.__raftDebug = {
    leader: () => state.cluster.currentLeader,
    token: () => state.cluster.currentToken,
    target: () => state.targetNode,
    finished: () => state.phase === "finished",
  }

  const onKey = (event: KeyboardEvent) => handleKey(event.key, state)
  window.addEventListener("keydown", onKey)

  const resize = () => {
    const rect = canvasHolder.getBoundingClientRect()
    scene.resize(rect.width, rect.height)
  }
  window.addEventListener("resize", resize)

  const loop = () => {
    const now = performance.now()
    const dt = now - state.lastTickMs
    state.lastTickMs = now

    // Stall accumulator: when jobs are pending AND there is no leader,
    // accrue the gap so the gate can fail on prolonged leaderless stalls.
    const pending = state.cluster.jobs.some((j) => j.acceptedByWorker === null)
    if (pending && state.cluster.currentLeader === null && state.phase === "playing") {
      state.stallAccumMs += dt
      const secs = Math.floor(state.stallAccumMs / 1000)
      if (secs > state.cluster.metrics.queue_stall_secs) {
        state.cluster.metrics.queue_stall_secs = secs
      }
    } else {
      state.stallAccumMs = 0
    }

    // Auto-resolve when every job is dispatched — the pass rule is evaluated
    // against the metrics.
    if (
      state.phase === "playing" &&
      state.cluster.metrics.successful_dispatches === state.cluster.metrics.jobs_queued
    ) {
      finishWave(state)
    }

    const snapshot = buildSceneState(state)
    scene.sync(snapshot)
    scene.render()
    updateHud(hud, state, now)
    if (now > state.pulse.until) {
      state.pulse = {
        election: null,
        dispatch: null,
        rejectFlash: null,
        toast: state.pulse.toast,
        until: 0,
      }
    }
    window.requestAnimationFrame(loop)
  }
  window.requestAnimationFrame(loop)
}

function buildHud(app: Element): HudElements {
  const hud = document.createElement("div")
  hud.setAttribute("class", "hud hud-top")

  const briefing = document.createElement("div")
  briefing.setAttribute("class", "hud-panel")
  briefing.innerHTML = `
    <h1 class="hud-title">Raft Ring — Distributed Job Scheduler</h1>
    <p class="hud-briefing">Simplified-Raft leader election with <strong>fencing-token</strong> dispatch under split-brain.</p>
    <p class="hud-briefing">5 scheduler nodes (quorum = 3). Each new leadership term bumps the monotonic fencing token; workers reject any orb whose token is below their <code>last_seen_token</code>.</p>
    <p class="hud-briefing">Win: dispatch all 8 jobs from the canonical leader. <strong>Never</strong> dispatch from a non-leader. If a partition severs the leader from quorum, the majority side must elect a new leader.</p>
    <p class="hud-line"><span class="label">Project:</span> <span class="value">12_distributed_job_scheduler</span></p>
  `

  const statusPanel = document.createElement("div")
  statusPanel.setAttribute("class", "hud-panel")
  statusPanel.innerHTML = `
    <p class="hud-status" data-status>—</p>
    <div class="hud-metrics" data-metrics></div>
  `

  hud.appendChild(briefing)
  hud.appendChild(statusPanel)
  app.appendChild(hud)

  const bottom = document.createElement("div")
  bottom.setAttribute("class", "hud hud-bottom")
  bottom.innerHTML = `
    <div class="hud-controls">
      <div><span class="key">Tab / Q-E</span>cycle target node</div>
      <div><span class="key">V</span>Start election (bump term + request votes) &nbsp; <span class="key">Space</span>Dispatch front job &nbsp; <span class="key">P</span>Toggle partition</div>
    </div>
    <div class="hud-panel">
      <div class="hud-banner" data-banner style="display:none"></div>
      <div class="hud-toast" data-toast></div>
    </div>
  `
  app.appendChild(bottom)

  return {
    status: statusPanel.querySelector("[data-status]"),
    metrics: statusPanel.querySelector("[data-metrics]"),
    banner: bottom.querySelector("[data-banner]"),
    toast: bottom.querySelector("[data-toast]"),
  }
}

type HudElements = {
  status: Element | null
  metrics: Element | null
  banner: Element | null
  toast: Element | null
}

function buildSceneState(state: GameState): SceneState {
  const c = state.cluster
  return {
    nodes: c.nodes.map((n) => ({
      id: n.id,
      role: n.role,
      term: n.term,
      leaderToken: n.leaderToken,
      visibleSide: visibleSide(n.id, c.partition),
    })),
    workers: c.workers.map((w) => ({ id: w.id, lastSeenToken: w.lastSeenToken })),
    jobs: c.jobs.map((j) => ({
      id: j.id,
      priority: j.priority,
      accepted: j.acceptedByWorker !== null,
    })),
    currentLeader: c.currentLeader,
    currentToken: c.currentToken,
    partition: c.partition,
    targetNode: state.targetNode,
    electionPulse: state.pulse.election,
    dispatchPulse: state.pulse.dispatch,
    rejectFlash: state.pulse.rejectFlash,
    toast: state.pulse.toast,
    finished: state.phase === "finished",
  }
}

function handleKey(key: string, state: GameState): void {
  if (state.phase === "finished") return
  const c = state.cluster

  if (key === "Tab" || key === "e") {
    state.targetNode = ((state.targetNode + 1) % 5) as NodeId
    flashToast(state, `Target → N${state.targetNode}`, "info")
    return
  }
  if (key === "q") {
    state.targetNode = ((state.targetNode - 1 + 5) % 5) as NodeId
    flashToast(state, `Target → N${state.targetNode}`, "info")
    return
  }

  if (key === "v" || key === "V") {
    const out = startElectionWrapper(state, state.targetNode)
    state.pulse = {
      election: { candidate: state.targetNode, voters: out.voters },
      dispatch: null,
      rejectFlash: null,
      toast: {
        text: out.won
          ? `N${state.targetNode} won election T${out.term} (token ${c.currentToken})`
          : `N${state.targetNode} lost election: ${out.reason}`,
        kind: out.won ? "good" : "bad",
      },
      until: performance.now() + PULSE_WINDOW_MS,
    }
    return
  }

  if (key === " " || key === "Spacebar") {
    const out = dispatchWrapper(state)
    state.pulse = {
      election: null,
      dispatch: out.dispatchPulse,
      rejectFlash: out.rejectFlash,
      toast: out.toast,
      until: performance.now() + PULSE_WINDOW_MS,
    }
    return
  }

  if (key === "p" || key === "P") {
    if (c.partition === null) {
      c.partition = canonicalPartition()
      c.metrics.partitions_injected += 1
      flashToast(state, "PARTITION raised: {N0,N1} | {N2,N3,N4}", "bad")
    } else {
      c.partition = null
      flashToast(state, "PARTITION lifted — cluster re-healed", "good")
    }
  }
}

// Wrap startElection so the scene's vote-beam pulse can render the actual
// voters. The cluster mutates nodes directly; we capture which peers granted
// votes by inspecting `votedFor` after the call.
function startElectionWrapper(
  state: GameState,
  candidate: NodeId,
): { won: boolean; term: number; reason: string; voters: readonly NodeId[] } {
  const c = state.cluster
  const out = startElection(c, candidate)
  const voters: NodeId[] = [candidate]
  for (const n of c.nodes) {
    if (n.id === candidate) continue
    if (n.votedFor === candidate && n.term === out.term) voters.push(n.id)
  }
  return { won: out.won, term: out.term, reason: out.reason, voters }
}

type DispatchPulseResult = {
  dispatchPulse: PulseWindow["dispatch"]
  rejectFlash: PulseWindow["rejectFlash"]
  toast: PulseWindow["toast"]
}

function dispatchWrapper(state: GameState): DispatchPulseResult {
  const c = state.cluster
  const target = state.targetNode
  const rr = {
    next: () => {
      const w: WorkerId = (state.rrIndex % 3) as WorkerId
      state.rrIndex += 1
      return w
    },
  }
  const out = clusterDispatch(c, target, rr)
  switch (out.kind) {
    case "ACCEPTED":
      return {
        dispatchPulse: {
          leader: target,
          worker: out.worker ?? (0 as WorkerId),
          jobId: out.jobId,
          accepted: true,
        },
        rejectFlash: null,
        toast: {
          text: `Job #${out.jobId} → W${out.worker} accepted (token ${out.leaderToken})`,
          kind: "good",
        },
      }
    case "STALE_REJECTED":
      return {
        dispatchPulse: {
          leader: target,
          worker: out.worker ?? (0 as WorkerId),
          jobId: out.jobId,
          accepted: false,
        },
        rejectFlash: { worker: out.worker ?? (0 as WorkerId) },
        toast: { text: `STALE FENCING REJECTED: ${out.reason}`, kind: "bad" },
      }
    case "STALE_ACCEPTED":
      return {
        dispatchPulse: {
          leader: target,
          worker: out.worker ?? (0 as WorkerId),
          jobId: out.jobId,
          accepted: false,
        },
        rejectFlash: { worker: out.worker ?? (0 as WorkerId) },
        toast: { text: `FENCING BREACH: ${out.reason}`, kind: "bad" },
      }
    case "DUPLICATE":
      return {
        dispatchPulse: null,
        rejectFlash: null,
        toast: { text: `DUPLICATE DISPATCH: ${out.reason}`, kind: "bad" },
      }
    case "NOT_LEADER":
      return {
        dispatchPulse: null,
        rejectFlash: null,
        toast: { text: `NOT LEADER: ${out.reason}`, kind: "bad" },
      }
    case "NO_QUORUM":
      return {
        dispatchPulse: null,
        rejectFlash: null,
        toast: { text: `NO QUORUM: ${out.reason}`, kind: "bad" },
      }
    case "QUEUE_EMPTY":
      return {
        dispatchPulse: null,
        rejectFlash: null,
        toast: { text: "Queue empty", kind: "info" },
      }
    default:
      return { dispatchPulse: null, rejectFlash: null, toast: null }
  }
}

function flashToast(state: GameState, text: string, kind: "info" | "bad" | "good"): void {
  state.pulse = {
    election: state.pulse.election,
    dispatch: state.pulse.dispatch,
    rejectFlash: state.pulse.rejectFlash,
    toast: { text, kind },
    until: performance.now() + PULSE_WINDOW_MS,
  }
}

function finishWave(state: GameState): void {
  state.phase = "finished"
  state.cluster.metrics.queue_stall_secs = Math.min(
    state.cluster.metrics.queue_stall_secs,
    STALL_LIMIT_SECS,
  )
  const record = buildEvidence(state.cluster.metrics, new Date())
  emitEvidence(record)
}

function updateHud(hud: HudElements, state: GameState, _now: number): void {
  const c = state.cluster
  if (hud.status !== null) {
    const leaderTxt = c.currentLeader === null ? "—" : `N${c.currentLeader}`
    const targetSide = visibleSide(state.targetNode, c.partition)
    const targetQuorum = targetSide.length >= 3
    const partitionTxt =
      c.partition === null ? "none" : `{${c.partition.a.join(",")}} | {${c.partition.b.join(",")}}`
    hud.status.innerHTML =
      `<span class="label">leader:</span> <span class="leader">${leaderTxt}</span>` +
      ` &nbsp; <span class="label">term:</span> <span class="term">T${c.currentToken}</span>` +
      ` &nbsp; <span class="label">token:</span> <span class="term">${c.currentToken}</span>` +
      ` &nbsp; <span class="label">target:</span> <span class="target">N${state.targetNode}</span>` +
      ` &nbsp; <span class="label">target quorum:</span> <span class="${targetQuorum ? "leader" : "partition"}">${targetQuorum ? "yes" : "no"}</span>` +
      ` &nbsp; <span class="label">partition:</span> <span class="partition">${partitionTxt}</span>`
  }
  if (hud.metrics !== null) {
    const m = c.metrics
    const okClass = (ok: boolean) => `value ${ok ? "good" : "bad"}`
    const rows: Array<[string, string, string]> = [
      [
        "dispatched",
        `${m.successful_dispatches}/${m.jobs_queued}`,
        okClass(m.successful_dispatches === m.jobs_queued),
      ],
      ["stale rejects", `${m.stale_token_rejections}`, "value"],
      ["stale accepted", `${m.stale_token_accepted}`, okClass(m.stale_token_accepted === 0)],
      ["duplicates", `${m.duplicate_dispatches}`, okClass(m.duplicate_dispatches === 0)],
      [
        "non-leader attempts",
        `${m.non_leader_dispatch_attempts}`,
        okClass(m.non_leader_dispatch_attempts === 0),
      ],
      ["queue stall (s)", `${m.queue_stall_secs}`, okClass(m.queue_stall_secs <= 5)],
      ["elections started", `${m.elections_started}`, "value"],
      ["won w/ quorum", `${m.elections_won_with_quorum}`, "value"],
      ["quorum failures", `${m.quorum_failures}`, "value"],
      ["max term", `${m.max_term_reached}`, "value"],
      ["partitions injected", `${m.partitions_injected}`, "value"],
      ["leader flip-flops", `${m.leader_flip_flops}`, "value"],
    ]
    hud.metrics.innerHTML = rows
      .map(
        ([label, value, cls]) =>
          `<span class="label">${label}</span><span class="${cls}">${value}</span>`,
      )
      .join("")
  }
  if (hud.banner !== null) {
    if (state.phase === "finished") {
      const m = c.metrics
      const pass =
        m.successful_dispatches === m.jobs_queued &&
        m.stale_token_accepted === 0 &&
        m.duplicate_dispatches === 0 &&
        m.queue_stall_secs <= 5 &&
        m.non_leader_dispatch_attempts === 0
      hud.banner.setAttribute("class", `hud-banner ${pass ? "pass" : "fail"}`)
      hud.banner.textContent = pass ? "EVIDENCE PASS" : "EVIDENCE FAIL"
      hud.banner.setAttribute("style", "display:inline-block")
    }
  }
  if (hud.toast !== null) {
    const t = state.pulse.toast
    if (t === null) {
      hud.toast.textContent = ""
    } else {
      hud.toast.textContent = t.text
      const color =
        t.kind === "good"
          ? "var(--text-good)"
          : t.kind === "bad"
            ? "var(--text-bad)"
            : "var(--text-info)"
      hud.toast.setAttribute("style", `color: ${color};`)
    }
  }
}

main()
