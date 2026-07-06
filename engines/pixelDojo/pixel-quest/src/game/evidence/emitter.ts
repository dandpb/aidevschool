import { validateEvidenceRecord } from "./evidence"
import type { PixelQuestEvidenceMetrics, PixelQuestEvidenceRecord } from "./types"

// PixelQuest evidence contract (input for engines/pixelDojo/verifier).
//
// Durable channel: the Playwright smoke run captures the append-only
// `window.__pixelQuestEvidence` array at the end of the run and persists it to
// `engines/pixelDojo/pixel-quest/.logs/evidence.ndjson` — one JSON object per
// line. Full contract: engines/pixelDojo/EVIDENCE_CONTRACT.md.
//
// Schema of each NDJSON line (see evidence/types.ts for the exact TS types):
//
//   {
//     "source": "pixelquest",             // literal — identifies the emitter
//     "unit_id": string,                  // curriculum unit under evaluation
//     "project": string,                  // curriculum project folder name
//     "encounter_id": string,             // encounter that produced the attempt
//     "game": "PixelDojo Quest",          // literal
//     "ts": string,                       // ISO-8601 emission timestamp
//     "pass": boolean,                    // in-game result; verifier owns mastery
//     "metrics": { "kind": string, ... }, // per-kind variant, discriminated by kind:
//                                         //   pixelquest-token-bucket | pixelquest-route-health
//                                         //   | pixelquest-policy-gate | pixelquest-sequence-flow
//                                         //   | pixelquest-task-queue
//     "review_context"?: { ... },         // scheduled-review projection (optional)
//     "curriculum_context"?: { ... }      // concept/mechanic/signal/trap labels (optional)
//   }
//
// Golden rule: the game emits evidence only. It never writes learner state;
// engines/pixelDojo/verifier consumes the NDJSON and decides the gate.

// Structural slice of an encounter definition that the shared evidence
// envelope needs. Every EncounterDefinition variant satisfies it.
export type EvidenceSourceDefinition = {
  readonly id: string
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly mechanicName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
}

// The genuinely per-kind part of evidence: the pass rule outcome plus the
// kind-discriminated metrics. Encounters produce this; the envelope is shared.
export type EncounterOutcome = {
  readonly pass: boolean
  readonly metrics: PixelQuestEvidenceMetrics
}

// Single shared evidence builder for all encounter kinds (dedup of the four
// per-encounter buildEvidence copies). Pass thresholds are NOT decided here:
// they come from the centralized contracts in content/types.ts via each
// encounter's outcome function.
export function buildEncounterEvidence(
  definition: EvidenceSourceDefinition,
  outcome: EncounterOutcome,
  now: Date,
): PixelQuestEvidenceRecord {
  return {
    source: "pixelquest",
    unit_id: definition.unit_id,
    project: definition.project,
    encounter_id: definition.id,
    game: "PixelDojo Quest",
    ts: now.toISOString(),
    pass: outcome.pass,
    metrics: outcome.metrics,
    curriculum_context: {
      concept: definition.concept,
      mechanic: definition.mechanicName,
      accepted_signal: definition.goodRequestLabel,
      rejected_trap: definition.badRequestLabel,
    },
  }
}

// Single typed emission point for the whole game. Validates the record,
// appends it to the append-only window channel, and keeps the legacy
// `EVIDENCE <json>` console line for stdout-scraping harnesses.
export function emitEvidence(record: PixelQuestEvidenceRecord): PixelQuestEvidenceRecord {
  const validEvidence = validateEvidenceRecord(record)
  if (typeof window !== "undefined") {
    window.__pixelQuestEvidence = [...(window.__pixelQuestEvidence ?? []), validEvidence]
  }
  console.log(`EVIDENCE ${JSON.stringify(validEvidence)}`)
  return validEvidence
}
