# Context authority verification

**Verdict**: PASS — 12/12 checks proven; both round-1 assertion gaps resolved.
**Profile**: light
**Diff range**: d723f7bb53d00401d3c9d6bf3be13d9fc670e971..ff52df7e113f3e60f9f5bbee964d969512d05bd2
**Round**: 2 — scoped; fix diff 58a711302bd43ec42ce47b7100b9331e347fa48d..ff52df7e113f3e60f9f5bbee964d969512d05bd2
**Verifier**: independent sub-agent; no code/test edits or commit.

## Binding sources

Source, convention, runtime, and Swept reviews are carried from 58a711302bd43ec42ce47b7100b9331e347fa48d (round-1 report preserved in `intent/2026-09-14-context-authority/verifier-round1.md`). Those reviews read `.checks/context-authority.md`, its binding `.tasks/context-authority.md`, verification instructions, engine AGENTS.md files and REVIEW.md. This round inspected the fix diff, additive checklist proofs, both new proof files, and MANIFEST change. No criteria or existing assertions were removed. C10/C12 were reassessed against the same literal binding task; other assertion reviews carry from the preceding SHA. Source/design enumeration and Coverage join are not required under light.

## Gate

At the exact HEAD above, independently ran:

```sh
env PATH=/mnt/mac/aidevschool/.venv-linux/bin:$PATH /mnt/mac/aidevschool/.venv-linux/bin/python -m pytest engines/openclaw/tests/test_provenance.py engines/miniMaxEvolutionEngine/tests/test_context_authority.py engines/miniMaxEvolutionEngine/tests/test_authority_contract_semantics.py engines/miniMaxEvolutionEngine/tests/test_authority_manifest_coverage.py -v
```

Verified at ff52df7e113f3e60f9f5bbee964d969512d05bd2: exit 0, **46 passed in 3.24s**, Python 3.14.7, pytest 8.4.2. Every named proof appeared individually as PASSED. C2 ran five cases, C6 six, C9 three; new C10 producer/command proofs ran seven/six cases, PhaseRunner once; new C12 semantic and no-migration proofs ran once each, manifest proof eight cases. All original proofs were rerun. Located new assertions with `rg -n -A 55 '^def test_|^@pytest.mark.parametrize'` against the new files. `git diff --check 4abb418..HEAD` also exited 0. Shell tooling fallback from round 1 remains applicable (`rtk` absent). No model invocation or real learner-state write was performed.

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
| C10 | M::test_phase_runner_provenance_contract plus three semantic proofs below | New S:24–26 asserts independent PASS, verified/command identity and producer prohibition; S:34 checks command conditional stamp; S:40–44 checks PhaseRunner condition/context separation | PASS — verified at ff52df7 |
| C11 | O::test_cli_preview_preserves_provenance | O:107 `assert cli.main(["--preview"]) == 0`; O:108 asserts read-only preview heading; O:109 `assert path.read_bytes() == before` | PASS |
| C12 | M::test_mvp_authority_documented plus three semantic/manifest proofs below | New S:49–61 asserts three distinct authorities in map/glossaries/README; S:70 asserts no runtime/canonical diff; L:21/22 verifies eight literal manifest references and file existence | PASS — verified at ff52df7 |

## Resolved gaps and refreshed assertion evidence

S = `engines/miniMaxEvolutionEngine/tests/test_authority_contract_semantics.py`; L = `engines/miniMaxEvolutionEngine/tests/test_authority_manifest_coverage.py`. All evidence in this section is verified at ff52df7e113f3e60f9f5bbee964d969512d05bd2.

- C10 `test_producer_cannot_advance_without_orchestrator_and_independent_pass`: S:24 `assert "Somente o orquestrador chama \`save_status\` após PASS independente" in text`; S:25 asserts literal verified and the command from the adjacent seven-agent table; S:26 `assert "A entrega do produtor não autoriza avanço de fase por si só." in text`. All seven agents ran.
- C10 `test_command_stamps_only_after_independent_pass`: S:34 `assert "o orquestrador registra \`grade=verified\` e \`advanced_by=/devschool-<command>\` somente após PASS independente" in text`. All six command cases ran; S:35 additionally requires preserving provenance on blocker-only writes.
- C10 `test_phase_runner_requires_independent_verifier_before_stamping`: S:40 `assert "Never write YAML machine state before the verifier returns PASS." in text`; S:41 asserts the verified/command stamp before save_status; S:42 `assert "Dispatch the verifier as a fresh Task with no hand-off from the producer except the artefact files themselves." in text`. S:43/44 also assert consumption limits and no producer-only advance.
- C12 `test_mvp_result_does_not_confer_canonical_mastery`: S:49 `assert "MVP \`MASTERED\` is a verdict in the tutor's own ledger; it is not canonical mastery and has no automatic promotion path" in context`; S:50 `assert "G1–G4 govern the MVP's 24-concept track; they are not aliases for the canonical gates" in context`; S:51 `assert "MVP gap-ladder reviews and LiteracyDojo local skill reviews retain their own schedules; neither overwrites canonical FSRS" in context`. S:53–55 separately assert the learner glossary's canonical mastery, Learning Gate/Empirical Gate and local-review boundaries; S:57/58 assert README authority limits; S:60/61 assert cycle glossary verified prerequisite and no learner/MVP mastery grant.
- C12 `test_authority_manifest_links_contracts_and_proofs`: L:21 `assert f"\`{reference}\`" in manifest`; L:22 `assert (ROOT / reference).is_file()`. The literal adjacent parameter table L:10–18 includes pipeline contract, context map, both glossaries, MVP README and all three linked proof files; every case ran.
- C12 `test_mvp_runtime_and_canonical_data_are_not_modified`: S:70 `assert result.returncode == 0, result.stdout + result.stderr`, for the immediately preceding `git diff --exit-code 4abb418 HEAD` on MVP runtime, canonical learning/pipeline YAML and curriculum. This supplements the unchanged whole-feature lifecycle review carried from round 1; it is not substituted for that broader base-range review.

No remaining ranked gaps. Assertions now settle the required relationships. No mutants were applied under light.

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

No Test policy section in the checklist. Coverage recomputation, test-policy verdicts, source UI enumeration and fault injection are not run under light. No UI surface is introduced. Runtime behavior is exercised in temporary fixtures with fake role execution; human/agent instruction compliance is proven as a document contract, not through actual model invocation.
