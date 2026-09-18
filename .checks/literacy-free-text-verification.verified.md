# Literacy free-text verification (judgment-verified prompt_builder) — Verification

**Verdict**: PASS
**Profile**: light (step 1 `ui` and step 4 fault injection skipped per profile; steps 2, 3, 5 run; Swept "existing" rows re-read)
**Diff range**: d4a61da..fb30f6b
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

## Round-2 scope

Round 1 (at 66940da) FAILED on C11 only: the approved-escalation lookup fired on
outright failure, not the ESCALATE band, and resolved digests re-queued duplicates. This
round re-judges the fix `fb30f6b` plus the surfaces it touched; everything else carries
from 66940da (marked below). Proofs re-ran in full at HEAD per protocol.

## C11 re-judged (the round-1 FAIL)

The fix lands exactly the prescribed direction, verified in code at HEAD:

- **Lookup covers the ESCALATE band** — `learner/gate/literacy_verifier.py:208`
  `if not independent_pass:` guards `_approved_resolution(...)` (:209). The ESCALATE band
  (0.4–0.75) has `independent_pass == False` (`_recomputed_flags`, :189-194, returns
  `ok and bool(recomputed["pass"])`), so it now consults the queue. The old condition
  (`judgment_errors or (not independent_pass and not escalate)`) is gone.
- **Resolved digests queue nothing further** — `literacy_verifier.py:223-224`
  `if escalations_path is None or resolution is not None: return` at the top of
  `_queue_escalation`, which now receives `resolution` (:221) from the call site
  (:278-282, still gated on `escalate`). A FAIL-band approved digest never reaches the
  call (`escalate` False); an ESCALATE-band approved digest reaches it and returns early.
- **Verdict precedence holds** — `_verdict_word` (:239-242) checks `independent_pass`
  first, so an approved escalate-band digest reads PASS even though `escalate` stays True.
- **Proof now drives the production sequence** — `test_approved_escalation_passes`
  (`test_literacy_judgment.py:271-318`): FakeClient(0.6) → ESCALATE + exactly one queue
  line (:282-283); real `resolve_escalation(L18_ATTEMPT, approve=True)` → exit 0
  (:287-288); re-verify → PASS, `mastery_eligible is True`, `resolution == "manual"`,
  still exactly one queue line (:290-296); plus the FAIL-band regression guard
  (0.2 digest with resolved/approve → PASS/manual, :298-318). The hand-written-entry-only
  gap from round 1 is closed — the entry the re-verify consults is one the production
  queue flow itself created and the real resolver rewrote.
- **Blast radius**: both helpers are private with exactly one call site each, inside
  `verify_literacy_evidence` (repo-wide grep) — no other surface consumes the changed
  semantics. Coverage recompute for the new branches: production sequence (ESCALATE-band
  approval), no-duplicate early return, and FAIL-band guard each have a settling
  assertion in the extended proof.

**Result: PASS.**

## Binding sources — carried from 66940da

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| `.tasks/literacy-free-text-verification.md` | yes | none (round-1 criterion-11 contradiction resolved by fb30f6b) | - |
| `.design/literacy-free-text-verification.md` (incl. transport amendment) | yes | none (round-1 approved-escalation door violation resolved) | - |
| `docs/design/rfc-literacy-free-text-verification.md` (ACCEPTED 2026-09-17) | yes | none | - |
| `learner/substrate/judgments.py` (seam) | yes | none | - |

Step 1 is `ui`-gated and did not run under `light`; the fix touched no interface. Sources
above were opened in round 1 and re-opened as needed for the C11 door wording.

## Proofs run at HEAD (step 2) — round 2, full re-run

- `python3 -m pytest learner/gate/tests/test_literacy_judgment.py learner/gate/tests/test_literacy_verifier.py -v` —
  **29 passed, 0 failed, exit 0**, every check proof appearing individually as PASSED.
  `test_live_paraphrase_semantics` ran live (not skipped): it builds
  `http_client(os.environ["TYPESAFE_API_KEY"])` directly (`test_literacy_judgment.py:152`,
  no replay), the key is present, and no canned path can satisfy its `score >= 0.75`
  assertion.
- `python3 scripts/check_python_complexity.py --max 8 --baseline scripts/python_complexity_baseline.txt learner engines/minimaxDojo engines/openclaw engines/miniMaxEvolutionEngine engines/aiDevschoolMvp` — **exit 0**.
- Receipts (round-1 non-blocking observation, resolved): all three committed files
  (`literacy-a1a9c72fae9c363d`, `literacy-ba3ab1e28f62c652`, `literacy-e0bf59e8a3ec694b`)
  carry canned `0.5` answers on every line — FakeClient(0.5) residue. The live C5
  receipt is **not** among them and cannot be: C5 (runs at 13%) writes real scores into
  the `e0bf…` digest file, then later canned tests in the same run (C12 replay et al.)
  overwrite the digest-named file with 0.5 lines. So 66940da's "from the live proofs"
  message is inaccurate, but the receipts are harmless test artifacts. Known behavior,
  unchanged in kind: every full-suite run dirties the two tracked receipts
  (timestamp-only — verified by diff, restored to HEAD after this run) and now also
  regenerates the untracked `literacy-d6fb10291ae02bd6.ndjson` (0.2 answers — the C11
  FAIL-band guard / `literacy_evidence_digest_of` helper writes it via the seam).

## Checks (step 3)

C11 re-judged above. All other rows **carried from 66940da** (proofs re-run green at
fb30f6b; citations into `literacy_verifier.py` refreshed for the +3-line shift the fix
introduced — test-file lines below 271 are unchanged).

| Check | Claim | Proof run | Evidence (settling assertion) | Result |
|---|---|---|---|---|
| C1 | values variant validates; bad shapes/undeclared ids reject | `test_values_answer_transport` PASSED | `test_literacy_judgment.py:78` accept; `:87-90` bad shapes; `:93-97` undeclared-field rejection at recompute | PASS |
| C2 | TS emits `{answer:{values}}` deep-copied; structured shapes unchanged | vitest 8/8 PASSED (round 1) | `evidence.test.ts:44-47` values emission; `:50-54` mutation isolation; `:56-64` six structured shapes; `useCases.test.ts:216` `toEqual(answer)` | PASS |
| C3 | ≥0.75 → pass + judgment block + receipt digest | `test_judgment_pass_path` PASSED | `test_literacy_judgment.py:110-113` (`pass is True`, `score == approx(0.9)`, `len(receipt_digest) == 16`) | PASS |
| C4 | <0.4 no escalation; 0.4–0.75 escalates | `test_judgment_bands` PASSED | `:127` (`not escalate` @0.2), `:133` (`escalate is True` @0.6); bands `literacy_judgment.py:113-114` | PASS |
| C5 | live paraphrase, zero rubric substrings, ≥0.75 | `test_live_paraphrase_semantics` PASSED (live, re-run this round) | `:146-150` keyword sanity; `:152-155` (http_client, `errors == []`, `score >= 0.75`) | PASS |
| C6 | no key → FAIL naming TYPESAFE_API_KEY; deterministic offline | `test_fail_closed_without_key` PASSED | `:161-164`; deterministic-offline `test_literacy_verifier.py:10-18`; message `literacy_evaluator.py:167-172` | PASS |
| C7 | CLI exits 0/3/1 = PASS/ESCALATE/FAIL, receipt JSON | `test_cli_exit_codes` PASSED | `:184-187` (`== 0/3/1`); exit map `literacy_verifier.py:394-412` | PASS |
| C8 | producer claim advisory, no mismatch error | `test_producer_claim_advisory` PASSED | `:223-225`; early return `literacy_evaluator.py:207-213` vs loop `:224-226` | PASS |
| C9 | ESCALATE appends queue entry; receipt exists | `test_escalation_appends_queue` PASSED | `:241-250` (one entry, `status=="open"`, `evidence_digest` match, receipt exists) | PASS |
| C10 | resolve rewrites with provenance; unknown/non-open exit 1 | `test_resolve_cli` PASSED | `:261-268`; messages `literacy_verifier.py:331,334`; provenance rewrite `:337-342`; atomic rewrite `:343-346` | PASS |
| C11 | approved escalation → PASS, manual resolution | `test_approved_escalation_passes` PASSED **through the production sequence** | re-judged this round — see "C11 re-judged"; `test_literacy_judgment.py:271-318`, `literacy_verifier.py:208-211, 223-224, 239-242` | **PASS** |
| C12 | same evidence twice → byte-identical receipt | `test_replay_determinism` PASSED | `:311` `first.to_receipt_dict() == second.to_receipt_dict()`; replay half rests on the seam (`substrate/tests/test_judgments.py:298`) + CLI wiring `literacy_verifier.py:380-384` | PASS (weak) |
| C13 | changed field → new digest, fresh judgment | `test_changed_answer_rejudges` PASSED | `:322` `first[...receipt_digest] != second[...receipt_digest]` | PASS |

13 of 13 checks proven.

## Landing literal shapes — carried from 66940da (line numbers refreshed)

| Door | Evidence | Result |
|---|---|---|
| values schema variant | `literacy_evidence.schema.json` values oneOf member (required `["values"]`, `additionalProperties: false`) | matches |
| TS whitelist entry + deep copy | `evidence.ts:122` — `if ("values" in answer) return { answer: { values: { ...answer.values } } };` | matches |
| sweep `literacy` / primitive `noul` / `{activityId}::{fieldId}` / `ask_and_record` receipts | `literacy_judgment.py:60, 93-94` | matches |
| ESCALATIONS_PATH location | `literacy_verifier.py:32-34` — `learner/verifier_receipts/literacy-escalations.ndjson` | matches |
| resolve provenance fields | `literacy_verifier.py:337-342` (status/resolution/resolved_by/resolved_at rewrite) | matches |
| thresholds | `literacy_judgment.py:21` `PASS_THRESHOLD = 0.75`, `:24` `ESCALATE_THRESHOLD = 0.4` | matches |
| verifier client injection | `literacy_verifier.py:380-384` — `default_judgment_client()` at the entry, injected | matches |
| fail-closed message | `literacy_evaluator.py:167-172` | matches |
| receipt-retention removal | `_prune_receipts`/`RECEIPT_RETENTION` gone; zero references repo-wide | matches |

## Swept "existing" rows — carried from 66940da

- **authorization**: key literal absent from the diff; receipts key-free — present.
- **concurrency**: single-process CLI present; receipts atomic (`judgments.py`); queue
  append still a plain `open("a")` (`literacy_verifier.py:161-164`) — the row's
  `atomic_write_text` claim still overstates the append path. Carried finding (minor,
  non-blocking).

## Committed-test updates — carried from 66940da, plus round 2

- Round-1 updates (fail-closed message wording, `useCases.test.ts` transport inversion):
  not weakenings — carried.
- Round 2: `test_approved_escalation_passes` was extended, not weakened — the old
  hand-written-entry assertions are retained as the FAIL-band guard behind real
  production-sequence assertions. The `literacy_evidence_digest_of` helper
  (`test_literacy_judgment.py:321-327`) exists only to mint the guard's digest; note its
  verify call writes a real 0.2 receipt (`d6fb…`) as a side effect.

## Test policy rows

None in the checklist — nothing to judge (carried line).

## Faults injected

Skipped — `standard`/`ui` profile step, not run under `light` (carried).

## Gate

`python3 -m pytest learner/gate/tests/test_literacy_judgment.py learner/gate/tests/test_literacy_verifier.py -v` — 29 passed, 0 failed (live C5 included), exit 0.
`python3 scripts/check_python_complexity.py --max 8 --baseline scripts/python_complexity_baseline.txt …` — exit 0.

## Remaining gaps (all non-blocking, carried/updated from round 1)

1. Concurrency Swept row overstates atomicity for the queue append (`literacy_verifier.py:161-164`).
2. C12 proof does not exercise replay end-to-end (FakeClient bypasses `replay_cached`); "at most one receipt file" unasserted.
3. C10 proven at function level; the `--resolve` CLI flag wiring (`main`, `literacy_verifier.py:415+,433,450`) has no proof.
4. C1 precision: the JSON schema's `answer` oneOf never executed by a proof; the hand-rolled mirror could drift undetected.
5. Minor: C4 band boundaries (exactly 0.4 / 0.75) unprobed; C11 check text says "citing the resolver" but the receipt carries only `resolution: "manual"` (resolver identity lives in the queue entry — matches the door's letter); dead lines `test_literacy_judgment.py:114-115`; receipt churn on every full-suite run (two tracked files timestamp-only + untracked `d6fb…`); 66940da's commit message calls the canned-0.5 receipts "live proofs" (inaccurate; harmless artifacts). New, on record: an unresolved (open) digest re-verified in the ESCALATE band still appends another open entry — only resolved digests are suppressed, consistent with the append-only owner-curated queue design and outside the round-1 FAIL.
