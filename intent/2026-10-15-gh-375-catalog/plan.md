# Plan: reconcile four Dev journey catalog divergences

Change-id: 2026-10-15-gh-375-catalog · Status: approved
From: [spec.md](spec.md); owner-provided implementation plan, 2026-10-15.

## Files and order

1. Record intent/spec/plan here. Update the two approved assertions in
   `learner/substrate/tests/test_substrate.py`; record the expected pre-fix
   scaffold count failure before editing catalog status.
2. Reconcile `curriculum/catalog.md` and
   `curriculum/{02_key_value_store,05_websocket_chat,12_distributed_job_scheduler,18_search_engine}/docs/status.md`
   with `docs/product-readiness/assessments/2026-09-13-05fca349-devjourneys-wave1.md`
   and present/absent implementation directories. Preserve historical caveats.
3. Regenerate through the substrate: `curriculum/BACKLOG_STATUS.md`,
   `engines/codexDojo/src/data/{projects,learner}.ts`, and
   `engines/codexdojo-os-prototype/src/data/learner.ts`. Inspect all generated
   diffs and retain only task-caused changes. Update
   `engines/codexDojo/ecosystem/MANIFEST.md` to map the reconciled evidence.
4. Record command results in `verification.md` here; run a simplification pass
   and independent REVIEW.md passes against this plan. Commit with the two
   owner-approved GH-375 override trailers, run the SDLC guard, push the named
   branch, and open a PR to main.

## Proof

Use a task-local virtual environment with the declared `.[dev]` dependencies;
the system Python lacks dotenv and the inherited .venv is unusable.

- `python3 -m unittest learner.substrate.tests.test_substrate.TestDashboardSnapshot.test_build_snapshot_picks_up_backlog_counts`
  before catalog edit: FAIL (17 != 14), then pass after regeneration.
- `python3 docs/prioridades/2026-08-17/caso-p7-catalog-evidence/verify_catalog.py`: PASS.
- `python3 -m unittest learner.substrate.tests.test_substrate learner.substrate.tests.test_catalog_projections`: all pass.
- `python3 -m unittest discover -s learner/substrate/tests -t .`: all pass.
- `python3 -m learner.substrate --check`: canonical and generated views in sync.
- Where feasible, independently rerun the four Node packages' own lint/build/test
  commands; retain current results separately from the historical catalog facts.
- `git diff --check` and `bash scripts/sdlc_guard_check.sh --base origin/main --head HEAD`: clean.

## Risks and verification split

The main risk is confusing implementation with mastery or turning historical
green tests into claims of full spec completion. Keep `units_log` unchanged,
assert its authority, retain Node-only/benchmark/spec caveats, and date results.
No status changes to the other projects and no handwritten generated edits.
A fresh-context verifier subagent reruns focused proof and reviews correctness,
evidence, conventions, security/hygiene, and simplification before publication.

## Source-grounded adjustment

Project 12's old local status also calls due-time dispatch broken. Current main
already filters `dueAtMs` in `dispatchNext`, rejects future jobs in `dispatchJob`,
and tests both paths. Correct that stale statement in the same status file;
retain the remaining specification gaps and the Wave 1 numbers as historical.
