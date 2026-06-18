# Evolution Report — Project 14 Log Aggregator

> Cycle status: **cycle-complete**  
> Focus: ingestion/query bottlenecks and next optimizations per language

## System-Level Evolution Theme

The project currently behaves like a small in-memory log API. To become the specified log aggregator, it needs an ingestion pipeline: bounded intake, validation/deduplication, queueing/backpressure, indexing, segment storage, retention/compression, trace reconstruction, alerting, and operational metrics. The dominant bottleneck is linear scans over volatile arrays, not serialization throughput yet.

## Node/TypeScript

### Current Bottleneck

Node's bottleneck is event-loop pressure from synchronous parse/validation/storage/query work. Every query linearly scans the full in-memory array, ingestion uses Express JSON parsing without explicit size/batch limits, and retention is manual. Under bursty ingestion, old logs are silently shifted out of the array instead of returning backpressure.

### Optimization Path

1. Add request size and batch size limits before parsing or accepting logs.
2. Introduce an ingest queue with a configured depth; return `429 ingest_backpressure` when saturated.
3. Maintain indexes for level, service, correlation id, trace id, span id, searchable words, and selected structured attributes.
4. Move indexing and alert evaluation to batched async loops or workers so HTTP handlers stay responsive.
5. Add a dedupe map keyed by source identity plus `log_id`, with TTL/cap and conflict detection.

### Expected Result

Node becomes a strong JSON-ingestion baseline if it keeps the HTTP path short: parse, validate, enqueue, acknowledge. Query/index work should be decoupled enough to measure JSON parsing overhead separately from indexing latency.

## Go

### Current Bottleneck

Go's bottleneck is unused indexing and coarse store locking. It has a synchronized store and an index map, but queries ignore the index and scan all logs. The ring buffer silently evicts logs globally, so high-volume sources can erase lower-volume sources and invalidate the intended multi-source isolation lesson.

### Optimization Path

1. Route queries through intersected indexes, then fetch candidate log records by stable internal id.
2. Replace array-position indexes with immutable log ids or segment offsets so eviction does not corrupt index references.
3. Use bounded channels for ingest and indexing stages; expose queue depth and indexing lag.
4. Partition buffers or scheduling by source to prevent permanent starvation from a noisy producer.
5. Add retention/compression workers that operate on segments and record raw/compressed bytes.

### Expected Result

Go should become the throughput reference for the project: goroutine-owned pipeline stages, bounded channels, clear worker counts, and cheap index updates under sustained ingestion.

## Rust

### Current Bottleneck

Rust has no implementation, so there is no basis for comparing ownership models, async backpressure, or memory layout against Go and Node.

### Optimization Path

1. Add a Rust implementation with typed log envelopes, validation errors, and Axum endpoints matching the JSON contract.
2. Use bounded `tokio::mpsc` channels between ingest, store, index, retention, and alert workers.
3. Model indexes with stable record ids and segment ownership so compression cannot race query reads.
4. Use explicit enums for validation/query/storage errors and map them to contract error codes.
5. Add benchmarks that separate JSON parse, validation, enqueue, index update, and query stages.

### Expected Result

Rust should become the memory-layout and safety comparison point: more explicit ownership boundaries, lower accidental allocation, and strong consistency around segment compression/query overlap.

## Cross-Language Next Benchmark

Once each language has the same pipeline shape, benchmark:

- JSON ingest throughput for single logs and bounded batches;
- accepted-to-queryable freshness p95;
- selective indexed query p95;
- full-text query p95 over a fixed corpus;
- backpressure correctness under saturated queues;
- duplicate-id behavior and conflict detection;
- retention/compression lag and compression ratio.

Only after the JSON baseline is complete should protobuf ingestion be added for the catalog comparison question.
