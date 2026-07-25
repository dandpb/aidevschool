# Curriculum

**Path:** `curriculum/` · **Shared** across all engines (never duplicated). The canonical source of
truth is [`curriculum/catalog.md`](../../curriculum/catalog.md).

## What it is

The numbered catalog defines a Level 0 no-code AI-in-practice entry followed by
a six-level programming track. It owns the current entry count, project status,
and implementation-certification caveats; read
[`curriculum/catalog.md`](../../curriculum/catalog.md) instead of copying those
mutable facts here. The programming curriculum is Node-first today. Go and Rust
remain comparative paths only when a project has executable evidence for those
implementations; their presence must not be inferred from an empty directory or
a roadmap promise.

The shared curriculum also contains a separate
[`ai-literacy`](../../curriculum/ai-literacy/README.md) track of short pt-BR
lessons consumed by LiteracyDojo. Its own catalog owns the current count and
status. That lesson track does not duplicate Project 00 and is not counted as
additional numbered catalog projects.

> `catalog.md` is authoritative. Every engine, dashboard, and roadmap must reference it; other lists
> (`docs/PROMPTS/IDEIAS/`, `engines/codexDojo/ecosystem/ROADMAP.md`) are derived and must stay aligned.

Programming projects target the lifecycle `spec → implementation → code review
→ benchmark → evolution → verify`; claims of polyglot comparison require
evidence for every language compared.

## The numbered catalog

### Level 0 — AI in practice

| # | Slug | Focus |
| --- | --- | --- |
| 00 | `00_ai_in_practice` | Apply AI with a falsifiable no-code verification checklist. |

Its explore-only surface is [miniTown](11_engine_miniTown.md). Guided
micro-lessons currently live in the separate AI Literacy track and
[LiteracyDojo](12_engine_literacyDojo.md).

## The programming projects

### Level 1 — Fundamentals

| # | Slug | Title | Focus |
| --- | --- | --- | --- |
| 01 | `01_rate_limiter` | Rate Limiter (Token Bucket) | Atomic refills, shared concurrent state. |
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

The tree below is a **conceptual ecosystem target package** assembled from
current project conventions; it is not a literal scaffold or a claim that every
project contains every path. The current `_shared/project_template/` contains
only `docs/spec_template.md` and `docs/status_schema.md`. Project-local
documentation and package files are authoritative for the layout that exists
today.

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

Implementation layout varies by project. The Node track is the default gate;
Go and Rust are required only where the current project contract and evidence
say so. Read the local package before assuming a toolchain or command.

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

1. **Tests + coverage** — per-language commands above; the target comes from
   `⟨config: gates.cobertura_nucleo_min⟩` (the programming learner empirical gate).
2. **Mutation testing** — `docs/mutation_gate.md` proves the suite catches faults, not just executes
   lines (Project 01: Stryker, 373 mutants, 71.05% score, ≥ 60% break threshold). Owner: the verifier
   (`Prometor`). It documents its scope boundary explicitly: it does **not** unblock the learning gate
   and does **not** mark the unit `mastered` — only the learner's evaluated diagnostic attempt flips
   the gate.
3. **Benchmarks** — `benchmark.yaml` configures docker images, ports, and the four scenarios
   `[baseline, stress, spike, endurance]`, consumed by `curriculum/_shared/benchmarks/runner.py`. The
   benchmark rule uses `⟨config: galileu.samples_min⟩`, `⟨config: galileu.warmup_min⟩`, and
   `⟨config: galileu.cv_max_pct⟩`; unstable measurements block speed claims. Project 01's
   `status.md` records the observed noisy scenarios as "needs re-run."
4. **Polyglot Arena prediction gate** — `_shared/arena/gate.py` keeps `arena_report.md` at
   `gate: locked` until the learner commits a per-metric prediction (latency / memory / throughput)
   for all three languages; only then does it reveal a guess-vs-actual table. Predictions are
   append-only in `learner/predictions.yaml` (ADR-002 / ADR-004).
5. **Fairness rubric** — `_shared/arena/effort_budget_rubric.md`: the arena compares languages, not
   agent effort. A `fairness-auditor` checks each implementation (same algorithm class, idiomatic
   stdlib first, no hand-tuned micro-optimizations, equal build posture) before benchmarking; any flag
   blocks the benchmark stage (ADR-005).

## How the curriculum connects to the learning gate

For a programming project, `docs/diagnostic.md` is the pre-implementation
learning-gate challenge. The learner writes an attempt at
`learner/attempts/<unit_id>-attempt-<N>.md` (tasks such as Test Design,
Algorithm Sketch, Code-Reading Risk Scan, and Review Judgment). The `sonda`
agent grades it and either keeps implementation blocked or sets
`implementation_blocked: false`. **A programming unit never reaches `mastered`
from that diagnostic**; after implementation it requires verifier-backed
executable evidence.

Project 00 is specified to follow a separate Level 0 branch: the learner
attempts a no-code application task, and independent verification applies the
falsifiable
[ADR-0004 checklist](../design/adr/0004-no-code-empirical-gate.md). That branch
is not yet represented by the current learner-substrate schema, so local
completion cannot be promoted to `mastered` today. In both branches, the
current learner answer lives in `learner/learning_state.yaml`; project files
alone do not prove learner mastery (see
[Learner substrate](08_learner_substrate.md)).

## Shared utilities

`curriculum/_shared/` holds cross-project Python: the arena (`gate.py`, rubric), the benchmark runner,
contracts, and `project_template/` (a starting skeleton for a new project).
`curriculum/__init__.py` makes it importable as `curriculum._shared.*`.
Per-project completion evidence belongs in that project's local contract.

> **Domain language:** [`curriculum/CONTEXT.md`](../../curriculum/CONTEXT.md)
> defines the bounded-context vocabulary. `catalog.md` remains the data source
> of truth, and `curriculum/AGENTS.md` owns contribution rules.
