# Metric-failure rubric lint (authoring judgment + deterministic CI guard)

> Build this with **tlc-implement** (`.claude/skills/tlc-implement`).
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

The mastery gate's claimed-vs-verified disagreement check is vacuous by construction for any failure metric outside an 11-name hardcoded vocabulary: `game_metric_violations` (`learner/gate/standards.py:316-330`) only recognizes names in `_NONZERO_FAILURE_METRICS`/`_TRUE_FAILURE_METRICS` or ending `_violations`, and `apply_failure_metrics` is active for exactly one legacy record — so a game emitting `crashes: 2` under a rubric that never checks it passes the gate with the failure sitting in the evidence (`canonical_gate.py:182` reports `[]`). Nobody observes this today because nothing enumerates the 17 games' metric vocabularies (~40+ names across `sim/levels.ts`-style literals, 16 in rubrics `pass_when`, 3 on disk).

The change: a versioned `metric_failure_snapshot.yaml` becomes the single source of truth for failure-metric classification; the runtime frozensets derive from it at load; a `metric_lint` tool enumerates each game's emitted metric names, proposes classifications via typed judgment at authoring time (receipts, reusing PR #486's runner), and an offline `--check` fails CI closed on anything the snapshot does not cover.

11 criteria in 4 slices · 5 one-way doors · 1 open, of which 0 block. Depends on PR #486 (judgments/receipts infra) being merged first.

## Criteria

### Snapshot + runtime derivation

1. Given `learner/gate/metric_failure_snapshot.yaml` seeded with the current 11 names (with their existing failure modes), `game_metric_violations` behaves byte-identically to pre-change: `game_metric_violations({"metrics": {"abusive_admitted": 2}})` returns `["abusive_admitted=2"]`, `{"overheated": True}` returns `["overheated=true"]`, and an unclassified name returns `[]` until snapshoted.
2. When the snapshot classifies `crashes` as `failure(nonzero)` and evidence carries `{"metrics": {"crashes": 3}}`, `game_metric_violations` returns `["crashes=3"]`.
3. If the snapshot file is missing, unreadable, not a mapping, or contains an entry whose classification is not one of `failure(nonzero)`, `failure(true)`, `not_failure`, `unknown`, importing the classification raises a `MetricSnapshotError` naming the file path and the offending entry — never an empty vocabulary.
4. A snapshot entry classified `unknown` still fails `--check` (exit 1) unless its provenance records a judgment receipt or an explicit manual override.

### Enumeration

5. Given a fixture game tree with metric object literals in a `sim/levels.ts`-style file, enumeration returns every literal key (including nested objects' keys) and nothing else; the current repo's `game-10-hash-ring` yields at least `owner_predictions`, `moved_keys`, `arc_prediction_ok`.
6. The enumeration union includes names that appear only in `evidence_rubrics.yaml` `pass_when` fields (all 16 present in the seeded snapshot's coverage).

### Propose (authoring-time judgment)

7. With `TYPESAFE_API_KEY` set and an injected client returning canned Nouls, `--propose` on a game with unclassified metrics writes digest-named receipts (via `learner/substrate/judgments.py` infra) and prints a YAML snippet classifying each unknown metric with its probability and provenance.
8. When `TYPESAFE_API_KEY` is unset, `--propose` exits with code 2 and a message naming the variable; `--check` is unaffected (fully offline).
9. If a judgment call fails mid-propose, the metric stays `unknown`, a fallback receipt line with the error class is written, and `--propose` still exits 0.

### Check + CI

10. `--check` with a metric present in enumeration sources but missing from the snapshot exits 1 naming the game and metric; with the seeded snapshot over the current repo it exits 0 (the census lands with this task).
11. `.github/workflows/ci.yml` gains a step in the "Python (learner + curriculum shared)" job running `python3 -m learner.gate.metric_lint --check` with no API key available, and the step passes at HEAD by criterion 10's second clause.

## Out of scope

- Runtime judgment anywhere in the gate - runtime stays deterministic (golden rule 2)
- Per-game machine-readable metric schemas (TS refactor) - only if literal enumeration misses computed keys; escalate to the design doc's heavier alternative then
- Literacy free-text verification - RFC ACCEPTED 2026-09-17; its own discovery round follows

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| command `python3 -m learner.gate.metric_lint --propose` | output format | 7 (YAML snippet per unknown metric) |
| command `--propose` | flags and defaults | existing - game selector positional or `--game`; no other flags |
| command `--propose` | exit codes | 8 (2 without key), 9 (0 on judgment failure) |
| command `--propose` | fails halfway | 9 |
| command `--check` | exit codes | 10 (0 covered / 1 naming gaps), 11 |
| command `--check` | output format | 10 (one line per gap: game + metric) |
| document `metric_failure_snapshot.yaml` | structure | 1, 3 (schema + fail-closed validation) |
| collection snapshot entries | duplicates | 3 (duplicate game+metric raises MetricSnapshotError) |

## Swept

- validation: 3 (schema validated at load, loud failure)
- failure modes: 3, 8, 9, 10
- idempotency and retry: 10 (re-run byte-stable), 7 (digest-named receipts overwrite on re-propose)
- authorization: existing - `TYPESAFE_API_KEY` env/`.env` only (PR #486 pattern), never in receipts or the repo
- concurrency and ordering: n/a - single-process CLI; snapshot written via `atomic_write_text`
- data lifecycle: snapshot is committed and versioned; receipts committed (PR #486 decision)
- external-dependency failure: 9 (propose degrades to unknown-skip), 10+11 (check has no external dependency at all)
- state transitions: n/a - stateless tooling over committed sources
- observability: 7 (receipts), 10 (check names exact gaps)

## Impact

| Front | What changes |
|---|---|
| domain | new term: `metric_failure_snapshot` - per-game classification of every emitted metric name (`failure(nonzero)`/`failure(true)`/`not_failure`/`unknown`) with provenance; lives in `learner/gate/metric_failure_snapshot.yaml` |
| domain | new term: `metric_lint` - enumeration + propose/check tooling; lives in `learner/gate/metric_lint.py` |
| domain | existing term: `_NONZERO_FAILURE_METRICS`/`_TRUE_FAILURE_METRICS` meant hardcoded frozensets, now derive from the snapshot at load - consumers: `game_metric_violations` (internal), `canonical_gate.py:182` and `standards.py:476-481` via its return value (unchanged shape) |
| stored data | nothing to migrate - snapshot seeded fresh from the 11 current names plus the census |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| vocabulary source of truth | `learner/gate/metric_failure_snapshot.yaml`; `standards.py` frozensets derived at module load; `MetricSnapshotError` fail-closed (mirrors `load_thresholds`) | dual maintenance (snapshot + hardcoded frozensets) with CI sync check - two places to forget |
| snapshot entry schema | `games.<game>: <metric>: {classification: failure(nonzero)\|failure(true)\|not_failure\|unknown, provenance: receipt:<digest16>\|manual:<who>}` | flat name→bool map - cannot express the two failure modes or provenance |
| CI guard | `--check` offline, exit 1 on missing metrics and on `unknown` without provenance; step added to the existing Python learner job with no key available | warning-only - keeps the breach open (user rejected in the verdict round) |
| judgment scope | `--propose` only: proposes entries + writes receipts via the PR #486 runner; never edits code; CI never calls the API | live judgment in CI - nondeterministic, key management in CI |
| enumeration sources | union of game-src `metrics: {` object-literal keys, `evidence_rubrics.yaml` `pass_when` fields, on-disk `evidence.ndjson` metric keys | per-game exported schemas - 17-game refactor; wins only if computed keys evade the literal scan |

## Sources

- `.design/metric-rubric-lint.md` - **binding for shape and decisions**: snapshot, derivation, propose/check split, journey states
- `learner/gate/standards.py:219-237,316-330,476-481,71-83` (`load_thresholds` pattern), `canonical_gate.py:182`, `evidence_rubrics.yaml` - grounding
- PR #486 / `learner/substrate/judgments.py` - the runner/receipt infrastructure being reused (dependency)

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Provenance field format beyond `receipt:<digest16>`/`manual:<who>` (e.g. a `since` date) | default taken: classification + provenance only; extend while building |
