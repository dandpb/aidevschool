import { broadcast, connect, createState, type RelayState, subscribe, sweepDead } from "./relay"

export type LevelId = "L1" | "L2" | "L3" | "L4"

/** A single station as it appears in a wave's scripted configuration. */
export interface StationSpec {
  id: string
  /** starts connected (persistent link up) */
  connected: boolean
  /** channel subscribed to (empty = none) */
  channel: string
  /** sim-clock ts of the last heartbeat (older than now-timeout ⇒ will be swept) */
  lastHeartbeatAt: number
}

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** the channel a broadcast fires on (L2/L4) */
  broadcastChannel: string
  /** the scripted station configuration presented to the player */
  stations: StationSpec[]
  /** sim-clock `now` the wave is evaluated at */
  now: number
  /** heartbeat timeout window (L3/L4) */
  timeoutMs: number
  /** id of the station the player must reconnect in L4 */
  reconnectTarget: string | null
  passRule: string
}

/** The channel used across all broadcast levels. */
const CH = "alerts"

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Persistent link",
    lesson: "A client holds a persistent connection or it doesn't. Predict the live set.",
    broadcastChannel: CH,
    now: 100,
    timeoutMs: 1000,
    reconnectTarget: null,
    stations: [
      { id: "st-0", connected: true, channel: "", lastHeartbeatAt: 100 },
      { id: "st-1", connected: false, channel: "", lastHeartbeatAt: 0 },
      { id: "st-2", connected: true, channel: "", lastHeartbeatAt: 100 },
      { id: "st-3", connected: false, channel: "", lastHeartbeatAt: 0 },
      { id: "st-4", connected: true, channel: "", lastHeartbeatAt: 100 },
    ],
    passRule: "Predict every connected station (the live set) at ≥80% accuracy.",
  },
  {
    id: "L2",
    title: "Broadcast fan-out",
    lesson: "A broadcast delivers only to clients that are live AND subscribed.",
    broadcastChannel: CH,
    now: 100,
    timeoutMs: 1000,
    reconnectTarget: null,
    stations: [
      { id: "st-0", connected: true, channel: CH, lastHeartbeatAt: 100 }, // delivers
      { id: "st-1", connected: true, channel: "", lastHeartbeatAt: 100 }, // live, not subscribed
      { id: "st-2", connected: false, channel: CH, lastHeartbeatAt: 0 }, // subscribed, dead
      { id: "st-3", connected: true, channel: CH, lastHeartbeatAt: 100 }, // delivers
      { id: "st-4", connected: true, channel: "other", lastHeartbeatAt: 100 }, // wrong channel
    ],
    passRule: "Predict the delivery set — live ∩ subscribed at ≥80% accuracy.",
  },
  {
    id: "L3",
    title: "Heartbeat",
    lesson: "A link with no heartbeat for timeoutMs goes dark. Predict the survivors.",
    broadcastChannel: CH,
    now: 200,
    timeoutMs: 100,
    reconnectTarget: null,
    stations: [
      { id: "st-0", connected: true, channel: CH, lastHeartbeatAt: 200 }, // fresh → survives
      { id: "st-1", connected: true, channel: CH, lastHeartbeatAt: 50 }, // stale (200-50=150>100)
      { id: "st-2", connected: true, channel: CH, lastHeartbeatAt: 190 }, // fresh → survives
      { id: "st-3", connected: true, channel: CH, lastHeartbeatAt: 0 }, // stale
      { id: "st-4", connected: true, channel: CH, lastHeartbeatAt: 195 }, // fresh → survives
    ],
    passRule: "Predict every link still live after the sweep at ≥80% accuracy.",
  },
  {
    id: "L4",
    title: "Recovery",
    lesson:
      "A dropped client reconnects, re-subscribes, and rejoins the next fan-out — the full lifecycle.",
    broadcastChannel: CH,
    now: 300,
    timeoutMs: 100,
    reconnectTarget: "st-2",
    stations: [
      { id: "st-0", connected: true, channel: CH, lastHeartbeatAt: 300 }, // live, subscribed
      { id: "st-1", connected: true, channel: CH, lastHeartbeatAt: 300 }, // live, subscribed
      // st-2 was dropped by a prior heartbeat sweep (not present in the initial live set)
      { id: "st-2", connected: false, channel: "", lastHeartbeatAt: 0 },
      { id: "st-3", connected: true, channel: CH, lastHeartbeatAt: 300 }, // live, subscribed
    ],
    passRule: "Reconnect the dropped station, then confirm it receives the next broadcast.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

/** Build the initial RelayState for a level (only connected stations present). */
export function buildState(cfg: LevelConfig): RelayState {
  let s = createState()
  for (const st of cfg.stations) {
    if (st.connected) {
      s = connect(s, st.id, st.lastHeartbeatAt)
      if (st.channel) s = subscribe(s, st.id, st.channel)
    }
  }
  return s
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

/**
 * Grade a set-prediction wave (L1/L2/L3). Accuracy = (TP + TN) / total stations,
 * where TP = correctly predicted IN the set and TN = correctly predicted NOT in the
 * set, counted over ALL `total` stations (not just the union). Both false positives
 * and false negatives count against the player. Pass requires accuracy ≥ 0.8, so a
 * perfect prediction of any subset clears (TP+TN = total).
 */
export function evaluateSetPrediction(args: {
  predicted: readonly string[]
  truth: readonly string[]
  total: number
  label: string
}): WaveOutcome {
  const pred = new Set(args.predicted)
  const truth = new Set(args.truth)
  // true negatives = stations in neither set; count them directly.
  const inUnion = new Set<string>([...truth, ...pred])
  let tp = 0
  for (const id of truth) if (pred.has(id)) tp++
  const tn = args.total - inUnion.size
  const correct = tp + tn
  const accuracy = args.total === 0 ? 0 : correct / args.total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      [`${args.label}_accuracy`]: round2(accuracy),
      [`${args.label}_predicted`]: pred.size,
      [`${args.label}_truth`]: truth.size,
      [`${args.label}_total`]: args.total,
    },
  }
}

/** L1: predict the live set (every connected client). */
export function evaluateConnectedPrediction(
  cfg: LevelConfig,
  predicted: readonly string[],
): WaveOutcome {
  const state = buildState(cfg)
  const truth = [...state.clients.keys()].sort()
  return evaluateSetPrediction({
    predicted,
    truth,
    total: cfg.stations.length,
    label: "connected",
  })
}

/** L2: predict the broadcast delivery set (live ∩ subscribed). */
export function evaluateDeliveryPrediction(
  cfg: LevelConfig,
  predicted: readonly string[],
): WaveOutcome {
  const state = buildState(cfg)
  const truth = broadcast(state, cfg.broadcastChannel, "m", cfg.now).deliveredTo
  return evaluateSetPrediction({
    predicted,
    truth,
    total: cfg.stations.length,
    label: "delivery",
  })
}

/** L3: predict the survivor set after the heartbeat sweep. */
export function evaluateSurvivorPrediction(
  cfg: LevelConfig,
  predicted: readonly string[],
): WaveOutcome {
  const base = buildState(cfg)
  const { dropped } = sweepDeadWrapped(base, cfg.now, cfg.timeoutMs)
  const truth = cfg.stations
    .filter((st) => st.connected && !dropped.includes(st.id))
    .map((st) => st.id)
    .sort()
  const out = evaluateSetPrediction({
    predicted,
    truth,
    total: cfg.stations.length,
    label: "survivor",
  })
  return {
    ...out,
    metrics: { ...out.metrics, missed_heartbeat_dropped: dropped.length },
  }
}

/** L4: grade a reconnect. Pass = the reconnected client receives the next broadcast. */
export function evaluateRecovery(args: { cfg: LevelConfig; reconnectedId: string }): WaveOutcome {
  const cfg = args.cfg
  let state = buildState(cfg)
  const before = broadcast(state, cfg.broadcastChannel, "m", cfg.now).deliveredTo
  // recovery: reconnect + re-subscribe + fresh heartbeat
  const target = cfg.stations.find((st) => st.id === args.reconnectedId)
  const wasDropped = target ? !target.connected : false
  state = connect(state, args.reconnectedId, cfg.now)
  state = subscribe(state, args.reconnectedId, cfg.broadcastChannel)
  const after = broadcast(state, cfg.broadcastChannel, "m", cfg.now).deliveredTo
  const rejoined = after.includes(args.reconnectedId) && !before.includes(args.reconnectedId)
  return {
    pass: rejoined && wasDropped,
    metrics: {
      target_correct: args.reconnectedId === cfg.reconnectTarget,
      rejoined_fanout: rejoined,
      delivered_after: after.length,
      was_dropped: wasDropped,
    },
  }
}

/** Internal: sweepDead wrapper kept here to avoid a circular-feeling import noise in callers. */
function sweepDeadWrapped(state: RelayState, now: number, timeoutMs: number) {
  return sweepDead(state, now, timeoutMs)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
