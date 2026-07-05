import type { PixelQuestEvidenceRecord } from "../../game/evidence/types"

const DEFAULT_TOKEN_BUCKET_METRICS = {
  kind: "pixelquest-token-bucket" as const,
  target_rate: 5,
  observed_admit_rate: 0.5,
  max_burst_1s: 5,
  good_admits: 5,
  legit_rejected: 0,
  abusive_admitted: 0,
  abusive_rejected: 5,
  heat_peak: 0,
  overheated: false,
}

const DEFAULT_UNIT_ID = "U0-sonda-rate-limiter-robustness"
const DEFAULT_PROJECT = "01_rate_limiter"
const DEFAULT_ENCOUNTER_ID = "encounter-agent-quest-01"
const DEFAULT_TS = "2026-06-11T12:00:00.000Z"

/**
 * Build a token-bucket evidence record for unit tests. Overrides are merged
 * on top of the defaults; pass `metrics` to replace the metrics block.
 */
export function makeTokenBucketEvidence(
  pass: boolean,
  overrides: Partial<Omit<PixelQuestEvidenceRecord, "pass" | "metrics">> = {},
  metrics: Partial<typeof DEFAULT_TOKEN_BUCKET_METRICS> = {},
): PixelQuestEvidenceRecord {
  return {
    source: "pixelquest",
    unit_id: DEFAULT_UNIT_ID,
    project: DEFAULT_PROJECT,
    encounter_id: DEFAULT_ENCOUNTER_ID,
    game: "PixelDojo Quest",
    ts: DEFAULT_TS,
    pass,
    ...overrides,
    metrics: { ...DEFAULT_TOKEN_BUCKET_METRICS, ...metrics },
  }
}