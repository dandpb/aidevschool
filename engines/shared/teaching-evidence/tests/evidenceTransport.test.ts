// AID-1673 (hardening-top10 R3): direct suite for the dual channel — the
// append-only window publication + embedding-host postMessage transport.
// The append-only tests are the BUG_AUDIT_2026-07-19 #33 mutation guard:
// reverting writeWindowChannel to an overwrite must fail this file.
// AID-1678: the dormant `game` channel is append-only too (legacy single
// record wrapped), closing the #33 residual this suite had pinned as
// reachability-only while the follow-up issue was open.
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  TEACHING_EVIDENCE_MESSAGE,
  configureEvidenceParentOrigin,
  dualEmit,
} from "../evidenceTransport"
import { emitFunnelEvent } from "../funnelTelemetry"
import { setMissionEvidenceForwarder } from "../hostProtocol"
import { resetEvidenceSeams, stubBrowserWindow, type FakeWindow } from "./harness"

// The funnel piggyback is asserted through the emitFunnelEvent seam (mocked
// here): what matters to the evidence contract is WHICH funnel events dualEmit
// requests per channel/handoff — the batcher/transport units are pinned in
// tests/funnelTelemetry.test.ts and engines/voxelDojo/shared/funnelTelemetry.test.ts.
vi.mock("../funnelTelemetry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../funnelTelemetry")>()
  return { ...actual, emitFunnelEvent: vi.fn() }
})

const HOST_ORIGIN = "https://host.example"

afterEach(() => {
  resetEvidenceSeams()
})

function record(unitId = "U2-key-value-store") {
  return {
    source: "voxeldojo",
    unit_id: unitId,
    project: "02_key_value_store",
    scenario_id: "kv-warehouse-L1",
    game: "KV WAREHOUSE",
    ts: "2026-09-13T00:00:00.000Z",
    pass: true,
    metrics: { accuracy: 1 },
  }
}

function channelValues(window: FakeWindow, key: string): unknown[] {
  return (window[key] as unknown[]) ?? []
}

describe("dualEmit — window channels are append-only (BUG_AUDIT #33 guard)", () => {
  it("voxeldojo channel appends every record in order", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { window } = stubBrowserWindow()
    const first = record()
    const second = record("U3-other")
    dualEmit(first, "voxeldojo")
    dualEmit(second, "voxeldojo")
    expect(channelValues(window, "__voxelDojoEvidence")).toEqual([first, second])
    expect(consoleLog).toHaveBeenCalledTimes(2)
  })

  it("pixelquest channel appends every record in order", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { window } = stubBrowserWindow()
    const first = { ...record(), source: "pixelquest" as const }
    const second = { ...record(), source: "pixelquest" as const }
    dualEmit(first, "pixelquest")
    dualEmit(second, "pixelquest")
    expect(channelValues(window, "__pixelQuestEvidence")).toEqual([first, second])
  })

  it("a legacy non-array channel value is normalized into a fresh array", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { window } = stubBrowserWindow()
    window.__voxelDojoEvidence = "stale-shape"
    const fresh = record()
    dualEmit(fresh, "voxeldojo")
    expect(channelValues(window, "__voxelDojoEvidence")).toEqual([fresh])
  })

  it("game channel appends every record in order (AID-1678: BUG_AUDIT #33 residual closed)", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { window } = stubBrowserWindow()
    const first = record()
    const second = record("U3-other")
    dualEmit(first, "game")
    dualEmit(second, "game")
    expect(channelValues(window, "__gameEvidence")).toEqual([first, second])
  })

  it("a legacy single-record game channel value is wrapped, not dropped", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { window } = stubBrowserWindow()
    const legacy = record("U1-legacy")
    window.__gameEvidence = legacy
    const fresh = record()
    dualEmit(fresh, "game")
    expect(channelValues(window, "__gameEvidence")).toEqual([legacy, fresh])
  })

  it("returns the record unchanged (identity) and works without a window", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const fresh = record()
    expect(dualEmit(fresh, "voxeldojo")).toBe(fresh)
    expect(consoleLog).toHaveBeenCalledWith(`EVIDENCE ${JSON.stringify(fresh)}`)
  })
})

describe("dualEmit — embedding-host postMessage gate", () => {
  it("forwards to the parent only when the referrer origin matches the configured origin", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { window, parent } = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/mission` })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    const fresh = record()
    dualEmit(fresh, "game")
    expect(parent.postMessage).toHaveBeenCalledTimes(1)
    const [message, targetOrigin] = parent.postMessage.mock.calls[0] as unknown[]
    expect(message).toEqual({
      type: TEACHING_EVIDENCE_MESSAGE,
      version: 1,
      evidence: fresh,
    })
    expect(targetOrigin).toBe(HOST_ORIGIN)
    expect((window.__gameEvidence as { unit_id: string }[])[0]?.unit_id).toBe(fresh.unit_id)
  })

  it("stays silent on mismatching referrer, empty referrer, and bad referrer URLs", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const mismatch = stubBrowserWindow({ referrer: "https://evil.example/mission" })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    dualEmit(record(), "game")
    expect(mismatch.parent.postMessage).not.toHaveBeenCalled()
    resetEvidenceSeams()

    const emptyReferrer = stubBrowserWindow({ referrer: "" })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    dualEmit(record(), "game")
    expect(emptyReferrer.parent.postMessage).not.toHaveBeenCalled()
    resetEvidenceSeams()

    const badReferrer = stubBrowserWindow({ referrer: "http://[not-a-url" })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    dualEmit(record(), "game")
    expect(badReferrer.parent.postMessage).not.toHaveBeenCalled()
  })

  it("stays silent for top-level windows and unconfigured origins", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const topLevel = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/mission`, topLevel: true })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    dualEmit(record(), "game")
    expect(topLevel.parent.postMessage).not.toHaveBeenCalled()
    resetEvidenceSeams()

    const unconfigured = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/mission` })
    dualEmit(record(), "game")
    expect(unconfigured.parent.postMessage).not.toHaveBeenCalled()
  })

  it("configureEvidenceParentOrigin accepts only http(s) absolute origins", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const urlWithOrigin = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/any/path` })
    configureEvidenceParentOrigin(`${HOST_ORIGIN}/configured/path?query=1`)
    dualEmit(record(), "game")
    expect(
      (urlWithOrigin.parent.postMessage.mock.calls[0] as unknown[])[1],
    ).toBe(HOST_ORIGIN)
    resetEvidenceSeams()

    const nonHttp = stubBrowserWindow({ referrer: "ftp://host.example/page" })
    configureEvidenceParentOrigin("ftp://host.example")
    dualEmit(record(), "game")
    expect(nonHttp.parent.postMessage).not.toHaveBeenCalled()
    resetEvidenceSeams()

    const blank = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/page` })
    configureEvidenceParentOrigin("   ")
    dualEmit(record(), "game")
    expect(blank.parent.postMessage).not.toHaveBeenCalled()
    resetEvidenceSeams()

    const invalid = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/page` })
    configureEvidenceParentOrigin("not a url")
    dualEmit(record(), "game")
    expect(invalid.parent.postMessage).not.toHaveBeenCalled()
  })

  it("a claimed mission forwarder takes precedence over the host postMessage", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { parent } = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/mission` })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    const forwarder = vi.fn(() => true)
    setMissionEvidenceForwarder(forwarder)
    const fresh = record()
    dualEmit(fresh, "game")
    expect(forwarder).toHaveBeenCalledWith(fresh)
    expect(parent.postMessage).not.toHaveBeenCalled()
  })

  it("a declining mission forwarder falls through to the host postMessage", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { parent } = stubBrowserWindow({ referrer: `${HOST_ORIGIN}/mission` })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    setMissionEvidenceForwarder(() => false)
    dualEmit(record(), "game")
    expect(parent.postMessage).toHaveBeenCalledTimes(1)
  })

  it("exports the wire message type of the teaching-game contract", () => {
    expect(TEACHING_EVIDENCE_MESSAGE).toBe("aidevschool:teaching-evidence")
  })
})

describe("dualEmit — funnel piggyback wiring (AID-987/T1b)", () => {
  const funnel = () => vi.mocked(emitFunnelEvent)

  it("voxeldojo pass counts loop-complete; handoff only when the record left the game", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    stubBrowserWindow()
    dualEmit(record(), "voxeldojo")
    expect(funnel().mock.calls).toEqual([
      ["voxeldojo", "voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed" }],
    ])
  })

  it("voxeldojo failure counts result=failed and no handoff", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    stubBrowserWindow()
    dualEmit({ ...record(), pass: false }, "voxeldojo")
    expect(funnel().mock.calls).toEqual([
      ["voxeldojo", "voxel-loop-complete", { unitId: "U2-key-value-store", result: "failed" }],
    ])
  })

  it("a real host handoff adds the evidence-handoff event", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    stubBrowserWindow({ referrer: `${HOST_ORIGIN}/mission` })
    configureEvidenceParentOrigin(HOST_ORIGIN)
    dualEmit(record(), "voxeldojo")
    expect(funnel().mock.calls).toEqual([
      ["voxeldojo", "voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed" }],
      ["voxeldojo", "evidence-handoff", { unitId: "U2-key-value-store" }],
    ])
  })

  it("a claimed mission forwarder also counts as a handoff", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    stubBrowserWindow()
    setMissionEvidenceForwarder(() => true)
    dualEmit(record(), "voxeldojo")
    expect(funnel().mock.calls.filter((call) => call[1] === "evidence-handoff")).toEqual([
      ["voxeldojo", "evidence-handoff", { unitId: "U2-key-value-store" }],
    ])
  })

  it("pixelquest channel uses the encounter vocabulary", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    stubBrowserWindow()
    dualEmit(record(), "pixelquest")
    expect(funnel().mock.calls).toEqual([
      ["pixelquest", "pixelquest-encounter-complete", { unitId: "U2-key-value-store", result: "completed" }],
    ])
  })

  it("the game channel stays unmeasured and records without unit_id emit nothing", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    stubBrowserWindow()
    dualEmit(record(), "game")
    expect(funnel()).not.toHaveBeenCalled()
    dualEmit({ pass: true }, "voxeldojo")
    expect(funnel()).not.toHaveBeenCalled()
  })
})
