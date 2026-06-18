# Code Review — Mini Message Queue

## Scope

Reviewed `docs/spec.md` and the authored source in `go-impl`, `rust-impl`, and `node-impl`. Generated dependency/build output was not reviewed as source. This is a documentation-only review.

## Severity legend

- **Critical**: violates a core capstone guarantee or makes the implementation unsafe to treat as complete.
- **High**: materially misses functional requirements or important non-functional behavior.
- **Medium**: correct for the learning baseline but incomplete, inefficient, or under-specified.
- **Low**: polish, documentation, or test-depth issue.

## 1. Specification coverage

- **Critical — all languages:** accepted messages and committed offsets are in memory only, so FR-015/NFR-004 restart durability is not met. The Go, Rust, and Node implementations all acknowledge writes before any durable append or offset commit persistence exists.
- **High — all languages:** compaction for compacted topics is not implemented. `cleanupPolicy` is stored but no path retains latest values per key or preserves stable offset traversal after compaction.
- **High — all languages:** the implementations cover core topic creation, partition routing, append offsets, partition reads, consumer groups, explicit commits, replay within retention, metadata basics, and retention. That makes them good single-node mechanics exercises, but below the spec's durable log-system bar.
- **Medium — all languages:** structured errors exist, but the internal service errors and HTTP mappings are not fully aligned with every spec code (`committed_offset_no_longer_retained`, idempotent duplicate-create semantics, and detailed `details` objects are partial).

## 2. Correctness and edge cases

- **High — Rust:** `produce` rejects `serde_json::Value::Null`, while the spec explicitly allows `null` as a tombstone for compacted topics.
- **High — Node:** `produce` rejects falsy values (`null`, `false`, `0`, empty string), so valid JSON payloads can be incorrectly rejected. This is broader than the spec's empty-payload edge case.
- **Medium — all languages:** reads from offsets greater than `nextOffset` return an empty set with `nextOffset` equal to the requested offset. The spec explicitly mentions offset equal to `nextOffset`; larger offsets are semantically questionable and may deserve `offset_out_of_range`.
- **Medium — all languages:** consumer group fetch splits `limit` across partitions with `max(1, floor(limit / partitions))`, which can return more messages than the requested total limit when `limit < partition_count`.

## 3. Concurrency and partition assignment

- **Strong point — Go:** `Broker`, `Partition`, and `ConsumerGroup` use separate `sync.RWMutex` boundaries, so concurrent producers to different partitions avoid global lock contention after topic lookup.
- **Strong point — Rust:** each partition is an `Arc<RwLock<Partition>>`, making append serialization explicit and matching the spec's partition-level ordering model.
- **Tradeoff — Node:** the event loop makes individual broker operations atomic in-process, simplifying offset assignment, but this only holds while operations remain synchronous and CPU-light.
- **Medium — all languages:** partition assignment uses a simple custom hash and partition 0 as the no-key default. The behavior is documented in READMEs, but the hash is not stable across language implementations, so cross-language key routing differs.

## 4. Storage, retention, and durability

- **Critical — all languages:** there is no segment store, append log, fsync boundary, checkpoint, recovery path, or persisted consumer offset store.
- **Medium — Go/Node:** retention deletes from the front of a slice/array (`p.Messages = p.Messages[1:]`, `shift()`), which becomes O(n) per removed record and will dominate the hot append path under age or byte pressure.
- **Medium — Rust:** retention uses `Vec::remove(0)`, also O(n) per removal and likely worse under large retained logs.
- **Medium — all languages:** retention is triggered synchronously inside `Produce`, so cleanup work can block producers despite NFR-006 asking retention and compaction not to block the whole broker.

## 5. API and error behavior

- **Medium — Go:** the manual router accepts broad `/topics/*` and `/consumers/*` patterns; malformed paths can be routed to the wrong handler before returning an error.
- **Medium — Rust:** Axum routes are clearer, but invalid consumer groups map to `400` from `IntoResponse`; the spec's fetch/commit endpoints distinguish missing groups as `404`.
- **Medium — Node:** Express route mapping is straightforward and readable, but no runtime schema validation catches malformed request bodies before service logic.
- **Low — all languages:** metadata endpoints expose only a subset of the spec. Per-partition retained bytes and full consumer-group lag views are partial or ad hoc.

## 6. Tests and benchmark evidence

- **Strong point — Go:** the broker tests cover duplicate topic creation, explicit/key/default partition routing, monotonic offsets, retention, consumer redelivery, commits, lag, and concurrent produce.
- **Strong point — Rust:** async tests cover core broker behavior and concurrent produce with spawned tasks.
- **Strong point — Node:** unit and HTTP tests cover the main happy paths and some retention behavior.
- **High — all languages:** no restart tests prove durable accepted produces or offset commits, and no compaction tests cover compacted-topic semantics.
- **Medium — all languages:** benchmarks are either absent or skeletal; the spec's p95 latency and 100k msg/s throughput targets remain unverified.

## 7. Maintainability and observability

- **Medium — all languages:** broker logic is compact and readable, but storage, routing, retention, compaction, offset tracking, and metrics are not separated enough for the next capstone step.
- **Medium — all languages:** metrics required by NFR-008 are mostly absent. Lag can be computed, but append latency, read latency, throughput, retained bytes, and compaction duration are not instrumented.
- **Low — all languages:** READMEs are useful and accurately describe the in-memory ring-buffer model, but they should explicitly call out non-durable status to avoid overstating spec completion.

## Cross-language comparison

| Area | Go | Rust | Node/TypeScript |
| --- | --- | --- | --- |
| Partition model | Per-partition `sync.RWMutex` and slice log. | `Arc<RwLock<Partition>>` with async methods. | Plain partition objects on the single event loop. |
| Offset assignment | Serializes each partition append under lock. | Serializes each partition append under async write lock. | Synchronous append increments `nextOffset`. |
| Consumer groups | Mutable map with independent group lock. | Cloned group snapshots and write-locked commits. | `Map<number, number>` offsets on group object. |
| Retention | Age/byte cleanup in append path with front-slice deletion. | Age/byte cleanup in append path with `Vec::remove(0)`. | Age/byte cleanup in append path with `Array.shift()`. |
| API surface | Broad stdlib HTTP server; most endpoints present. | Typed Axum routes; clean async surface. | Express implementation; concise route handlers. |
| Main advantage | Best concurrency tests and explicit synchronization. | Strong ownership boundaries around shared state. | Simplest to inspect and fast to iterate. |
| Main gap | No durable log/commit store. | No durable log/commit store; `null` rejected. | No durable log/commit store; falsy payload rejection. |

## Overall assessment

All three implementations are credible in-memory single-node teaching baselines for partition assignment, offset tracking, and at-least-once consumer semantics. For a complex systems capstone, the largest missing pieces are durable storage/recovery, compaction, asynchronous retention, full metrics, and benchmark evidence. Go is the most test-rich, Rust has the cleanest typed async model, and Node is the most compact but has the most payload-validation risk.
