# Literacy free-text verification (judgment-verified prompt_builder)

Sources:

- `.tasks/literacy-free-text-verification.md` - the 13 criteria, Decided rows, boundary (binding)
- `.design/literacy-free-text-verification.md` - **binding for behavior and shape** (incl. the transport amendment)
- `docs/design/rfc-literacy-free-text-verification.md` - ACCEPTED (owner YES, 2026-09-17): the authorization and its conditions
- `learner/substrate/judgments.py` (`ask_and_record`, `replay_cached`) - the seam being reused

## Out of scope

- Deterministic activity types - unchanged, fully offline
- The canonical rubric YAML/lesson content - read-only
- literacyDojo UI beyond the `structuredAnswer` whitelist entry
- Learner-facing per-field judgment feedback; threshold recalibration

## Landing

Adds `learner/gate/literacy_judgment.py` (per-field Noul construction + mean aggregation + thresholds) and the escalations queue; changes the evaluator's prompt_builder branch, the verifier CLI (ESCALATE/exit 3/`--resolve`), the evidence schema's `answer` oneOf, and the TS `structuredAnswer` whitelist. Reuses `judgments.ask_and_record` (receipts) and the substrate entry client (env+replay) — no new judgment plumbing.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Judgment receipt sweep | sweep name `literacy`, primitive `noul`, one question per field (`{activityId}::{fieldId}`), receipts via `ask_and_record` in `learner/judgment_receipts/literacy-<digest16>.ndjson` | a literacy-specific receipt format - second receipt standard in one repo |
| Escalation queue location | `learner/verifier_receipts/literacy-escalations.ndjson`, append-only, entries `{attempt_id, evidence_digest, field_scores, judgment_receipt_digest, status: open\|resolved, resolution?: approve\|reject, resolved_by?, resolved_at?}` | `learner/judgment_receipts/` - that dir is judgment provenance; resolutions are human decisions with their own provenance |
| Approved-escalation semantics | re-verification of a digest with `status: resolved, resolution: approve` → verdict PASS, `mastery_eligible: true`, `resolution: "manual"` in the receipt | auto-PASS on approve without re-verify context - mastery provenance must be reconstructable from files alone |
| Verifier client | `from learner.substrate import default_judgment_client` at the verifier entry (env + dotenv + memo + disk replay), injected into `recompute_literacy_evidence` | auto-detect inside the evaluator - breaks hermetic tests (the established injection-only convention) |
| Fail-closed error shape | no key / API failure on prompt_builder → `LiteracyEvaluationError("prompt_builder verification requires TYPESAFE_API_KEY ...")` surfacing as verdict FAIL, exit 1 | silent skip of judgment - a pass-shaped hole in the gate |
| TS whitelist entry | `if ("values" in answer) return { answer: { values: { ...answer.values } } };` — deep copy, matches the existing per-shape style | JSON round-trip clone - inconsistent with the file's spread-copy idiom |

- Nothing else in this change is hard to reverse.

Build-time door (additive):

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Receipt retention removed | `judgments._prune_receipts` and `RECEIPT_RETENTION` deleted — receipts are append-only committed provenance | keeping the 30-file retention - it would delete exactly the receipts the metric-lint snapshot and literacy verifications cite as provenance (the check-replay decision supersedes the task's Unresolved-1 default) |

## Checks

### S1 - Answer transport · 4 files · ~18 KB · ~5k

**C1** - The schema's `answer` oneOf validates `{values: {<fieldId>: string 1..2000}}` and the structure validator accepts it; a `values` entry with a non-string/empty/oversized field, or fields the activity does not declare, is rejected
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_values_answer_transport"`

**C2** - The TS producer emits the free text: `structuredAnswer` returns `{answer: {values: {...}}}` for prompt_builder answers and is byte-identical to today's output for every structured shape
Proof: `cd engines/literacyDojo && NODE_ENV=development npx vitest run tests/domain/evidence.test.ts` (new file)

### S2 - Judgment verification path · 3 files · ~14 KB · ~4k

**C3** - Canned per-field Nouls ≥ 0.75 for every field of the real `l18` activity → recomputation returns `score >= 0.75`, `pass == True`, and a `judgment` block with per-field Nouls + receipt digest
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_judgment_pass_path"`

**C4** - Mean < 0.4 → `pass == False`, no escalation; mean 0.4–0.75 → `pass == False` and `escalate == True`
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_judgment_bands"`

**C5** - Live (skipped without `TYPESAFE_API_KEY`): a paraphrased field text sharing zero `mustIncludeAny` substrings with the rubric scores ≥ 0.75
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_live_paraphrase_semantics"`

**C6** - No key at the verifier entry → verdict FAIL with an error naming `TYPESAFE_API_KEY`, exit 1; a deterministic-type record still verifies offline with exit 0
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_fail_closed_without_key"`

### S3 - Verdict wiring · 2 files · ~10 KB · ~3k

**C7** - CLI exits 0/3/1 with `verdict` PASS/ESCALATE/FAIL respectively, receipt JSON on stdout
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_cli_exit_codes"`

**C8** - prompt_builder producer `pass: true` + independent FAIL/ESCALATE produces no mismatch error; `producer_pass_claim` carries the claim as metadata
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_producer_claim_advisory"`

### S4 - Escalation queue and resolution · 2 files · ~8 KB · ~2k

**C9** - ESCALATE appends one queue entry (attempt_id, evidence_digest, field scores, receipt digest, `status: "open"`) and the judgment receipt exists
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_escalation_appends_queue"`

**C10** - `--resolve <attemptId> --approve|--reject` rewrites the entry with resolution + `resolved_by`/`resolved_at`; unknown or non-open attempt exits 1 naming it
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_resolve_cli"`

**C11** - Re-verifying evidence whose digest has an approved escalation → PASS, `mastery_eligible: true`, `resolution: "manual"` citing the resolver
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_approved_escalation_passes"`

### S5 - Replay determinism · 2 files · ~6 KB · ~2k

**C12** - Same evidence verified twice with key present → byte-identical receipt JSON, at most one judgment receipt file
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_replay_determinism"`

**C13** - One field changed → new digest, fresh judgment (new receipt), not a replay
Proof: `python3 -m pytest "learner/gate/tests/test_literacy_judgment.py::test_changed_answer_rejudges"`

## Swept

- validation: C1 (answer variant, field-id binding, bounds)
- failure modes: C6, C10 (unknown/non-open resolution)
- idempotency and retry: C12, C13
- authorization: existing - `TYPESAFE_API_KEY` env/`.env` only; receipts key-free (PR #486 C4 standard)
- concurrency and ordering: existing - single-process CLI; queue/receipts via `atomic_write_text`
- data lifecycle: design Open 1 - queue append-only, owner-curated
- external-dependency failure: C6 (judgment failure fails closed like key absence)
- state transitions: C9, C10, C11 (open → resolved; approved digest → PASS with manual resolution)
- observability: C3 (judgment block), C9 (per-field scores in the queue entry)

## Handoff

One batch: all five slices total ~16k estimated reading against a 150k budget. Single build agent; the orchestrator dispatches the Verifier over the whole feature afterwards.
