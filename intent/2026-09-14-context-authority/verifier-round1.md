# Context authority verification

**Verdict**: FAIL — 10/12 checks proven; C10 and C12 have assertion gaps.
**Profile**: light
**Diff range**: d723f7bb53d00401d3c9d6bf3be13d9fc670e971..58a711302bd43ec42ce47b7100b9331e347fa48d
**Round**: 1 — full
**Verifier**: independent sub-agent; no code/test edits or commit.

## Binding sources

Read `.checks/context-authority.md`, its binding `.tasks/context-authority.md`, and the tlc-implement verification reference fully. Read engine AGENTS.md files and REVIEW.md. Full feature diff reviewed, including adopted upstream implementation; ownership delta inspected against 4abb418. Source/design enumeration and Coverage join are not required under light. No contradiction found in the implementation documents read; the findings below concern whether named assertions prove those documents' required meaning.

## Gate

At the exact HEAD above, independently ran:

```sh
env PATH=/mnt/mac/aidevschool/.venv-linux/bin:$PATH /mnt/mac/aidevschool/.venv-linux/bin/python -m pytest engines/openclaw/tests/test_provenance.py engines/miniMaxEvolutionEngine/tests/test_context_authority.py -v
```

Exit 0: **22 passed in 2.97s**, Python 3.14.7, pytest 8.4.2. Each named test below appeared as PASSED; C2 ran five cases, C6 six cases, C9 three cases. All other named proofs ran once. Located test bodies with `rg -n -A 65 '^def test_|^@pytest.mark.parametrize'` against both files. Both proof files are additions within the feature range. The available shell lacks `rtk` (exit 127), so commands ran directly after that failed attempt. No model invocation or real learner-state write was performed.

Below O means `engines/openclaw/tests/test_provenance.py`; M means `engines/miniMaxEvolutionEngine/tests/test_context_authority.py`.

## Checks

| Check | Proof run (PASSED) | Assertion evidence | Result |
| --- | --- | --- | --- |
| C1 | O::test_legacy_provenance_is_read_only | O:27 `assert status.grade == "unspecified"`; O:28 `assert status.advanced_by == ""`; O:29 `assert path.read_bytes() == before` | PASS |
| C2 | O::test_checklist_advances_with_provenance, all five phase cases | O:49 `assert status["grade"] == "simulate"`; O:50 `assert status["advanced_by"] == "openclaw-checklist"`; O:48/52 phase and mirror assertions use literal parameter table at O:36–41: spec-done/impl, impl-done/review, review-done/benchmark, benchmark-done/optimize, cycle-complete/cycle-complete | PASS |
| C3 | O::test_cli_override_reports_simulated_provenance | O:58 invokes CLI with `--max-events 0`; O:62 `assert status["grade"] == "simulate"`; O:63 `assert status["advanced_by"] == "openclaw-cli-override"` | PASS |
| C4 | M::test_supervisor_pass_stamps_authorized_bytes | M:35/36 assert verified/mme-supervisor; M:38 `assert len(auth) == 1`; M:39 `assert auth[0]["resulting_pipeline_digest"] == hashlib.sha256(workspace.pipeline.read_bytes()).hexdigest()` | PASS |
| C5 | O::test_sequential_writers_preserve_latest_provenance | O:73/74 assert simulate/openclaw-checklist first; O:79 `assert result.grade == "verified"`; O:80 `assert result.advanced_by == "mme-supervisor"` | PASS |
| C6 | O::test_invalid_provenance_is_rejected, all six cases | O:91/96 `with pytest.raises(StateCorruptionError)` around load/save; O:98 `assert path.read_bytes() == before`; invalid grade/writer literals at O:84–87 | PASS |
| C7 | M::test_supervisor_fail_keeps_provenance | M:52 `assert result["status"] == "failed"`; M:53 `assert workspace.pipeline.read_bytes() == before`; M:54 forbids advancement_authorized | PASS |
| C8 | O::test_cli_override_reports_simulated_provenance | O:65 `assert "grade=simulate" in output`; O:66 `assert "advanced_by=openclaw-cli-override" in output` | PASS |
| C9 | M::test_briefing_exposes_provenance_read_only, all three grades | M:86/87 assert formatted grade/writer from literal table M:57–59; M:88 `assert "simulate e unspecified não substituem verified" in output`; M:89 compares both state files to before; M:79–81 invokes real briefing.sh | PASS |
| C10 | M::test_phase_runner_provenance_contract | M:95 `assert "grade" in runner and "advanced_by" in runner`; M:97 `assert "PASS" in runner`; M:103/104 repeat word-presence checks per writer, M:106 asserts only the word `orquestrador` | FAIL — does not assert required conditional authority or producer prohibition |
| C11 | O::test_cli_preview_preserves_provenance | O:107 `assert cli.main(["--preview"]) == 0`; O:108 asserts read-only preview heading; O:109 `assert path.read_bytes() == before` | PASS |
| C12 | M::test_mvp_authority_documented | M:112 `assert term in context`; M:114–119 assert isolated names/filenames; M:121/122 assert only test paths in MANIFEST | FAIL — does not assert authority distinctions or documentation paths in MANIFEST |

## Ranked gaps

1. **Important — C10 proof does not settle the claim.** The required independent-PASS condition, verified value, command identity, and prohibition on producer-only phase advances are not asserted. A document still mentioning `grade`, `advanced_by`, `PASS`, and `orquestrador` can pass while removing the actual restriction. The current contract does contain the restriction (PhaseRunner:37–44,59 and agents/dev-node.md:45–47), so this is a proof gap, not a claim that runtime or current wording is wrong. Assert the substantive contractual statements across the relevant writer instructions.
2. **Important — C12 proof does not settle the claim.** The map's words can remain while their separation is removed. The test never asserts `MASTERED` versus canonical mastery, G1–G4 versus learning/empirical gates, LiteracyDojo local review, or the required README/glossary/map paths in MANIFEST. Current docs visibly express these distinctions and the manifest row contains those paths; make the proof assert those relationships and links instead of isolated vocabulary.

These are assertion inspections, not fault-injection results; no mutants were applied.

## Swept existing constraints

| Existing claim | Code read | Assessment |
| --- | --- | --- |
| Scheduler rollback | `engines/openclaw/runner/scheduler.py:152–158`, `_restore`:102–106 | Both mirror and pipeline snapshots restored on write failure |
| Atomic writes and ledger/outbox | `shared/fsio.py:20–40`; supervisor/ledger.py:81–90; supervisor/outbox.py:74–101 | Temp/replace pipeline writing; append+fsync ledger; no-replace durable publication remain |
| Gate and autonomous policy | scheduler.py:72–79,121–123; supervisor/autonomous.py:247–269,323–334 | Gate and existing autonomous checks precede advance; verifier FAIL exits before authorization |
| Compare-and-advance and lease | supervisor/autonomous.py:213–236; supervisor/lease.py:102–135,141–156 | Identity/digest recheck and durable authorization checked; existing lease exclusive acquisition/recovery retained, no claim of global writer lock |
| Executor limits/failures | supervisor/autonomous.py:115–121,136–149,290–314; supervisor/executor.py:70 | Existing role budgets, timeout and failure handling retained |
| Shared serialization/writer | pipeline_status.py:111–140; autonomous.py:195–210,229–234; scheduler.py:69–70 | Planned digest and save both use dump_status; programmatic advancement goes through save_status |
| MVP lifecycle | Full feature diff | MVP README only; no runtime, ledger, curriculum, review or learner-state migration |

## Profile exclusions

No Test policy section in the checklist. Coverage recomputation, test-policy verdicts, source UI enumeration and fault injection are not run under light. No UI surface is introduced. Re-run all named proofs at the next HEAD, then scope assertion review to the fix and these two failed checks.
