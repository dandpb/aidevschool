# Evolution Report — Project 10 · Distributed Cache

> Scope: one bottleneck and one optimization path per language, grounded in the reviewed implementation.  
> No source code was modified for this report.

## Go

### Bottleneck

The Go implementation uses a single cache-level lock for entries, metrics, and singleflight registration. This makes correctness easy to inspect, but independent hot keys serialize through the same mutex and remote-shard behavior is not present to hide or distribute that contention.

### Optimization

Split state into sharded entry locks keyed by the same hash-ring hash, while keeping a separate small mutex for the `flights` map. This preserves deterministic LRU/LFU behavior inside a shard, reduces multi-key contention, and creates a natural seam for future owner-enforced shard routing.

## Rust

### Bottleneck

The most serious bottleneck is the singleflight failure path, not raw speed: a successful loader followed by a failed cache `set()` can return early before notifying `Condvar` waiters. That can turn one oversized loaded value into a permanent waiter deadlock.

### Optimization

Guard the producer path with a completion helper/drop guard that always writes a terminal `Result` and calls `notify_all`, then store cache population failures as the shared terminal result. After that correctness fix, shard the `State` mutex by key so independent keys do not block each other.

## Node/TypeScript

### Bottleneck

Eviction does a full array materialization and sort every time capacity is exceeded. That is readable and deterministic for tests, but under churn it makes eviction cost grow with the whole cache instead of with the victim set.

### Optimization

Maintain policy-specific metadata incrementally: for LRU, a doubly-linked recency list or ordered Map discipline; for LFU, frequency buckets with recency tie-breakers. Keep the existing deterministic tie-breaker tests, but make victim selection O(1) or O(log n) instead of O(n log n).

## Cross-Language Evolution Note

Before optimizing micro-latency, each language should add a minimal liveness/routing layer so benchmarks can separate local hits, remote hits, owner-unavailable misses, and loader-backed misses. Without that, optimization work risks improving a single-node cache rather than the distributed cache described by the spec.
