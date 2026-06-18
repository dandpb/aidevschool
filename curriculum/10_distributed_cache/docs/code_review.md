# Code Review — Project 10 · Distributed Cache (Go · Rust · Node/TS)

> Inputs: `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/` source and tests.  
> Review focus: concurrency correctness, fault tolerance, distributed algorithms, and cross-language parity.  
> Severity scale: Critical, Major, Minor, Educational.

## Executive Summary

All three implementations deliver a useful local in-memory cache with TTL expiry, deterministic LRU/LFU eviction, virtual-node consistent hashing, key/prefix/namespace invalidation, write-through failure handling, metrics counters, and per-key singleflight/cache-aside tests. The main gap is that the distributed surface is mostly modeled, not implemented: there is ring inspection, but no gossip protocol, live/suspect/failed membership convergence, remote shard routing, migration handling, or unavailable-owner behavior.

| Implementation | Critical | Major | Minor | Educational |
| --- | ---: | ---: | ---: | ---: |
| Go | 0 | 4 | 3 | 1 |
| Rust | 1 | 4 | 2 | 1 |
| Node/TS | 0 | 4 | 3 | 1 |

## Security

- **[Major][All] Missing tenant-aware size/namespace controls beyond per-value limits.** Keys and namespaces are client-controlled, and prefix invalidation can delete broad ranges without authorization or namespace ownership checks. This is acceptable for a curriculum local service, but in a distributed cache it is a data-plane privilege boundary.
- **[Minor][Go/Rust] Error responses are coarse and sometimes misclassified.** Go maps loader errors to `502` for GET but negative TTL uses `ErrInvalidKey`; Rust maps most `HttpApp` errors to generic `400`. Stable machine-readable error codes exist only partially, which weakens safe client retry behavior.
- **[Minor][Node] `HttpApp` coerces missing PUT values to `""`.** `String(parsed.value ?? '')` makes malformed bodies store an empty value instead of rejecting missing `value`; empty values are valid, so malformed input becomes indistinguishable from an intentional empty cache write.

## Performance

- **[Major][All] No real remote-shard path, so cluster latency and hot-key behavior are unmeasured.** The ring owner is reported, but operations always hit local process memory. RF-007/RF-013 are only partially exercised; RNF-003 and hot-key shard-owner behavior cannot be evaluated.
- **[Minor][Go/Rust] Global cache mutex serializes independent keys.** Go protects entries, metrics, and flights partly with one `sync.RWMutex`; Rust protects entries/metrics with one `Mutex<State>`. Correct for small tests, but skewed or multi-key benchmarks will hit a single lock before the algorithmic cache behavior becomes visible.
- **[Minor][Node] Eviction sorts all entries on every eviction.** `evict()` materializes and sorts the full entry set. With large `capacityEntries`, capacity pressure becomes O(n log n) per victim instead of maintaining O(log n) or O(1) eviction metadata.

## Readability

- **[Minor][All] Distributed terminology overstates behavior.** README claims distributed cache traits, but the code mainly implements a single-node cache with hash-ring metadata. Naming should distinguish `LocalCacheWithRing`-style behavior from actual multi-node routing/gossip.
- **[Minor][Rust] `HttpApp::handle` encodes routing and parsing in a large match.** It is deterministic for tests, but request parsing, cache command dispatch, and response mapping are interleaved enough that future protocol changes will be hard to reason about.

## Maintainability

- **[Major][All] Gossip membership is not implemented.** RF-012/RNF-006 require gossip convergence with live/suspect/failed status. The `membershipChanges` metric exists, but there are no membership records, no incarnation conflict resolution, no failure timeout, and no gossip loop.
- **[Major][All] Ring changes do not migrate or proxy existing entries.** Adding a node changes `Owner(key)` for new lookups, but existing entries stay in the local map and GET does not enforce owner routing. This can report a new shard owner while serving data from the old node, hiding ownership drift.
- **[Minor][Go/Node] Ring has no removal/failure path.** `HashRing.Add` exists, but node removal is absent, so node-failure behavior and bounded remapping on removal cannot be tested.

## Idiomaticity

- **[Educational][Go] `context.Context` is accepted but only meaningful for loader/write-through waits.** Local cache methods receive `ctx`, but do not check it around lock waits or before expensive operations. This is common in Go APIs, but cancellation semantics should be documented.
- **[Critical][Rust] Singleflight producer can deadlock waiters if `set()` fails after a successful load.** In `load_singleflight`, the producer calls `self.set(...)?` before storing the flight result and notifying the condition variable. If `set` returns `ValueTooLarge` or another error, `?` exits without `notify_all`, leaving coalesced callers waiting forever.
- **[Educational][Node] Promise-based singleflight is clean and idiomatic.** The `finally` block removes failed promises from `inflight`, avoiding poisoned future loads, which directly matches the TypeScript note in the spec.

## Error Handling

- **[Major][All] No explicit `503 shard unavailable` path.** Owner resolution returns an owner even when there is no real remote node or liveness state. The spec requires unavailable shards to fail rather than silently route to arbitrary/local data.
- **[Major][Go] Singleflight waiters can observe stale or inconsistent terminal state ordering.** The producer deletes the flight, writes the cache, then closes `done`. That is mostly safe, but the result value/version returned by waiters is synthesized rather than read from the committed entry, so version/TTL metadata can diverge from actual cache state after replacement races.
- **[Major][Node] Loader timeouts/cancellation are absent.** The spec calls for timeout/cancellation with `504`; loaders can run indefinitely and all coalesced callers wait for the same unresolved promise.

## Testing

- **[Major][All] Tests cover local behavior, not distributed-system acceptance.** There are good unit tests for TTL, eviction, invalidation, consistent-hash add, write-through failure, and singleflight. Missing: gossip convergence, failed/suspect node routing, remote owner GET/SET/DELETE, removal remap bounds, prefix invalidation under concurrent writes, and loader timeout fanout.
- **[Minor][Go/Rust] No race/deadlock stress gate for singleflight failure paths.** Tests prove successful coalescing but not the error path where loaders fail, values are oversized, contexts are cancelled, or waiters time out.
- **[Minor][Node] HTTP tests use `HttpApp` rather than the real `node:http` server.** This keeps tests deterministic, but it misses request streaming, JSON parse exceptions crossing the server callback, and socket-level failure behavior.

## Recommended Next Fixes

1. Implement a minimal membership model (`alive`, `suspect`, `failed`, incarnation, ring version) before claiming distributed completion.
2. Add owner enforcement: local hit only when this node owns the key; otherwise proxy/return `503` in the current single-process curriculum mode.
3. Add singleflight failure/timeout tests in all languages, especially the Rust notification path.
4. Add removal/remapping tests and a benchmark that distinguishes local hits, remote hits, and loader-backed misses.
