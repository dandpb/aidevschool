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

The catalog recognizes **Project 01** as the only fully verified implementation
("Implemented: 1"). Folders for projects 02 through 18 exist with polyglot code,
tests, and docs, but the catalog has not certified them against its completion
standard. They are tracked here as `scaffolded` (not `planned`) — a project with
working Go/Rust/Node code and an `evolution_report.md` is more than "documented
intent"; it just hasn't passed the adversarial gate yet.

| Project | Status | Evidence |
| --- | --- | --- |
| `01_rate_limiter` | `implemented` | Go/Rust/Node implementations with tests (catalog-verified: 99% Go, 19 Rust tests, 91.86% Node). N≥3 benchmark rerun pending. |
| `02_key_value_store` | `scaffolded` | Folder + Go/Rust/Node code + docs/{spec,code_review,benchmark_results,evolution_report,status}.md present; not catalog-verified; no `learning_state.yaml` entries. |
| `03_url_shortener` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `04_concurrent_task_queue` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `05_websocket_chat` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `06_file_upload_pipeline` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `07_rest_api_auth` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `08_event_driven_order_system` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `09_plugin_system` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `10_distributed_cache` | `scaffolded` | Folder + Go/Rust/Node code + docs + `multinode_verification.md` present; not catalog-verified. |
| `11_load_balancer` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `12_distributed_job_scheduler` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `13_api_gateway_circuit_breaker` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `14_log_aggregator` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `15_metrics_collector` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `16_mini_message_queue` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `17_distributed_config_service` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |
| `18_search_engine` | `scaffolded` | Folder + Go/Rust/Node code + docs present; not catalog-verified. |

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
