# PixelDojo Quest — Evidence Contract

Contract between the game (`pixel-quest/`, producer) and the verifier
(`verifier/`, consumer). The game emits evidence **only**; it never writes
learner state. The verifier reads this file and decides the learning gate.

## File location

```
engines/pixelDojo/pixel-quest/.logs/evidence.ndjson
```

Written by the Playwright smoke run (`pnpm run smoke` inside `pixel-quest/`),
which captures the append-only in-page channel `window.__pixelQuestEvidence`
at the end of the run. NDJSON: one JSON object per line, one line per
completed encounter attempt, in play order. The file is regenerated on every
smoke run (generated artifact — not committed).

Source of truth for the emission logic and this schema:
`pixel-quest/src/game/evidence/emitter.ts` (types in
`pixel-quest/src/game/evidence/types.ts`, runtime validation in
`pixel-quest/src/game/evidence/evidence.ts`).

## Schema (one JSON object per line)

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `"pixelquest"` | Literal. Identifies the emitting game. |
| `unit_id` | `string` | Curriculum unit the attempt evaluates. Non-empty. |
| `project` | `string` | Curriculum project folder (e.g. `01_rate_limiter`). Non-empty. |
| `encounter_id` | `string` | Encounter that produced the attempt. Non-empty. |
| `game` | `"PixelDojo Quest"` | Literal. |
| `ts` | `string` | ISO-8601 emission timestamp. |
| `pass` | `boolean` | In-game result only. The verifier owns mastery — a `pass` here is never mastery by itself. |
| `metrics` | `object` | Per-kind variant, discriminated by `metrics.kind`: `pixelquest-token-bucket`, `pixelquest-route-health`, `pixelquest-policy-gate`, or `pixelquest-sequence-flow`. Exact fields per kind in `pixel-quest/src/game/evidence/types.ts`. |
| `review_context` | `object` (optional) | Scheduled-review projection: `unit_kind`, `scheduled_review`, `review_reason`, `streak_candidate`, `scheduler_source: "learner-substrate"`, `verifier_required: true`. |
| `curriculum_context` | `object` (optional) | `concept`, `mechanic`, `accepted_signal`, `rejected_trap`. |

Every record is validated against this schema at emission time
(`validateEvidenceRecord`); malformed records are never written.

## How the verifier consumes this

`python3 -m engines.pixelDojo.verifier` (from the ecosystem root) reads this
NDJSON file by default (falling back to the legacy single-record
`engines/pixelDojo/.logs/last_run_evidence.json` if the NDJSON is absent;
`--evidence PATH` overrides either). Consumption rules:

- **Selection:** only the **latest** record whose `unit_id` matches
  `learner/learning_state.yaml > active_unit.id` is graded; all other lines
  belong to other units and are ignored (they gate when their unit is active).
  No matching record, an empty file, or an active unit not in `evaluating`
  state means *nothing to grade* — the CLI says so and exits 0 without writing.
- **Strict parsing:** a malformed line rejects the whole file (the emitter
  validates records before writing, so a bad line means tampering/truncation).
- **Gate preconditions (all enforced before any write):** required fields
  present; `unit_id`/`project` match the active unit; a non-empty learner
  attempt file exists (attempt-before-solution); `metrics`, when present, is a
  discriminated object; `ts` is valid ISO-8601 and **strictly newer** than the
  last gated evidence for the unit (anti-replay — each gate review records the
  `evidence_ts` it consumed, so a record can never be graded twice).
- `pass: true` in a record is never mastery by itself; the verifier maps the
  eligible record to a gate outcome (`fail` / `pass_retried` /
  `pass_first_try`) and appends the review to
  `learner/learning_state.yaml > units_log` via the substrate's scheduling
  primitives. Exit 1 means the evidence was rejected; `--dry-run` decides
  without writing.

## Example line

```json
{"source":"pixelquest","unit_id":"U0-sonda-rate-limiter-robustness","project":"01_rate_limiter","encounter_id":"encounter-agent-quest-01","game":"PixelDojo Quest","ts":"2026-07-05T12:00:00.000Z","pass":true,"metrics":{"kind":"pixelquest-sequence-flow","advanced":5,"held":5,"skipped_required":0,"guards_missed":0,"heat_peak":0,"overheated":false},"review_context":{"unit_kind":"concept","scheduled_review":true,"review_reason":"due","streak_candidate":true,"scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"Orquestracao agentica para provar robustez de token bucket","mechanic":"Agent Quest","accepted_signal":"acao agentica correta","rejected_trap":"atalho sem evidencia"}}
```
