import { describe, expect, it } from "vitest"
import { hashToRing, HashRing, RING_SIZE } from "./ring"
import {
  buildInitialRing,
  defaultWaveSteps,
  DEFAULT_REMAP_BUDGET,
  DEFAULT_SPILL_BUDGET,
  DEFAULT_WAVE_TARGET,
  INITIAL_NODES,
} from "./defaultWave"
import {
  createWaveState,
  handleKey,
  snapshotMetrics,
  type WaveState,
} from "./wave"

describe("hashToRing", () => {
  it("maps strings deterministically into [0, RING_SIZE)", () => {
    for (const key of ["a", "f", "k", "p", "u", "z", "user:42", "hot"]) {
      const h = hashToRing(key)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(RING_SIZE)
    }
  })

  it("is stable across calls (same key → same position)", () => {
    expect(hashToRing("alpha")).toBe(hashToRing("alpha"))
  })

  it("places single-char keys at charCode mod RING_SIZE", () => {
    // The polynomial hash with h=0 starts at charCode for the first char.
    expect(hashToRing("a")).toBe(97 % RING_SIZE) // 33
    expect(hashToRing("f")).toBe(102 % RING_SIZE) // 38
    expect(hashToRing("k")).toBe(107 % RING_SIZE) // 43
    expect(hashToRing("p")).toBe(112 % RING_SIZE) // 48
    expect(hashToRing("u")).toBe(117 % RING_SIZE) // 53
    expect(hashToRing("z")).toBe(122 % RING_SIZE) // 58
  })
})

describe("HashRing", () => {
  it("owns a key by next-clockwise vnode (RING)", () => {
    const ring = buildInitialRing()
    // Sorted vnodes: 3(A), 8(C), 13(B), 23(A), 32(C), 37(B), 47(A), 52(C), 57(B)
    expect(ring.ownerRing(0)).toBe("shard-A") // wrap → vnode at 3
    expect(ring.ownerRing(3)).toBe("shard-A") // exact vnode position
    expect(ring.ownerRing(7)).toBe("shard-C") // → vnode at 8
    expect(ring.ownerRing(33)).toBe("shard-B") // → vnode at 37
    expect(ring.ownerRing(38)).toBe("shard-A") // → vnode at 47
    expect(ring.ownerRing(48)).toBe("shard-C") // → vnode at 52
    expect(ring.ownerRing(58)).toBe("shard-A") // wrap → vnode at 3
  })

  it("mod-N owners shift across the whole ring on add/remove (the trap)", () => {
    // Under MOD-N, adding a node changes the divisor, so MOST positions on the
    // ring get a new owner. Under RING, only positions in the joined arc move.
    const modnBefore = new HashRing()
    for (const n of INITIAL_NODES) modnBefore.add(n.id, n.vnodes)
    const modnAfter = new HashRing()
    for (const n of INITIAL_NODES) modnAfter.add(n.id, n.vnodes)
    modnAfter.add("shard-D", [50, 28, 11])

    const ringBefore = new HashRing()
    for (const n of INITIAL_NODES) ringBefore.add(n.id, n.vnodes)
    const ringAfter = new HashRing()
    for (const n of INITIAL_NODES) ringAfter.add(n.id, n.vnodes)
    ringAfter.add("shard-D", [50, 28, 11])

    let modnChanges = 0
    let ringChanges = 0
    for (let pos = 0; pos < RING_SIZE; pos += 1) {
      if (modnBefore.ownerModN(pos) !== modnAfter.ownerModN(pos)) modnChanges += 1
      if (ringBefore.ownerRing(pos) !== ringAfter.ownerRing(pos)) ringChanges += 1
    }
    // MOD-N scrambles most of the ring on a single add (~2/3 for N=3→4).
    expect(modnChanges).toBeGreaterThanOrEqual(40)
    // RING only touches the keys in the joined arcs (D's 3 vnodes split 3 arcs,
    // each a handful of positions). The contrast is the whole point.
    expect(ringChanges).toBeLessThan(modnChanges / 3)
  })

  it("rejects vnode positions outside [0, RING_SIZE)", () => {
    const ring = new HashRing()
    expect(() => ring.add("x", [-1])).toThrow()
    expect(() => ring.add("x", [RING_SIZE])).toThrow()
    expect(() => ring.add("x", [1.5])).toThrow()
    expect(() => ring.add("x", [])).toThrow()
  })

  it("removes a node cleanly", () => {
    const ring = buildInitialRing()
    expect(ring.size()).toBe(3)
    expect(ring.has("shard-B")).toBe(true)
    expect(ring.remove("shard-B")).toBe(true)
    expect(ring.has("shard-B")).toBe(false)
    expect(ring.size()).toBe(2)
    expect(ring.remove("nope")).toBe(false)
  })
})

describe("default wave (RING strategy, no MOD-N at churn)", () => {
  function playOut(): WaveState {
    const state = createWaveState(buildInitialRing(), defaultWaveSteps(), {
      waveTarget: DEFAULT_WAVE_TARGET,
      spillBudget: DEFAULT_SPILL_BUDGET,
      remapBudget: DEFAULT_REMAP_BUDGET,
    })
    const inputs = [
      "Space", // 1: release "a" → B
      "Space", // 2: release "f" → A
      "Space", // 3: release "k" → A
      "a", // 4: add shard-D (split C's arc, hot key incoming)
      "Space", // 5: release "p" (HOT) → D
      "Space", // 6: release "u" → B
      "Space", // 7: release "z" → A (overflow)
      "x", // 8: remove shard-A (churn)
    ]
    for (const key of inputs) {
      const out = handleKey(state, key)
      expect(out.kind).toBe("advanced")
    }
    return state
  }

  it("routes every key to its next-clockwise owner (misroutes=0)", () => {
    const state = playOut()
    expect(state.accum.keys_routed).toBe(DEFAULT_WAVE_TARGET)
    expect(state.accum.misroutes).toBe(0)
    // Verify final owners match the ring's RING-strategy projection.
    for (const k of state.lockedKeys) {
      expect(k.owner).toBe(state.ring.ownerRing(k.hashPos))
    }
  })

  it("survives 2 churn events (1 add, 1 remove)", () => {
    const state = playOut()
    expect(state.accum.churn_events_survived).toBe(2)
    expect(state.accum.node_adds).toBe(1)
    expect(state.accum.node_removes).toBe(1)
  })

  it("keeps remap minimal under RING (3 remapped, well under budget)", () => {
    const state = playOut()
    expect(state.accum.keys_remapped).toBe(3) // 0 on add + 3 on remove
    expect(state.accum.keys_remapped).toBeLessThanOrEqual(DEFAULT_REMAP_BUDGET)
  })

  it("balanced the hot key with the add (hot_key_balanced=true)", () => {
    const state = playOut()
    expect(state.hotKeyBalanceRequired).toBe(true)
    expect(state.hotKeyBalanced).toBe(true)
    // The hot key "p" (hashPos 48) should be owned by D after the split.
    const hotKey = state.lockedKeys.find((k) => k.isHot)
    expect(hotKey).toBeDefined()
    expect(hotKey?.owner).toBe("shard-D")
  })

  it("ended with 3 live nodes (B, C, D)", () => {
    const state = playOut()
    expect(state.ring.size()).toBe(3)
    expect(state.ring.has("shard-A")).toBe(false)
    expect(state.ring.has("shard-B")).toBe(true)
    expect(state.ring.has("shard-C")).toBe(true)
    expect(state.ring.has("shard-D")).toBe(true)
  })

  it("emits a passing metrics snapshot", () => {
    const state = playOut()
    const m = snapshotMetrics(state)
    expect(m.kind).toBe("threejs-ring-keeper")
    expect(m.keys_routed).toBe(DEFAULT_WAVE_TARGET)
    expect(m.misroutes).toBe(0)
    expect(m.keys_remapped).toBe(3)
    expect(m.remap_budget).toBe(DEFAULT_REMAP_BUDGET)
    expect(m.churn_events_survived).toBe(2)
    expect(m.hot_key_balanced).toBe(true)
    expect(m.spills).toBe(0)
    expect(m.spill_budget).toBe(DEFAULT_SPILL_BUDGET)
    expect(m.strategies_used).toEqual(["ring"])
    expect(m.modn_used_at_churn).toBe(false)
    expect(m.node_count_final).toBe(3)
    expect(m.wave_cleared).toBe(true)
    expect(m.wave_target).toBe(DEFAULT_WAVE_TARGET)
  })
})

describe("MOD-N trap (contrast)", () => {
  it("switching to MOD-N at churn flags modn_used_at_churn", () => {
    const state = createWaveState(buildInitialRing(), defaultWaveSteps(), {
      waveTarget: DEFAULT_WAVE_TARGET,
      spillBudget: DEFAULT_SPILL_BUDGET,
      remapBudget: DEFAULT_REMAP_BUDGET,
    })
    handleKey(state, "Space") // a
    handleKey(state, "Space") // f
    handleKey(state, "Space") // k
    handleKey(state, "1") // toggle to MOD-N — does NOT advance wave
    handleKey(state, "a") // add D under MOD-N: nearly every key remaps
    const m = snapshotMetrics(state)
    expect(m.modn_used_at_churn).toBe(true)
    expect(m.strategies_used).toContain("modn")
    // MOD-N at churn remaps far more than RING would.
    expect(m.keys_remapped).toBeGreaterThan(0)
  })

  it("ignores wrong keys without advancing the wave", () => {
    const state = createWaveState(buildInitialRing(), defaultWaveSteps(), {
      waveTarget: DEFAULT_WAVE_TARGET,
      spillBudget: DEFAULT_SPILL_BUDGET,
      remapBudget: DEFAULT_REMAP_BUDGET,
    })
    const out = handleKey(state, "x") // step 0 expects SPACE
    expect(out.kind).toBe("wrong-key")
    expect(state.stepIndex).toBe(0)
  })
})
