/**
 * RELAY STATION simulation core — persistent connections + fan-out + heartbeats.
 *
 * Pure TypeScript, deterministic. The clock is injected (`now: number`); the sim
 * NEVER reads `Date.now()` directly, so the same scripted wave replays bit-for-bit.
 * ZERO `three` imports — all rendering lives in src/scene. If it can't run in
 * Vitest without a GPU, it doesn't belong here.
 */

/** A client station holding a persistent connection to the relay hub. */
export interface Client {
  id: string
  /** holds a live connection right now */
  connected: boolean
  /** sim-clock ts of the last heartbeat ping received from this client */
  lastHeartbeatAt: number
  /** channels this client is subscribed to (fan-out membership) */
  channels: Set<string>
}

/** The whole relay state — the hub plus every known client. */
export interface RelayState {
  clients: Map<string, Client>
}

/** A broadcast result: the message, the channel, and exactly who received it. */
export interface BroadcastResult {
  channel: string
  message: string
  deliveredTo: string[]
  /** connected AND subscribed — the canonical fan-out set (for grading + display) */
  subscribedLive: string[]
}

export function createState(): RelayState {
  return { clients: new Map() }
}

export function cloneState(state: RelayState): RelayState {
  const out = createState()
  for (const [id, c] of state.clients) {
    out.clients.set(id, { ...c, channels: new Set(c.channels) })
  }
  return out
}

/** Add a client with a persistent connection; its first heartbeat is `now`. */
export function connect(state: RelayState, clientId: string, now: number): RelayState {
  const next = cloneState(state)
  next.clients.set(clientId, {
    id: clientId,
    connected: true,
    lastHeartbeatAt: now,
    channels: new Set(),
  })
  return next
}

/** Drop a client's persistent connection (it leaves the live set / orbit). */
export function disconnect(state: RelayState, clientId: string): RelayState {
  const next = cloneState(state)
  const c = next.clients.get(clientId)
  if (c) c.connected = false
  return next
}

/** Fully remove a client record (used by sweepDead when a link goes dark). */
export function remove(state: RelayState, clientId: string): RelayState {
  const next = cloneState(state)
  next.clients.delete(clientId)
  return next
}

/** Subscribe a client to a channel (fan-out membership). Delivery still requires the client to be live. */
export function subscribe(state: RelayState, clientId: string, channel: string): RelayState {
  const next = cloneState(state)
  const c = next.clients.get(clientId)
  if (c) c.channels.add(channel)
  return next
}

/** Unsubscribe a client from a channel. */
export function unsubscribe(state: RelayState, clientId: string, channel: string): RelayState {
  const next = cloneState(state)
  const c = next.clients.get(clientId)
  if (c) c.channels.delete(channel)
  return next
}

/** Mark liveness — a heartbeat ping arrived from this client at `now`. */
export function heartbeat(state: RelayState, clientId: string, now: number): RelayState {
  const next = cloneState(state)
  const c = next.clients.get(clientId)
  if (c) c.lastHeartbeatAt = now
  return next
}

/** Is this client connected right now? */
export function isLive(client: Client): boolean {
  return client.connected
}

/** Is this client subscribed to this channel? */
export function isSubscribed(client: Client, channel: string): boolean {
  return client.channels.has(channel)
}

/**
 * The canonical fan-out set: clients that are BOTH connected AND subscribed to
 * `channel`. This is the load-bearing invariant of the whole concept — broadcast
 * delivers only to live ∩ subscribed, never to dead or non-subscribed clients.
 */
export function subscribedLive(state: RelayState, channel: string): string[] {
  const out: string[] = []
  for (const c of state.clients.values()) {
    if (isLive(c) && isSubscribed(c, channel)) out.push(c.id)
  }
  out.sort()
  return out
}

/**
 * Broadcast `message` on `channel`. Returns the delivered-to set — only clients
 * that are connected AND subscribed. Non-subscribed and dead clients are excluded
 * by construction. `now` is recorded as the broadcast time (unused by delivery
 * but part of the deterministic contract for replay grading).
 */
export function broadcast(
  state: RelayState,
  channel: string,
  message: string,
  now: number,
): BroadcastResult {
  const deliveredTo = subscribedLive(state, channel)
  // `now` is part of the deterministic contract (recorded as the broadcast instant for
  // replay grading); delivery itself depends only on liveness ∩ subscription.
  void now
  return {
    channel,
    message,
    deliveredTo,
    subscribedLive: deliveredTo,
  }
}

/**
 * Sweep every client whose heartbeat is stale (no ping for `timeoutMs`).
 * Returns the new state with stale clients dropped, plus the ids that were
 * swept so the caller can grade/display "missed-heartbeat dropped".
 */
export function sweepDead(
  state: RelayState,
  now: number,
  timeoutMs: number,
): { state: RelayState; dropped: string[] } {
  const dropped: string[] = []
  const next = cloneState(state)
  for (const [id, c] of next.clients) {
    if (c.connected && now - c.lastHeartbeatAt > timeoutMs) {
      dropped.push(id)
    }
  }
  for (const id of dropped) next.clients.delete(id)
  dropped.sort()
  return { state: next, dropped }
}

/** Convenience: the sorted ids of every connected client (the live set). */
export function liveClients(state: RelayState): string[] {
  const out: string[] = []
  for (const c of state.clients.values()) if (isLive(c)) out.push(c.id)
  out.sort()
  return out
}

/** Has this client's heartbeat gone stale relative to `now`/`timeoutMs`? */
export function isStale(client: Client, now: number, timeoutMs: number): boolean {
  return client.connected && now - client.lastHeartbeatAt > timeoutMs
}
