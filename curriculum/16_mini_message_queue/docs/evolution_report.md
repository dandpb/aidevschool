# Evolution Report — Mini Message Queue

## Summary

The three implementations converge on the same learning architecture: an in-memory Kafka-like broker with partition-local offsets, deterministic key routing, consumer-group committed offsets, and synchronous retention. The next evolution should move the broker from a correct in-memory model toward a benchmarkable log system with durable segment storage and non-blocking cleanup.

## Go bottleneck and optimization

- **Identified bottleneck:** retention removes old messages by repeatedly slicing the front of `[]Message` and recalculating retained bytes during append. Under retention pressure, producer latency includes cleanup work and can become proportional to expired-record count.
- **Suggested optimization:** replace the plain slice with segment files or an in-memory ring/deque abstraction that advances a head pointer and accounts bytes incrementally. Run retention in a background worker per topic/partition.
- **Before benchmark placeholder:** p95 produce latency under retention pressure — pending benchmark.
- **After benchmark placeholder:** p95 produce latency after segmented/head-pointer retention — pending benchmark.

## Rust bottleneck and optimization

- **Identified bottleneck:** `Vec::remove(0)` in retention shifts the entire retained log for every deleted message, and it runs while the partition write lock is held.
- **Suggested optimization:** use `VecDeque` for the in-memory baseline or introduce append-only segments with compact metadata. Keep the write lock only for offset/accounting state changes and move cleanup scanning outside the hot append path where possible.
- **Before benchmark placeholder:** append throughput with expired-record cleanup — pending benchmark.
- **After benchmark placeholder:** append throughput after deque/segment retention — pending benchmark.

## Node/TypeScript bottleneck and optimization

- **Identified bottleneck:** `Array.shift()` and repeated `JSON.stringify` byte accounting execute synchronously on the event loop during `produce`, so retention can block both producers and consumers.
- **Suggested optimization:** maintain per-message encoded byte length, replace `shift()` with a head index or deque, and schedule retention in bounded batches with `setImmediate`/worker coordination so event-loop stalls are visible and capped.
- **Before benchmark placeholder:** event-loop delay and p95 produce latency during retention — pending benchmark.
- **After benchmark placeholder:** event-loop delay and p95 produce latency after batched retention — pending benchmark.

## Next evolution target

Introduce a durable partition-log abstraction shared conceptually across languages: append segment, flush boundary, read cursor, retained head, and compacted view. That abstraction unlocks restart verification, compaction correctness, and fair cross-language throughput comparisons.
