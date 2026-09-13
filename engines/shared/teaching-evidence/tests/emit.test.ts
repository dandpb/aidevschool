// AID-1673 (hardening-top10 R3): direct suite for emitEvidence — the record
// factory every teaching game uses to hand evidence to the dual channel.
// Pins the record shape (review_context derivation, attempt_id/observations
// optionality, injected clock) and the source→window-channel routing.
import { afterEach, describe, expect, it, vi } from "vitest"
import { emitEvidence, type EvidenceMeta } from "../emit"
import { resetEvidenceSeams, stubBrowserWindow } from "./harness"

const FIXED_CLOCK = () => new Date("2026-09-13T10:30:00.000Z")

const META: EvidenceMeta = {
  source: "voxeldojo",
  unitId: "U2-key-value-store",
  project: "02_key_value_store",
  scenarioId: "kv-warehouse-L1",
  game: "KV WAREHOUSE",
  curriculum: {
    concept: "consistent hashing",
    mechanic: "place crates by hash key",
  },
}

const METRICS = { accuracy: 0.9, gates: 2 }

afterEach(() => {
  resetEvidenceSeams()
})

function silenceEvidenceConsole() {
  return vi.spyOn(console, "log").mockImplementation(() => undefined)
}

describe("emitEvidence — record shape", () => {
  it("builds the canonical record with the injected clock", () => {
    const consoleLog = silenceEvidenceConsole()
    const record = emitEvidence({ meta: META, pass: true, metrics: METRICS, now: FIXED_CLOCK })
    expect(record).toStrictEqual({
      source: "voxeldojo",
      unit_id: "U2-key-value-store",
      project: "02_key_value_store",
      scenario_id: "kv-warehouse-L1",
      game: "KV WAREHOUSE",
      ts: "2026-09-13T10:30:00.000Z",
      pass: true,
      metrics: METRICS,
      review_context: {
        unit_kind: "concept",
        scheduled_review: false,
        review_reason: "deepening",
        scheduler_source: "learner-substrate",
        verifier_required: true,
      },
      curriculum_context: META.curriculum,
    })
    expect(consoleLog).toHaveBeenCalledTimes(1)
  })

  it("omits attempt_id and observations unless supplied", () => {
    silenceEvidenceConsole()
    const bare = emitEvidence({ meta: META, pass: false, metrics: METRICS, now: FIXED_CLOCK })
    expect("attempt_id" in bare).toBe(false)
    expect("observations" in bare).toBe(false)

    const full = emitEvidence({
      meta: META,
      pass: false,
      metrics: METRICS,
      now: FIXED_CLOCK,
      attemptId: "attempt-7",
      observations: { hint: "shelf glow" },
    })
    expect(full.attempt_id).toBe("attempt-7")
    expect(full.observations).toEqual({ hint: "shelf glow" })
  })

  it("derives scheduled_review/review_reason from the review slice", () => {
    silenceEvidenceConsole()
    const scheduled = emitEvidence({
      meta: META,
      pass: true,
      metrics: METRICS,
      now: FIXED_CLOCK,
      reviewSlice: { nextReviews: [{ unitId: META.unitId }, { unitId: "U9-other" }] },
    })
    expect(scheduled.review_context.scheduled_review).toBe(true)
    expect(scheduled.review_context.review_reason).toBe("due")

    const notScheduled = emitEvidence({
      meta: META,
      pass: true,
      metrics: METRICS,
      now: FIXED_CLOCK,
      reviewSlice: { nextReviews: [{ unitId: "U9-other" }] },
    })
    expect(notScheduled.review_context.scheduled_review).toBe(false)
    expect(notScheduled.review_context.review_reason).toBe("deepening")
  })

  it("logs the record on the EVIDENCE console channel", () => {
    const consoleLog = silenceEvidenceConsole()
    const record = emitEvidence({ meta: META, pass: true, metrics: METRICS, now: FIXED_CLOCK })
    expect(consoleLog).toHaveBeenCalledWith(`EVIDENCE ${JSON.stringify(record)}`)
  })

  it("emits without a window (node: transport still returns the record)", () => {
    silenceEvidenceConsole()
    const record = emitEvidence({ meta: META, pass: true, metrics: METRICS, now: FIXED_CLOCK })
    expect(record.unit_id).toBe(META.unitId)
  })
})

describe("emitEvidence — channel routing", () => {
  it("voxeldojo source appends to the __voxelDojoEvidence channel", () => {
    silenceEvidenceConsole()
    const { window } = stubBrowserWindow()
    const record = emitEvidence({ meta: META, pass: true, metrics: METRICS, now: FIXED_CLOCK })
    const channel = window.__voxelDojoEvidence as unknown[]
    expect(Array.isArray(channel)).toBe(true)
    expect(channel[0]).toBe(record)
  })

  it("pixelquest source appends to the __pixelQuestEvidence channel", () => {
    silenceEvidenceConsole()
    const { window } = stubBrowserWindow()
    const record = emitEvidence({
      meta: { ...META, source: "pixelquest", scenarioId: "enc-42" },
      pass: true,
      metrics: METRICS,
      now: FIXED_CLOCK,
    })
    const channel = window.__pixelQuestEvidence as unknown[]
    expect(Array.isArray(channel)).toBe(true)
    expect(channel[0]).toBe(record)
  })

  it("explicit __gameEvidence windowKey routes to the game channel", () => {
    silenceEvidenceConsole()
    const { window } = stubBrowserWindow()
    const record = emitEvidence({
      meta: { ...META, windowKey: "__gameEvidence" },
      pass: true,
      metrics: METRICS,
      now: FIXED_CLOCK,
    })
    const published = window.__gameEvidence as { unit_id?: string }
    expect(published).toBeTruthy()
    expect(published.unit_id).toBe(record.unit_id)
  })
})
