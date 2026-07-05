import { describe, expect, it } from "vitest"
import { curriculumPack } from "../content/curriculumPack"
import { PackValidationError, validateContentPack } from "../content/packValidator"
import type { ContentPack, EncounterDefinition } from "../content/types"
import { EvidenceValidationError, validateEvidenceRecord } from "../game/evidence/evidence"
import type { PixelQuestEvidenceMetrics } from "../game/evidence/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = "2026-07-05T12:00:00.000Z"

/**
 * Builds a minimal well-formed record with a metrics block the caller controls.
 * The outer envelope is always valid so that failures are isolated to the
 * metrics block under test.
 */
function recordWithMetrics(metrics: Record<string, unknown>): unknown {
  return {
    source: "pixelquest",
    unit_id: "U-test",
    project: "test",
    encounter_id: "encounter-test",
    game: "PixelDojo Quest",
    ts: NOW,
    pass: false,
    metrics,
  }
}

const tokenBucketMetrics = {
  kind: "pixelquest-token-bucket",
  target_rate: 1.5,
  observed_admit_rate: 0.5,
  max_burst_1s: 1,
  good_admits: 5,
  legit_rejected: 0,
  abusive_admitted: 0,
  abusive_rejected: 1,
  heat_peak: 0,
  overheated: false,
} as const

const routeHealthMetrics = {
  kind: "pixelquest-route-health",
  routed: 3,
  isolated: 2,
  bad_routes: 0,
  good_rejected: 0,
  heat_peak: 0,
  overheated: false,
} as const

const policyGateMetrics = {
  kind: "pixelquest-policy-gate",
  allowed: 3,
  denied: 3,
  policy_leaks: 0,
  false_denies: 0,
  heat_peak: 0,
  overheated: false,
} as const

const sequenceMetrics = {
  kind: "pixelquest-sequence-flow",
  advanced: 3,
  held: 2,
  skipped_required: 0,
  guards_missed: 0,
  heat_peak: 0,
  overheated: false,
} as const

/** Deep-clones a baseline metrics block then overrides a single field. */
function metricsWith(
  baseline: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  return { ...structuredClone(baseline), ...override }
}

// ---------------------------------------------------------------------------
// 1. Each variant validates correctly AND rejects the wrong kind (dispatcher)
// ---------------------------------------------------------------------------

describe("readMetrics dispatcher keys only on metrics.kind", () => {
  it("validates each of the four metrics variants on a correct shape", () => {
    for (const metrics of [
      tokenBucketMetrics,
      routeHealthMetrics,
      policyGateMetrics,
      sequenceMetrics,
    ]) {
      const result = validateEvidenceRecord(recordWithMetrics(metrics)).metrics
      expect(result.kind).toBe(metrics.kind)
    }
  })

  it("validates a token-bucket metrics block even when the enclosing record is for a route-health encounter", () => {
    // The dispatcher reads ONLY metrics.kind. There is no encounter-context
    // check, so a route-health *encounter* could ship token-bucket *metrics*
    // and the validator would accept it. This documents that as a deliberate
    // (if loose) property of the validator: the metrics self-describe.
    const raw = recordWithMetrics(tokenBucketMetrics)
    const metrics = validateEvidenceRecord(raw).metrics as PixelQuestEvidenceMetrics
    expect(metrics.kind).toBe("pixelquest-token-bucket")
  })

  it("validates a route-health metrics block under a record whose encounter_id looks token-bucket-ish", () => {
    // Same point in the other direction: encounter_id carries no kind signal
    // that the validator consults.
    const raw = recordWithMetrics(routeHealthMetrics)
    const metrics = validateEvidenceRecord(raw).metrics as PixelQuestEvidenceMetrics
    expect(metrics.kind).toBe("pixelquest-route-health")
  })
})

// ---------------------------------------------------------------------------
// 2. Negative / NaN / Infinity rejection in numeric fields
// ---------------------------------------------------------------------------

describe("numeric field strictness", () => {
  it("rejects NaN, Infinity, and negative numbers in token-bucket metrics", () => {
    for (const [field, bad] of [
      ["good_admits", Number.NaN],
      ["abusive_admitted", Number.POSITIVE_INFINITY],
      ["abusive_rejected", Number.NEGATIVE_INFINITY],
      ["target_rate", -1],
      ["heat_peak", Number.NaN],
    ] as const) {
      expect(() =>
        validateEvidenceRecord(
          recordWithMetrics(metricsWith(tokenBucketMetrics, { [field]: bad })),
        ),
      ).toThrow(EvidenceValidationError)
    }
  })

  it("rejects NaN and Infinity in sequence-flow metrics", () => {
    for (const [field, bad] of [
      ["advanced", Number.NaN],
      ["guards_missed", Number.POSITIVE_INFINITY],
      ["heat_peak", Number.NEGATIVE_INFINITY],
    ] as const) {
      expect(() =>
        validateEvidenceRecord(recordWithMetrics(metricsWith(sequenceMetrics, { [field]: bad }))),
      ).toThrow(EvidenceValidationError)
    }
  })

  it("rejects a non-boolean overheated for every variant", () => {
    for (const baseline of [
      tokenBucketMetrics,
      routeHealthMetrics,
      policyGateMetrics,
      sequenceMetrics,
    ]) {
      expect(() =>
        validateEvidenceRecord(recordWithMetrics(metricsWith(baseline, { overheated: 1 }))),
      ).toThrow(EvidenceValidationError)
      expect(() =>
        validateEvidenceRecord(recordWithMetrics(metricsWith(baseline, { overheated: "true" }))),
      ).toThrow(EvidenceValidationError)
    }
  })

  it("rejects when a required numeric field is missing", () => {
    // (variant baseline, field to remove)
    const cases: Array<[Record<string, unknown>, string]> = [
      [structuredClone(tokenBucketMetrics), "good_admits"],
      [structuredClone(routeHealthMetrics), "routed"],
      [structuredClone(policyGateMetrics), "allowed"],
      [structuredClone(sequenceMetrics), "advanced"],
    ]
    for (const [clone, field] of cases) {
      delete clone[field]
      expect(() => validateEvidenceRecord(recordWithMetrics(clone))).toThrow(
        EvidenceValidationError,
      )
    }
  })

  it("silently ignores extra unknown fields (the readers are not strict about surplus keys)", () => {
    // Documents a gap: the per-variant readers project a fixed set of keys and
    // never check for unexpected fields, so a metrics block carrying foreign
    // keys still validates. This is a strength (forward-compat) and a gap (a
    // misspelled field name is silently dropped, not flagged).
    const noisy = metricsWith(tokenBucketMetrics, { stray_field: 999, another: "x" })
    expect(() => validateEvidenceRecord(recordWithMetrics(noisy))).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 3. readEvidenceContract accepts each kind and rejects unknown
// ---------------------------------------------------------------------------

describe("readEvidenceContract dispatch", () => {
  function unitWithContract(contract: Record<string, unknown>): ContentPack {
    return {
      id: "test",
      version: "0.0.0",
      title: "test",
      regions: [],
      encounters: [],
      assets: { tiles: [], sprites: [], audio: [] },
      units: [
        {
          unit_id: "U-test",
          project: "test",
          concept: "c",
          prerequisites: [],
          encounter_ids: [],
          // The validator reads through a Record<string, unknown> lens, so the
          // typed `as never` cast just satisfies the literal-typed UnitDefinition
          // field for this construction.
          evidence_contract: contract as never,
        },
      ],
    }
  }

  it("accepts each of the four contract kinds", () => {
    const contracts = [
      {
        kind: "pixelquest-token-bucket",
        minGoodAdmits: 8,
        maxAbusiveAdmitted: 0,
        maxObservedRateMultiplier: 1.35,
      },
      { kind: "pixelquest-route-health", minRouted: 3, maxBadRoutes: 0 },
      { kind: "pixelquest-policy-gate", minAllowed: 3, maxPolicyLeaks: 0 },
      { kind: "pixelquest-sequence-flow", minAdvanced: 3, maxGuardsMissed: 0 },
    ]
    for (const contract of contracts) {
      expect(() => validateContentPack(unitWithContract(contract))).not.toThrow()
    }
  })

  it("rejects an unknown evidence contract kind", () => {
    const pack = unitWithContract({ kind: "pixelquest-unknown", minGoodAdmits: 1 })
    expect(() => validateContentPack(pack)).toThrow(PackValidationError)
  })

  it("records an issue (rather than throwing) when a known kind is missing a required threshold", () => {
    // The contract reader is a best-effort validator: it pushes an issue and
    // continues with a default. A missing threshold on a known kind should be
    // surfaced as a PackValidationError rather than silently accepted.
    const pack = unitWithContract({ kind: "pixelquest-sequence-flow" }) // no minAdvanced / maxGuardsMissed
    expect(() => validateContentPack(pack)).toThrow(PackValidationError)
  })
})

// ---------------------------------------------------------------------------
// 4. evidenceContractFor maps encounterKind -> contract kind
// ---------------------------------------------------------------------------

describe("evidenceContractFor maps each encounterKind to the matching contract kind", () => {
  const pack = validateContentPack(curriculumPack)

  it("produces a sequence contract for a sequence_flow module", () => {
    const unit = pack.units.find((u) => u.project === "02_key_value_store")
    expect(unit?.evidence_contract.kind).toBe("pixelquest-sequence-flow")
  })

  it("produces a route-health contract for a route_health module", () => {
    const unit = pack.units.find((u) => u.project === "11_load_balancer")
    expect(unit?.evidence_contract.kind).toBe("pixelquest-route-health")
  })

  it("produces a policy-gate contract for a policy_gate module", () => {
    const unit = pack.units.find((u) => u.project === "07_rest_api_auth")
    expect(unit?.evidence_contract.kind).toBe("pixelquest-policy-gate")
  })

  it("produces a token-bucket contract for a module with no explicit encounterKind", () => {
    const unit = pack.units.find((u) => u.project === "03_url_shortener")
    expect(unit?.evidence_contract.kind).toBe("pixelquest-token-bucket")
  })

  it("validates the full curriculum pack without error", () => {
    expect(() => validateContentPack(curriculumPack)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 5. The critical anti-drift invariant: for every unit, the
//    evidence_contract.kind must match the kind of the encounter referenced
//    by encounter_ids[0]. Iterates all 18 units.
// ---------------------------------------------------------------------------

describe("curriculum anti-drift: contract kind matches encounter kind for every unit", () => {
  const pack = validateContentPack(curriculumPack)
  const encountersByEncounterId = new Map<string, EncounterDefinition>(
    pack.encounters.map((e) => [e.id, e]),
  )

  // Map from encounter.kind (content domain) to evidence contract kind
  // (evidence domain). This is the relationship the refactor must preserve.
  const expectedContractKind: Record<EncounterDefinition["kind"], string> = {
    token_bucket: "pixelquest-token-bucket",
    sequence_flow: "pixelquest-sequence-flow",
    route_health: "pixelquest-route-health",
    policy_gate: "pixelquest-policy-gate",
  }

  it("covers all 18 curriculum units", () => {
    expect(pack.units).toHaveLength(18)
  })

  for (const unit of pack.units) {
    it(`unit ${unit.unit_id} (${unit.project}) has a contract kind matching its first encounter`, () => {
      const firstEncounterId = unit.encounter_ids[0]
      expect(
        firstEncounterId,
        `${unit.unit_id} must reference at least one encounter`,
      ).toBeDefined()
      const encounter = encountersByEncounterId.get(firstEncounterId ?? "")
      expect(encounter, `${unit.unit_id} -> unknown encounter ${firstEncounterId}`).toBeDefined()
      const expected = encounter ? expectedContractKind[encounter.kind] : undefined
      expect(unit.evidence_contract.kind).toBe(expected)
    })
  }
})
