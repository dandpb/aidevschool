// AID-1673 (hardening-top10 R3): direct suite for the evidence envelope
// validator — the deterministic gate that decides whether a teaching-game
// record may count as evidence (golden rule: certainty never lives in the
// LLM). Pins every rejection class of validateEvidenceEnvelope, including
// the BUG_AUDIT_2026-07-19 #34 family (non-ISO `ts` must be rejected:
// the ts-check removal mutation below must fail this file).
import { describe, expect, it } from "vitest"
import {
  EvidenceValidationError,
  readBoolean,
  readNumber,
  validateEvidenceEnvelope,
  type EvidenceEnvelopeValidationOptions,
} from "../evidenceEnvelope"

const REVIEW_REASONS = ["due", "deepening", "overdue", "interleaving", "recurring-trap"] as const

const OPTIONS: EvidenceEnvelopeValidationOptions<
  "voxeldojo",
  "KV WAREHOUSE",
  "scenario_id",
  Record<string, unknown>,
  (typeof REVIEW_REASONS)[number]
> = {
  source: "voxeldojo",
  game: "KV WAREHOUSE",
  identityKey: "scenario_id",
  reviewReasons: [...REVIEW_REASONS],
  decodeMetrics: (metrics) => metrics,
}

const ENCOUNTER_OPTIONS: EvidenceEnvelopeValidationOptions<
  "pixelquest",
  "PixelDojo Quest",
  "encounter_id",
  Record<string, unknown>,
  (typeof REVIEW_REASONS)[number]
> = {
  source: "pixelquest",
  game: "PixelDojo Quest",
  identityKey: "encounter_id",
  reviewReasons: [...REVIEW_REASONS],
  decodeMetrics: (metrics) => metrics,
}

function envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: "voxeldojo",
    unit_id: "U2-key-value-store",
    project: "02_key_value_store",
    scenario_id: "kv-warehouse-L1",
    game: "KV WAREHOUSE",
    ts: "2026-09-13T00:00:00.000Z",
    pass: true,
    metrics: { accuracy: 0.95, gates: 3 },
    attempt_id: "attempt-1",
    review_context: {
      unit_kind: "concept",
      scheduled_review: true,
      review_reason: "due",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
    curriculum_context: {
      concept: "consistent hashing",
      mechanic: "place crates by hash key",
      accepted_signal: "same key lands on the same shelf",
      rejected_trap: "random shelf per write",
    },
    ...overrides,
  }
}

function expectRejected(
  raw: unknown,
  options: Parameters<typeof validateEvidenceEnvelope>[1] = OPTIONS,
  messagePart: string,
): void {
  expect(() => validateEvidenceEnvelope(raw, options)).toThrowError(EvidenceValidationError)
  expect(() => validateEvidenceEnvelope(raw, options)).toThrowError(messagePart)
}

describe("validateEvidenceEnvelope — accepts the canonical shapes", () => {
  it("round-trips a full voxelDojo envelope keeping identity, contexts and metrics", () => {
    const raw = envelope()
    const validated = validateEvidenceEnvelope(raw, OPTIONS)
    expect(validated).toStrictEqual(raw)
    expect(validated.scenario_id).toBe("kv-warehouse-L1")
    expect(validated.metrics).toEqual({ accuracy: 0.95, gates: 3 })
  })

  it("accepts the pixelquest encounter_id identity", () => {
    const validated = validateEvidenceEnvelope(
      envelope({
        source: "pixelquest",
        game: "PixelDojo Quest",
        encounter_id: "enc-42",
        scenario_id: undefined,
      }),
      ENCOUNTER_OPTIONS,
    )
    expect(validated.encounter_id).toBe("enc-42")
    expect("scenario_id" in validated).toBe(false)
  })

  it("omits optional contexts and attempt_id when absent", () => {
    const validated = validateEvidenceEnvelope(
      envelope({ attempt_id: undefined, review_context: undefined, curriculum_context: undefined }),
      OPTIONS,
    )
    expect("attempt_id" in validated).toBe(false)
    expect("review_context" in validated).toBe(false)
    expect("curriculum_context" in validated).toBe(false)
  })

  it("keeps streak_candidate only when a boolean is supplied", () => {
    const withStreak = validateEvidenceEnvelope(
      envelope({
        review_context: {
          unit_kind: "concept",
          scheduled_review: false,
          review_reason: "deepening",
          streak_candidate: true,
          scheduler_source: "learner-substrate",
          verifier_required: true,
        },
      }),
      OPTIONS,
    )
    expect(withStreak.review_context?.streak_candidate).toBe(true)

    const withoutStreak = validateEvidenceEnvelope(envelope(), OPTIONS)
    expect(withoutStreak.review_context && "streak_candidate" in withoutStreak.review_context).toBe(
      false,
    )
  })

  it("runs the engine-provided metrics decoder (gate-appropriate strictness)", () => {
    const strict = {
      ...OPTIONS,
      decodeMetrics: (metrics: Record<string, unknown>) => ({
        accuracy: readNumber(metrics, "accuracy"),
      }),
    }
    const validated = validateEvidenceEnvelope(envelope({ metrics: { accuracy: 0.5 } }), strict)
    expect(validated.metrics).toEqual({ accuracy: 0.5 })
    expect(() => validateEvidenceEnvelope(envelope({ metrics: { accuracy: -1 } }), strict)).toThrowError(
      "evidence.accuracy",
    )
  })
})

describe("validateEvidenceEnvelope — rejects invalid envelopes (BUG_AUDIT #34 family)", () => {
  it("rejects non-object payloads", () => {
    expectRejected(null, OPTIONS, "evidence must be an object")
    expectRejected("not-an-object", OPTIONS, "evidence must be an object")
    expectRejected([envelope()], OPTIONS, "evidence must be an object")
  })

  it("rejects wrong source and wrong game", () => {
    expectRejected(envelope({ source: "pixelquest" }), OPTIONS, "evidence.source must be voxeldojo")
    expectRejected(envelope({ game: "OTHER GAME" }), OPTIONS, "evidence.game must be KV WAREHOUSE")
  })

  it("rejects empty or non-string unit_id / project / identity", () => {
    expectRejected(envelope({ unit_id: "" }), OPTIONS, "evidence.unit_id must be a non-empty string")
    expectRejected(envelope({ unit_id: "   " }), OPTIONS, "evidence.unit_id must be a non-empty string")
    expectRejected(envelope({ unit_id: 7 }), OPTIONS, "evidence.unit_id must be a non-empty string")
    expectRejected(envelope({ project: "" }), OPTIONS, "evidence.project must be a non-empty string")
    expectRejected(envelope({ scenario_id: "" }), OPTIONS, "evidence.scenario_id must be a non-empty string")
    expectRejected(
      envelope({ scenario_id: undefined }),
      OPTIONS,
      "evidence.scenario_id must be a non-empty string",
    )
  })

  it("rejects non-ISO timestamps (BUG_AUDIT #34: ts must be an ISO timestamp)", () => {
    expectRejected(envelope({ ts: undefined }), OPTIONS, "evidence.ts must be an ISO timestamp")
    expectRejected(envelope({ ts: 1783641600000 }), OPTIONS, "evidence.ts must be an ISO timestamp")
    expectRejected(envelope({ ts: "" }), OPTIONS, "evidence.ts must be an ISO timestamp")
    expectRejected(envelope({ ts: "not a date at all" }), OPTIONS, "evidence.ts must be an ISO timestamp")
    expectRejected(
      envelope({ ts: "2026-13-45T99:99:99Z" }),
      OPTIONS,
      "evidence.ts must be an ISO timestamp",
    )
  })

  it("rejects non-boolean pass", () => {
    expectRejected(envelope({ pass: "true" }), OPTIONS, "evidence.pass must be boolean")
    expectRejected(envelope({ pass: 1 }), OPTIONS, "evidence.pass must be boolean")
    expectRejected(envelope({ pass: undefined }), OPTIONS, "evidence.pass must be boolean")
  })

  it("rejects non-object metrics", () => {
    expectRejected(envelope({ metrics: null }), OPTIONS, "evidence.metrics must be an object")
    expectRejected(envelope({ metrics: "accuracy=1" }), OPTIONS, "evidence.metrics must be an object")
    expectRejected(envelope({ metrics: [] }), OPTIONS, "evidence.metrics must be an object")
  })

  it("rejects malformed attempt_id", () => {
    expectRejected(
      envelope({ attempt_id: "" }),
      OPTIONS,
      "evidence.attempt_id must be a non-empty string",
    )
    expectRejected(
      envelope({ attempt_id: 42 }),
      OPTIONS,
      "evidence.attempt_id must be a non-empty string",
    )
  })

  it("rejects malformed review_context field by field", () => {
    const base = envelope().review_context as Record<string, unknown>
    const rc = (overrides: Record<string, unknown> = {}) => ({ ...base, ...overrides })
    expectRejected(envelope({ review_context: "nope" }), OPTIONS, "evidence.review_context must be an object")
    expectRejected(
      envelope({ review_context: rc({ unit_kind: "skill" }) }),
      OPTIONS,
      "review_context.unit_kind must be concept",
    )
    expectRejected(
      envelope({ review_context: rc({ review_reason: "because" }) }),
      OPTIONS,
      "review_context.review_reason is invalid",
    )
    expectRejected(
      envelope({ review_context: rc({ scheduler_source: "game-local" }) }),
      OPTIONS,
      "review_context.scheduler_source must be learner-substrate",
    )
    expectRejected(
      envelope({ review_context: rc({ verifier_required: false }) }),
      OPTIONS,
      "review_context.verifier_required must be true",
    )
    expectRejected(
      envelope({ review_context: rc({ scheduled_review: "yes" }) }),
      OPTIONS,
      "review_context.scheduled_review must be boolean",
    )
    expectRejected(
      envelope({ review_context: rc({ streak_candidate: "yes" }) }),
      OPTIONS,
      "review_context.streak_candidate must be boolean",
    )
  })

  it("enforces requireStreakCandidate when the option is set", () => {
    const base = envelope().review_context as Record<string, unknown>
    const strict = { ...OPTIONS, requireStreakCandidate: true }
    expectRejected(
      envelope({ review_context: { ...base, streak_candidate: undefined } }),
      strict,
      "review_context.streak_candidate must be boolean",
    )
  })

  it("rejects malformed curriculum_context field by field", () => {
    expectRejected(
      envelope({ curriculum_context: "nope" }),
      OPTIONS,
      "evidence.curriculum_context must be an object",
    )
    expectRejected(
      envelope({ curriculum_context: { concept: "" } }),
      OPTIONS,
      "curriculum_context.concept must be a non-empty string",
    )
    expectRejected(
      envelope({ curriculum_context: { concept: "x", mechanic: "" } }),
      OPTIONS,
      "curriculum_context.mechanic must be a non-empty string",
    )
    expectRejected(
      envelope({ curriculum_context: { concept: "x", mechanic: "y", accepted_signal: " " } }),
      OPTIONS,
      "curriculum_context.accepted_signal must be a non-empty string",
    )
    expectRejected(
      envelope({ curriculum_context: { concept: "x", mechanic: "y", rejected_trap: "" } }),
      OPTIONS,
      "curriculum_context.rejected_trap must be a non-empty string",
    )
  })

  it("enforces requireCurriculumSignals when the option is set", () => {
    const strict = { ...OPTIONS, requireCurriculumSignals: true }
    expectRejected(
      envelope({ curriculum_context: { concept: "x", mechanic: "y" } }),
      strict,
      "curriculum_context.accepted_signal must be a non-empty string",
    )
  })
})

describe("readBoolean / readNumber leaf validators", () => {
  it("readBoolean accepts only booleans", () => {
    expect(readBoolean({ flag: false }, "flag")).toBe(false)
    expect(() => readBoolean({ flag: "false" }, "flag")).toThrowError(EvidenceValidationError)
    expect(() => readBoolean({}, "flag")).toThrowError("evidence.flag must be boolean")
  })

  it("readNumber accepts only finite non-negative numbers", () => {
    expect(readNumber({ n: 0 }, "n")).toBe(0)
    expect(() => readNumber({ n: -1 }, "n")).toThrowError("evidence.n")
    expect(() => readNumber({ n: Number.NaN }, "n")).toThrowError("evidence.n")
    expect(() => readNumber({ n: Number.POSITIVE_INFINITY }, "n")).toThrowError("evidence.n")
    expect(() => readNumber({ n: "3" }, "n")).toThrowError("evidence.n")
  })
})

describe("EvidenceValidationError", () => {
  it("carries the contract name for downstream filtering", () => {
    const error = new EvidenceValidationError("boom")
    expect(error.name).toBe("EvidenceValidationError")
    expect(error.message).toBe("boom")
  })
})
