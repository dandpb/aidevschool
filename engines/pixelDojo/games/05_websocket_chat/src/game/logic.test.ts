import { describe, expect, it } from "vitest"
import {
  type GameState,
  type RoomId,
  WAVE_QUOTA,
  broadcast,
  createState,
  cycleFocus,
  isWin,
  liveMembersOfRoom,
  maybeSpawn,
  maybeFinish,
} from "./logic"

// Drive the deterministic L2 wave manually (no real clock) so the test can
// prove the discipline end-to-end: alternate rooms, fan-out each message to
// its target room, and assert a clean win with all gates satisfied.
function playCleanWave(): GameState {
  let state = createState(0)
  // Spawn + immediately resolve each inbound particle in spawn order.
  for (let i = 0; i < WAVE_QUOTA; i += 1) {
    state = maybeSpawn(state, i * 1000)
    const active = state.messages.find((m) => !m.broadcast && !m.expired)
    if (active === undefined) throw new Error(`no active message at step ${i}`)
    // Move focus to the message's target room.
    while (state.focusedRoom !== active.targetRoom) {
      state = cycleFocus(state, 1)
    }
    state = broadcast(state, i * 1000 + 1)
  }
  return state
}

describe("05_websocket_chat logic", () => {
  it("creates an L2 wave with 12 live clients across 2 rooms", () => {
    const state = createState(0)
    expect(state.clients).toHaveLength(12)
    const room0 = state.clients.filter((c) => c.room === 0)
    const room1 = state.clients.filter((c) => c.room === 1)
    expect(room0).toHaveLength(6)
    expect(room1).toHaveLength(6)
    expect(state.clients.every((c) => c.alive)).toBe(true)
    expect(state.focusedRoom).toBe(0)
  })

  it("spawns a single inbound particle per interval up to the wave quota", () => {
    let state = createState(0)
    state = maybeSpawn(state, 0)
    expect(state.messages).toHaveLength(1)
    state = maybeSpawn(state, 100)
    expect(state.messages).toHaveLength(1)
    state = maybeSpawn(state, 1300)
    expect(state.messages).toHaveLength(2)
  })

  it("fans out one copy per live member of the focused room", () => {
    let state = createState(0)
    state = maybeSpawn(state, 0)
    const active = state.messages[0]
    if (active === undefined) throw new Error("no message")
    const room = active.targetRoom as RoomId
    while (state.focusedRoom !== room) state = cycleFocus(state, 1)
    const before = liveMembersOfRoom(state, room).length
    state = broadcast(state, 1)
    expect(state.metrics.messages_broadcast).toBe(1)
    expect(state.metrics.correct_deliveries).toBe(before)
    expect(state.metrics.wrong_room_leaks).toBe(0)
  })

  it("counts a wrong-room fan-out as a leak (isolation failure)", () => {
    let state = createState(0)
    state = maybeSpawn(state, 0)
    const active = state.messages[0]
    if (active === undefined) throw new Error("no message")
    // Force the wrong room: cycle to whichever room the message is NOT for.
    const wrongRoom: RoomId = active.targetRoom === 0 ? 1 : 0
    while (state.focusedRoom !== wrongRoom) state = cycleFocus(state, 1)
    state = broadcast(state, 1)
    expect(state.metrics.wrong_room_leaks).toBeGreaterThan(0)
    expect(state.metrics.correct_deliveries).toBe(0)
    expect(isWin(state.metrics)).toBe(false)
  })

  it("cycles the focused room modulo ROOM_COUNT in both directions", () => {
    let state = createState(0)
    expect(state.focusedRoom).toBe(0)
    state = cycleFocus(state, 1)
    expect(state.focusedRoom).toBe(1)
    state = cycleFocus(state, 1)
    expect(state.focusedRoom).toBe(0)
    state = cycleFocus(state, -1)
    expect(state.focusedRoom).toBe(1)
  })

  it("does not finish until the full quota is spawned and resolved", () => {
    let state = createState(0)
    state = maybeSpawn(state, 0)
    state = broadcast(state, 1)
    expect(state.finished).toBe(false)
  })

  it("wins the clean L2 wave with all gates satisfied", () => {
    const state = playCleanWave()
    expect(state.spawnedInbound).toBe(WAVE_QUOTA)
    const m = state.metrics
    expect(m.messages_inbound).toBe(WAVE_QUOTA)
    expect(m.messages_broadcast).toBe(WAVE_QUOTA)
    // 6 members per room * 4 messages per room = 24 correct deliveries.
    expect(m.correct_deliveries).toBe(24)
    expect(m.wrong_room_leaks).toBe(0)
    expect(m.missed_disconnects).toBe(0)
    expect(m.deadline_misses).toBe(0)
    expect(m.slow_consumer_drops).toBe(0)
    expect(state.finished).toBe(true)
    expect(state.won).toBe(true)
    expect(isWin(m)).toBe(true)
  })

  it("maybeFinish is idempotent once the wave has resolved", () => {
    const state = playCleanWave()
    const before = state.metrics
    const after = maybeFinish(state, 9999)
    expect(after.metrics).toEqual(before)
    expect(after.finished).toBe(true)
  })
})
