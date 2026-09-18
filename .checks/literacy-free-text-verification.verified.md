# Literacy free-text verification (judgment-verified prompt_builder) — Verification

**Verdict**: PASS (F1 fixed at c9d4d68, F2 fixed at d913966 — both independently verified)
**Profile**: light (step 1 `ui` and step 4 fault injection skipped per profile; steps 2, 3, 5 run)
**Diff range**: d4a61da..d913966 (round-5 scope: d913966 + hermeticity surface only)
**Round**: 5 - scoped
**Verifier**: independent sub-agent (author != verifier)

## Round-5 scope

Round 4 PASSED its scope (F1/schema verified at c9d4d68) with F2 (hermeticity)
carried open. This round judges only the F2 fix commit `d913966` plus the
hermeticity surface. Everything else — C2/regreened schema, queue wiring, client
entries, replay lookup, binding sources — carries from round 4 (marked). Round 5
is the final scoped round: both round-3 findings are closed.

## F1 — FIXED at c9d4d68 (verified round 4): 5840deb's schema "de-churn" broke C2 and the literacyDojo producer

The commit rewrote `"required"` from an **array** to a **bare string** at all
seven `answer` oneOf members of `learner/gate/literacy_evidence.schema.json`
(optionIds, orderedIds, contextIds, criterionIds, labels, verdicts, values —
the diff's entire +7/−21). `"required": "values"` is invalid JSON Schema
(the spec requires an array of strings).

- **C2 proof fails 8/8 at HEAD**: `cd engines/literacyDojo && NODE_ENV=development
  npx vitest run tests/domain/evidence.test.ts` → 8 failed, exit 1 —
  `TypeError: schema.required?.some is not a function` at
  `src/domain/evidence.ts:146` (`schema.required?.some((key) => !(key in record))` —
  `?.` guards null, not a non-array string).
- **Causal chain**: `evidence.ts:1` imports the shared
  `learner/gate/literacy_evidence.schema.json` directly; 5840deb changed only
  that file on this path (not in the commit's other files); at fb30f6b the same
  seven sites were arrays and `.some` worked. Round 2 carried C2 green from
  round 1 without re-running it — regreening it this round is what caught it.
- **Blast radius is the whole producer, not free text**: `buildEvidenceRecord`
  (`evidence.ts:100→197→133-146`) throws for **every** answer shape — values and
  all six structured variants. The literacyDojo app cannot emit any evidence
  record at HEAD.
- **Why Python stayed green**: `evidence_validator.py:6-12` reads only the
  schema's top level (`properties`, top-level `required` — still an array) and
  never descends into `properties.answer.oneOf[*].required`. Round-2 gap 4
  ("the JSON schema's answer oneOf never executed by a proof") was load-bearing:
  the never-executed artifact rotted and broke the cross-language consumer.

Fix direction: restore array form (or fix whatever generated the string form)
and add a proof that executes the JSON oneOf.

### Round-4 verification of the fix

`c9d4d68` restores all seven `answer` oneOf `required` values to arrays
(+21/−7, `learner/gate/literacy_evidence.schema.json` only — surgical; nothing
else in the commit). Verified at HEAD:

- Schema shape: `python3 -c "import json; …type(v['required'])…"` over
  `properties.answer.oneOf` → `['list' × 7]`.
- C2 proof re-run: `cd engines/literacyDojo && NODE_ENV=development npx vitest
  run tests/domain/evidence.test.ts` → **8 passed, exit 0** (was 8 failed, exit 1
  at round 3). The `matchesSchema` TypeError at `evidence.ts:146` is gone.
- Python literacy proofs unaffected:
  `python3 -m pytest learner/gate/tests/test_literacy_judgment.py
  learner/gate/tests/test_literacy_verifier.py -q` → **29 passed** (envelope
  validator never executes the oneOf — unchanged expectation).
- Full TS suite (the schema feeds every shape through the producer):
  `cd engines/literacyDojo && NODE_ENV=development npm run test` → **33 test
  files, 251/251 tests passed, exit 0** (pipefail-verified).

The residual "add a python proof that executes the JSON oneOf" from the fix
direction remains open (carried gap — the cross-language blind spot that let
F1 rot undetected on the author side).

## F2 — FIXED at d913966 (verified round 5): round-3 item 3 not met, hermeticity fix incomplete

The receipts-root seam is threaded (`recompute_literacy_evidence` →
`verify_prompt_builder` → `ask_and_record`, `judgment_receipts_root` param) and
most proofs pass tmp roots — but three proof sites still reach the production
store, because `ask_and_record` defaults `receipts_root=None` to
`DEFAULT_RECEIPTS_ROOT` (`learner/substrate/judgments.py:333`):

1. `_cli_exit` (`test_literacy_judgment.py:213`) runs the real `lv.main`, and the
   CLI has **no receipts-root plumbing** (`literacy_verifier.py:379-381` passes
   no `judgment_receipts_root`). The tmp var `receipts = tmp_path /
   f"receipts-{noul}"` at `:202` is **dead** — the intended wiring never landed.
2. `test_approved_escalation_passes` verify calls `:285-287`, `:296-298`,
   `:321-323` — no `judgment_receipts_root`.
3. `test_replay_determinism` `:344-349` — no `judgment_receipts_root`.

**Empirical** (shasum of `learner/judgment_receipts/` before/after the mandated
proof run at HEAD): `literacy-e0bf59e8a3ec694b.ndjson` rewritten with canned
**0.9** answers and `literacy-d6fb10291ae02bd6.ndjson` with canned **0.2**
answers, both stamped with the run's timestamps; no new files (count stayed 6;
pitfalls/profile/metric-lint untouched). So "canned receipts no longer land in
the production store" is false at HEAD: every full-suite run re-pollutes it, and
2a19f55's receipt deletions do not stick (the two files were already untracked
leftovers before this run — git status alone looked clean; only the checksum
diff exposed the rewrite). The fix's own cited hazard stands: a real verify of
the fixture paraphrase through the CLI replays canned 0.9 instead of asking.
Note also the CLI cannot be made hermetic without patching module globals
(`ESCALATIONS_PATH` + `judgments.DEFAULT_RECEIPTS_ROOT`) — this round's own
verifier CLI proof had to patch both.

**Round 4**: still open — `c9d4d68` touches only the schema file; no hermeticity
code changed. Re-confirmed empirically: this round's mandated pytest run (the
29-test invocation above) rewrote both production receipts at 11:07:23 local
(`literacy-d6fb10291ae02bd6.ndjson`, `literacy-e0bf59e8a3ec694b.ndjson` — stat
timestamps match the run to the minute; no other receipt file moved). The
re-pollution persists at HEAD.

### Round-5 verification of the fix

`d913966` closes all three F2 sites plus the CLI plumbing gap (commit touches
`literacy_verifier.py` + `test_literacy_judgment.py` only):

- **CLI flag**: `--judgment-receipts-root` added to `main()` argparse (default
  `None` → committed store — the CLI stays a production entry, matching the
  round-3 BLOCKER-fix semantics); `_run_verify` threads
  `judgment_receipts_root=receipts_root` into `verify_literacy_evidence`.
- **Site 1 (`_cli_exit`)**: now invokes `lv.main([…, "--judgment-receipts-root",
  str(receipts)])` — the formerly dead `receipts` var is live; the redundant
  queue-dir mkdir lines are gone.
- **Site 2 (C11, three verify calls in `test_approved_escalation_passes`)** and
  **site 3 (`test_replay_determinism`, two calls)**: all now pass
  `judgment_receipts_root=tmp_path / "receipts"`.
- **Static sweep (verifier-run)**: every `verify_literacy_evidence` /
  `recompute_literacy_evidence` call in `test_literacy_judgment.py` now carries a
  tmp root (line 162 is the `judgment_client=None` fail-closed path — no client,
  no ask, no receipt); `test_literacy_verifier.py` calls validate pre-judged
  envelopes. No unthreaded receipt-writing site remains.
- **Empirical (verifier-run, the decisive check)**: `shasum` of every file in
  `learner/judgment_receipts/` before vs after the full four-file proof run
  (58 passed, exit 0) — **identical, zero bytes changed, no new files** (4
  pre-existing files before and after). The two canned receipts
  (`literacy-e0bf…`, `literacy-d6fb…`) are deleted from disk.
- **Side effect verified green**: the `_load_evidence_or_fail` extraction holds
  the complexity gate — `check_python_complexity.py --max 8 …` exit 0.
- **C12 strengthened as a bonus**: both `test_replay_determinism` calls share
  the tmp root, so the second call genuinely replays the first's receipt
  through `replay_cached` inside the test's own store — the round-3 "weak,
  carried" note on C12's replay path no longer applies.

## Round-3 re-judged items — the residual fixes that did land

- **BLOCKER (queue write by default) — FIXED, proven in code and executably.**
  `literacy_verifier.py:262` `queue_path = escalations_path or ESCALATIONS_PATH`
  normalizes once and feeds both the read (`:272-274` → `_approved_manual`) and
  the write (`:276-279`); `_queue_escalation`'s guard is resolution-only
  (`:187` `if resolution is not None: return` — the old `escalations_path is
  None` early-return is gone); the CLI passes no path (`:379-381`) so the
  committed queue is the default, and `resolve_escalation` normalizes the same
  way (`:325`). Executable proof (verifier-run, hermetic, real `main()`):
  FakeClient(0.6) evidence → exit **3**, queue written by default with exactly
  one open entry (attempt/digest/field_scores/16-char receipt digest) →
  `main(["--resolve", …, "--approve"])` exit **0** against the default queue →
  re-verify exit **0**, PASS, `resolution: "manual"`, queue still one line.
  Production queue `learner/verifier_receipts/` untouched.
- **HIGH (client at the two remaining entries) — FIXED.**
  `learner/gate/literacy_bridge.py:22,26` constructs `default_judgment_client()`
  inside `verify_stream`; `learner/gate/verifier.py:166-170` constructs it inside
  `LiteracyVerifier.verify`. Both call `verify_literacy_evidence` with the
  client injected — prompt_builder verifies with a key through every entry now.
- **replay_cached direct lookup — FIXED as described.**
  `learner/substrate/judgments.py:183` `root.glob(f"*-{digest[:16]}.ndjson")`
  with the `:184` `-fallback.ndjson` exclusion; write side agrees
  (`:243` `{sweep}-{digest[:16]}.ndjson`, `:294` fallback suffix). The old
  full-dir scan and the per-file `input_digest` recheck are gone — the filename
  now carries the digest binding (a 64-bit prefix collision would collide at
  write time regardless; negligible and pre-existing in the naming scheme).
- **Unknown-field binding centralized** — `literacy_judgment.py:43-47` raises
  before any ask (moved out of the evaluator); `noul_value` public (`:106`,
  `judgments.py:433`).

## Binding sources — carried from 66940da / fb30f6b (round 2)

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| `.tasks/literacy-free-text-verification.md` | yes | none | - |
| `.design/literacy-free-text-verification.md` (incl. transport amendment) | yes | none | - |
| `docs/design/rfc-literacy-free-text-verification.md` (ACCEPTED 2026-09-17) | yes | none | - |
| `learner/substrate/judgments.py` (seam) | yes | none | - |

Step 1 is `ui`-gated and did not run under `light`; the fix touched no interface.

## Proofs run at HEAD (step 2) — round 5, scoped re-run (round-4 runs below)

- `python3 -m pytest learner/gate/tests/test_literacy_judgment.py
  learner/gate/tests/test_literacy_verifier.py
  learner/substrate/tests/test_judgments.py
  learner/gate/tests/test_metric_lint.py -q` — **58 passed, exit 0**, with the
  production receipts store **byte-identical before/after** (shasum, F2
  verification above).
- `python3 scripts/check_python_complexity.py --max 8 --baseline
  scripts/python_complexity_baseline.txt learner engines/minimaxDojo
  engines/openclaw engines/miniMaxEvolutionEngine engines/aiDevschoolMvp` —
  **exit 0**.

### Round-4 runs (carried; c913966 touched no TS/schema surface)

- Schema shape check (`python3 -c` over `properties.answer.oneOf`) → seven
  `list` (F1 verification above).
- `cd engines/literacyDojo && NODE_ENV=development npx vitest run
  tests/domain/evidence.test.ts` — **8 passed, exit 0** (regreened at c9d4d68).
- `python3 -m pytest learner/gate/tests/test_literacy_judgment.py
  learner/gate/tests/test_literacy_verifier.py -q` — **29 passed**.
- `cd engines/literacyDojo && NODE_ENV=development npm run test` — **33 test
  files, 251/251 passed, exit 0** (pipefail-verified).

Round-3 full re-run carries: 58 passed across the four python files (live C5
included) and complexity check exit 0. Carried cosmetic: the checklist's C2
proof path says `src/domain/evidence.test.ts`, which has never existed in git —
the file lives at `tests/domain/evidence.test.ts` since feature commit 90062e0.

## Checks (step 3)

C2 re-judged at round 4 (PASS at c9d4d68). All twelve python rows re-ran green in
round 5's 58-test invocation at d913966 HEAD; their assertion citations carry
from 66940da/round 2 (files below line 271 unchanged by 5840deb;
`literacy_verifier.py` citations refreshed in the round-3 sections above).

| Check | Claim | Proof run | Result |
|---|---|---|---|
| C1 | values variant validates; bad shapes/undeclared ids reject | `test_values_answer_transport` PASSED (re-run) | PASS |
| C2 | TS emits `{answer:{values}}` deep-copied; structured shapes unchanged | vitest **8 passed, exit 0** at c9d4d68 (round 4; was 8 failed at round 3) | PASS |
| C3 | ≥0.75 → pass + judgment block + receipt digest | `test_judgment_pass_path` PASSED (re-run) | PASS |
| C4 | <0.4 no escalation; 0.4–0.75 escalates | `test_judgment_bands` PASSED (re-run) | PASS |
| C5 | live paraphrase, zero rubric substrings, ≥0.75 | `test_live_paraphrase_semantics` PASSED **live** (re-run) | PASS |
| C6 | no key → FAIL naming TYPESAFE_API_KEY; deterministic offline | `test_fail_closed_without_key` PASSED (re-run) | PASS |
| C7 | CLI exits 0/3/1 = PASS/ESCALATE/FAIL, receipt JSON | `test_cli_exit_codes` PASSED (re-run) | PASS |
| C8 | producer claim advisory | `test_producer_claim_advisory` PASSED (re-run) | PASS |
| C9 | ESCALATE appends queue entry; receipt exists | `test_escalation_appends_queue` PASSED (re-run) | PASS |
| C10 | resolve rewrites with provenance; unknown/non-open exit 1 | `test_resolve_cli` PASSED (re-run) + verifier-run real-`main()` resolve sequence (closes round-2 gap 3 at HEAD, though no repo proof persists it) | PASS |
| C11 | approved escalation → PASS, manual resolution | `test_approved_escalation_passes` PASSED (re-run) + verifier-run CLI sequence | PASS |
| C12 | same evidence twice → byte-identical receipt | `test_replay_determinism` PASSED (round-5 re-run; replay now exercised end-to-end through `replay_cached` inside the test's tmp receipts root — d913966) | PASS |
| C13 | changed field → new digest, fresh judgment | `test_changed_answer_rejudges` PASSED (re-run) | PASS |

**All 13 checks proven. C2 regreened at c9d4d68 (round 4); the other 12 carry green from the round-3 re-run.**

## Landing literal shapes — carried from 66940da, refreshed where 5840deb/c9d4d68 moved lines

| Door | Evidence | Result |
|---|---|---|
| values schema variant | `literacy_evidence.schema.json` values oneOf member — `required` restored to array form at c9d4d68; round-4 check confirmed arrays at all seven members | matches |
| TS whitelist entry + deep copy | `evidence.ts` values branch unchanged by 5840deb/c9d4d68 | matches (reachable at runtime again — C2 green) |
| sweep `literacy` / primitive `noul` / `{activityId}::{fieldId}` receipts | `literacy_judgment.py:50, 96-97` | matches |
| ESCALATIONS_PATH location | `literacy_verifier.py:32-34` | matches |
| resolve provenance fields | `literacy_verifier.py:333-345` | matches |
| thresholds | `literacy_judgment.py:21,24` | matches |
| verifier client injection | `literacy_verifier.py:377-381`, `literacy_bridge.py:22,26`, `verifier.py:166-170` | matches (all three entries) |
| fail-closed message | `literacy_evaluator.py` (unchanged wording) | matches |
| receipt-retention removal | zero references repo-wide | matches |

## Swept "existing" rows — carried from 66940da

- **authorization**: present (unchanged).
- **concurrency**: queue append still a plain `open("a")` (`literacy_verifier.py:161-164`)
  — carried minor finding.

## Test policy rows

None in the checklist — nothing to judge (carried).

## Faults injected

Skipped — `standard`/`ui` profile step, not run under `light` (carried).

## Gate (round 5)

Four-file pytest (`test_literacy_judgment.py` + `test_literacy_verifier.py` + `test_judgments.py` + `test_metric_lint.py`) — **58 passed, exit 0**; `learner/judgment_receipts/` **shasum-identical before/after** the run.
`check_python_complexity.py --max 8 …` — **exit 0**.
Carried from round 4: vitest `evidence.test.ts` 8 passed; full literacyDojo suite 251/251 across 33 files, exit 0.

## Remaining gaps (ranked)

1. Carried minor: queue append not atomic (`open("a")`); JSON oneOf still executed by no python proof — the exact blind spot that let F1 land (top author-side fix candidate).
2. Cosmetic: `verify_literacy_evidence` docstring still says the queue is used "when `escalations_path` is given" — None now means the committed queue (`literacy_verifier.py:254-255`); checklist C2 proof path says `src/domain/evidence.test.ts`, which has never existed (`tests/domain/evidence.test.ts` is the file).

Both round-3 findings closed: F1 at c9d4d68 (round 4), F2 at d913966 (round 5). The C12 "weak replay" carry and the canned-receipts-on-disk note are resolved by d913966 (replay now exercised end-to-end inside the test's tmp store; the two files deleted).
