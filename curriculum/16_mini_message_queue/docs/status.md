# Status — Mini Message Queue

## Phase

`cycle-complete`

## Implementation status

| Language | Path | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | done | In-memory broker with topics, partitions, consumer groups, retention, HTTP API, and tests. |
| Rust | `rust-impl/` | done | Async in-memory broker with Axum API, partition locks, retention, consumer groups, and tests. |
| Node/TypeScript | `node-impl/` | done | Express in-memory broker with topic/consumer endpoints, retention, and unit/integration tests. |

## Cycle notes

- Documentation review complete for all three implementations.
- Implementations should be treated as capstone baselines rather than production-complete brokers.
- Known next evidence needed: durability/restart tests, compaction tests, p95 latency benchmarks, and throughput benchmarks.

## Deliverables

- `docs/spec.md`: present.
- `docs/code_review.md`: present.
- `docs/evolution_report.md`: present.
- Go implementation: done.
- Rust implementation: done.
- Node/TypeScript implementation: done.
