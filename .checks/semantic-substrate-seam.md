# Semantic judgment enrichment for the learner substrate seam

Sources:

- `.tasks/semantic-substrate-seam.md` - the criteria, Decided rows, boundary (binding)
- `.design/semantic-substrate-seam.md` - **binding for behavior and receipt shape**: snapshot policy, fallback states, receipts, scheduling boundary
- `learner/substrate/scheduling.py:1-19` - ADR rule forcing the no-ratings boundary

## Out of scope

- Literacy free-text rubric verification - needs its own RFC (design doc, Needs an RFC 1)
- Scheduling/FSRS rating sources - ADR forbids non-gate ratings
- Fragile-parsing map items 6-10 - separate tickets (task doc, Out of scope)

## Landing

Adds `learner/substrate/judgments.py` (runner + receipts, injected client) and `learner/judgment_receipts/` (runtime only); touches `learner/substrate/dashboard_snapshot.py` (enrichment seam + `masteredCount` re-source) and the sync entry in `learner/substrate/` that composes `projections.py`. Reuses `snapshot_sources.py` parsers as the fallback (not duplicated), the `_utc_stamp` style from `learner/new_instance.py`, and `atomic_write_text` from `shared/fsio.py`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Judgment provider dependency | TypeSafe HTTP API `POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`, stdlib `urllib` only (no new package dep), `Authorization: Bearer $TYPESAFE_API_KEY` | self-hosted model - no offline/key-policy constraint exists |
| Receipt record + home | `learner/judgment_receipts/<kind>-<input_digest[:16]>.ndjson` (fallback lines: `...-fallback.ndjson`), one JSON object per question: `question`, `kind` (noul/choice), `answer`, `probabilities`, `model`, `usage`, `input_digest` (sha256 of canonical state+questions), `timestamp`, `status` (ok/fallback). Build-time amendment: digest names replace `<UTC-stamp>-<kind>` so a re-sweep of identical inputs overwrites instead of duplicating — receipts map 1:1 to distinct sweeps. | `learner/verifier_receipts/` - the gate-evidence dir stays gate-only |
| One sweep per sync | `default_client()` returns `memoized(http_client(key))` caching answers by input digest for the client's lifetime — a sync's four snapshot-building views reuse one consistent sweep | per-view independent sweeps - 4x API cost and possibly inconsistent enriched values across views in one sync |
| Enrichment is injection-only; env detection solely at the sync entry | `build_snapshot(..., judgment_client=None)` never reads env and never calls the API; the sync entry constructs the real client from `TYPESAFE_API_KEY` and passes it down | auto-detect inside `build_snapshot` - existing tests call `build_snapshot()` directly and would silently hit the live API whenever a key is exported, breaking hermeticity (AID-2132 lesson) |
| Scheduling boundary (forced) | runner exposes no rating; `derive_next_reviews(units_log, pitfalls, today)` signature and inputs unchanged | none - forced by the spaced-repetition ADR |
| `masteredCount` source | `sum(1 for u in units_log if u.get("mastered"))`, both `source_root` branches | catalog status prefix - conflates engine implementation with learner mastery |

- Snapshot policy (semantic replaces parsed per field; fallback restores deterministic values) is task-decided but reversible - not a door here.

## Checks

### S1 - Semantic runner with receipts and fallback · 5 files · ~60 KB · ~15k

**C1** - A key-present sync run with a working client writes `learner/judgment_receipts/<UTC-stamp>.ndjson` with one JSON object per asked question, each carrying `question`, `kind`, `answer`, `probabilities`, `model`, `usage`, `input_digest` (64-char lowercase hex), `timestamp`, `status: "ok"`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_receipt_written_on_success"`

**C2** - With no client (key unset at the sync entry), no new file appears under the receipts root, and the snapshot is byte-identical (sorted-key JSON equality) to the deterministic golden for the same fixture tree and injected `today` (golden regenerated after the task-decided `masteredCount` re-source — that change is unconditional, not key-gated, and C11 covers it)
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_no_client_is_byte_identical_to_golden"`

**C3** - If the client raises (HTTP error, timeout, network) or returns answers whose keys do not match the asked questions, the snapshot equals the deterministic fallback values and one receipt line with `status: "fallback"` and the error class is written
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_fallback_on_client_failure"` and `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_fallback_on_mismatched_answer_keys"`

**C4** - No receipt file ever contains the value of `TYPESAFE_API_KEY`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_key_never_in_receipt"`

**C5** - With a working client installed, `snapshot["nextReviews"]` equals the no-client `nextReviews` for the same `units_log` and injected `today`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_next_reviews_unchanged_by_enrichment"`

### S2 - Pitfall recurrence counts · 3 files · ~18 KB · ~5k

**C6** - With canned Nouls assigning >= 0.5 to the 21 recorded-hit entries of the 51-entry fixture, `topPitfalls[0].occurrences == 21` with `id` and `lastSeen` unchanged from parser output
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_occurrences_count_semantic_hits"`

**C7** - A new fixture journal entry repeating the trap (canned noul 0.8) raises `occurrences` by 1 and writes one more receipt file (the changed pitfalls sweep's digest-named file; the unchanged profile sweep overwrites its own); canned 0.2 does not
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_new_recurrence_updates_count_and_receipt"`

**C8** - Live (skipped without `TYPESAFE_API_KEY`): one real-API run over the repo's actual journal yields `topPitfalls[0].occurrences >= 15`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_live_smoke_occurrences"`

### S3 - Profile levels from the matrix · 3 files · ~14 KB · ~4k

**C9** - Canned Choices `dreyfus_overall -> competent (0.99)`, `bloom_overall -> analyze (0.97)` give `profile.dreyfus == "competent"`, `profile.bloom == "analyze"`; no client gives `bloom == "apply"`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_profile_choice_overrides"`

**C10** - On a Portuguese-only matrix fixture (`Avançado (Proficiente)`, no English keyword), no client keeps the parser default `"competent"`; canned `dreyfus_overall -> proficient` yields `"proficient"`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_profile_portuguese_only_cells"`

### S4 - masteredCount from units_log · 3 files · ~17 KB · ~4k

**C11** - With 2 mastered units in the fixture `units_log`, `masteredCount == 2`; flipping a fixture catalog Status cell from `scaffolded` to `✅ Implemented` leaves `masteredCount == 2`
Proof: `python3 -m pytest "learner/substrate/tests/test_judgments.py::test_mastered_count_from_units_log"`

## Swept

- validation: C3 (mismatched answer keys -> fallback)
- failure modes: C3
- idempotency and retry: C2 (re-run without client byte-identical; receipts append per run as audit)
- authorization: C4 - key via env/`.env` (gitignored), never in receipts or the repo
- concurrency and ordering: existing - single-process CLI; `atomic_write_text` already used
- data lifecycle: Unresolved 1 in the task - default taken: prune to newest 30 receipt files in-run
- external-dependency failure: C3
- state transitions: not in scope - enrichment is stateless over its inputs
- observability: C1 (the receipts are the observability record)

## Handoff

One batch: all four slices total ~28k estimated reading against a 150k budget. No handoff boundary; single build agent, then the orchestrator dispatches the Verifier over the whole feature.
