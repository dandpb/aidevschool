import { describe, expect, it } from "vitest"
import {
  evaluateConnectedPrediction,
  evaluateDeliveryPrediction,
  evaluateRecovery,
  evaluateSurvivorPrediction,
  levelConfig,
} from "./levels"
import {
  type BroadcastResult,
  broadcast,
  connect,
  createState,
  disconnect,
  heartbeat,
  isStale,
  liveClients,
  remove,
  subscribe,
  sweepDead,
  unsubscribe,
} from "./relay"

/**
 * The four load-bearing proofs of the RELAY STATION concept, all headless:
 *  1. broadcast delivers ONLY to live + subscribed clients (fan-out = live ∩ subscribed)
 *  2. a missed-heartbeat client is swept and excluded from the next broadcast
 *  3. subscribe / unsubscribe changes the fan-out set
 *  4. determinism — same injected clock + seed ⇒ same delivery set
 */

describe("fan-out = live ∩ subscribed (the L2 lesson)", () => {
  it("broadcast delivers ONLY to clients that are both connected and subscribed", () => {
    let s = createState()
    // four clients; mixed live/subscribed matrix
    s = connect(s, "a", 0) // live, will subscribe
    s = connect(s, "b", 0) // live, will NOT subscribe
    s = connect(s, "c", 0) // will subscribe then disconnect (dead)
    s = connect(s, "d", 0) // live, will subscribe
    s = subscribe(s, "a", "alerts")
    s = subscribe(s, "c", "alerts")
    s = subscribe(s, "d", "alerts")
    s = disconnect(s, "c") // dead now — must be excluded even though subscribed

    const result = broadcast(s, "alerts", "ping", 100)

    // a and d are live+subscribed; b is live but not subscribed; c is subscribed but dead
    expect(result.deliveredTo).toEqual(["a", "d"])
    expect(result.deliveredTo).not.toContain("b")
    expect(result.deliveredTo).not.toContain("c")
  })

  it("subscribedLive matches deliveredTo exactly", () => {
    let s = createState()
    s = connect(s, "x", 0)
    s = connect(s, "y", 0)
    s = subscribe(s, "x", "ch")
    const result: BroadcastResult = broadcast(s, "ch", "m", 5)
    expect(result.subscribedLive).toEqual(result.deliveredTo)
    expect(result.subscribedLive).toEqual(["x"])
  })
})

describe("missed heartbeat → swept → excluded from next broadcast (the L3 lesson)", () => {
  it("sweepDead drops clients whose lastHeartbeatAt is older than timeoutMs", () => {
    let s = createState()
    s = connect(s, "fresh", 100) // heartbeated at 100
    s = connect(s, "stale", 10) // heartbeated at 10 — old
    s = subscribe(s, "fresh", "ch")
    s = subscribe(s, "stale", "ch")

    // timeout 50ms; at now=100, fresh is fine (100-100=0), stale is stale (100-10=90>50)
    const { state: swept, dropped } = sweepDead(s, 100, 50)
    expect(dropped).toEqual(["stale"])
    expect(swept.clients.has("stale")).toBe(false)
    expect(swept.clients.has("fresh")).toBe(true)
  })

  it("a swept client is excluded from the next broadcast", () => {
    let s = createState()
    s = connect(s, "alive", 200)
    s = connect(s, "ghost", 0) // never heartbeated since connect at t=0
    s = subscribe(s, "alive", "alerts")
    s = subscribe(s, "ghost", "alerts")

    // before sweep both are subscribed+live → both deliver
    expect(broadcast(s, "alerts", "m", 200).deliveredTo).toEqual(["alive", "ghost"])

    const { state: swept } = sweepDead(s, 200, 100) // ghost: 200-0=200>100 → dropped
    const after = broadcast(swept, "alerts", "m", 200)
    expect(after.deliveredTo).toEqual(["alive"])
    expect(after.deliveredTo).not.toContain("ghost")
  })

  it("isStale flags the right client and heartbeat clears the flag", () => {
    let s = createState()
    s = connect(s, "c", 0)
    expect(isStale(s.clients.get("c") as never, 60, 50)).toBe(true)
    s = heartbeat(s, "c", 60)
    expect(isStale(s.clients.get("c") as never, 60, 50)).toBe(false)
  })
})

describe("subscribe / unsubscribe changes the fan-out set (the membership lesson)", () => {
  it("subscribing a live client adds it to the next broadcast delivery", () => {
    let s = createState()
    s = connect(s, "a", 0)
    expect(broadcast(s, "ch", "m", 0).deliveredTo).toEqual([])
    s = subscribe(s, "a", "ch")
    expect(broadcast(s, "ch", "m", 0).deliveredTo).toEqual(["a"])
  })

  it("unsubscribing removes a client from the delivery set without dropping the connection", () => {
    let s = createState()
    s = connect(s, "a", 0)
    s = connect(s, "b", 0)
    s = subscribe(s, "a", "ch")
    s = subscribe(s, "b", "ch")
    expect(broadcast(s, "ch", "m", 0).deliveredTo).toEqual(["a", "b"])

    s = unsubscribe(s, "a", "ch")
    expect(broadcast(s, "ch", "m", 0).deliveredTo).toEqual(["b"])
    // connection still live
    expect(liveClients(s)).toEqual(["a", "b"])
  })
})

describe("connect / disconnect (the L1 persistent-link lesson)", () => {
  it("connect adds a live client; disconnect removes it from the live set but keeps the record", () => {
    let s = createState()
    s = connect(s, "a", 0)
    s = connect(s, "b", 0)
    expect(liveClients(s)).toEqual(["a", "b"])
    s = disconnect(s, "a")
    expect(liveClients(s)).toEqual(["b"])
    // record persists (idempotent reconnect semantics)
    expect(s.clients.has("a")).toBe(true)
  })

  it("a reconnected client (remove then connect) rejoins the live set", () => {
    let s = createState()
    s = connect(s, "a", 0)
    s = subscribe(s, "a", "ch")
    s = remove(s, "a") // full drop
    expect(liveClients(s)).toEqual([])
    s = connect(s, "a", 50) // recovery
    s = subscribe(s, "a", "ch") // re-subscribe (recovery re-arms membership)
    expect(broadcast(s, "ch", "m", 50).deliveredTo).toEqual(["a"])
  })
})

describe("determinism (injected clock ⇒ replayable waves)", () => {
  it("the exact same sequence of operations yields the exact same delivery set", () => {
    function run(): string[] {
      let s = createState()
      s = connect(s, "a", 0)
      s = connect(s, "b", 0)
      s = connect(s, "c", 0)
      s = subscribe(s, "a", "ch")
      s = subscribe(s, "c", "ch")
      s = heartbeat(s, "a", 10)
      s = heartbeat(s, "c", 10)
      // b never heartbeats → stale
      const { state: swept } = sweepDead(s, 60, 50)
      return broadcast(swept, "ch", "m", 60).deliveredTo
    }
    expect(run()).toEqual(run())
    // and the value is the deterministic truth: a (live, sub, fresh), c (live, sub, fresh), b dropped
    expect(run()).toEqual(["a", "c"])
  })
})

describe("edge cases", () => {
  it("broadcast on a channel nobody subscribed to delivers to nobody", () => {
    let s = createState()
    s = connect(s, "a", 0)
    expect(broadcast(s, "ghost-channel", "m", 0).deliveredTo).toEqual([])
  })

  it("sweepDead with no clients is a no-op returning an empty drop list", () => {
    const s = createState()
    const { state, dropped } = sweepDead(s, 999, 10)
    expect(dropped).toEqual([])
    expect(state.clients.size).toBe(0)
  })

  it("subscribing a never-connected client records the channel but it never delivers (not live)", () => {
    let s = createState()
    s = subscribe(s, "phantom", "ch") // no connect first
    expect(s.clients.has("phantom")).toBe(false) // subscribe is no-op on unknown client
    expect(broadcast(s, "ch", "m", 0).deliveredTo).toEqual([])
  })
})

describe("level evaluation (L1–L4 grading contract)", () => {
  it("L1: a perfect connected-set prediction clears; an empty prediction fails", () => {
    const cfg = levelConfig("L1")
    const truth = ["st-0", "st-2", "st-4"] // the connected stations in the scripted config
    expect(evaluateConnectedPrediction(cfg, truth).pass).toBe(true)
    expect(evaluateConnectedPrediction(cfg, []).pass).toBe(false)
  })

  it("L2: a perfect delivery-set prediction clears; predicting all stations fails", () => {
    const cfg = levelConfig("L2")
    const truth = ["st-0", "st-3"] // live ∩ subscribed to "alerts"
    expect(evaluateDeliveryPrediction(cfg, truth).pass).toBe(true)
    const all = cfg.stations.map((s) => s.id)
    expect(evaluateDeliveryPrediction(cfg, all).pass).toBe(false)
  })

  it("L3: a perfect survivor-set prediction clears; predicting the stale ones fails", () => {
    const cfg = levelConfig("L3")
    const survivors = ["st-0", "st-2", "st-4"] // fresh heartbeats
    expect(evaluateSurvivorPrediction(cfg, survivors).pass).toBe(true)
    const stale = ["st-1", "st-3"] // these get swept
    expect(evaluateSurvivorPrediction(cfg, stale).pass).toBe(false)
  })

  it("L4: reconnecting the dropped target rejoins the fan-out and clears", () => {
    const cfg = levelConfig("L4")
    const out = evaluateRecovery({ cfg, reconnectedId: cfg.reconnectTarget as string })
    expect(out.pass).toBe(true)
    expect(out.metrics.rejoined_fanout).toBe(true)
    // reconnecting a station that wasn't the dropped target fails
    const wrong = evaluateRecovery({ cfg, reconnectedId: "st-0" })
    expect(wrong.pass).toBe(false)
  })
})
