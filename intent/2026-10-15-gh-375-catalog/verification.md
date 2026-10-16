# Verification: GH-375 catalog reconciliation

Producer: Codex · Date: 2026-10-15 · Base: `304456dd` (`origin/main`).
Independent review is recorded separately in `review.md` after verification.

## Environment

The system Python lacked `dotenv`; the original checkout's `.venv` could not
load its standard library. Created `.scratch/gh-375/venv` with Python 3.13 and
installed the repository's declared `.[dev]` dependencies. Commands below use
that environment's Python; no project dependencies or lockfiles were changed.
Node dependencies were installed with `npm ci --include=dev --no-audit --no-fund`
in the four isolated project directories, all exit 0.

## Regression and substrate proof

Before editing catalog status, the approved count assertion failed:

```text
python -m unittest learner.substrate.tests.test_substrate.TestDashboardSnapshot.test_build_snapshot_picks_up_backlog_counts
AssertionError: 17 != 14
Ran 1 test
FAILED (failures=1)
```

After canonical catalog edits and `python -m learner.substrate`:

| Command | Result |
| --- | --- |
| `python -m learner.substrate` | exit 0; 31 projections regenerated |
| `python docs/prioridades/2026-08-17/caso-p7-catalog-evidence/verify_catalog.py` | exit 0; catalog evidence verification: PASS |
| `python -m unittest learner.substrate.tests.test_substrate learner.substrate.tests.test_catalog_projections` | exit 0; 118 tests, OK |
| `python -m unittest discover -s learner/substrate/tests -t .` | exit 0; 209 tests, OK |
| `python -m learner.substrate --check` | exit 0; canonical learner state and generated projections are in sync |

Only four generated tracked files changed: backlog, dashboard projects,
dashboard learner, and OS learner. Both snapshots retain `masteredCount: 2`
and now report `scaffoldedCount: 14`; canonical `learning_state.yaml` is untouched.
The test now checks mastery against `count_mastered(units_log)` rather than
assuming that implementation status grants mastery.

## Current Node proof, separate from Wave 1

Each package's own `npm run lint` (with `RTK_DISABLED=1`) and `npm run build`
passed. `npm run test:coverage` ran for 02; `npm test` ran for 05/12/18.

| Project | Tests on current base, 2026-10-15 | Current v8 All files (statements/branches/functions/lines) |
| --- | --- | --- |
| 02 | 33/33 across 3 files | 89.4 / 92.3 / 100 / 89.4 |
| 05 | 10/10 across 2 files | not measured |
| 12 | 8/8 in 1 file | 92.88 / 88.04 / 96.77 / 92.88 |
| 18 | 10/10 in 1 file | not measured |

The catalog intentionally cites the requested historical Wave 1 numbers
(`2026-09-13 @ 05fca349`), including 7 tests for 12 and 92.26% branch coverage
for 02. Today's results do not overwrite that immutable observation. The
status for 12 also corrects its stale due-time bug claim: current source and
passing tests cover future-job rejection on both dispatch paths. Other
specification, benchmark, and Node-only caveats remain.

## Publication boundary

The user authorized commit, push, and opening a PR to main. No merge or new
readiness certification is part of this change. The original checkout had
unrelated dirty files and remains preserved; clean-tree proof is scoped to
this task's isolated worktree, not the shared checkout.
