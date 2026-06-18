# Evolution Report: Project 03 URL Shortener

## Summary

Project 03 now demonstrates the same URL-shortening contract in Go, Rust, and Node. The next evolution should separate two concerns: first add or explicitly defer durable storage, then benchmark redirect/list/statistics paths.

## Language Bottlenecks

### Go

- **Identified bottleneck**: Listing URLs uses whole-store locking plus full collection sorting.
- **Why it matters**: Redirects may stay fast, but management endpoints can degrade sharply as the number of short URLs grows.

### Rust

- **Identified bottleneck**: A single global mutex protects URLs, clicks, and rate-limit state.
- **Why it matters**: Rust makes safe concurrency possible, but a coarse lock hides those benefits under mixed redirect and analytics load.

### Node

- **Identified bottleneck**: The analytics queue is unbounded and drains on the event loop.
- **Why it matters**: A burst of redirects can turn analytics bookkeeping into memory pressure and responsiveness loss.

## Suggested Optimization

Add benchmark and durability evidence before optimizing internals:

- Go: maintain an ordered index or cursor structure so `/urls` does not repeatedly sort the entire map.
- Rust: split hot state into smaller locks or sharded structures; keep analytics updates off the main URL lock.
- Node: bound and batch the analytics queue, then track list ordering incrementally.

## Before / After Placeholder

Benchmarks pending.

| Language | Before | After |
| --- | --- | --- |
| Go | Pending benchmark of current full-sort list path. | Pending benchmark after ordered-index/cursor optimization. |
| Rust | Pending benchmark of current global-mutex state. | Pending benchmark after lock splitting or sharding. |
| Node | Pending benchmark of current unbounded analytics queue. | Pending benchmark after bounded/batched analytics. |
