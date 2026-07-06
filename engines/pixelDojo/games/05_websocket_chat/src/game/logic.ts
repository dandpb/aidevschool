// Pure switch-fabric game logic for 05_websocket_chat.
//
// The pedagogical core is the WebSocket connection lifecycle and broadcast
// fan-out: one persistent tether per client, one inbound message routed to
// every member of the target color-band room. Dead-heartbeat clients must be
// pruned before the next fan-out (their copies would otherwise drop into the
// void — a "missed disconnect"). The pure state machine below is what the
// three.js scene mirrors; all discipline (no leaks, no missed disconnects, no
// deadline misses) is enforced here so the unit test can prove it without a
// GPU.

export const ROOM_COLORS = ["cyan", "magenta"] as const
export const ROOM_COUNT = ROOM_COLORS.length
export const LEVEL = 2
export const LIVE_CLIENTS = 12
export const WAVE_QUOTA = 8
// L2 specifically does NOT yet penalize prune discipline — see PLAN §7. So no
// clients die during the L2 wave (heartbeats stay healthy). The dead-peer /
// prune path is still implemented and unit-tested so L3 can flip it on.
export const L2_HEARTBEAT_DECAY_PER_TICK = 0
export const L2_SLOW_CONSUMER_TOLERANCE = 0
export const L2_DEADLINE_MS = 8000
export const L2_SPAWN_INTERVAL_MS = 1200

export type RoomColor = (typeof ROOM_COLORS)[number]
export type RoomId = 0 | 1

export type Client = {
  readonly id: number
  readonly room: RoomId
  readonly angle: number
  readonly radius: number
  readonly height: number
  alive: boolean
  heartbeat: number // 0..1
  buffer: number // outstanding fan-out copies draining
}

export type Message = {
  readonly id: number
  readonly targetRoom: RoomId
  readonly bornAt: number
  readonly deadlineMs: number
  broadcast: boolean
  broadcastAtRoom: RoomId | null
  fannedOutAt: number | null
  expired: boolean
}

export type Metrics = {
  readonly kind: "threejs-websocket-chat"
  readonly level: number
  readonly rooms_managed: number
  readonly live_clients: number
  readonly messages_inbound: number
  readonly messages_broadcast: number
  readonly correct_deliveries: number
  readonly wrong_room_leaks: number
  readonly missed_disconnects: number
  readonly slow_consumer_drops: number
  readonly deadline_misses: number
}

export type GameState = {
  readonly startedAt: number
  readonly clients: Client[]
  readonly messages: Message[]
  focusedRoom: RoomId
  nextMessageId: number
  nextSpawnAt: number
  spawnedInbound: number
  metrics: Metrics
  finished: boolean
  won: boolean
}

export function roomColor(id: RoomId): RoomColor {
  return ROOM_COLORS[id]
}

export function makeClient(id: number, room: RoomId): Client {
  // Spread members of each room around their own depth band so rooms are
  // visually distinct color rings around the hub.
  const sameRoomIndex = id % 6
  const angle = (sameRoomIndex / 6) * Math.PI * 2 + (room === 1 ? Math.PI / 6 : 0)
  const radius = room === 0 ? 4.5 : 6.5
  const height = room === 0 ? 1.2 : -1.2
  return {
    id,
    room,
    angle,
    radius,
    height,
    alive: true,
    heartbeat: 1,
    buffer: 0,
  }
}

export function createState(startedAt: number): GameState {
  const clients: Client[] = []
  for (let i = 0; i < LIVE_CLIENTS; i += 1) {
    const room: RoomId = i % 2 === 0 ? 0 : 1
    clients.push(makeClient(i, room))
  }
  return {
    startedAt,
    clients,
    messages: [],
    focusedRoom: 0,
    nextMessageId: 1,
    nextSpawnAt: startedAt,
    spawnedInbound: 0,
    metrics: emptyMetrics(),
    finished: false,
    won: false,
  }
}

export function emptyMetrics(): Metrics {
  return {
    kind: "threejs-websocket-chat",
    level: LEVEL,
    rooms_managed: ROOM_COUNT,
    live_clients: 0,
    messages_inbound: 0,
    messages_broadcast: 0,
    correct_deliveries: 0,
    wrong_room_leaks: 0,
    missed_disconnects: 0,
    slow_consumer_drops: 0,
    deadline_misses: 0,
  }
}

export function liveMembersOfRoom(state: GameState, room: RoomId): Client[] {
  return state.clients.filter((c) => c.room === room && c.alive)
}

// Cycle the focused room by +1 / -1 (mod ROOM_COUNT). NES-pad friendly.
export function cycleFocus(state: GameState, direction: 1 | -1): GameState {
  if (state.finished) return state
  const next = (((state.focusedRoom + direction) % ROOM_COUNT) + ROOM_COUNT) % ROOM_COUNT
  state.focusedRoom = next as RoomId
  return state
}

// Spawn the next inbound message particle if it is time. The PLAN calls for a
// wave of `WAVE_QUOTA` inbound particles. Each particle's target room is
// deterministic (alternates) so the verifier can reproduce the wave.
export function maybeSpawn(state: GameState, now: number): GameState {
  if (state.finished) return state
  if (state.spawnedInbound >= WAVE_QUOTA) return state
  if (now < state.nextSpawnAt) return state
  const targetRoom: RoomId = (state.spawnedInbound % 2 === 0 ? 0 : 1) as RoomId
  state.messages.push({
    id: state.nextMessageId,
    targetRoom,
    bornAt: now,
    deadlineMs: L2_DEADLINE_MS,
    broadcast: false,
    broadcastAtRoom: null,
    fannedOutAt: null,
    expired: false,
  })
  state.nextMessageId += 1
  state.spawnedInbound += 1
  state.nextSpawnAt = now + L2_SPAWN_INTERVAL_MS
  return state
}

// Player action: fan out the oldest un-broadcast inbound message to the
// currently focused room. This is THE pedagogical move — one inbound particle
// becomes N copies, one per live member of the chosen room. Wrong room is a
// leak (isolation failure). An unpruned dead client in the target room is a
// missed disconnect.
export function broadcast(state: GameState, now: number): GameState {
  if (state.finished) return state
  const pending = state.messages.find((m) => !m.broadcast && !m.expired)
  if (pending === undefined) return state
  if (now >= pending.bornAt + pending.deadlineMs) {
    return expireMessage(state, pending.id, now)
  }
  const targetRoom = state.focusedRoom
  const members = state.clients.filter((c) => c.room === targetRoom)
  let correct = 0
  let leaks = 0
  let missed = 0
  let slow = 0
  for (const client of members) {
    if (client.alive) {
      if (client.buffer > 0) {
        // Slow consumer: previous fan-out hasn't drained — over-paced
        // broadcast bounces (visible spark in the scene).
        slow += 1
        continue
      }
      client.buffer = 1
      if (targetRoom === pending.targetRoom) {
        correct += 1
      } else {
        leaks += 1
      }
    } else {
      // Dead client left on the wire — fan-out copy drops into the void.
      missed += 1
    }
  }
  pending.broadcast = true
  pending.broadcastAtRoom = targetRoom
  pending.fannedOutAt = now
  state.metrics = {
    ...state.metrics,
    messages_broadcast: state.metrics.messages_broadcast + 1,
    correct_deliveries: state.metrics.correct_deliveries + correct,
    wrong_room_leaks: state.metrics.wrong_room_leaks + leaks,
    missed_disconnects: state.metrics.missed_disconnects + missed,
    slow_consumer_drops: state.metrics.slow_consumer_drops + slow,
  }
  return maybeFinish(state, now)
}

// Player action: prune (disconnect) a dead client. In L2 no clients ever die,
// so this is a no-op (and must remain so for the L2 gate).
export function disconnectDead(state: GameState, _clientId: number, _now: number): GameState {
  if (state.finished) return state
  return state
}

// Mark a message as expired (deadline miss). Counts as a fail metric.
export function expireMessage(state: GameState, messageId: number, now: number): GameState {
  const msg = state.messages.find((m) => m.id === messageId)
  if (msg === undefined || msg.broadcast || msg.expired) return state
  msg.expired = true
  state.metrics = {
    ...state.metrics,
    deadline_misses: state.metrics.deadline_misses + 1,
  }
  return maybeFinish(state, now)
}

// Drive a single simulation tick: decay heartbeats, drain client buffers,
// expire past-deadline messages, and detect wave-end.
export function tick(state: GameState, now: number): GameState {
  if (state.finished) return state
  // Heartbeat decay + presence pruning.
  for (const client of state.clients) {
    if (client.alive) {
      client.heartbeat = Math.max(0, client.heartbeat - L2_HEARTBEAT_DECAY_PER_TICK)
      if (client.heartbeat <= 0) {
        client.alive = false
      }
    }
  }
  // Drain slow-consumer buffers so a paced next broadcast can land.
  for (const client of state.clients) {
    if (client.buffer > 0) client.buffer = Math.max(0, client.buffer - 1)
  }
  // Expire past-deadline inbound particles.
  for (const msg of state.messages) {
    if (!msg.broadcast && !msg.expired && now >= msg.bornAt + msg.deadlineMs) {
      expireMessage(state, msg.id, now)
    }
  }
  return maybeFinish(state, now)
}

// Wave ends when the quota has been spawned AND every spawned particle is
// either broadcast or expired. Win requires all the PLAN §6 invariants.
export function maybeFinish(state: GameState, now: number): GameState {
  if (state.finished) return state
  if (state.spawnedInbound < WAVE_QUOTA) return state
  const allResolved = state.messages.every((m) => m.broadcast || m.expired)
  if (!allResolved) return state
  const liveCount = state.clients.filter((c) => c.alive).length
  const metrics: Metrics = {
    ...state.metrics,
    messages_inbound: state.spawnedInbound,
    live_clients: liveCount,
  }
  state.metrics = metrics
  state.finished = true
  state.won = isWin(metrics)
  // `now` is the seal timestamp; unused by metrics but reserved for telemetry.
  void now
  return state
}

export function isWin(metrics: Metrics): boolean {
  return (
    metrics.kind === "threejs-websocket-chat" &&
    metrics.messages_broadcast === metrics.messages_inbound &&
    metrics.wrong_room_leaks === 0 &&
    metrics.missed_disconnects === 0 &&
    metrics.deadline_misses === 0 &&
    metrics.slow_consumer_drops <= L2_SLOW_CONSUMER_TOLERANCE
  )
}

// Live inbound particle the scene should render at the hub (the one currently
// awaiting broadcast). null between spawns / after wave-end.
export function activeMessage(state: GameState): Message | null {
  return state.messages.find((m) => !m.broadcast && !m.expired) ?? null
}
