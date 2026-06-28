# Curriculum

**Path:** `curriculum/` · **Shared** across all engines (never duplicated). The canonical source of
truth is [`curriculum/catalog.md`](../../curriculum/catalog.md).

## What it is

18 coding challenges, each implemented **polyglot in Go, Rust, and Node.js/TypeScript**, arranged as a
**6-level progression** from fundamentals to complex distributed systems. The same specification is
implemented three times so the learner studies comparative engineering through real benchmarks, code
reviews, and evolution reports. As of the latest catalog: **18 total, 1 implemented (Project 01).**

> `catalog.md` is authoritative. Every engine, dashboard, and roadmap must reference it; other lists
> (`docs/PROMPTS/IDEIAS/`, `engines/codexDojo/ecosystem/ROADMAP.md`) are derived and must stay aligned.

Every project follows the lifecycle: `spec → polyglot implementation → code review → benchmark (N≥3)
→ evolution → verify`.

## The 18 projects

### Level 1 — Fundamentals

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 01 | `01_rate_limiter` | Rate Limiter (Token Bucket) | Atomic refills, shared concurrent state. **✅ Implemented.** |
| 02 | `02_key_value_store` | Key-Value Store (in-memory) | Hash-map CRUD over TCP/HTTP, TTL, snapshot/persistence. |
| 03 | `03_url_shortener` | URL Shortener | base62/SHA-256, relational DB design, 301/302, analytics. |

### Level 2 — Concurrency & Performance

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 04 | `04_concurrent_task_queue` | Concurrent Task Queue | Worker pools, backpressure, priorities, retries, DLQ, idempotency. |
| 05 | `05_websocket_chat` | WebSocket Chat Server | Fan-out broadcast, rooms, presence, heartbeats; 10k+ connections. |
| 06 | `06_file_upload_pipeline` | File Upload/Processing Pipeline | Streaming/chunked multipart, bounded memory, parallel processing. |

### Level 3 — Architecture & Design Patterns

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 07 | `07_rest_api_auth` | REST API with Auth | JWT, RBAC, middleware chains, layered architecture, DI, versioning. |
| 08 | `08_event_driven_order_system` | Event-Driven Order System | Pub/sub, event sourcing, projections, sagas, outbox. |
| 09 | `09_plugin_system` | Plugin System | Dynamic loading, interfaces/traits, lifecycle, WASM/FFI/JS sandboxing. |

### Level 4 — Scalability & Distribution

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 10 | `10_distributed_cache` | Distributed Cache | Invalidation, LRU/LFU, consistent hashing, gossip, stampede prevention, sharding. |
| 11 | `11_load_balancer` | Load Balancer | Reverse proxy, health checks, balancing strategies, TLS termination, circuit breaker. |
| 12 | `12_distributed_job_scheduler` | Distributed Job Scheduler | Leader election (simplified Raft), distributed locks, cron, DAG deps, backoff. |

### Level 5 — Resilience & Observability

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 13 | `13_api_gateway_circuit_breaker` | API Gateway with Circuit Breaker | CB states, retry w/ jitter, fallbacks, bulkheading, per-tenant limits, coalescing. |
| 14 | `14_log_aggregator` | Log Aggregator | Structured logging, aggregation, compression, indexing, retention, OpenTelemetry. |
| 15 | `15_metrics_collector` | Metrics Collector & Dashboard | Time-series counters/gauges/histograms, p95, downsampling, Prometheus format, alerting. |

### Level 6 — Complex Systems

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 16 | `16_mini_message_queue` | Mini Message Queue (like Kafka) | Topics, partitions, consumer groups, offsets, log storage, replication, compaction. |
| 17 | `17_distributed_config_service` | Distributed Configuration Service | Consensus, watch/notify, versioning, linearizability, ACL, audit, rollback, flags. |
| 18 | `18_search_engine` | Search Engine | Inverted indexes, tokenization, TF-IDF/BM25, query parsing, fuzzy search, autocomplete. |

`catalog.md` also includes a **Concept Coverage Matrix** and a **Language Suitability Guide** (which
language is ideal for which project).

## Per-project layout

Every project directory follows the same pattern (verified across projects 01–03 and the canonical
`_shared/project_template/`):

```text
NN_project_name/
├── docs/
│   ├── spec.md                # the specification — SAME spec for all 3 languages (owner: curator)
│   ├── code_review.md         # owner: reviewer
│   ├── learning_notes.md      # owner: reviewer
│   ├── benchmark_results.md   # owner: benchmarker
│   ├── evolution_report.md    # owner: optimizer
│   ├── status.md              # pipeline status, updated per phase
│   ├── diagnostic.md          # the learning-gate challenge (gate artifact)
│   └── quiz.md / mutation_gate.md   # additional evidence artifacts
├── go-impl/                   # owner: dev-go
├── node-impl/                 # owner: dev-node
├── rust-impl/                 # owner: dev-rust
├── benchmarks/
│   ├── scenarios/             # baseline, stress, spike, endurance
│   └── results/               # raw per-language JSON
├── benchmark.yaml             # per-project benchmark config (images, ports, scenarios)
├── AGENTS.md                  # per-project agent conventions
└── PROMOTE.md                 # promotion notes
```

Each implementation is independently buildable (own `go.mod` / `package.json` / `Cargo.toml` /
`Dockerfile`) and configured via environment variables.

## Example: Project 01 (Rate Limiter)

All three READMEs reference the same `docs/spec.md` and expose the same API (`GET /`, `GET /status`,
`X-RateLimit-*` headers, `429 + Retry-After`). Spec defaults: capacity 10, refill 2 tokens/sec, lazy
refill `tokens = min(C, last + (now−last)·r)`. Ports: Go 8080, Node 8081, Rust 8082.

| Language | Path | Stack | Test command |
| --- | --- | --- | --- |
| Go | `01_rate_limiter/go-impl/` | stdlib `net/http` + `log/slog` | `go test -race -cover ./...` |
| Node/TS | `01_rate_limiter/node-impl/` | Express + zod + pino; Vitest; Stryker | `npm test`; `npm run test:mutation` |
| Rust | `01_rate_limiter/rust-impl/` | `axum` + `tokio` + `thiserror` + `tracing` | `cargo test` (+ `cargo clippy`) |

## How executable evidence works

1. **Tests + coverage** — per-language commands above; target ≥ 80% per package (matches the learner
   empirical gate).
2. **Mutation testing** — `docs/mutation_gate.md` proves the suite catches faults, not just executes
   lines (Project 01: Stryker, 373 mutants, 71.05% score, ≥ 60% break threshold). Owner: the verifier
   (`Prometor`). It documents its scope boundary explicitly: it does **not** unblock the learning gate
   and does **not** mark the unit `mastered` — only the learner's evaluated diagnostic attempt flips
   the gate.
3. **Benchmarks (N ≥ 3)** — `benchmark.yaml` configures docker images, ports, and the four scenarios
   `[baseline, stress, spike, endurance]`, consumed by `curriculum/_shared/benchmarks/runner.py`. The
   benchmark rule: ≥ 10 samples + warmup; block speed claims when CV ≥ 20%. Project 01's `status.md`
   honestly flags noisy scenarios (CV > 20%) as "needs re-run."
4. **Polyglot Arena prediction gate** — `_shared/arena/gate.py` keeps `arena_report.md` at
   `gate: locked` until the learner commits a per-metric prediction (latency / memory / throughput)
   for all three languages; only then does it reveal a guess-vs-actual table. Predictions are
   append-only in `learner/predictions.yaml` (ADR-002 / ADR-004).
5. **Fairness rubric** — `_shared/arena/effort_budget_rubric.md`: the arena compares languages, not
   agent effort. A `fairness-auditor` checks each implementation (same algorithm class, idiomatic
   stdlib first, no hand-tuned micro-optimizations, equal build posture) before benchmarking; any flag
   blocks the benchmark stage (ADR-005).

## How the curriculum connects to the learning gate

Each project's `docs/diagnostic.md` is the learning-gate challenge. The learner writes an attempt at
`learner/attempts/<unit_id>-attempt-<N>.md` (tasks: Test Design, Algorithm Sketch, Code-Reading Risk
Scan, Review Judgment). The `sonda` agent grades it and either keeps the gate blocked
(`retry_count++`) or sets `implementation_blocked: false`. **A unit never reaches `mastered` from a
diagnostic** — `mastered` requires Phase-2 verifier executable evidence. Project 01's code was
pre-filled outside the Ágora flow, so nothing is `mastered` yet (see [Learner substrate](08_learner_substrate.md)).

## Shared utilities

`curriculum/_shared/` holds cross-project Python: the arena (`gate.py`, rubric), the benchmark runner,
contracts, and `project_template/` (the canonical skeleton for a new project). `curriculum/__init__.py`
makes it importable as `curriculum._shared.*`. The per-project completion checklist lives at
`engines/codexDojo/ecosystem/templates/project-package.md`.

> **Doc note:** there is no `curriculum/CONTEXT.md`. The overview/contract content lives in
> `catalog.md` + `curriculum/AGENTS.md`.
