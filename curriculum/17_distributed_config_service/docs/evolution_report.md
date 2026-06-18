# Evolution Report — Distributed Configuration Service

## Summary

The three implementations converge on local in-memory configuration stores with versioned writes, simple watches, and feature flag evaluation. The next evolution is to make the distributed-system contract explicit: consensus log, committed apply path, ACL checks, audit records, watcher backpressure, and deterministic benchmark metrics.

## Go bottleneck and optimization

- **Identified bottleneck:** watcher notification happens while the global service write lock is held, and slow/full watcher channels silently drop events. Under watcher fan-out, writes can pay notification overhead or lose update observability.
- **Suggested optimization:** append committed events to a per-key event log while holding the mutation lock, then fan out from a separate notifier goroutine with bounded queues, delivery metrics, and explicit backpressure/close events.
- **Before benchmark placeholder:** p95 write latency and watch-notification p95 with 1,000 watchers — pending benchmark.
- **After benchmark placeholder:** p95 write latency and watch-notification p95 after async notifier split — pending benchmark.

## Rust bottleneck and optimization

- **Identified bottleneck:** all store, history, and flag state is protected by async `RwLock`s in one `AppState`; writes clone and broadcast full config values, and capstone modules are not separated.
- **Suggested optimization:** introduce immutable read snapshots for current config, a typed committed-log entry enum, and bounded per-watcher channels fed from an apply loop. This reduces lock hold time and prepares for consensus replay.
- **Before benchmark placeholder:** local read p95 and watch p95 under mixed write/watch load — pending benchmark.
- **After benchmark placeholder:** local read p95 and watch p95 with snapshot reads and apply-loop fan-out — pending benchmark.

## Node/TypeScript bottleneck and optimization

- **Identified bottleneck:** synchronous callback fan-out and JSON/history processing run on the event loop during `put`, so many watchers or large values can delay writes and reads.
- **Suggested optimization:** store compact committed event records, queue watcher delivery with bounded async batches, and expose event-loop delay plus watcher queue metrics. Move heavier history/audit serialization out of the immediate mutation callback.
- **Before benchmark placeholder:** event-loop delay, write p95, and notification p95 during watcher fan-out — pending benchmark.
- **After benchmark placeholder:** event-loop delay, write p95, and notification p95 after bounded async fan-out — pending benchmark.

## Next evolution target

Add a shared conceptual `ConsensusLog` abstraction in each language with `propose`, `commit`, `apply`, and `lastAppliedLogIndex`. Even a simplified three-node simulator would let the curriculum compare consensus overhead, fail-closed quorum behavior, and watch notification latency honestly.
