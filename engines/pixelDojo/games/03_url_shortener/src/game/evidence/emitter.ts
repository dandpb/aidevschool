// Slug Launcher evidence emitter (producer side of the gate contract).
//
// Schema (one JSON object per EVIDENCE console line):
//
//   {
//     "schema": "03_url_shortener-v1",
//     "source": "threejs-dojo",
//     "unit_id": "03_url_shortener",
//     "project": "03_url_shortener",
//     "encounter_id": "slug-launcher-01",
//     "game": "Slug Launcher",
//     "ts": "<iso8601>",
//     "pass": true,
//     "metrics": { "kind": "threejs-slug-launcher", ... },
//     "curriculum_context": { ... }
//   }
//
// Two channels per emission:
//   1. console.log("EVIDENCE " + JSON.stringify(rec)) — for stdout-scraping
//      harnesses (the Playwright smoke captures this).
//   2. window.__gameEvidence = rec — the durable in-page channel the smoke
//      asserts on.
//
// Golden rule: the game emits evidence only. It never writes learner state.

import type {
  SlugLauncherCurriculumContext,
  SlugLauncherEvidenceRecord,
  SlugLauncherMetrics,
} from "./types"

export const SLUG_LAUNCHER_UNIT_ID = "03_url_shortener" as const
export const SLUG_LAUNCHER_PROJECT = "03_url_shortener" as const
export const SLUG_LAUNCHER_ENCOUNTER_ID = "slug-launcher-01" as const

export const SLUG_LAUNCHER_CURRICULUM_CONTEXT: SlugLauncherCurriculumContext = {
  concept:
    "unique short-code generation with base62/hash-based encodings and explicit collision handling",
  mechanic: "Slug Launcher (3D hash cannon + base62 docks)",
  accepted_signal:
    "all crates docked to unique base62 codes; every collision detected and retried within the 5-attempt budget",
  rejected_trap:
    "losing a crate to retry-exhaustion instead of switching strategy, or treating a collision-free seed as proof of correctness",
}

export type EvidenceInput = {
  readonly pass: boolean
  readonly metrics: SlugLauncherMetrics
  readonly now?: Date
}

export function buildSlugLauncherEvidence(input: EvidenceInput): SlugLauncherEvidenceRecord {
  return {
    schema: "03_url_shortener-v1",
    source: "threejs-dojo",
    unit_id: SLUG_LAUNCHER_UNIT_ID,
    project: SLUG_LAUNCHER_PROJECT,
    encounter_id: SLUG_LAUNCHER_ENCOUNTER_ID,
    game: "Slug Launcher",
    ts: (input.now ?? new Date()).toISOString(),
    pass: input.pass,
    metrics: input.metrics,
    curriculum_context: SLUG_LAUNCHER_CURRICULUM_CONTEXT,
  }
}

// Validate the structural shape of a record before emission so a bad record
// is never published. Mirrors pixel-quest's evidence.ts validateEvidenceRecord.
export function validateEvidenceRecord(record: unknown): SlugLauncherEvidenceRecord {
  if (typeof record !== "object" || record === null) {
    throw new Error("evidence record must be an object")
  }
  const r = record as Record<string, unknown>
  if (r["schema"] !== "03_url_shortener-v1") throw new Error("bad schema")
  if (r["source"] !== "threejs-dojo") throw new Error("bad source")
  if (r["unit_id"] !== SLUG_LAUNCHER_UNIT_ID) throw new Error("bad unit_id")
  if (r["project"] !== SLUG_LAUNCHER_PROJECT) throw new Error("bad project")
  if (typeof r["encounter_id"] !== "string" || r["encounter_id"] === "") {
    throw new Error("bad encounter_id")
  }
  if (r["game"] !== "Slug Launcher") throw new Error("bad game")
  if (typeof r["ts"] !== "string" || Number.isNaN(Date.parse(r["ts"]))) {
    throw new Error("bad ts")
  }
  if (typeof r["pass"] !== "boolean") throw new Error("bad pass")
  const metrics = r["metrics"]
  if (typeof metrics !== "object" || metrics === null) throw new Error("bad metrics")
  const m = metrics as Record<string, unknown>
  if (m["kind"] !== "threejs-slug-launcher") throw new Error("bad metrics.kind")
  for (const key of [
    "codes_assigned",
    "collisions_detected",
    "collisions_retried_ok",
    "retries_exhausted",
    "dock_overflows",
    "wave_target",
  ]) {
    if (typeof m[key] !== "number" || !Number.isFinite(m[key])) {
      throw new Error(`bad metrics.${key}`)
    }
  }
  if (typeof m["wave_cleared"] !== "boolean") throw new Error("bad metrics.wave_cleared")
  if (!Array.isArray(m["strategies_used"])) throw new Error("bad metrics.strategies_used")
  if (typeof r["curriculum_context"] !== "object" || r["curriculum_context"] === null) {
    throw new Error("bad curriculum_context")
  }
  return record as SlugLauncherEvidenceRecord
}

export function emitEvidence(input: EvidenceInput): SlugLauncherEvidenceRecord {
  const record = validateEvidenceRecord(buildSlugLauncherEvidence(input))
  if (typeof window !== "undefined") {
    window.__gameEvidence = record
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
