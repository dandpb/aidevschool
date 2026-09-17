# Metric-rubric-lint Verification

**Verdict**: PASS
**Profile**: light (no tlc-implement profile in AGENTS.md) — step 1 (checklist vs binding sources, `ui`) skipped; step 4 (fault injection, `standard`/`ui`) skipped; steps 2, 3, 5 run in full
**Diff range**: 36f2543..5d032cc (HEAD)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| `.design/metric-rubric-lint.md` | yes | split with task on `unknown`-with-provenance (see gap 1); Decisions row vs Journey states disagree with each other; implementation takes the fail-closed side | none |
| `.tasks/metric-rubric-lint.md` | yes | same `unknown` carve-out (criterion 4) — precision gap, no shipped divergence (0 `unknown` entries in snapshot) | none |
| PR #486 / `learner/substrate/judgments.py` | yes (record path read; `atomic_write_text` at `judgments.py:270,300`) | none | none |

## Checks

All 16 tests in `learner/gate/tests/test_metric_lint.py` ran individually and passed at HEAD in one `pytest -v` invocation (16 passed, 0.28s). Both command proofs re-run: `python3 -m learner.gate.metric_lint --check` exit 0; census mode exit 0 with `game-10-hash-ring: ['arc_prediction_ok', ..., 'moved_keys', ..., 'owner_predictions', ...]` present. The diff carries every proof's target (`metric_lint.py`, `metric_snapshot.py`, `test_metric_lint.py`, `standards.py`, `ci.yml`, snapshot, receipt are all new/touched in range).

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | derived vocabularies preserve legacy behavior: `abusive_admitted: 2` → `["abusive_admitted=2"]`, `overheated: True` → `["overheated=true"]`, unclassified → `[]` | pytest 16/16 green | `test_metric_lint.py:32-40` — `standards.game_metric_violations({"metrics": {"abusive_admitted": 2}}) == ["abusive_admitted=2"]`; `... {"overheated": True}}) == ["overheated=true"]`; `... {"totally_unclassified_name": 5}}) == []`. Wiring: `standards.py` (diff hunk @@ -249) — `_NONZERO_FAILURE_METRICS, _TRUE_FAILURE_METRICS = failure_vocabularies()` at module load. Legacy 11 = 4 nonzero + 7 true entries under `shared:` with `manual:legacy-frozensets`, modes unchanged | PASS |
| C2 | snapshot `failure(nonzero)` on `crashes` yields `["crashes=3"]` | pytest green | `test_metric_lint.py:53-61` — fixture snapshot `crashes: {classification: failure(nonzero), ...}`; `failure_vocabularies(snapshot)`; `game_metric_violations({"metrics": {"crashes": 3}}) == ["crashes=3"]` | PASS |
| C3 | missing file / non-mapping / bad classification / duplicate / missing provenance raise `MetricSnapshotError` naming path+entry | pytest green (5 parametrized cases, each PASSED individually) | `test_metric_lint.py:64-89` — `pytest.raises(MetricSnapshotError)` with needles `missing`/`must be a mapping`/`classification`/`provenance`/`duplicate`; loader names path (`metric_snapshot.py:113,119`) and entry (`:67,72,99`); duplicate keys caught by `_StrictLoader` (`:51`); never returns empty vocabulary (raises at load) | PASS |
| C4 | literal keys at any nesting depth; game-10 yields `owner_predictions`, `moved_keys`, `arc_prediction_ok` | pytest green | `test_metric_lint.py:113` — `{"outer_count","nested","inner_ok","deeper","deep_key"} <= census["game-99-fx"]`; `:120` — `{"owner_predictions","moved_keys","arc_prediction_ok"} <= census["game-10-hash-ring"]` | PASS (note 3: subset `<=`, task's "and nothing else" clause unasserted; structurally holds — only `metrics: {` blocks scanned, `metric_lint.py:83-86`) |
| C5 | rubrics-only `pass_when` names enumerated, all 16 in census | pytest green | `test_metric_lint.py:137` — `expected == census["rubrics"]` (equality, recomputed from `evidence_rubrics.yaml`); independently confirmed 16 names; snapshot coverage of all 16 follows from C10 exit 0 (`check()` covers `rubrics` scope via `shared:` union, `metric_lint.py:242`) | PASS |
| C6 | propose writes digest-named receipts + prints snippet with classification, probability, provenance | pytest green | `test_metric_lint.py:173-183` — one `metric-lint-*.ndjson`, all lines `kind == "choice"`, questions exact; `"classification: failure(nonzero)"`, `"classification: not_failure"`, `"provenance: receipt:"` in snippet. Probability rendered at `metric_lint.py:218` (`# p=...`) but not asserted (note 4) | PASS |
| C7 | no key → propose exits 2 naming `TYPESAFE_API_KEY`; check unaffected offline | pytest green | `test_metric_lint.py:195-196` — `metric_lint.main(["--propose"]) == 2`; `"TYPESAFE_API_KEY" in ...err`. `--check` path (`metric_lint.py:255-259`) never touches the client/key; CI step runs keyless (C11) | PASS |
| C8 | judgment failure → metric stays `unknown`, fallback receipt with error class, exit 0 | pytest green | `test_metric_lint.py:208-212` — `"classification: unknown" in snippet`; fallback file `metric-lint-*-fallback.ndjson` with `line["status"] == "fallback"` and `line["error_class"] == "RuntimeError"`. Exit 0: `main` returns 0 unconditionally after `propose` (`metric_lint.py:269-270`); test proves `propose()` does not raise under client failure (note 4: exit code not asserted verbatim) | PASS |
| C9 | check exits 1 naming game+metric for missing; exits 1 for `unknown` | pytest green + `--check` re-run | `test_metric_lint.py:229-231` — `"missing_one" in g and "missing from snapshot" in g`; `"unknown_one" in g and "classified unknown" in g`; `not any("covered" in g ...)`. Exit mapping `metric_lint.py:259` — `return 1 if gaps else 0`. Gap line shape `<scope>::<metric> (...)` at `:246-248` | PASS (note 1: precision gap vs task criterion 4) |
| C10 | census lands: `--check` exit 0 over current repo | command re-run: exit 0; pytest green | shell: `python3 -m learner.gate.metric_lint --check` → `CHECK_EXIT=0`; `test_metric_lint.py:236` — `metric_lint.main(["--check"]) == 0`. Census (19 lines) = 16 voxel `game-*` dirs + pixelquest + rubrics + evidence-disk = 17 games ∪ rubrics ∪ on-disk evidence | PASS |
| C11 | ci.yml step in Python learner job, keyless | command re-run (exit 0) + workflow read + pytest green | `.github/workflows/ci.yml:315-316` — `- name: metric-failure snapshot guard` / `run: python3 -m learner.gate.metric_lint --check`, inside job `learner:` (`:280-281`, name "Python (learner + curriculum shared)"; next job at `:323`); no `TYPESAFE_API_KEY` secret in the job (only the comment at `:314`); `test_metric_lint.py:241-243` asserts the command string in the job's section | PASS |

## Literal shapes vs shipped code

- Snapshot schema: `version: 1` (`metric_failure_snapshot.yaml:13`), `shared:` block carrying the legacy 11 (exactly 11 `manual:legacy-frozensets` entries, 4 `failure(nonzero)` + 7 `failure(true)` — identical name sets to the deleted hardcoded frozensets in the `standards.py` diff), `games.<game>: <metric>: {classification, provenance}` throughout.
- Provenance regex `^(receipt:[0-9a-f]{16}|manual:[a-z0-9][a-z0-9._-]*)$` (`metric_snapshot.py:29`); every entry validated (`:61-74`).
- Exit codes: check 0/1 (`metric_lint.py:259`), propose 0/2 (`:268` return 2 without key, `:270` return 0).
- Derivation wiring: `standards.py` — `from learner.gate.metric_snapshot import failure_vocabularies` then `_NONZERO_FAILURE_METRICS, _TRUE_FAILURE_METRICS = failure_vocabularies()` at module load.
- Choice primitive: `_CHOICE_CRITERIA` (`metric_lint.py:39-53`) with exactly `failure_nonzero` / `failure_true` / `not_failure`; state `{metric_name, where_emitted}` (`:143`); mapped to snapshot classifications at `:156-160`.
- Committed receipt `learner/judgment_receipts/metric-lint-518d6905b440cc43.ndjson`: exists (250 lines), every line `"kind": "choice"`, `input_digest` = `518d6905b440cc43...` whose first 16 chars equal the filename and the snapshot's `receipt:518d6905b440cc43`. Arithmetic reconciles exactly: 237 snapshot entries with receipt provenance + 13 overridden by `manual:seed-review` = 250 receipt lines — every judgment is either pasted or explicitly overridden, none silent.
- Receipt answer fidelity spot-check: `missed_heartbeat_dropped`, `mismatch_predictions`, `missing_methods_named`, `extra_log_ids`, `lanes_orphaned` all `failure_nonzero` in receipt and `failure(nonzero)` in snapshot.
- Seed-review override semantics (3 spot-checks): `held: 2` appears in passing pixelquest fixtures (`evidencePolymorphism.test.ts:66-70`); `denied: 3` sits beside `policy_leaks: 0`/`false_denies: 0` — the gate correctly denying (`evidence.test.ts:104-108`); `stale_nodes: toSync.length` is the scenario's given set with `pass: setOk && valueOk` independent of it (`game-17-lighthouse-network/src/sim/levels.ts:228-234`). All three overrides to `not_failure` are defensible; each was a real override (receipt originally answered `failure_nonzero` for all three).

## Swept "existing" rows re-read

| Row | Cited constraint | Verified |
|---|---|---|
| authorization | `TYPESAFE_API_KEY` env/`.env` only, never in repo | yes — full-range diff grep for `TYPESAFE|sk-|api_key|Bearer` hits only the variable *name* (error message, docs, test); no key literal; CI step keyless |
| concurrency | snapshot/receipts via `atomic_write_text` | yes — `judgments.py:270` (`_write_ok_receipt`) and `:300` (`_write_fallback_receipt`); `metric_lint.propose` → `judgments.record_judgment` → `_write_ok_receipt` |

## Test policy rows

No `## Test policy` section in `.checks/metric-rubric-lint.md` — nothing to judge.

## Faults injected

Skipped — `standard`/`ui` only; profile is light.

## Checklist vs binding sources (step 1)

Skipped — `ui` only; profile is light. One precision finding surfaced during step 3 is recorded as gap 1 below.

## Gaps (ranked; none flips the verdict)

1. **Precision gap, C9 vs task criterion 4 / design Decisions row**: criterion 4 carves out "`unknown` ... unless its provenance records a judgment receipt or an explicit manual override", and the design's Decisions row says "exit 1 on ... `unknown` without receipt provenance" — but the design's own Journey says "exit 1 for check until resolved by hand", and the checklist's C9 wording ("`unknown` without provenance") describes a state the loader makes unreachable (C3 requires provenance on every entry, so an unknown can never lack it — under the literal wording the clause would be vacuous). Implementation (`metric_lint.py:247-248`) fails on ANY `unknown`, the test enforces that, and the shipped snapshot has zero `unknown` entries — no observable divergence today. A finding about the checklist's wording, not the code.
2. **Snapshot header comment inaccuracy**: header says "eleven overrides marked manual:seed-review-2026-09-17" (`metric_failure_snapshot.yaml:11`); actual count is 13. Stale comment; no check asserts the count.
3. **C4 "and nothing else" clause unasserted**: task criterion 5 asks enumeration to return "every literal key ... and nothing else"; the test asserts subset (`<=`), not equality. Structurally holds (only `metrics: {` blocks are scanned), and the risk direction (false positives) fails loud, not silent.
4. **C6 probability / C8 exit-0 clauses structural, not asserted**: the snippet's probability (`metric_lint.py:218`) and propose's unconditional exit 0 (`:269-270`) hold by construction and by the traced path; the tests assert the other clauses.

## Gate

`python3 -m pytest learner/gate/tests/test_metric_lint.py -v` — 16 passed, 0 failed.
`python3 -m learner.gate.metric_lint --check` — exit 0. `python3 -m learner.gate.metric_lint` — exit 0, census includes game-10 names.
