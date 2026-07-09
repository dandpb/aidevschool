import { dualEmit } from "../../../../shared/evidence"
// Plugin Docking Bay — evidence builder + emitter.
//
// Mirrors the producer pattern from engines/pixelDojo/EVIDENCE_CONTRACT.md:
// the game emits one append-only record per attempt, the verifier owns mastery.
// The smoke run captures `window.__gameEvidence` (single record — there is only
// one wave per smoke attempt) and the matching `EVIDENCE <json>` console line.
//
// Producer side-effect contract (smoke-enforced): this module never writes
// localStorage keys `learning_state`, `units_log`, or `mastered`, never
// publishes `window.__pixelQuestLearningState`, and never calls the substrate.

import type { Wave, WaveMetrics } from "./lifecycle"
import { isPass } from "./lifecycle"

export type PluginLifecycleEvidenceRecord = {
  readonly schema: "09_plugin_system-v1"
  readonly source: "plugindoj"
  readonly unit_id: "09_plugin_system"
  readonly project: "09_plugin_system"
  readonly encounter_id: "plugin-docking-bay-01"
  readonly game: "Plugin Docking Bay"
  readonly ts: string
  readonly pass: boolean
  readonly gates: readonly string[]
  readonly metrics: WaveMetrics
  readonly curriculum_context: {
    readonly concept: string
    readonly mechanic: string
    readonly accepted_signal: string
    readonly rejected_trap: string
  }
  readonly review_context: {
    readonly unit_kind: "concept"
    readonly scheduled_review: boolean
    readonly review_reason: "deepening"
    readonly streak_candidate: boolean
    readonly scheduler_source: "learner-substrate"
    readonly verifier_required: true
  }
}

const UNIT_ID = "09_plugin_system"
const ENCOUNTER_ID = "plugin-docking-bay-01"

const PASS_GATES = [
  "pods_started_unsandboxed === 0",
  "undeclared_leaked === 0",
  "version_mismatches_handled === version_mismatches_total",
  "invalid_transitions_attempted === 0",
  "hooks_out_of_order === 0",
  "host_damage === 0",
  "plugins_unloaded_clean === pods_loaded",
] as const

function gateResults(m: WaveMetrics): readonly { readonly gate: string; readonly ok: boolean }[] {
  return [
    { gate: PASS_GATES[0], ok: m.pods_started_unsandboxed === 0 },
    { gate: PASS_GATES[1], ok: m.undeclared_leaked === 0 },
    { gate: PASS_GATES[2], ok: m.version_mismatches_handled === m.version_mismatches_total },
    { gate: PASS_GATES[3], ok: m.invalid_transitions_attempted === 0 },
    { gate: PASS_GATES[4], ok: m.hooks_out_of_order === 0 },
    { gate: PASS_GATES[5], ok: m.host_damage === 0 },
    { gate: PASS_GATES[6], ok: m.plugins_unloaded_clean === m.pods_loaded },
  ]
}

export function buildEvidence(wave: Wave, now: Date): PluginLifecycleEvidenceRecord {
  const pass = isPass(wave)
  return {
    schema: "09_plugin_system-v1",
    source: "plugindoj",
    unit_id: UNIT_ID,
    project: UNIT_ID,
    encounter_id: ENCOUNTER_ID,
    game: "Plugin Docking Bay",
    ts: now.toISOString(),
    pass,
    gates: gateResults(wave.metrics)
      .filter((g) => g.ok)
      .map((g) => g.gate),
    metrics: wave.metrics,
    curriculum_context: {
      concept: "lifecycle-managed plugins with capability + sandbox isolation",
      mechanic: "Plugin Docking Bay",
      accepted_signal:
        "pod advances load->init->start->stop->unload in sandbox, undeclared denied, version mismatched rejected",
      rejected_trap:
        "unsandboxed start, undeclared capability leak, forced invalid transition, version mismatch allowed",
    },
    review_context: {
      unit_kind: "concept",
      scheduled_review: false,
      review_reason: "deepening",
      streak_candidate: false,
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
  }
}

/**
 * Emit the evidence record. Writes one `EVIDENCE <json>` line to the console
 * (stdout-scraping harnesses) and stores it on `window.__gameEvidence` for the
 * Playwright smoke run to pick up. Idempotent per attempt: the smoke run reads
 * the single record at the end of the wave.
 */
export function emitEvidence(record: PluginLifecycleEvidenceRecord): PluginLifecycleEvidenceRecord {
  return dualEmit(record, "game")
}
