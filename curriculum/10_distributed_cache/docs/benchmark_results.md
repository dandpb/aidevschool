# Benchmark Results - Project 10: Distributed Cache

## Methodology

Benchmark evidence is collected per runtime with repeatable command lines and at least three samples before cross-runtime comparison. The target scenario set is:

1. Unit/runtime microbenchmarks for cache set/get/delete operations.
2. HTTP/API scenario load using `k6` or `autocannon` against cache endpoints.
3. Concurrency scenario for singleflight/cache-aside and write-through paths.
4. Eviction/invalidation scenario for LRU, LFU, TTL, ring mapping, and graceful shutdown.

Acceptance for comparable benchmark claims requires N >= 3 samples and coefficient of variation (CV) < 20%. This run used N=5 for Go. No Go `Benchmark*` functions were present, so Go benchmark execution fell back to verbose test timing as required. Service-level `k6`/`autocannon` scenarios remain pending and should be run without Docker unless a future task explicitly allows it.

## Environment

- OS/arch: macOS arm64
- Go: go1.26.4 darwin/arm64
- Working directory: `curriculum/10_distributed_cache/go-impl/`
- Date: 2026-06-18

## Go Results

### Benchmark command

Command:

```bash
go test -bench=. -benchmem -count=5 ./... 2>&1
```

Result: no `Benchmark*` rows were emitted; tests passed.

```text
PASS
ok  distributedcache  3.457s
?   distributedcache/cmd/server  [no test files]
```

### Fallback verbose timing command

Command:

```bash
go test -count=5 -v ./... 2>&1
```

Result: tests passed across five repetitions.

```text
PASS
ok  distributedcache  1.939s
?   distributedcache/cmd/server  [no test files]
```

Selected real test timings observed in the verbose output:

| Test | Observed timings |
| --- | --- |
| `TestSetGetDeleteTTLAndInvalidation` | 0.04s, 0.04s, 0.04s, 0.04s, 0.04s |
| `TestLRUAndLFUEviction` | 0.00s |
| `TestConsistentHashingRemapsBoundedSubset` | 0.00s |
| `TestCacheAsideSingleflightWriteThroughAndCapacityErrors` | 0.02s, 0.03s, 0.03s, 0.02s, 0.02s |
| `TestHTTPHealthMetricsAndGracefulShutdown` | 0.00s, 0.01s, 0.00s, 0.00s, 0.00s |
| `TestValidationRingAndInvalidationHTTPEdges` | 0.00s |

## Rust Results

Pending execution. No Rust benchmark/test numbers were collected in this run.

## Node Results

Pending execution. No Node benchmark/test numbers were collected in this run.

## Analysis and Recommendations

The Go implementation passes its N=5 fallback run. TTL/invalidation and cache-aside/singleflight paths are the measurable unit-test scenarios, while eviction, hashing, and validation tests complete below visible timer resolution.

Recommended next steps: add Go benchmarks for hot-key get/set, cache-aside miss coalescing, eviction pressure, and consistent-hash remapping; then run HTTP cache load with `k6` or `autocannon` using N >= 3 and CV < 20% before comparing with Rust or Node.
