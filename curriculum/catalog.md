# Curriculum Catalog — Canonical Project List

> **Source of truth** for the aidevschool curriculum. All engines, dashboards, and roadmaps
> MUST reference this file. Other documents that list projects (e.g. `docs/PROMPTS/IDEIAS/`,
> `engines/codexDojo/ecosystem/ROADMAP.md`) are derived and must stay aligned with this catalog.
>
> **Status:** Canonical · **Total projects:** 18 · **Implemented:** 1 (Project 01)

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

## Level 1 — Fundamentals

**Focus:** data structures, HTTP servers, error handling, basic concurrency.

### 01. Rate Limiter (Token Bucket)

| Field | Value |
|-------|-------|
| **Slug** | `01_rate_limiter` |
| **Status** | ✅ Implemented |
| **Concepts** | Token bucket algorithm, concurrency primitives, atomic refills, shared state |
| **Key question** | Go (goroutines + channels) vs Rust (tokio + Arc&lt;Mutex&gt;) vs Node (event loop + clusters) — which handles rate limiting best? |
| **Directory** | `01_rate_limiter/` |
| **Go coverage** | 99% (ratelimit) / 86% (main) |
| **Rust tests** | 19 pass, clippy clean |
| **Node coverage** | 91.86%, 40 tests |
| **Benchmark** | 4 scenarios × 3 langs × N=1 (needs N≥3 re-run) |
| **Dependencies** | None (entry point) |

### 02. Key-Value Store (in-memory)

| Field | Value |
|-------|-------|
| **Slug** | `02_key_value_store` |
| **Status** | 🔲 Not started |
| **Concepts** | Hash maps, CRUD API, TCP/HTTP, serialization, TTL expiration, snapshot/persistence basics |
| **Key question** | How does each language's map/dictionary implementation compare under concurrent read/write pressure? |
| **Directory** | `02_key_value_store/` |
| **Dependencies** | Project 01 (concurrency basics) |

### 03. URL Shortener

| Field | Value |
|-------|-------|
| **Slug** | `03_url_shortener` |
| **Status** | 🔲 Not started |
| **Concepts** | Hashing (base62, SHA-256 trunc), relational DB design, HTTP redirects (301/302), unique ID generation, analytics pipeline |
| **Key question** | How do ID generation strategies (snowflake, ULID, auto-increment) compare across languages for collision resistance and throughput? |
| **Directory** | `03_url_shortener/` |
| **Dependencies** | Project 02 (storage basics) |

---

## Level 2 — Concurrency and Performance

**Focus:** concurrency patterns, async I/O, thread safety.

### 04. Concurrent Task Queue

| Field | Value |
|-------|-------|
| **Slug** | `04_concurrent_task_queue` |
| **Status** | 🔲 Not started |
| **Concepts** | Worker pools, job scheduling, backpressure, priorities, timeouts, retry policies, dead-letter queues, idempotency |
| **Key question** | Which language's concurrency model delivers the best throughput for async job processing? |
| **Directory** | `04_concurrent_task_queue/` |
| **Dependencies** | Projects 01-03 |

### 05. WebSocket Chat Server

| Field | Value |
|-------|-------|
| **Slug** | `05_websocket_chat` |
| **Status** | 🔲 Not started |
| **Concepts** | WebSocket protocol, connection management, fan-out broadcasting, rooms, presence, heartbeats |
| **Key question** | How does each runtime handle 10k+ concurrent persistent connections? |
| **Directory** | `05_websocket_chat/` |
| **Dependencies** | Projects 01-03 |

### 06. File Upload/Processing Pipeline

| Field | Value |
|-------|-------|
| **Slug** | `06_file_upload_pipeline` |
| **Status** | 🔲 Not started |
| **Concepts** | Streaming I/O, chunked processing, multipart upload, memory management, parallel processing, bounded memory |
| **Key question** | How do streaming vs buffering approaches compare for large file handling? |
| **Directory** | `06_file_upload_pipeline/` |
| **Dependencies** | Projects 01-03 |

---

## Level 3 — Architecture and Design Patterns

**Focus:** Clean Architecture, design patterns, separation of concerns.

### 07. REST API with Auth

| Field | Value |
|-------|-------|
| **Slug** | `07_rest_api_auth` |
| **Status** | 🔲 Not started |
| **Concepts** | JWT (sign/verify), RBAC, middleware chains, layered architecture, dependency injection, input validation, versioning |
| **Key question** | How does auth middleware composition differ across frameworks in each language? |
| **Directory** | `07_rest_api_auth/` |
| **Dependencies** | Projects 04-06 |

### 08. Event-Driven Order System

| Field | Value |
|-------|-------|
| **Slug** | `08_event_driven_order_system` |
| **Status** | 🔲 Not started |
| **Concepts** | Pub/sub, event sourcing, eventual consistency, projections, sagas (orchestrated + choreographed), outbox pattern |
| **Key question** | How do event replay and projection rebuild times compare across language runtimes? |
| **Directory** | `08_event_driven_order_system/` |
| **Dependencies** | Projects 04-06 |

### 09. Plugin System

| Field | Value |
|-------|-------|
| **Slug** | `09_plugin_system` |
| **Status** | 🔲 Not started |
| **Concepts** | Dynamic loading, interfaces/traits, plugin lifecycle, sandboxing, WASM/FFI/JS sandboxing, API versioning |
| **Key question** | How does each language's FFI/WASM/dynamic-loading story compare for safe plugin isolation? |
| **Directory** | `09_plugin_system/` |
| **Dependencies** | Projects 04-06 |

---

## Level 4 — Scalability and Distribution

**Focus:** distributed systems, caching, load balancing, consensus.

### 10. Distributed Cache

| Field | Value |
|-------|-------|
| **Slug** | `10_distributed_cache` |
| **Status** | 🔲 Not started |
| **Concepts** | Cache invalidation, TTL, LRU/LFU eviction, consistent hashing, gossip protocol, cache-aside vs write-through, cache stampede prevention, sharding |
| **Key question** | How do eviction policies and sharding strategies interact under skewed access patterns? |
| **Directory** | `10_distributed_cache/` |
| **Dependencies** | Projects 07-09 |

### 11. Load Balancer

| Field | Value |
|-------|-------|
| **Slug** | `11_load_balancer` |
| **Status** | 🔲 Not started |
| **Concepts** | Reverse proxy, health checks, round-robin, least-connections, consistent hashing, TLS termination, sticky sessions, circuit breaker per backend |
| **Key question** | How does connection pooling and health-check frequency affect failover speed? |
| **Directory** | `11_load_balancer/` |
| **Dependencies** | Projects 07-09 |

### 12. Distributed Job Scheduler

| Field | Value |
|-------|-------|
| **Slug** | `12_distributed_job_scheduler` |
| **Status** | 🔲 Not started |
| **Concepts** | Leader election (Raft simplified), distributed locks, cron-like scheduling, fault tolerance, DAG dependencies, exponential backoff retry |
| **Key question** | How do leader election implementations compare in split-brain scenarios? |
| **Directory** | `12_distributed_job_scheduler/` |
| **Dependencies** | Projects 07-09 |

---

## Level 5 — Resilience and Observability

**Focus:** circuit breakers, retries, structured logging, metrics, tracing.

### 13. API Gateway with Circuit Breaker

| Field | Value |
|-------|-------|
| **Slug** | `13_api_gateway_circuit_breaker` |
| **Status** | 🔲 Not started |
| **Concepts** | Fault tolerance, circuit breaker states (closed/open/half-open), retry with exponential backoff + jitter, fallbacks, bulkheading, rate limit per tenant, request coalescing |
| **Key question** | How do circuit breaker recovery times compare across language concurrency models? |
| **Directory** | `13_api_gateway_circuit_breaker/` |
| **Dependencies** | Projects 10-12 |

### 14. Log Aggregator

| Field | Value |
|-------|-------|
| **Slug** | `14_log_aggregator` |
| **Status** | 🔲 Not started |
| **Concepts** | Structured logging (JSON), log levels, aggregation pipelines, compression, indexing, retention, distributed tracing (OpenTelemetry), correlation IDs |
| **Key question** | How does ingestion throughput compare for JSON vs protobuf log formats? |
| **Directory** | `14_log_aggregator/` |
| **Dependencies** | Projects 10-12 |

### 15. Metrics Collector & Dashboard

| Field | Value |
|-------|-------|
| **Slug** | `15_metrics_collector` |
| **Status** | 🔲 Not started |
| **Concepts** | Time-series data, counters/gauges/histograms, aggregation (sum/avg/p95), downsampling, retention, Prometheus-compatible format, alerting |
| **Key question** | How do histogram bucket strategies affect p99 accuracy across runtimes? |
| **Directory** | `15_metrics_collector/` |
| **Dependencies** | Projects 10-12 |

---

## Level 6 — Complex Systems

**Focus:** production-grade distributed systems, real-world complexity.

### 16. Mini Message Queue (like Kafka)

| Field | Value |
|-------|-------|
| **Slug** | `16_mini_message_queue` |
| **Status** | 🔲 Not started |
| **Concepts** | Topics, partitions, consumer groups, offsets, log-structured storage, replication, exactly-once semantics, log compaction |
| **Key question** | How do partition assignment and consumer rebalancing strategies affect throughput stability? |
| **Directory** | `16_mini_message_queue/` |
| **Dependencies** | Projects 13-15 |

### 17. Distributed Configuration Service

| Field | Value |
|-------|-------|
| **Slug** | `17_distributed_config_service` |
| **Status** | 🔲 Not started |
| **Concepts** | Consensus (Raft/Paxos simplified), watch/notify, versioning, linearizability, ACL per key, audit, rollback, multi-region replication, feature flags |
| **Key question** | How do watch-notification latency and consensus overhead compare? |
| **Directory** | `17_distributed_config_service/` |
| **Dependencies** | Projects 13-15 |

### 18. Search Engine

| Field | Value |
|-------|-------|
| **Slug** | `18_search_engine` |
| **Status** | 🔲 Not started |
| **Concepts** | Inverted indexes, tokenization, TF-IDF/BM25 ranking, query parsing, fuzzy search, autocomplete, incremental indexing, index persistence |
| **Key question** | How do inverted index build times and query latencies compare for different corpus sizes? |
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
