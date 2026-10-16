# Plan: Unblock curriculum progression, test discovery, and late-game verification

## Execution Steps

1. **Dependency resilience & pre-existing tests**:
   - Wrap `posthog` and `dotenv` in `try...except ImportError` within `learner/analytics.py`.
   - Update `PRUNED_DIRS` in `engines/test_engine_contracts.py`.
   - Replace GNU `sed -i` with portable `pathlib.Path` in `factory/tests/test_p4_tree_integrity_2822.py`.
   - Exclude `.scratch`, `.lavish`, `.loops` from `findNetlifyTomls` in `learner/gate/tests/dojo_analytics_activation_surfaces.test.mjs`.

2. **Curriculum evidence & status hygiene**:
   - Update `_PHASE_RE` regex in `curriculum/_shared/evidence.py`.
   - Update `curriculum/03_*` through `curriculum/18_*` `docs/status.md` files from `cycle-complete` to `impl`.
   - Recompute Whiteboard metrics in `learner/substrate/adapters/whiteboard.py` from canonical Markdown/YAML sources.

3. **Benchmark harness hardening**:
   - Update `expectedStatuses` in `curriculum/_shared/benchmarks/generic_http_workload.js` to `{ min: 200, max: 299 }, 429`.
   - Expose `THINK_TIME_S` defaulting to 0.

4. **OpenClaw polyglot unblocking**:
   - Add `project_languages` in `engines/openclaw/config.py`.
   - Update `engines/openclaw/runner/checklist.py` and unit tests in `engines/openclaw/tests/test_checklist.py`.

5. **Late game evaluators & game bugfix**:
   - Implement `learner/gate/observatory_evaluator.py`, `freight_yard_evaluator.py`, `lighthouse_network_evaluator.py`, `stacks_evaluator.py`.
   - Register all 4 in `learner/gate/teaching_game_bridge.py`.
   - Fix corpus term frequency in `engines/voxelDojo/game-18-stacks/src/sim/levels.ts`.
   - Create `learner/gate/tests/test_late_games_evaluators.py` and clear `ALLOWED_UNVERIFIED` in `learner/gate/tests/test_gate_game_coverage.py`.
   - Extract internal helpers to keep cyclomatic complexity ≤ 8 across all evaluators.

6. **CI & Pytest discovery**:
   - Add missing suites to `pyproject.toml` and `.github/workflows/ci.yml`.
   - Add `learner/analytics_events/tests/__init__.py`.
   - Regenerate substrate projections via `python3 -m learner.substrate`.
