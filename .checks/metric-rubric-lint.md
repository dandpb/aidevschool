# Metric-failure rubric lint (authoring judgment + deterministic CI guard)

Sources:

- `.tasks/metric-rubric-lint.md` - the 11 criteria, Decided rows, boundary (binding)
- `.design/metric-rubric-lint.md` - **binding for shape and decisions**: snapshot, derivation, propose/check split, journey states
- PR #486 / `learner/substrate/judgments.py` - the runner/receipt infrastructure being reused

## Out of scope

- Runtime judgment anywhere in the gate - runtime stays deterministic (golden rule 2)
- Per-game metric schemas (TS refactor) - only if literal enumeration misses computed keys
- Literacy free-text verification - RFC ACCEPTED 2026-09-17; separate discovery

## Landing

Adds `learner/gate/metric_lint.py` (enumerate / --propose / --check) and `learner/gate/metric_failure_snapshot.yaml` (committed source of truth); touches `learner/gate/standards.py` (frozensets derive from the snapshot at load, `MetricSnapshotError` mirroring the `ThresholdSeamError` pattern already in that file), `learner/gate/tests/` (new test file — that dir already runs in the CI pytest line), and `.github/workflows/ci.yml` (one step in the Python learner job). Reuses `learner/substrate/judgments.py` (client injection, digest receipts, `atomic_write_text`) — no new judgment plumbing.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Classification judgment primitive | one Choice per metric over `failure_nonzero` / `failure_true` / `not_failure`, state = `{metric_name, where_emitted, example_usage}` | Noul "is failure?" + a second mode question - two calls for one answer, and success-polarity booleans (`arc_prediction_ok`) would read as failure |
| Snapshot schema scope | `version: 1`; `shared:` block for engine-wide names (the legacy 11, provenance `manual:legacy-frozensets`) + `games.<game>: <metric>: {classification, provenance}` | task shape had only `games.<game>:` - the legacy vocabulary is engine-wide, not per-game; `shared:` is the additive fix |
| Provenance required on every entry | `provenance: receipt:<digest16>` or `manual:<who>` on all classifications; `--check` additionally fails `unknown` entries | provenance optional except unknown - unauditable failure classifications |
| Census seeding | legacy 11 seeded manually; all other enumerated names classified by a real `--propose` run with the live key, receipts committed as provenance | hand-classifying ~40 names in the seed commit - the tool exists to do exactly this; the seed run dogfoods it |
| Exit codes | `--check`: 0 covered / 1 naming gaps; `--propose`: 0 (incl. judgment failure, C9), 2 without key | nonzero on propose judgment failure - would fail CI-style usage for a degraded-but-correct run |

- Nothing else in this change is hard to reverse.

## Checks

### S1 - Snapshot + runtime derivation · 3 files · ~20 KB · ~5k

**C1** - Frozensets derived from the seeded snapshot preserve legacy behavior exactly: `abusive_admitted: 2` → `["abusive_admitted=2"]`, `overheated: True` → `["overheated=true"]`, unclassified name → `[]`
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_frozensets_derived_preserve_legacy_behavior"`

**C2** - Snapshot entry `failure(nonzero)` on `crashes` makes `{"metrics": {"crashes": 3}}` yield `["crashes=3"]`
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_snapshot_failure_nonzero_detected"`

**C3** - Missing file, non-mapping YAML, bad classification value, duplicate game+metric, or missing provenance raise `MetricSnapshotError` naming the path and entry — never an empty vocabulary
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_malformed_snapshot_fails_closed"`

### S2 - Enumeration · 2 files · ~8 KB · ~2k

**C4** - Fixture game tree: literal keys inside `metrics: {` blocks extracted at any nesting depth; real repo: `game-10-hash-ring` yields at least `owner_predictions`, `moved_keys`, `arc_prediction_ok`
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_enumeration_extracts_literal_keys" "learner/gate/tests/test_metric_lint.py::test_enumeration_game10_live"`

**C5** - Names appearing only in `evidence_rubrics.yaml` `pass_when` fields are enumerated (all 16 present in the seeded census)
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_rubrics_only_metrics_enumerated"`

### S3 - Propose (authoring-time judgment) · 2 files · ~6 KB · ~2k

**C6** - With key + injected canned client, `--propose` on unclassified metrics writes digest-named receipts and prints a YAML snippet with classification, probability, provenance
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_propose_writes_receipts_and_prints_yaml"`

**C7** - Without key, `--propose` exits 2 naming `TYPESAFE_API_KEY`; `--check` unaffected offline
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_propose_without_key_exits_2"`

**C8** - Judgment failure mid-propose: metric stays `unknown`, fallback receipt line with error class, exit 0
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_propose_judgment_failure_stays_unknown"`

### S4 - Check + CI · 3 files · ~10 KB · ~3k

**C9** - `--check` exits 1 naming game+metric for an enumerated-but-missing metric; exits 1 for `unknown` without provenance
Proof: `python3 -m pytest "learner/gate/tests/test_metric_lint.py::test_check_fails_closed_on_gaps"`

**C10** - Census lands: over the current repo (17 games ∪ rubrics ∪ on-disk evidence), `python3 -m learner.gate.metric_lint --check` exits 0
Proof: `python3 -m learner.gate.metric_lint --check` (exit 0 at HEAD)

**C11** - ci.yml gains the guard step in the Python learner job, running `--check` with no key
Proof: `python3 -m learner.gate.metric_lint --check` (same command the step runs) + the workflow step `metric-failure snapshot guard` present in `.github/workflows/ci.yml`

## Swept

- validation: C3 (snapshot schema, loud failure)
- failure modes: C3, C7, C8, C9
- idempotency and retry: C10 (re-run stable), C6 (digest-named receipts overwrite on re-propose)
- authorization: existing - `TYPESAFE_API_KEY` env/`.env` only (PR #486 pattern); CI step runs keyless
- concurrency and ordering: n/a - single-process CLI; snapshot via `atomic_write_text` (existing)
- data lifecycle: snapshot + receipts committed (PR #486 decision)
- external-dependency failure: C8 (propose degrades to unknown-skip); check has no external dependency (C9/C10/C11 keyless)
- state transitions: n/a - stateless tooling over committed sources
- observability: C6 (receipts), C9 (check names exact gaps)

## Handoff

One batch: all four slices total ~12k estimated reading against a 150k budget. Single build agent; the orchestrator dispatches the Verifier over the whole feature afterwards.
