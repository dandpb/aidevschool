# codexDojo Roadmap

> **Canonical source:** `curriculum/catalog.md` (18 projects, 6 levels).
> This file is the product-facing summary. For full project details, concepts, dependencies,
> and status, always reference `curriculum/catalog.md`.

> **Implementation status**: This roadmap is a derived product summary. For actual implementation status of each project, see [curriculum/BACKLOG_STATUS.md](../../../curriculum/BACKLOG_STATUS.md).

## 18-Project Curriculum

The curriculum follows a 6-level progression. Each project is implemented polyglot
(Go, Rust, Node.js/TypeScript) with full benchmarks, code reviews, and evolution reports.

### Level 1 — Fundamentals

| # | Project | Main learning goal | Languages | Status |
| --- | --- | --- | --- | --- |
| 01 | Rate Limiter (Token Bucket) | Concurrency primitives, atomic refills, shared state | Go, Rust, Node | ✅ Implemented |
| 02 | Key-Value Store (in-memory) | Hash maps, CRUD API, serialization, TTL | Go, Rust, Node | 🔲 Not started |
| 03 | URL Shortener | Hashing, DB design, HTTP redirects, analytics | Go, Rust, Node | 🔲 Not started |

### Level 2 — Concurrency and Performance

| # | Project | Main learning goal | Languages | Status |
| --- | --- | --- | --- | --- |
| 04 | Concurrent Task Queue | Worker pools, backpressure, retry, DLQ, idempotency | Go, Rust, Node | 🔲 Not started |
| 05 | WebSocket Chat Server | Persistent connections, broadcast, rooms, heartbeats | Go, Rust, Node | 🔲 Not started |
| 06 | File Upload/Processing Pipeline | Streaming I/O, chunked processing, memory management | Go, Rust, Node | 🔲 Not started |

### Level 3 — Architecture and Design Patterns

| # | Project | Main learning goal | Languages | Status |
| --- | --- | --- | --- | --- |
| 07 | REST API with Auth | JWT, RBAC, middleware, DI, layered architecture | Go, Rust, Node | 🔲 Not started |
| 08 | Event-Driven Order System | Pub/sub, event sourcing, projections, sagas | Go, Rust, Node | 🔲 Not started |
| 09 | Plugin System | Dynamic loading, interfaces, sandboxing, WASM/FFI | Go, Rust, Node | 🔲 Not started |

### Level 4 — Scalability and Distribution

| # | Project | Main learning goal | Languages | Status |
| --- | --- | --- | --- | --- |
| 10 | Distributed Cache | Invalidation, TTL, LRU/LFU, consistent hashing, gossip | Go, Rust, Node | 🔲 Not started |
| 11 | Load Balancer | Reverse proxy, health checks, failover, TLS termination | Go, Rust, Node | 🔲 Not started |
| 12 | Distributed Job Scheduler | Leader election, distributed locks, DAG dependencies | Go, Rust, Node | 🔲 Not started |

### Level 5 — Resilience and Observability

| # | Project | Main learning goal | Languages | Status |
| --- | --- | --- | --- | --- |
| 13 | API Gateway with Circuit Breaker | Fault tolerance, bulkheading, retry+backoff, fallbacks | Go, Rust, Node | 🔲 Not started |
| 14 | Log Aggregator | Structured logging, aggregation, tracing, correlation | Go, Rust, Node | 🔲 Not started |
| 15 | Metrics Collector & Dashboard | Time-series, counters/gauges/histograms, alerting | Go, Rust, Node | 🔲 Not started |

### Level 6 — Complex Systems

| # | Project | Main learning goal | Languages | Status |
| --- | --- | --- | --- | --- |
| 16 | Mini Message Queue (like Kafka) | Topics, partitions, consumer groups, offsets, replication | Go, Rust, Node | 🔲 Not started |
| 17 | Distributed Configuration Service | Consensus, watch/notify, versioning, ACLs, feature flags | Go, Rust, Node | 🔲 Not started |
| 18 | Search Engine | Inverted indexes, tokenization, TF-IDF/BM25, ranking | Go, Rust, Node | 🔲 Not started |

## Project Package Structure

```text
curriculum/NN_project_name/
  docs/
    spec.md              # Requirements, architecture, API contracts
    status.md            # Pipeline state
    code_review.md       # 7-category review
    learning_notes.md    # Pedagogical insights
    benchmark_results.md # 4 scenarios × 3 langs × N≥3
    evolution_report.md  # Optimization before/after
  go-impl/               # Idiomatic Go implementation
    cmd/
    internal/
    Dockerfile
    go.mod
    README.md
  rust-impl/             # Idiomatic Rust implementation
    src/
    tests/
    Dockerfile
    Cargo.toml
    README.md
  node-impl/             # Idiomatic Node/TS implementation
    src/
    tests/
    Dockerfile
    package.json
    tsconfig.json
    README.md
  benchmarks/
    scripts/
    results/
```

## Increment Rule

Each project adds only one main dimension of complexity:

- **Level 1→2:** Single-process → multi-connection concurrency
- **Level 2→3:** Concurrent → architectural patterns (layers, DI, events)
- **Level 3→4:** Single-node → distributed (sharding, consensus, replication)
- **Level 4→5:** Functional → resilient (circuit breakers, observability)
- **Level 5→6:** Component → system (message queues, config services, search engines)

## Completion Standard

See `engines/codexDojo/ecosystem/templates/project-package.md` for the full completion checklist.
A project is NOT complete until: spec ✓, 3 implementations ✓ (≥80% coverage each),
code review ✓, benchmarks N≥3 ✓, evolution report ✓, verifier PASS ✓.
