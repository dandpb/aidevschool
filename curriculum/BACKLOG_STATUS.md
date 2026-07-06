# Curriculum Backlog Status

Canonical source: [catalog.md](./catalog.md)

## Status vocabulary

Adopted from [MANIFEST § Status Vocabulary](../engines/codexDojo/ecosystem/MANIFEST.md#status-vocabulary). Every
project below has exactly one status; future agents must keep these labels honest.

| Status | Meaning | Promotion criteria to next status |
| --- | --- | --- |
| `implemented` | code/artifact exists and passes verification | (terminal for now — the catalog has certified it) |
| `scaffolded` | folder/boilerplate exists, no verified behavior | `scaffolded → implemented` requires the 5-phase cycle to produce catalog-verified artifacts (spec ✓, 3 impls ✓ ≥80% coverage, code review ✓, benchmarks N≥3 ✓, evolution report ✓, verifier PASS ✓) |
| `planned` | documented intent, no code yet | `planned → scaffolded` requires folder + Go/Rust/Node skeleton + initial spec.md |
| `proposal` | design material only, no runtime commitment | `proposal → scaffolded` requires executable scaffold + test harness + working comparison runner |
| `blocked` | cannot proceed due to external dependency | `blocked → planned` requires the dependency to be resolved |

The catalog recognizes **Project 01** and **Project 02** as verified implementations,
**both Node.js-only** — neither has certified Go/Rust parity; see each project's row
below for the exact caveat. Folders for projects 03 through 18 exist with polyglot code,
tests, and docs, but the catalog has not certified them against its completion
standard. They are tracked here as `scaffolded` (not `planned`) — a project with
working Go/Rust/Node code and an `evolution_report.md` is more than "documented
intent"; it just hasn't passed the adversarial gate yet.

| Project | Status | Evidence |
| --- | --- | --- |
| `01_rate_limiter` | `implemented` | 6 evidence artifacts: (1) `docs/spec.md`, (2-4) Go/Rust/Node implementations with tests (Go ~85.9% cov + `-race`, Rust 14 unit + 6 integration tests, Node 92.91% cov / 55 tests + 1 pre-existing `it.todo`), (5) `docs/code_review.md` (21 issues, 7 categories, re-derived against current code), (6) `docs/benchmark_results.md` + `docs/evolution_report.md` + verifier gate. **Certification caveat: benchmark (N=10) and optimize (1 applied + measured optimization) are Node.js-only execution-verified in this sandbox; Go and Rust have no working toolchain here (confirmed unreachable, not skipped) and are carried as code-reviewed/proposed-only for benchmark and optimize — this is NOT a 3-language performance parity certification.** |
| `02_key_value_store` | `implemented` (Node.js only) | 6 evidence artifacts for Node.js: (1) `docs/spec.md` (13 sections, hash map/CRUD/TCP-HTTP/TTL/snapshot-persistence-basics), (2) Node implementation with tests (10/10 passing, 91.45% stmts / 82.01% branch / 100% funcs / 91.45% lines coverage), (3) `docs/code_review.md` (0 Critical / 3 Major / 4 Minor / 4 Educational, 7 categories, re-derived against current code with runtime probes), (4) `docs/benchmark_results.md` (N=10 + tolerance re-check PASS), (5) `docs/evolution_report.md` (3 Major bugs fixed + regression-tested, 1 measured perf optimization, 1 rejected optimization, verifier gate self-check PASS), (6) `learner/pipeline_status.md` phase history. **Certification caveat, same shape as Project 01: this is Node.js-only.** `go-impl/` and `rust-impl/` exist in the repo (from an earlier ungated backfill commit, not this cycle's gated pipeline) but were **never compiled, tested, reviewed, or benchmarked** in this cycle or before — they are unverified code, not certified implementations. Do not read `implemented` here as 3-language parity. |
| `03_url_shortener` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `04_concurrent_task_queue` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `05_websocket_chat` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `06_file_upload_pipeline` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `07_rest_api_auth` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `08_event_driven_order_system` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `09_plugin_system` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `10_distributed_cache` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `11_load_balancer` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `12_distributed_job_scheduler` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `13_api_gateway_circuit_breaker` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `14_log_aggregator` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `15_metrics_collector` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `16_mini_message_queue` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `17_distributed_config_service` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |
| `18_search_engine` | `scaffolded` | Go/Rust/Node implementations exist; pending catalog-verified 5-phase gate. |

## Reading the table

- **`implemented`** = the only label that travels with the learner. A `mastered` unit in `learner/learning_state.yaml` requires a `scaffolded → implemented` promotion in this table.
- **`scaffolded`** = has code, not evidence. The 5-phase loop will turn a `scaffolded` row into `implemented` row by row.
- **`planned`** = the row is empty in the catalog (no folder). None of 02–18 are here.
- **`proposal`** = design material lives in `docs/design/polyglot-arena/` (demoted from `engines/polyglotEvolutionArena/` on 2026-06-21) or the historical seed at `docs/PROMPTS/IDEIAS/polyglotEvolutionArena/`. None of 02–18 are here; the polyglot-arena archive itself is `proposal`.
- **`blocked`** = no row in this table currently holds this value; future rows might.

## Update rule

When a project moves from `scaffolded` to `implemented`:

1. Update this file's row and the evidence cell.
2. Update `curriculum/catalog.md` (Status field, Go coverage / Rust tests / Node coverage / Benchmark cells).
3. Update `curriculum/<NN>/docs/status.md` to `phase: cycle-complete`.
4. Append a new entry to `learner/journal.md` under the relevant section.
5. The catalog is the source of truth; this file is the operational view.
