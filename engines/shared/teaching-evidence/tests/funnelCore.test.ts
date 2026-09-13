// C5 (checklist .checks/analytics-emitter-consolidation.md): a surfaces batch
// through the core serializes exactly the v3 envelope and flushes at
// FUNNEL_BATCH_MAX_EVENTS = 100. The core is config-driven; these tests pin
// its surfaces configuration — the same one funnelTelemetry's FunnelBatcher
// passes (schemaVersion 3, closed vocabulary from vocabularies/surfaces.json,
// chunk cap 100, fire-and-forget transport).
import { describe, expect, it } from "vitest"
import { FUNNEL_BATCH_MAX_EVENTS, funnelEventIsValid, type FunnelEvent } from "../funnelTelemetry"
import { createFunnelClient, type FunnelCoreBatch, type FunnelCoreTransport } from "../funnelCore"

const UUID_A = "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b"
const FIXED_CLOCK = () => new Date("2026-09-13T12:00:00.000Z")

function recordingTransport(): { transport: FunnelCoreTransport<FunnelEvent>; batches: FunnelCoreBatch<FunnelEvent>[] } {
  const batches: FunnelCoreBatch<FunnelEvent>[] = []
  return {
    batches,
    transport: {
      send(batch) {
        batches.push(batch)
      },
    },
  }
}

/** The surfaces v3 configuration of the core (mirrors FunnelBatcher's). */
function surfacesClient(batches: FunnelCoreBatch<FunnelEvent>[], source: FunnelEvent["source"] = "voxeldojo") {
  return createFunnelClient<FunnelEvent>({
    schemaVersion: 3,
    source,
    validate: funnelEventIsValid,
    identity: { sessionUuid: () => UUID_A, eventUuid: () => UUID_A },
    clock: FIXED_CLOCK,
    batch: { maxPerBatch: FUNNEL_BATCH_MAX_EVENTS, flushAtEvents: FUNNEL_BATCH_MAX_EVENTS },
    transport: {
      send(batch) {
        batches.push(batch)
      },
    },
  })
}

describe("createFunnelClient — surfaces v3 configuration", () => {
  it("serializes the surfaces v3 envelope", () => {
    const { batches } = recordingTransport()
    const client = surfacesClient(batches)
    expect(client.emit("voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed" })).toBe(true)
    client.flush("manual")
    expect(batches).toEqual([
      {
        schemaVersion: 3,
        source: "voxeldojo",
        events: [
          {
            schemaVersion: 3,
            source: "voxeldojo",
            event: "voxel-loop-complete",
            eventId: UUID_A,
            sessionId: UUID_A,
            occurredAt: "2026-09-13T12:00:00.000Z",
            props: { unitId: "U2-key-value-store", result: "completed" },
          },
        ],
      },
    ])
  })

  it("flushes at 100", () => {
    const { batches } = recordingTransport()
    const client = surfacesClient(batches, "dojotoday")
    for (let index = 0; index < FUNNEL_BATCH_MAX_EVENTS - 1; index += 1) {
      expect(client.emit("daily-view-open")).toBe(true)
    }
    expect(batches).toHaveLength(0)
    expect(client.pending).toBe(FUNNEL_BATCH_MAX_EVENTS - 1)
    expect(client.emit("daily-view-open")).toBe(true)
    expect(batches).toHaveLength(1)
    expect(batches[0]?.events).toHaveLength(100)
    expect(client.pending).toBe(0)
  })

  it("stamps configured envelope extras on minted events; closed vocabularies still reject", () => {
    // Extras slot (a future producer's contentVersion-style extra): proven
    // with a stand-in validator, since the surfaces v3 envelope carries none.
    const { batches } = recordingTransport()
    const client = createFunnelClient<FunnelEvent>({
      schemaVersion: 3,
      source: "dojotoday",
      validate: (event) => event.event === "daily-view-open" && event.contentVersion === "test-extras",
      identity: { sessionUuid: () => UUID_A, eventUuid: () => UUID_A },
      clock: FIXED_CLOCK,
      extras: { contentVersion: "test-extras" },
      transport: {
        send(batch) {
          batches.push(batch)
        },
      },
    })
    expect(client.emit("daily-view-open")).toBe(true)
    expect(batches).toHaveLength(0)
    client.flush("manual")
    expect(batches[0]?.events[0]).toMatchObject({ contentVersion: "test-extras" })

    const surfaces = surfacesClient(batches)
    expect(surfaces.emit("daily-view-open", { __not_in_vocabulary__: "x" })).toBe(false)
    expect(surfaces.pending).toBe(0)
  })
})
