# Status — Project 10 · Distributed Cache

| Field | Value |
| --- | --- |
| Project | `10_distributed_cache` |
| Phase | `cycle-complete` |
| Updated | 2026-06-18 |
| Reviewed inputs | `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/` |
| Deliverables added | `docs/code_review.md`, `docs/evolution_report.md`, `docs/status.md` |

## Cycle Summary

The cycle is complete for documentation purposes: each language has a working, tested local cache implementation and this review/status/evolution set records the cross-language state. The implementations satisfy many local cache mechanics from the spec: HTTP-style API shape, TTL, idempotent delete, capacity eviction, LRU/LFU selection, virtual-node hashing, invalidation, metrics counters, cache-aside loading, write-through failure behavior, and singleflight coalescing.

The major remaining caveat is distributed completeness. Gossip membership, live/suspect/failed convergence, remote shard routing, node removal, and migration/failure behavior are not implemented as real multi-node behavior. Treat the project as cycle-complete with known distributed-systems gaps captured in the review.

## Acceptance Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Local cache API | Complete | GET/PUT/DELETE plus invalidation and metrics are implemented/tested. |
| TTL and eviction | Complete | LRU/LFU and expiry behavior exist in all languages. |
| Consistent hashing | Partial | Virtual-node ring exists; real owner routing/migration is absent. |
| Cache-aside/write-through | Partial | Happy path and write failure covered; loader timeout/cancellation is missing. |
| Gossip membership | Missing | No real gossip loop or liveness state. |
| Stampede prevention | Partial | Successful per-key coalescing exists; failure/timeout stress coverage is weak. |
| Observability | Partial | Counters exist; latency histograms and shard ownership metrics are minimal. |

## Remaining Multi-Node Gaps

| Gap | Status | Current Evidence | Next Step |
| --- | --- | --- | --- |
| Gossip membership | `planned` | No real gossip loop or liveness state | Implement gossip protocol with join/leave/suspect/failed states |
| Remote shard routing | `planned` | Virtual-node ring exists but no real owner routing | Add cross-node GET routing to owning shard |
| Node removal | `planned` | Not implemented | Implement graceful node departure and data migration |
| Data migration | `planned` | Not implemented | Implement rebalancing on membership change |
| Failure simulation | `planned` | Not implemented | Add chaos testing harness for node failure scenarios |

## Next Recommended Phase

Move to a distributed-correctness hardening pass before benchmarking language performance. Otherwise benchmark results will mostly compare local map/lock overhead rather than the spec's intended interaction between eviction, sharding, membership, and hot-key behavior.
