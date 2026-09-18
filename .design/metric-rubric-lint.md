# Metric-failure rubric lint (authoring-time judgment + deterministic CI guard)

> Plan this with **tlc-plan** (`.claude/skills/tlc-plan`).
> Decisions below carry the literal shape - copy them, do not re-derive them.

## Situation

- Project: in active construction; depends on **PR #486** (judgments/receipts infrastructure — reuse, not rebuild)
- Decision: committed by the user (Daniel), 2026-09-17 — "siga as recomendações"; verdict confirmed build + snapshot/CI fail-closed in the same session
- In flight: PR #486 open (CI 40/40); this work branches after it merges
- At stake: the gate's claimed-vs-verified disagreement check is vacuous for unknown failure metrics today — a wrong build here is reverted in an afternoon (tool + yaml + CI step), but a wrong *omission* ships silent false-passes

## Problem

`game_metric_violations` (`learner/gate/standards.py:316-330`) classifies a metric as failure-indicating only if its name is in one of two hardcoded frozensets (11 names) or ends with `_violations`. Those frozensets are active in the pass path for exactly one legacy record (`apply_failure_metrics: true` appears once in `evidence_rubrics.yaml`, for GATEKEEPER); what they really feed is the claimed-vs-verified disagreement check (`standards.py:476-481`, `canonical_gate.py:182`). That check is therefore vacuous by construction for any game whose failure metrics are outside the 11-name vocabulary: a game emits `crashes: 2`, its rubric checks only `predictions > 0`, the gate passes with a failure sitting in the evidence, and the disagreement list reads `[]`.

Measured: 11 frozenset names · 16 metric names in `evidence_rubrics.yaml` · ~40+ across the 17 games' `evidence/emit.ts` (decentralized) · 3 on-disk evidence names (none failure-ish). No false-pass observed — and nothing instrumented to detect one. If nothing changes, the 18th game that emits an out-of-vocabulary failure metric passes clean and nobody learns.

## Evidence

- vacuity mechanism verified by reading all four call sites (this session)
- coverage universe enumerated from the three sources above; the full per-game enumeration is build work (the lint's first run IS the census)
- failure-indicator judgment validated on this repo's data class (session 1: attempt triage 0.89/0.02/0.05, stable ×3)

## Journey

Operational sequence: a new game (or rubric edit) lands → author runs `python3 -m learner.gate.metric_lint --propose` with `TYPESAFE_API_KEY` → the lint enumerates the game's metric names, judges each ("is this a failure indicator?"), writes receipts, and prints/patches proposed snapshot entries → human reviews the diff, commits snapshot + (if any) frozenset derivation updates → CI's `--check` (offline, deterministic) fails closed on any metric in sources missing from the snapshot or classified `unknown` without a judgment receipt.

States: **no key** → `--propose` exits with a pointer to set `TYPESAFE_API_KEY`; `--check` fully works offline; **judgment fails** → proposal skips that metric (stays `unknown`), fallback receipt written, exit 0 for propose / exit 1 for check until resolved by hand; **disagreement with an existing snapshot entry** → `--propose --update` re-judges and diffs, human decides; **new game** → union scan picks up its `emit.ts` automatically.

## Verdict

build - the cost of doing nothing is a provably vacuous safety check on the mastery gate; the cost of building is one tool + one yaml + one CI step, fully reversible. Confirmed by the user (Daniel), 2026-09-17.

Cheaper paths considered: naming convention (`_violations` suffix) as documentation only - leaves the check vacuous for whatever the author forgets; warning-only CI - keeps the breach open by convention; pure-regex classifier - "is this a failure indicator?" is semantic, and that judgment is validated.

## Success

- Worked if: the next voxel/pixel game authored has every emitted metric classified in the snapshot before merge, enforced by CI - by the next gate cycle
- Early signal: `--check` failing on the first re-run against current games (the census) - that failing is the tool working; it going quiet before any entry exists is the bet going wrong
- Review: next gate cycle - the learner/owner

## Boundary

In: metric lint module, versioned snapshot, judgment proposal path (receipts via #486 infra), CI `--check` step, frozensets derived from the snapshot.
Out: runtime judgment anywhere in the gate - runtime stays deterministic (golden rule 2); TS-side metric schema refactor across 17 games - only if the emit.ts enumeration proves unreliable (see Shape); the literacy free-text RFC - separate artifact (`docs/design/rfc-literacy-free-text-verification.md`).

## Shape

A single yaml becomes the source of truth for "which metric names are failure indicators", the runtime frozensets derive from it at load (same convention as `load_thresholds` reading `evidence_rubrics.yaml`), a judgment-powered propose mode fills it at authoring time with full receipt provenance, and an offline CI check fails closed on anything the snapshot does not cover. Reversing it means deleting one module, one yaml, one CI step.

### Adds

- `learner/gate/metric_lint.py` - enumerate (emit.ts literals ∪ rubrics `pass_when` ∪ on-disk evidence ndjson), `--propose` (judgment + receipts), `--check` (offline, fail-closed)
- `learner/gate/metric_failure_snapshot.yaml` - per game: metric → `failure` | `not_failure` | `unknown`, with provenance (receipt digest or `manual:<who>`)

### Changes

- `learner/gate/standards.py` - `_NONZERO_FAILURE_METRICS`/`_TRUE_FAILURE_METRICS` derived from the snapshot at module load (yaml-at-runtime is established via `load_thresholds`)
- `.github/workflows/ci.yml` - one step in the Python learner job: `python3 -m learner.gate.metric_lint --check`

### Leaves

- `game_metric_violations` logic, evaluators, canonical_gate call sites - unchanged semantics, now fed by a complete vocabulary
- All 17 games' TS emit code - untouched (enumeration is read-only)

The heavier alternative - requiring each game to export a machine-readable metrics schema - only pays off if the emit.ts literal enumeration proves unreliable during the build; if a game's metrics hide behind computed keys, escalate then, not now.

## Roadmap

One block: the lint + snapshot + CI guard above - clear (backed by Decisions). Blocked on PR #486 merging.

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| Vocabulary source of truth | `learner/gate/metric_failure_snapshot.yaml`; `standards.py` frozensets derive from it at load | single source; yaml-at-runtime already established (`load_thresholds`) | dual maintenance (snapshot + hardcoded frozensets) with a CI sync check - loses: two places to forget | costly (consumers appear once derived) |
| CI guard mode | `--check` offline, exit 1 on: metric in sources missing from snapshot; `unknown` without receipt provenance | fail-closed at authoring, deterministic in CI, no API/key in CI | warning-only - rejected by the user (verdict round) | reversible |
| Judgment scope | authoring-time `--propose` only; proposes entries + writes receipts; never edits code; CI never calls the API | producer-side tooling; golden rule 2 keeps judgment out of the gate's runtime | live judgment in CI - nondeterministic, key management in CI | one-way while golden rules stand |
| Enumeration sources | union of `evidence/emit.ts` metric literals, `evidence_rubrics.yaml` `pass_when` fields, on-disk `evidence.ndjson` | catches all three vocabularies without touching 17 games | per-game exported schema - wins only if literal enumeration misses computed keys (named in Shape) | reversible |

## Open

1. Snapshot schema details (per-metric `since` date, free-text note) - default taken: minimal (classification + provenance only), extend while building

## Sources

- Discovery interview 2026-09-17 (this session) - verdict, scope, journey states
- `learner/gate/standards.py:219-237,316-330,476-481`, `canonical_gate.py:182`, `evidence_rubrics.yaml` (apply_failure_metrics count = 1) - grounding
- PR #486 / `.design/semantic-substrate-seam.md` - the judgments/receipts infrastructure being reused
