# Gate authority Verification

**Verdict**: PASS
**Profile**: light (repo declares no tlc-implement profile; step 1 binding screens and step 4 fault injection do not run under light)
**Diff range**: a518d86..HEAD (feature commits e748efd, e17d98b, 7de26f2 + `engines/minimaxDojo/tests/test_threshold_drift.py` and `learner/substrate/__init__.py` from 1166833; 2acba07/52996b5/1166833 analytics content excluded from judgment)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier); read-only except this report

## Binding sources

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| `.tasks/gate-authority.md` (8 criteria, Decided, Unresolved) | yes | none — seam default `learner.yaml` honored (standards.py:37), unit>seam overlay implemented (standards.py:105-134, canonical_gate.py:176), no-fallback loud seam error (standards.py:40-102) | - |
| `AGENTS.md` §CODE MAP/CONVENTIONS | yes — seam declared at `engines/minimaxDojo/config/learner.yaml` (AGENTS.md:91,119); `test_default_seam_path_is_the_declared_one` pins it (test_standards.py:91-98) | none | - |
| `engines/minimaxDojo/tests/test_threshold_drift.py` | yes — existing fence (TestThresholdDrift, learner.yaml ↔ learning_state.yaml ↔ SKILL.md) still present and green | none | - |
| `docs/TECH_DEBT_AUDIT_2026-07-08.md` §Phase 1 | not opened (precedent citation only; decides no check value at check level) | - | - |

## Checks

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | Seam flip 0.65→0.55 inverts gate verdict on mutation 0.58 via receipt AND verifier-block paths | `pytest learner/gate/tests/test_standards.py -v` — both named tests PASSED individually | `test_standards.py:79` `assertIsNot(ok, True)` + `:80` `any("0.58" in e ...)`; `:82` receipt `any("mutation_score" in v ...)`; after `_write_seam(0.55, 0.80)` `:85` → `:87` `assertIs(ok2, True)`, `:89` `assertEqual(receipt_violations(...), [])`; declared path pinned `:93-94` (`"engines/minimaxDojo/config"`, `learner.yaml`) | PASS |
| C2 | `effective_thresholds` overlays `mutation_min`/`min_coverage`, falls back to seam | same run — PASSED | `test_standards.py:107-108` `effective_thresholds(None)/({}) == base`; `:109-116` overlay of `mutation_min` 0.50 then `+min_coverage` 0.70 → `Thresholds(mutation_min=0.50, coverage_min=0.70)`; impl `standards.py:118-121` (`unit_gate.get(..., th.*)`); seam values 0.65/0.80 confirmed in `config/learner.yaml` `gates:` block | PASS |
| C3 | Missing/malformed/key-missing seam → `ThresholdSeamError` naming path, propagated by `receipt_violations`, subclasses `ValueError` | same run — all 3 named tests PASSED | `test_standards.py:139` `assertRaises(ThresholdSeamError)`, `:143` `assertIn("nope.yaml", str(ctx.exception))`, `:146` `assertIsInstance(ctx.exception, ValueError)`; malformed subtests `:149-159` (not-a-mapping, missing `gates` key, `abc`, `1.5`) each raise naming `learner.yaml`; propagation `:171-172` `assertRaises(ThresholdSeamError): receipt_violations(...)`; CLI handler `__main__.py:91-93` `except ValueError` → `return 1` | PASS |
| C4 | No threshold literal in code: grep empty + fence test green | `pytest "…::TestThresholdLiterals::test_no_hardcoded_threshold_literals"` PASSED; grep run by verifier | Fence asserts empty findings over production `.py` under learner/ + curriculum/ excluding `tests/` (`test_threshold_drift.py:123-133`, scanner `:85-117`). **Grep as written in C4 is NOT empty**: 1 hit = `test_threshold_drift.py:148` `"MUTATION_MIN = 0.65\n"` — the fence's own discrimination fixture (test code, out of the Landing-decided fence scope). Substance (no live literal) proven; proof command needs the same `tests/` exclusion the fence has | PASS (with finding, see gaps) |
| C5 | Judgment symbols absent from `curriculum/_shared/`, judgment lives in `learner/gate/standards.py` | `git grep "verified_pass\|game_metric_violations\|independently_verified_pass" -- curriculum/_shared/` → empty (exit 1); `pytest test_standards.py test_evidence.py` green (49 passed across both) | Symbols in `standards.py`: `VerifierVerdict` :142, `verified_pass` :153, `verdict_blockers` :168, `verdict_passed` :191, `challenge_gate_blockers` :198, `game_metric_violations` :316, `independently_verified_pass` :333, `check_evidence` :403, `passes_gate` :467; rubric catalog moved with judgment (`evidence_rubrics.yaml` rename → `learner/gate/`); curriculum keeps discovery/identity only — `evidence.py:119` delegates `gate_blockers` → `challenge_gate_blockers`, `:397` `statuses` uses `verdict_passed` | PASS |
| C6 | Affected suites green, 9 import sites updated, judgment tests moved | Targeted per-target runs (see Gate below); full testpaths run infrastructure-limited (timeout at ~88%, all green to that point — degraded mount) | Sites at HEAD: `canonical_gate.py:14-17`, `security.py:11-13`, `verifier_receipt.py:11`, `test_gate.py:14`, `substrate/__init__.py:454`, `dashboard_snapshot.py:29`, `scheduler.py:11-16`, `test_scheduler.py:8-9`, `test_evidence.py:28-29` — all import from `learner.gate.standards` / `shared.*`, none from the old homes. Moved: `TestPassesGate` (check_evidence/passes_gate) now in `test_standards.py:177+` ("Moved from curriculum/_shared/tests"). **Note**: gate_ready/blockers tests remain in `curriculum/_shared/tests/test_evidence.py` as seam-pinned delegation tests, not moved | PASS |
| C7 | `curriculum/` imports no `engines.*`; primitives in `shared/` | `git grep -nE "from engines\.|import engines\." -- curriculum/` → empty (exit 1); `pytest engines/openclaw/tests engines/miniMaxEvolutionEngine/tests engines/minimaxDojo/tests` — 186 passed, 1 skipped | `shared/errors.py` `StateCorruptionError`; `shared/time.py:27` `utc_now_iso`; `shared/fsio.py:20` `atomic_write_text`, `:43` `resolve_contained`; old homes gone: `curriculum/_shared/time.py` deleted, `learner/substrate/fsio.py` deleted, `engines/openclaw/errors.py` keeps only `OpenclawError` | PASS |
| C8 | Both sides of the old cycle + shared import in fresh process | `.venv-linux/bin/python -c "import curriculum._shared.evidence, engines.openclaw.runner.scheduler, learner.gate.standards, shared.errors, shared.time, shared.fsio; print('ok')"` → `ok` | one-liner output `ok` (exit 0) | PASS |
| C9 | Fence discriminates: production `.py` with `mutation… = 0.6x` fails naming the file; clean tree passes | `pytest "…::TestThresholdLiterals::test_fence_discriminates" "…::test_no_hardcoded_threshold_literals"` — both PASSED individually | `test_threshold_drift.py:145` clean → `[]`; `:151-152` dirty.py (`MUTATION_MIN = 0.65`) → exactly 1 finding containing `"dirty.py"`; `:154-160` tests/ fixture exempt; scanner pattern `:97-101` covers the claim's `(mutation|mutation_score|mutation_min)…(=\|:\|<\|>)\s*0\.6[0-9]` class (`0\.[6-9][0-9]`, case-insensitive) | PASS |

## Coverage recompute (from code, not from the row)

| Set | Row said | Recomputed from code | Verdict |
|---|---|---|---|
| consumidores da barra | 4 | 5 direct application sites: `verified_pass` (standards.py:153, loads seam :155), `verdict_blockers` family → `verdict_passed` :191 / `challenge_gate_blockers` :198 (loads seam :172), `receipt_violations` (verifier_receipt.py:49), `independently_verified_pass` (standards.py:362 direct `load_thresholds()`), `effective_thresholds` call at `canonical_gate.py:176` | all have proofs (C1 both directions — `verified_pass` False asserted test_standards.py:124, True via `independently_verified_pass` :87; receipt C1/C3; challenge_gate_blockers/verdict_passed C5 via test_evidence delegation tests). **Minor gap**: row undercounts; the `canonical_gate.py:176` unit-scoped overlay is exercised only with overlay == seam (`test_gate.py:114` sets `mutation_min: 0.65` = seam) — wiring green but never discriminated from seam-only at the canonical-gate level (semantics proven one level down by C2) |
| import sites do cutover | 9 | 9 confirmed at HEAD (citations in C6) | met — none residual |
| modos de falha do seam | 3 | arquivo ausente (test :135-146) · YAML malformado (4 subtests :148-159) · chave faltando (`no_gates_block` subtest :151; missing threshold-key routes through the asserted except-branch standards.py:92-96 via `float(None)` TypeError) | met; note: missing threshold-key variant and raw YAML-syntax branch (standards.py:74-78) share asserted paths but are not separately asserted |
| primitivas movidas | 3 | 4 named in Landing: `StateCorruptionError` (shared/errors.py; C7/C8 + scheduler tests), `utc_now_iso` (shared/time.py:27; C8 + moved test `shared/tests/test_time.py::TestUtcNowIso` PASSED), `atomic_write_text` (shared/fsio.py:20; canonical path substrate/__init__.py:110, evidence.py:337), `resolve_contained` (shared/fsio.py:43) | met — row omits `resolve_contained` (named in Landing); it is proven anyway by `test_standards.py:258` root-escape test (PASSED) |
| direções do antigo ciclo | 2 | curriculum→engines absent (C7 grep empty) · engines→curriculum→learner importable (C8 `ok`) | met |

## Swept (existing rows read against code)

| Row | Cited constraint | Located |
|---|---|---|
| idempotency and retry | anti-replay `replay_violations` | def `security.py:84`, called `canonical_gate.py:139`; `test_rejects_replayed_ndjson_evidence` PASSED |
| authorization | receipt + context isolation | `verifier_receipt.py:51-54` digest binding, `:64-65` `context_isolated is not True` → violation; `_secure_receipt_path` :69-96; `test_voxel_pass_requires_receipt_from_confined_directory` PASSED |
| concurrency and ordering | `atomic_write_text` on canonical path | `shared/fsio.py:20-40` (mkstemp + `os.replace`); used at `learner/substrate/__init__.py:110`, `curriculum/_shared/evidence.py:337`, `prediction_store.py`, `generated_views.py` |

Rows marked *n/a* are user-approved policy — nothing in the code for them to be wrong about.

## Faults injected

Not run — profile `light` (step 4 runs under standard/ui only).

## Gate

- `pytest learner/gate/tests/test_standards.py learner/gate/tests/test_gate.py curriculum/_shared/tests/test_evidence.py shared/tests/test_time.py` — **128 passed**, 0 failed
- `pytest engines/openclaw/tests engines/miniMaxEvolutionEngine/tests engines/minimaxDojo/tests` — **186 passed, 1 skipped** (agora-skill conditional), 0 failed
- `pytest learner/substrate/tests learner/tests` — **204 passed**, 0 failed
- `pytest` (full testpaths, C6 as written) — **infrastructure-limited**: timed out at ~88% on the degraded mount with zero failures up to the cutoff; every suite C6 names is covered green by the targeted runs above
- C8 import one-liner — `ok`, exit 0
- Greps C5/C7 empty (exit 1); C4 grep as written returns exactly 1 line (finding below)

## Gaps (ranked, none verdict-changing)

1. **C4 proof command is not reproducible as written** — `grep -rnE "(MUTATION_MIN|COVERAGE_MIN)[[:space:]]*=[[:space:]]*0\." learner/ curriculum/ engines/` returns `engines/minimaxDojo/tests/test_threshold_drift.py:148` (the fence's own `dirty.py` fixture string, `"MUTATION_MIN = 0.65\n"`). The claim's substance (no literal in production code) is proven by the fence test, and the Landing-decided scope excludes `tests/`; but the shipped proof text (and the task's criterion 3) needs a `tests/` exclusion, or the fixture should construct the literal without matching the grep.
2. **C6 "moved tests" overstates** — only the `check_evidence`/`passes_gate` tests moved to `test_standards.py`; the `gate_ready`/`gate_blockers` tests remain in `curriculum/_shared/tests/test_evidence.py` (now seam-pinned delegation tests). Substance (9 sites, green suites) unaffected.
3. **Coverage row undercounts bar consumers** — 5 direct application sites in code vs 4 row members; `canonical_gate.py:176` overlay wiring never discriminated from the seam in any test (`test_gate.py:114` overlay always equals seam).
4. **Coverage row omits `resolve_contained`** — named in the Landing one-way door; proven anyway (`test_standards.py:258`).
5. **Unexercised branches (notes)** — raw YAML syntax-error path (`standards.py:74-78`) and the missing-threshold-key variant (shares asserted `except (TypeError, ValueError)` branch, `standards.py:92-96`).
6. **Full testpaths run infrastructure-limited** — timeout at ~88% all-green; targeted runs cover every C6-named suite.

**Verdict**: PASS — 9/9 checks proven with located `file:line` evidence; no contradiction with the binding task; gaps above are precision/coverage-row findings, not unproven claims.
