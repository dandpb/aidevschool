# Evolution Report — Project 08 Event-Driven Order System

## Current architecture baseline

All three implementations use the same teaching architecture: command handlers fold prior events, append an immutable event plus outbox record, publish pending outbox entries, update projections, run a fulfillment saga, and expose replay/health/read APIs. The cross-language comparison is fair because the behavior is intentionally aligned.

## Node/TypeScript

**Bottleneck:** `publishOutbox()` runs synchronously after every append and finds events with an array scan. Event storage, outbox state, projection state, and saga orchestration live in one `OrderService`, which keeps the teaching surface compact but couples write latency to all downstream work.

**Optimization path:** Extract `EventStore`, `OutboxPublisher`, `ProjectionWorker`, and `SagaOrchestrator` interfaces. Replace arrays with indexed maps for event lookup and a durable adapter such as SQLite/Postgres. Run bounded async publisher/projection/saga loops with batch size and interval controls so append latency can be measured independently from projection lag.

## Go

**Bottleneck:** The architecture has good component names, but most implementation lives in `order.go`. A single mutex protects store operations, and `PublishOutbox()` is still called inline after appends, so the Go version does not yet exploit goroutine-based worker separation.

**Optimization path:** Split `order.go` into aggregate, store, outbox, projection, saga, and HTTP files. Move publisher/projection/saga work into goroutines driven by bounded channels and `context.Context` cancellation. Keep append plus outbox insert under one durable transaction, then let workers poll pending records in batches with backoff and race-tested shutdown.

## Rust

**Bottleneck:** Rust has the strongest enum modeling, but `AppState` centers on one `Arc<Mutex<Inner>>`. The HTTP layer is async, yet core event append, projection update, and saga reactions are synchronous state mutations protected by the same lock.

**Optimization path:** Introduce repository traits for event store/outbox/projections and keep locks out of async boundaries. Use `tokio` tasks for publisher, projection, and saga workers; pass events through bounded channels; persist checkpoints explicitly. Split the large `lib.rs` into domain, store, workers, and HTTP modules while preserving the typed event model.

## Cross-language optimization priorities

1. Replace in-memory event/outbox/projection state with a durable local store.
2. Decouple command append latency from publication, projection, and saga execution.
3. Add replay and projection-lag benchmarks for 100,000 events.
4. Add crash-recovery tests for append-before-publish and publish-before-mark-published cases.
5. Keep payload schema handling explicit so old event versions can replay safely.

## Expected outcome after evolution

The next cycle should turn this from a pattern-complete teaching implementation into a durability-and-performance comparison: Go should demonstrate worker/backpressure ergonomics, Rust should demonstrate typed async boundaries, and Node should demonstrate careful async orchestration without unbounded promise fan-out.
