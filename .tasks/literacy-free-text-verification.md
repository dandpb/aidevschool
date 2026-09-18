# Literacy free-text verification (judgment-verified prompt_builder)

> Build this with **tlc-implement** (`.claude/skills/tlc-implement`).
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

The independent literacy verifier raises on `prompt_builder` (`learner/gate/literacy_evaluator.py:60-63`) — free-text answers can never pass independent verification, `mastery_eligible` is unreachable, and (grounding finding) the learner's free text never even reaches the verifier: the producer's `structuredAnswer` whitelist (`engines/literacyDojo/src/domain/evidence.ts:107`) strips it and the evidence schema says "free-text never included". The substitute is nothing: the learner completes the activity in the browser and no evidence record exists that anyone could verify.

The change: prompt_builder evidence carries the per-field free text; the verifier judges each field's text against the canonical rubric's intent (one Noul per field, mean score), decides PASS ≥ 0.75 / ESCALATE 0.4–0.75 / FAIL < 0.4 with thresholds owned by code; escalations land in an append-only NDJSON queue the owner resolves by CLI with manual provenance; every judgment is a committed digest-named receipt and re-verification replays it — same evidence, same verdict.

13 criteria in 5 slices · 6 one-way doors · 1 open, of which 0 block. Depends on PR #494 (`judgments.ask_and_record` + replay seam).

## Criteria

### Answer transport

1. Given a prompt_builder evidence record whose `answer` is `{"values": {"tarefa": "Resumir o desempenho semanal...", ...}}`, `validate_literacy_evidence_structure` returns no errors, and `learner/gate/literacy_evidence.schema.json`'s `answer` oneOf validates it (each field value a string of 1–2000 chars; fields outside the activity's declared ids fail validation).
2. The producer emits the free text: `structuredAnswer` in `engines/literacyDojo/src/domain/evidence.ts` returns `{answer: {values: {...}}}` for prompt_builder answers (deep-copied), and a deterministic activity answer passing through the same function is byte-identical to today's output (no regression).

### Judgment verification path

3. Given the real lesson `l18-biblioteca-de-pedidos` activity and a canned client returning Noul ≥ 0.75 for every field, `recompute_literacy_evidence(evidence, root, judgment_client=fake)` returns `score >= 0.75`, `pass == True`, and a `judgment` block carrying the per-field Nouls and the receipt digest.
4. Given canned per-field Nouls averaging < 0.4, recomputation returns `pass == False` with the same block; averaging 0.4–0.75 returns `pass == False` plus `escalate == True`.
5. Given a paraphrased field text that contains none of the rubric's `mustIncludeAny` substrings, a live judgment (env-gated proof, skipped without `TYPESAFE_API_KEY`) scores ≥ 0.75 for that field — semantics over keywords, the lesson this exists to teach.
6. With no `judgment_client` injected (no key at the verifier entry), prompt_builder verification fails closed: verdict FAIL with an error naming `TYPESAFE_API_KEY`, exit 1 — deterministic activity types still verify fully offline (unchanged exit-0 path).

### Verdict wiring

7. The verifier CLI on a prompt_builder PASS prints the receipt JSON with `verdict: "PASS"`, `mastery_eligible: true`, and exits 0; on the 0.4–0.75 band it prints `verdict: "ESCALATE"` and exits 3; on < 0.4 it prints `verdict: "FAIL"` and exits 1.
8. For prompt_builder, a producer `pass: true` claim with independent FAIL/ESCALATE produces NO "producer does not match independent recomputation" error — the producer claim is advisory metadata (`producer_pass_claim`), disagreement is the expected upgrade path.

### Escalation queue and resolution

9. On ESCALATE, one line is appended to `learner/verifier_receipts/literacy-escalations.ndjson` carrying `attempt_id`, `evidence_digest`, per-field Nouls, judgment receipt digest, `status: "open"`; the digest-named judgment receipt exists in `learner/judgment_receipts/`.
10. `python3 -m learner.gate.literacy_verifier --resolve <attemptId> --approve` rewrites that entry to `status: "resolved"`, `resolution: "approve"`, with `resolved_by`/`resolved_at` manual provenance; `--reject` mirrors it; resolving an unknown or non-open attempt exits 1 naming it.
11. Re-verifying evidence whose digest has an approved escalation yields verdict PASS, `mastery_eligible: true`, and a `resolution: "manual"` field citing the resolver — the human path to mastery is recorded, not inferred.

### Replay determinism

12. Verifying the same prompt_builder evidence twice with the key present produces byte-identical receipt JSON (second run replays the committed judgment receipt; one new judgment receipt file at most).
13. Given a different answer (one field changed), re-verification judges fresh (new digest, new receipt) — retry after FAIL is a new judgment, not a replay.

## Out of scope

- Deterministic activity types - unchanged and fully offline
- The canonical rubric YAML and lesson content - consumed read-only
- literacyDojo UI changes beyond the `structuredAnswer` whitelist entry
- Learner-facing per-field judgment feedback - the escalation queue is owner-facing (design Open 2)
- Threshold recalibration - constants land as named values; calibrate on the first real escalations

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| command `python3 -m learner.gate.literacy_verifier` | flags and defaults | existing - `--evidence`, `--write-receipt`, `--root`; adds `--resolve <attemptId>` with `--approve`/`--reject` (10) |
| command | exit codes | 7 (0/1/3), 6 (fail-closed 1), 10 (resolve errors 1) |
| command | output format | existing - receipt JSON on stdout; ESCALATE carries the same shape with the new verdict value (7, 9) |
| command | fails halfway | 9 (escalation append after verdict; judgment receipt before queue line) |
| document `literacy-escalations.ndjson` | structure | 9 (entry fields), 10 (resolution fields) |
| collection escalations queue | duplicates, ordering | 9 (append-only; re-escalation of the same digest appends a new open entry with the same evidence_digest), 10 (only non-open entries resolvable) |

## Swept

- validation: 1 (answer variant shape and field-id binding)
- failure modes: 6 (no key fails closed), 10 (unknown/non-open resolution exits 1)
- idempotency and retry: 12 (re-verify byte-identical via replay), 13 (changed answer re-judges)
- authorization: existing - `TYPESAFE_API_KEY` env/`.env` only; verifier never receives the key in evidence; receipts key-free (PR #486 C4 standard)
- concurrency and ordering: n/a - single-process CLI; queue and receipts via `atomic_write_text` (existing)
- data lifecycle: design Open 1 - queue append-only, owner-curated; receipts committed (PR #486 decision)
- external-dependency failure: 6 (judgment failure fails closed exactly like absence of key)
- state transitions: 9, 10, 11 (open → resolved approve/reject; approved digest → PASS-with-manual-resolution)
- observability: 9 (per-field Nouls in the queue entry and receipt), 3 (judgment block in recomputation)

## Impact

| Front | What changes |
|---|---|
| domain | new term: `literacy_judgment` - per-field Noul construction + mean aggregation; lives in `learner/gate/literacy_judgment.py` |
| domain | new term: `literacy-escalations.ndjson` - append-only owner queue under `learner/verifier_receipts/` |
| domain | existing term: `LiteracyVerdict.verdict` meant `PASS` \| `FAIL`, now adds `ESCALATE` - consumers: the CLI exit mapping and any caller branching on `.passed` (property stays `verdict == "PASS"`; ESCALATE reads as not-passed, exit 3 distinguishes) |
| domain | existing term: `answer` in the evidence schema meant "structured only, free-text never included", now also carries `{values}` for prompt_builder - consumers: `validate_literacy_evidence_structure`, the TS `structuredAnswer` whitelist |
| domain | existing term: `mastery_eligible` meant "deterministic PASS only", now also judgment PASS and approved escalations - consumer: the mastery gate flow reading receipts |
| stored data | nothing to migrate - the queue is new; existing evidence records without `values` stay valid |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| verification semantics | judgment-only: one Noul per field against the rubric intent (state = scenario, genericPrompt, field label/hint, rubric, field text); `score = mean(field Nouls)` | deterministic cascade (minLength floor before judgment) - two provenance layers for cases the judgment already catches (owner round 2026-09-18) |
| thresholds | `PASS_THRESHOLD = 0.75` (mirrors `ACTIVITY_PASS_THRESHOLD`), `ESCALATE_THRESHOLD = 0.4` — named constants in `literacy_judgment.py` | any other band - recalibrate on first real escalations |
| escalation mechanics | `ESCALATE` verdict + exit 3 + append-only `learner/verifier_receipts/literacy-escalations.ndjson` + `--resolve` CLI with manual provenance | auto GitHub issue per escalation - verifier coupled to GitHub, issues become state (owner round 2026-09-18) |
| producer claim (prompt_builder) | advisory metadata; disagreement with the judgment verdict is not an error | error-on-disagreement - would re-block the case this exists to free |
| client policy | injection-only into `recompute_literacy_evidence`; env read at the verifier entry only; fail closed without key on prompt_builder | auto-detect inside the evaluator - breaks hermetic tests |
| determinism | replay committed judgment receipts by input digest; approved escalations turn the digest's re-verification into PASS with `resolution: "manual"` | live re-judgment per verify - answer variance flips verdicts retroactively |
| answer transport | schema `answer` oneOf gains `{values: {<fieldId>: string, 1..2000 chars}}`; TS whitelist emits `values` deep-copied | URL-encoded blob / sidecar file - one more artifact to keep in sync with the record |

## Sources

- `.design/literacy-free-text-verification.md` - **binding for behavior and shape**: semantics, thresholds, escalation, replay, transport amendment
- `docs/design/rfc-literacy-free-text-verification.md` - ACCEPTED (owner YES 2026-09-17) - the authorization this task implements
- `learner/gate/literacy_evaluator.py` (:60-63 raise, `ACTIVITY_PASS_THRESHOLD`), `literacy_verifier.py` (CLI, `LiteracyVerdict`, receipt), `evidence_validator.py:52`, `engines/literacyDojo/src/domain/evidence.ts:107` (`structuredAnswer`), `curriculum/ai-literacy/schemas/lesson.schema.json` + `modules/06-rotina-com-ia/l18-*.yaml` - grounding
- PR #494 / `learner/substrate/judgments.py` (`ask_and_record`, `replay_cached`) - the seam being consumed (dependency)

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Per-field text upper bound (schema `maxLength`) | default taken: 2000 chars per field (MAX_EVIDENCE_BYTES caps the record anyway); adjust in review if real answers run longer |
