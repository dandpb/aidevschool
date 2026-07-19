# Curriculum Catalog — Canonical Project List

> **Source of truth** for the aidevschool curriculum. All engines, dashboards, and roadmaps
> MUST reference this file. Other documents that list projects (e.g. `docs/PROMPTS/IDEIAS/`,
> `engines/codexDojo/ecosystem/ROADMAP.md`) are derived and must stay aligned with this catalog.
>
> **Status:** Canonical · **Total projects:** 19 (00–18) · **Implemented:** 2 (Project 01, Project 02 — both Node.js-only certifications; the status and caveats below are authoritative)
>
> `BACKLOG_STATUS.md` is a generated projection of this catalog. Edit status here, then run
> `python3 -m learner.substrate`; never edit the generated backlog directly.

---

## Overview

The curriculum follows a **6-level progression** from fundamentals to complex distributed
systems. Each project is implemented **polyglot** (Go, Rust, Node.js/TypeScript) to teach
comparative engineering through real benchmarks, code reviews, and evolution reports.

Every project follows the same lifecycle:
```
spec → polyglot implementation → code review → benchmark (N≥3) → evolution → verify
```

---

## Level 0 — AI na Prática (entrada não-técnica)

**Focus:** aplicar IA no dia a dia com verificação honesta — para pessoas não tecnológicas.
Trilha da visão dual-audience (AD-004/AD-005); unidades usam o gate no-code (AD-006), nunca o
gate de código. Superfície de exploração associada: `engines/miniTown/`.

### 00. AI na Prática

| Field | Value |
|-------|-------|
| **Slug** | `00_ai_in_practice` |
| **Status** | planned |
| **Concepts** | Pedir bem à IA (contrato do pedido), verificar o que a IA entrega, desconfiança produtiva, aplicar no próprio dia a dia |
| **Key question** | Uma pessoa não-técnica consegue usar IA com critério — e provar que verificou — sem escrever código? |
| **Learning goal** | Aplicar IA em tarefas reais com checklist de verificação falsificável (gate no-code). |
| **Directory** | `00_ai_in_practice/` |
| **Dependencies** | None (entry point da trilha não-técnica; paralelo ao 01) |

---

## Level 1 — Fundamentals

**Focus:** data structures, HTTP servers, error handling, basic concurrency.

### 01. Rate Limiter (Token Bucket)

| Field | Value |
|-------|-------|
| **Slug** | `01_rate_limiter` |
| **Status** | ✅ Implemented |
| **Evidence** | Six executable evidence groups cover the spec, Go/Rust/Node implementations and tests, review, benchmark, evolution, and verifier gate. Certification caveat: benchmark and optimization are Node.js-only execution-verified in this sandbox; Go and Rust are code-reviewed/proposed-only for those phases, not performance-parity certified. |
| **Concepts** | Token bucket algorithm, concurrency primitives, atomic refills, shared state |
| **Key question** | Go (goroutines + channels) vs Rust (tokio + Arc&lt;Mutex&gt;) vs Node (event loop + clusters) — which handles rate limiting best? |
| **Learning goal** | Entender concorrência básica, estado compartilhado e refills atômicos. |
| **Directory** | `01_rate_limiter/` |
| **Go coverage** | ~85.9% (ratelimit) — Phase 2 result, not re-executed in this sandbox (no toolchain) |
| **Rust tests** | 14 unit + 6 integration — Phase 2 result, not re-executed in this sandbox (no toolchain) |
| **Node coverage** | 92.91%, 55 tests + 1 pre-existing `it.todo` (re-verified after Phase 5 optimization) |
| **Benchmark** | **Node.js only**, N=10, native harness (autocannon substitute for k6). Go/Rust not executed — toolchain unavailable in this sandbox, installation attempted and failed at the network layer (see `docs/benchmark_results.md` §1.3). Not a 3-language comparison. |
| **Evolution** | **Node.js only** — 1 optimization applied and measured (wired the dead `clientKeyStrategy.ts` abstraction into `index.ts`); honest result: small real regression (RPS −5.9%, avg latency +7.3%), not an improvement, reported as-is. Go/Rust: 2+1 optimizations proposed, code-reviewed, **not applied/measured** — no compiler available to verify. See `docs/evolution_report.md`. |
| **Dependencies** | None (entry point) |

### 02. Key-Value Store (in-memory)

| Field | Value |
|-------|-------|
| **Slug** | `02_key_value_store` |
| **Status** | Partially implemented (Node.js: gated & certified; Go/Rust: code exists, unverified) |
| **Evidence** | Node.js has executable spec, tests, review, benchmark, evolution, and verifier evidence. Certification caveat: this is Node.js-only; the Go and Rust directories came from an earlier ungated backfill and have not been compiled, tested, reviewed, or benchmarked in the certified cycle. |
| **Concepts** | Hash maps, CRUD API, TCP/HTTP, serialization, TTL expiration, snapshot/persistence basics |
| **Key question** | How does each language's map/dictionary implementation compare under concurrent read/write pressure? (unanswered this cycle — no cross-language data exists) |
| **Learning goal** | Comparar mapas e dicionários sob carga concorrente e persistência simples. |
| **Directory** | `02_key_value_store/` |
| **Go coverage** | Unverified — `go-impl/` exists from an earlier ungated backfill commit; not compiled, tested, reviewed, or benchmarked in this or any gated cycle. |
| **Rust tests** | Unverified — `rust-impl/` exists from the same earlier ungated backfill; not compiled, tested, reviewed, or benchmarked in this or any gated cycle. |
| **Node coverage** | 91.45% stmts / 82.01% branch / 100% funcs / 91.45% lines — 10/10 tests passing (re-verified this cycle after 3 Major bug fixes + regression tests; `tsc`/`eslint` clean) |
| **Benchmark** | **Node.js only**, N=10 + tolerance re-check PASS, native harness (autocannon substitute for k6, mixed GET/SET/DELETE/EXPIRE/TTL-read workload). Go/Rust not executed — out of scope this cycle by explicit repo-owner decision, not a toolchain failure. Not a 3-language comparison. |
| **Evolution** | **Node.js only** — 3 Major code-review bugs fixed (expire() key-validation bypass, UTF-16-vs-UTF-8 value-size check, insecure `0.0.0.0` default bind) with regression tests; 1 measured perf optimization applied (rate-limited `/health` expiry sweep) — honest result: a wash on the benchmarked workload (all deltas within measurement noise), reported as-is, not spun as an improvement; 1 optimization rejected (dropping the sweep entirely) with documented reasoning. See `docs/evolution_report.md`. |
| **Dependencies** | Project 01 (concurrency basics) |

### 03. URL Shortener

| Field | Value |
|-------|-------|
| **Slug** | `03_url_shortener` |
| **Status** | scaffolded |

| **Concepts** | Hashing (base62, SHA-256 trunc), relational DB design, HTTP redirects (301/302), unique ID generation, analytics pipeline |
| **Key question** | How do ID generation strategies (snowflake, ULID, auto-increment) compare across languages for collision resistance and throughput? |
| **Learning goal** | Explorar hashing, geração de IDs e redirecionamento seguro. |
| **Directory** | `03_url_shortener/` |
| **Dependencies** | Project 02 (storage basics) |

---

## Level 2 — Concurrency and Performance

**Focus:** concurrency patterns, async I/O, thread safety.

### 04. Concurrent Task Queue

| Field | Value |
|-------|-------|
| **Slug** | `04_concurrent_task_queue` |
| **Status** | scaffolded |

| **Concepts** | Worker pools, job scheduling, backpressure, priorities, timeouts, retry policies, dead-letter queues, idempotency |
| **Key question** | Which language's concurrency model delivers the best throughput for async job processing? |
| **Learning goal** | Orquestrar jobs concorrentes com prioridades e retry. |
| **Directory** | `04_concurrent_task_queue/` |
| **Dependencies** | Projects 01-03 |

### 05. WebSocket Chat Server

| Field | Value |
|-------|-------|
| **Slug** | `05_websocket_chat` |
| **Status** | scaffolded |

| **Concepts** | WebSocket protocol, connection management, fan-out broadcasting, rooms, presence, heartbeats |
| **Key question** | How does each runtime handle 10k+ concurrent persistent connections? |
| **Learning goal** | Gerir conexões persistentes e broadcast em escala. |
| **Directory** | `05_websocket_chat/` |
| **Dependencies** | Projects 01-03 |

### 06. File Upload/Processing Pipeline

| Field | Value |
|-------|-------|
| **Slug** | `06_file_upload_pipeline` |
| **Status** | scaffolded |

| **Concepts** | Streaming I/O, chunked processing, multipart upload, memory management, parallel processing, bounded memory |
| **Key question** | How do streaming vs buffering approaches compare for large file handling? |
| **Learning goal** | Processar uploads grandes sem estourar memória. |
| **Directory** | `06_file_upload_pipeline/` |
| **Dependencies** | Projects 01-03 |

---

## Level 3 — Architecture and Design Patterns

**Focus:** Clean Architecture, design patterns, separation of concerns.

### 07. REST API with Auth

| Field | Value |
|-------|-------|
| **Slug** | `07_rest_api_auth` |
| **Status** | scaffolded |

| **Concepts** | JWT (sign/verify), RBAC, middleware chains, layered architecture, dependency injection, input validation, versioning |
| **Key question** | How does auth middleware composition differ across frameworks in each language? |
| **Learning goal** | Separar identidade, sessão, autorização e versionamento. |
| **Directory** | `07_rest_api_auth/` |
| **Dependencies** | Projects 04-06 |

### 08. Event-Driven Order System

| Field | Value |
|-------|-------|
| **Slug** | `08_event_driven_order_system` |
| **Status** | scaffolded |

| **Concepts** | Pub/sub, event sourcing, eventual consistency, projections, sagas (orchestrated + choreographed), outbox pattern |
| **Key question** | How do event replay and projection rebuild times compare across language runtimes? |
| **Learning goal** | Estudar consistência eventual, sagas e replay. |
| **Directory** | `08_event_driven_order_system/` |
| **Dependencies** | Projects 04-06 |

### 09. Plugin System

| Field | Value |
|-------|-------|
| **Slug** | `09_plugin_system` |
| **Status** | scaffolded |

| **Concepts** | Dynamic loading, interfaces/traits, plugin lifecycle, sandboxing, WASM/FFI/JS sandboxing, API versioning |
| **Key question** | How does each language's FFI/WASM/dynamic-loading story compare for safe plugin isolation? |
| **Learning goal** | Comparar FFI, WASM e dynamic loading com isolamento. |
| **Directory** | `09_plugin_system/` |
| **Dependencies** | Projects 04-06 |

---

## Level 4 — Scalability and Distribution

**Focus:** distributed systems, caching, load balancing, consensus.

### 10. Distributed Cache

| Field | Value |
|-------|-------|
| **Slug** | `10_distributed_cache` |
| **Status** | scaffolded |

| **Concepts** | Cache invalidation, TTL, LRU/LFU eviction, consistent hashing, gossip protocol, cache-aside vs write-through, cache stampede prevention, sharding |
| **Key question** | How do eviction policies and sharding strategies interact under skewed access patterns? |
| **Learning goal** | Medir invalidação, TTL e proteção contra stampede. |
| **Directory** | `10_distributed_cache/` |
| **Dependencies** | Projects 07-09 |

### 11. Load Balancer

| Field | Value |
|-------|-------|
| **Slug** | `11_load_balancer` |
| **Status** | scaffolded |

| **Concepts** | Reverse proxy, health checks, round-robin, least-connections, consistent hashing, TLS termination, sticky sessions, circuit breaker per backend |
| **Key question** | How does connection pooling and health-check frequency affect failover speed? |
| **Learning goal** | Equilibrar tráfego e failover com critérios claros. |
| **Directory** | `11_load_balancer/` |
| **Dependencies** | Projects 07-09 |

### 12. Distributed Job Scheduler

| Field | Value |
|-------|-------|
| **Slug** | `12_distributed_job_scheduler` |
| **Status** | scaffolded |

| **Concepts** | Leader election (Raft simplified), distributed locks, cron-like scheduling, fault tolerance, DAG dependencies, exponential backoff retry |
| **Key question** | How do leader election implementations compare in split-brain scenarios? |
| **Learning goal** | Coordenar jobs distribuídos sem split-brain. |
| **Directory** | `12_distributed_job_scheduler/` |
| **Dependencies** | Projects 07-09 |

---

## Level 5 — Resilience and Observability

**Focus:** circuit breakers, retries, structured logging, metrics, tracing.

### 13. API Gateway with Circuit Breaker

| Field | Value |
|-------|-------|
| **Slug** | `13_api_gateway_circuit_breaker` |
| **Status** | scaffolded |

| **Concepts** | Fault tolerance, circuit breaker states (closed/open/half-open), retry with exponential backoff + jitter, fallbacks, bulkheading, rate limit per tenant, request coalescing |
| **Key question** | How do circuit breaker recovery times compare across language concurrency models? |
| **Learning goal** | Proteger serviços downstream contra falhas em cascata. |
| **Directory** | `13_api_gateway_circuit_breaker/` |
| **Dependencies** | Projects 10-12 |

### 14. Log Aggregator

| Field | Value |
|-------|-------|
| **Slug** | `14_log_aggregator` |
| **Status** | scaffolded |

| **Concepts** | Structured logging (JSON), log levels, aggregation pipelines, compression, indexing, retention, distributed tracing (OpenTelemetry), correlation IDs |
| **Key question** | How does ingestion throughput compare for JSON vs protobuf log formats? |
| **Learning goal** | Coletar, estruturar e consultar logs em grande volume. |
| **Directory** | `14_log_aggregator/` |
| **Dependencies** | Projects 10-12 |

### 15. Metrics Collector & Dashboard

| Field | Value |
|-------|-------|
| **Slug** | `15_metrics_collector` |
| **Status** | scaffolded |

| **Concepts** | Time-series data, counters/gauges/histograms, aggregation (sum/avg/p95), downsampling, retention, Prometheus-compatible format, alerting |
| **Key question** | How do histogram bucket strategies affect p99 accuracy across runtimes? |
| **Learning goal** | Modelar métricas, buckets e alertas com precisão. |
| **Directory** | `15_metrics_collector/` |
| **Dependencies** | Projects 10-12 |

---

## Level 6 — Complex Systems

**Focus:** production-grade distributed systems, real-world complexity.

### 16. Mini Message Queue (like Kafka)

| Field | Value |
|-------|-------|
| **Slug** | `16_mini_message_queue` |
| **Status** | scaffolded |

| **Concepts** | Topics, partitions, consumer groups, offsets, log-structured storage, replication, exactly-once semantics, log compaction |
| **Key question** | How do partition assignment and consumer rebalancing strategies affect throughput stability? |
| **Learning goal** | Entender partições, offsets e consumer groups. |
| **Directory** | `16_mini_message_queue/` |
| **Dependencies** | Projects 13-15 |

### 17. Distributed Configuration Service

| Field | Value |
|-------|-------|
| **Slug** | `17_distributed_config_service` |
| **Status** | scaffolded |

| **Concepts** | Consensus (Raft/Paxos simplified), watch/notify, versioning, linearizability, ACL per key, audit, rollback, multi-region replication, feature flags |
| **Key question** | How do watch-notification latency and consensus overhead compare? |
| **Learning goal** | Praticar consistência, ACLs e feature flags distribuídas. |
| **Directory** | `17_distributed_config_service/` |
| **Dependencies** | Projects 13-15 |

### 18. Search Engine

| Field | Value |
|-------|-------|
| **Slug** | `18_search_engine` |
| **Status** | scaffolded |

| **Concepts** | Inverted indexes, tokenization, TF-IDF/BM25 ranking, query parsing, fuzzy search, autocomplete, incremental indexing, index persistence |
| **Key question** | How do inverted index build times and query latencies compare for different corpus sizes? |
| **Learning goal** | Construir busca com tokenização, ranking e autocomplete. |
| **Directory** | `18_search_engine/` |
| **Dependencies** | Projects 13-15 |

---

## Concept Coverage Matrix

| Project | Concurrency | Networking | Persistence | Architecture | Scalability | Resilience |
|---------|:-----------:|:----------:|:-----------:|:------------:|:-----------:|:----------:|
| 01. Rate Limiter | ✅ | ✅ | — | — | — | — |
| 02. Key-Value Store | — | ✅ | ✅ | — | — | — |
| 03. URL Shortener | — | ✅ | ✅ | — | — | — |
| 04. Task Queue | ✅ | — | ✅ | — | — | ✅ |
| 05. WebSocket Chat | ✅ | ✅ | — | — | ✅ | — |
| 06. File Upload | ✅ | ✅ | ✅ | — | — | — |
| 07. REST API + Auth | — | ✅ | ✅ | ✅ | — | — |
| 08. Event-Driven | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 09. Plugin System | — | — | — | ✅ | — | — |
| 10. Distributed Cache | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11. Load Balancer | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| 12. Job Scheduler | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13. API Gateway + CB | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| 14. Log Aggregator | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 15. Metrics Collector | ✅ | ✅ | ✅ | — | ✅ | — |
| 16. Message Queue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17. Config Service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 18. Search Engine | ✅ | — | ✅ | ✅ | ✅ | — |

---

## Language Suitability Guide

| Language | Ideal Projects | Strengths |
|----------|---------------|-----------|
| **Go** | 01, 04, 05, 07, 10, 11, 13 | Fast compilation, goroutines, small binaries, excellent stdlib for networking |
| **Rust** | 01, 02, 06, 10, 16, 18 | Memory safety without GC, fearless concurrency, zero-cost abstractions, best raw performance |
| **Node/TS** | 05, 07, 08, 09, 14, 15 | Async-first, largest ecosystem, JSON-native, rapid prototyping, full-stack capable |

---

## Required Artifacts Per Project

Every project must produce:

| Artifact | Path | Owner |
|----------|------|-------|
| Specification | `docs/spec.md` | Curator |
| Go implementation | `go-impl/` | dev-go |
| Rust implementation | `rust-impl/` | dev-rust |
| Node implementation | `node-impl/` | dev-node |
| Code review | `docs/code_review.md` | Reviewer |
| Learning notes | `docs/learning_notes.md` | Reviewer |
| Benchmark results | `docs/benchmark_results.md` | Benchmarker |
| Raw benchmark data | `benchmarks/results/` | Benchmarker |
| Evolution report | `docs/evolution_report.md` | Optimizer |
| Pipeline status | `docs/status.md` | All (updated per phase) |

See `engines/codexDojo/ecosystem/templates/project-package.md` for the full completion checklist.

---

*This catalog is the canonical source of truth. Last updated: 2026-06-17.*
