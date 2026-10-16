# Intent: Unblock curriculum progression, test discovery, and late-game verification

Author: Antigravity Coding Assistant · Change-id: 2026-10-16-unblock-curriculum-and-evaluators · Status: accepted · Tracking: GH-688

## Problem

A deep audit of the repository revealed structural blocks preventing the ecosystem from functioning end-to-end:
1. `learner/analytics.py` hard-crashed with `ModuleNotFoundError` during local test runs whenever `posthog` or `python-dotenv` were absent.
2. 3 pre-existing tests failed in pytest: unpruned scratch directories in `engines/test_engine_contracts.py`, and non-portable GNU `sed -i` in `factory/tests/test_p4_tree_integrity_2822.py`.
3. Curriculum evidence reported unverified backfilled `docs/status.md` files as `phase: cycle-complete` for projects 03–18, creating phantom mastery across the dashboard without executable proof.
4. The generic HTTP benchmark harness (`generic_http_workload.js`) treated 4xx client errors (400, 401, 403, 404) as successes (`0.000 fail rate`) and hardcoded a `sleep(0.02)` cap.
5. `engines/openclaw` strictly required Go and Rust implementations for every project, crashing on Node-only verified implementations like `02_key_value_store`.
6. Teaching-game evaluators for late-track games (U15 OBSERVATORY, U16 FREIGHT YARD, U17 LIGHTHOUSE NETWORK, U18 STACKS) were completely missing and exempted via `ALLOWED_UNVERIFIED`. Furthermore, L3 of `game-18-stacks` had an impossible pass rule due to a corpus imbalance where `doc-d` outranked `doc-c` for a two-term query.
7. Test discovery in CI skipped `learner/service/tests`, `shared/tests`, and `scripts/storage/test_progress_backup.py`, allowing regressions to pass unnoticed.

## Proposed outcome

1. `learner/analytics.py` provides graceful fallback when optional telemetry dependencies are missing.
2. Pre-existing test failures are resolved portably across Linux and macOS.
3. Curriculum statuses accurately reflect implementation state: projects 01 and 02 are cycle-complete; projects 03–18 are `impl` without false mastery claims.
4. Benchmark harness validates status codes in `200..299, 429` and exposes configurable think time.
5. `openclaw` supports per-project declared languages, unblocking `02_key_value_store`.
6. Independent evaluators are implemented for U15–U18, the corpus bug in `stacks` is resolved, and `ALLOWED_UNVERIFIED` is emptied to 0.
7. Test discovery is unified across `pyproject.toml` and `.github/workflows/ci.yml`.
