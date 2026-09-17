# Semantic judgment enrichment for the learner substrate seam

> Build this with **tlc-implement** (`.claude/skills/tlc-implement`).
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

The learner schedules reviews from numbers the substrate computes by string shape over human prose. `topPitfalls[0].occurrences` reads 1 on the live dashboard because the counter matches the first word of the pitfall title (`reivindicar`, 0 journal hits) while the true recurrence count of that trap is 21 — and that pitfall list feeds `derive_next_reviews`' recurring-trap entry in the granted spaced-repetition design. `profile.dreyfus`/`bloom` come from first-row English keyword matching that silently defaults on Portuguese-only cells. `masteredCount` counts catalog implementation statuses, which coincides with real mastery today (2 = 2) and stops coinciding the moment a project is implemented without being mastered.

The change: substrate sync gains an env-gated judgment step. With `TYPESAFE_API_KEY` set, a batched typed-judgment request (Noul sweep for pitfall recurrence, Choices for Dreyfus/Bloom) overrides the parser outputs, every judgment lands in an NDJSON receipt, and `masteredCount` is re-sourced from `units_log` deterministically. Without the key or on any API failure, output is byte-identical to today's.

11 criteria in 4 slices · 5 one-way doors · 1 open, of which 0 block

## Criteria

### Semantic runner with receipts and fallback

1. When `python3 -m learner.substrate` runs with `TYPESAFE_API_KEY` set and the judgment API reachable, a file `learner/judgment_receipts/<UTC-stamp>.ndjson` is created holding one JSON object per asked question, each with `question`, `kind` (`noul`|`choice`), `answer`, `probabilities`, `model`, `usage`, `input_digest` (64-char lowercase sha256), `timestamp`, `status: "ok"`.
2. When the same command runs with `TYPESAFE_API_KEY` unset, no new file appears in `learner/judgment_receipts/`, the snapshot fields `topPitfalls`, `profile.dreyfus`, `profile.bloom`, `masteredCount` are byte-identical to the pre-change deterministic output, and the exit code is 0.
3. If the API errors, times out, is unreachable, or returns answers whose keys do not match the asked questions (key set), the sync still exits 0, snapshot fields equal the deterministic fallback values, and one receipt line with `status: "fallback"` and the error class is written.
4. Always, no receipt file contains the value of `TYPESAFE_API_KEY` (byte search of the file for the key string).
5. While semantic enrichment is active (key set, canned responses installed), `snapshot["nextReviews"]` equals the one produced with the key unset for the same `units_log` and injected `today` — judgments change no scheduling output.

### Pitfall recurrence counts

6. Given the current `learner/pitfalls.md` (1 pitfall) and the 51 journal entries, with canned Noul responses assigning ≥ 0.5 to the 21 entries of the recorded live distribution, `snapshot.topPitfalls[0].occurrences == 21` with `id` and `lastSeen` unchanged from parser output.
7. Given a journal fixture gaining one entry repeating the trap (canned noul 0.8), the next sync increases `occurrences` by 1 and writes a new receipt file; with canned noul 0.2 it does not.
8. Given the live API and `TYPESAFE_API_KEY` present (env-gated proof, skipped otherwise), one sync over the current repo yields `topPitfalls[0].occurrences >= 15`.

### Profile levels from the matrix

9. With canned Choice responses `dreyfus_overall → competent (0.99)` and `bloom_overall → analyze (0.97)`, `snapshot.profile.dreyfus == "competent"` and `snapshot.profile.bloom == "analyze"`; with the key unset, `profile.bloom == "apply"` (parser value).
10. Given a `learner_profile.md` fixture whose matrix cells are Portuguese-only (e.g. `Avançado (Proficiente)` with no English keyword), with the key unset `profile.dreyfus` stays the parser default `"competent"` (existing silent behavior), and with canned `dreyfus_overall → proficient` it equals `"proficient"`.

### masteredCount from units_log

11. With the current `learning_state.yaml` (2 mastered units), `snapshot.masteredCount == 2`; and flipping a `catalog.md` Status cell from `scaffolded` to `✅ Implemented` leaves `masteredCount == 2`.

## Out of scope

- Literacy free-text rubric verification (`learner/gate/literacy_evaluator.py` prompt_builder gap) - changes what "independently verified" means; needs its own RFC (design doc, Needs an RFC 1)
- Scheduling behavior and FSRS rating sources - the spaced-repetition ADR forbids non-gate ratings
- Fragile-parsing map items 6–10 (the-judge scanner, dojotoday alignment, phase-from-prose, gate metric allowlist, checklist thresholds) - deterministic fixes or offline tooling, separate tickets

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| command `python3 -m learner.substrate` | output format and verbosity | existing - stdout unchanged; receipts are the new output (1) |
| command `python3 -m learner.substrate` | flags and defaults | existing - no new flags; `TYPESAFE_API_KEY` env is the only switch (1, 2) |
| command `python3 -m learner.substrate` | exit codes | 3 (also 2) |
| command `python3 -m learner.substrate` | fails halfway | 3 |
| document `learner/judgment_receipts/*.ndjson` | structure | 1 |
| collection `learner/judgment_receipts/` | naming, duplicates, lifecycle | 1 + Unresolved 1 |
| screen surfaces | none new | n/a - codexDojo renders changed values only; no new UI states |

## Swept

- validation: 3 (mismatched/malformed answer keys treated as failure → fallback)
- failure modes: 3
- idempotency and retry: 2 (re-run without key byte-identical; receipts append per run as audit, snapshot deterministic given responses)
- authorization: 4 - key read from env/`.env` (gitignored, `.gitignore:44`), never in receipts or the repo
- concurrency and ordering: n/a - single-process CLI sync; snapshot writes already use `atomic_write_text` (existing)
- data lifecycle: Unresolved 1
- external-dependency failure: 3
- state transitions: n/a - enrichment is stateless over its inputs; no lifecycle changes
- observability: 1 (the receipts are the observability record)

## Impact

| Front | What changes |
|---|---|
| domain | new term: `judgment receipt` - one NDJSON line recording a typed judgment with full provenance; lives in `learner/substrate/judgments.py`, files under `learner/judgment_receipts/` |
| domain | existing term: `topPitfalls[].occurrences` meant 1 + first-word substring hits, now means semantic recurrence count - consumers: codexDojo `src/render/learner.ts` (display) and `derive_next_reviews`' recurring-trap entry (consumes the pitfall list) |
| domain | existing term: `profile.bloom` may flip `apply` → `analyze` on the next key-present sync - consumer: codexDojo display only |
| domain | existing term: `masteredCount` meant implemented-prefixed catalog statuses, now means `units_log` mastered units - consumer: codexDojo display |
| stored data | nothing to migrate - receipts are new files; the snapshot is regenerated from source files |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| judgment provider | TypeSafe HTTP API `POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`, `Authorization: Bearer $TYPESAFE_API_KEY`; one batched request per sweep | self-hosted model - offline/key-policy constraints, neither present |
| receipt record | `learner/judgment_receipts/<UTC-stamp>.ndjson`; one JSON object per question: `question`, `kind` (noul/choice), `answer`, `probabilities`, `model`, `usage`, `input_digest` (sha256), `timestamp`, `status` (ok/fallback) | `learner/verifier_receipts/` - the gate-evidence directory stays gate-only |
| snapshot policy | semantic value replaces the parsed value per field; any failure or absent key restores deterministic values | dual fields (parsed + semantic side by side) - provenance belongs in receipts, not the dashboard |
| scheduling boundary | the runner exposes no rating; `derive_next_reviews(units_log, pitfalls, today)` signature and inputs unchanged | none live - forced by the spaced-repetition ADR ("ratings come ONLY from gate outcomes") |
| masteredCount | `sum(1 for u in units_log if u.get("mastered"))` | catalog status prefix - conflates engine implementation with learner mastery |

## Surface

| Route | In | Out | Status | Criteria |
|---|---|---|---|---|
| `python3 -m learner.substrate` | env `TYPESAFE_API_KEY` (optional) | snapshot files (existing paths), `learner/judgment_receipts/<stamp>.ndjson` (new) | exit 0 incl. API failure | 1, 2, 3 |

## Sources

- `.design/semantic-substrate-seam.md` - **binding for behavior and receipt shape**: snapshot policy, fallback states, receipts
- Experiment record 2026-09-17 (quoted in the design doc's Evidence) - thresholds in criteria 6 and 8
- `learner/substrate/scheduling.py:1-19` - the ADR rule forcing the scheduling boundary

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Judgment-receipt retention: prune during sync or keep all? | default taken: prune to newest 30 receipt files in-run; older receipts are deleted |
