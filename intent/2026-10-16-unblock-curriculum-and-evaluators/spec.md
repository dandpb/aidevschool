# Spec: Unblock curriculum progression, test discovery, and late-game verification

## Invariants & Behavioral Contracts

1. **Analytics Import Resilience**:
   - `learner/analytics.py` must import cleanly even when `posthog` or `dotenv` are uninstalled.
   - Initializing without credentials in local environments returns a no-op client without throwing unhandled exceptions.

2. **Cleanroom & Portable Verification**:
   - `engines/test_engine_contracts.py` ignores `.scratch`, `.loops`, `.lavish`, `venv`, `.venv-linux`, `.codegraph`.
   - `factory/tests/test_p4_tree_integrity_2822.py` replaces file contents via `pathlib.Path.write_text` rather than invoking system-specific `sed`.
   - `learner/gate/tests/dojo_analytics_activation_surfaces.test.mjs` ignores `.scratch`, `.lavish`, `.loops` when scanning `netlify.toml` files.

3. **Curriculum Status Integrity**:
   - `curriculum/_shared/evidence.py` matches bold Markdown phase markers (`- **phase:** cycle-complete`) and falls back to `learner/learning_state.yaml` when challenge-local diagnostic files are absent.
   - Projects `03`–`18` in `curriculum/*/docs/status.md` declare `phase: impl` until independent attempts and verifiable evidence exist.

4. **Benchmark Accuracy**:
   - `curriculum/_shared/benchmarks/generic_http_workload.js` rejects unexpected HTTP status codes (only 2xx and 429 are valid), and `THINK_TIME_S` defaults to 0 to measure true server throughput.

5. **Polyglot & Language Flexibility in OpenClaw**:
   - `engines/openclaw/config.py` defines `project_languages(project)`: `01_rate_limiter` requires Go, Rust, Node; `02_key_value_store` through `18_search_engine` require Node.
   - `engines/openclaw/runner/checklist.py` evaluates implementations against declared project languages.

6. **Teaching Game Evaluators (U15–U18)**:
   - `learner/gate/observatory_evaluator.py`: Implements independent quantile calculation and SLO alert threshold checks matching Prometheus linear interpolation.
   - `learner/gate/freight_yard_evaluator.py`: Implements partitioned append-only log replay, round-robin consumer group assignment, and offset preservation checks.
   - `learner/gate/lighthouse_network_evaluator.py`: Implements distributed quorum consensus, split-brain partition detection, and node sync re-merge checks.
   - `learner/gate/stacks_evaluator.py`: Implements inverted index term filing, top-doc scoring, two-term query scoring, and TF-IDF top-k ranking.
   - `engines/voxelDojo/game-18-stacks/src/sim/levels.ts`: Calibrates `doc-d` term frequency so a two-term query legitimately ranks `doc-c` (containing both terms) first.
   - `ALLOWED_UNVERIFIED` in `learner/gate/tests/test_gate_game_coverage.py` is reduced to an empty set (`set()`).

7. **CI & Pytest Coverage**:
   - `pyproject.toml` includes `learner/analytics_events/tests`, `learner/service/tests`, and `scripts/storage/test_progress_backup.py`.
   - `.github/workflows/ci.yml` runs `shared/tests`, `learner/service/tests`, and `scripts/storage/test_progress_backup.py`.
   - `learner/analytics_events/tests/__init__.py` namespaces test modules to prevent collision with `docs/product-readiness/tests/test_validate.py`.
