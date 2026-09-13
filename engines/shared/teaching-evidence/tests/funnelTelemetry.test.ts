// AID-1673 (hardening-top10 R3): package-level funnel suite — activation rule
// and singleton/no-op semantics of the anonymous funnel emitter. The batcher
// unit behavior and closed vocabularies are pinned by the emitter-side suite
// at engines/voxelDojo/shared/funnelTelemetry.test.ts, and the dualEmit
// piggyback wiring (which funnel events fire per channel) is pinned in
// tests/evidenceTransport.test.ts via the emitFunnelEvent seam. The
// build-time VITE_ANALYTICS_ENDPOINT activation itself is a bundler define
// (AID-913 pattern) and is intentionally inert in non-Vite runtimes.
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  FUNNEL_EVENT_PROPS,
  InMemoryFunnelTransport,
  FunnelBatcher,
  emitFunnelEvent,
  funnelEndpointPath,
  resetFunnelBatchers,
} from "../funnelTelemetry"
import { resetEvidenceSeams, stubBrowserWindow } from "./harness"

afterEach(() => {
  resetEvidenceSeams()
})

const UUID_A = "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b"
const FIXED_CLOCK = () => new Date("2026-09-13T12:00:00.000Z")

describe("emitFunnelEvent — deploy-activated no-op semantics", () => {
  it("is a no-op outside a browser", () => {
    expect(
      emitFunnelEvent("voxeldojo", "voxel-loop-complete", {
        unitId: "U2-key-value-store",
        result: "completed",
      }),
    ).toBe(false)
  })

  it("is a no-op in a browser whose deploy did not activate the endpoint", () => {
    stubBrowserWindow()
    expect(
      emitFunnelEvent("voxeldojo", "voxel-loop-complete", {
        unitId: "U2-key-value-store",
        result: "completed",
      }),
    ).toBe(false)
  })
})

describe("funnelEndpointPath — same-origin activation rule", () => {
  it("accepts only a non-empty absolute path", () => {
    expect(funnelEndpointPath({})).toBeNull()
    expect(funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: "" })).toBeNull()
    expect(funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: "https://evil.example/collect" })).toBeNull()
    expect(funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: "/__dojo/bridge/v1/analytics" })).toBe(
      "/__dojo/bridge/v1/analytics",
    )
  })
})

describe("resetFunnelBatchers — test isolation seam", () => {
  it("is safe to call and leaves an inert runtime inert", () => {
    stubBrowserWindow()
    expect(
      emitFunnelEvent("voxeldojo", "voxel-loop-complete", {
        unitId: "U2-key-value-store",
        result: "completed",
      }),
    ).toBe(false)
    resetFunnelBatchers()
    expect(emitFunnelEvent("dojotoday", "daily-view-open")).toBe(false)
    resetFunnelBatchers()
  })
})

describe("FunnelBatcher — collector-envelope shape from the package side", () => {
  it("delivers a schemaVersion 3 batch carrying the source and events", () => {
    const transport = new InMemoryFunnelTransport()
    const batcher = new FunnelBatcher("voxeldojo", transport, {
      createId: () => UUID_A,
      clock: FIXED_CLOCK,
    })
    expect(batcher.emit("voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed" })).toBe(true)
    batcher.flush("manual")
    const batch = transport.batches[0]
    expect(batch?.schemaVersion).toBe(3)
    expect(batch?.source).toBe("voxeldojo")
    expect(batch?.events[0]?.occurredAt).toBe("2026-09-13T12:00:00.000Z")
    expect(batch?.events[0]?.props).toEqual({ unitId: "U2-key-value-store", result: "completed" })
  })

  it("pins the per-event prop vocabularies mirrored by the collector", () => {
    expect(FUNNEL_EVENT_PROPS["evidence-handoff"]).toEqual(["unitId"])
    expect(FUNNEL_EVENT_PROPS["daily-view-open"]).toEqual([])
    expect(FUNNEL_EVENT_PROPS["voxel-loop-complete"]).toEqual(["unitId", "result"])
    expect(FUNNEL_EVENT_PROPS["pixelquest-encounter-complete"]).toEqual(["unitId", "result"])
  })
})
