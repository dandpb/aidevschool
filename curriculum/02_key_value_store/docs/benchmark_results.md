# Benchmark Results: 02 Key Value Store

## Methodology

Go measurements were collected from `curriculum/02_key_value_store/go-impl/` on macOS arm64 with Go 1.26.4. The benchmark command was run first with `go test -bench=. -benchmem -count=5 ./... 2>&1`. No `Benchmark*` functions were present, so the fallback command `go test -count=5 -v ./... 2>&1` was run and its package/test timings are recorded below.

The shared load-test methodology covers four scenarios:

| Scenario | Intended tool | Purpose |
| --- | --- | --- |
| Baseline | k6 + autocannon | Establish steady-state latency and throughput at normal concurrency. |
| Stress | k6 + autocannon | Increase load until saturation to identify bottlenecks and error thresholds. |
| Spike | k6 + autocannon | Apply sudden traffic bursts to observe recovery and queueing behavior. |
| Endurance | k6 + autocannon | Run sustained traffic to detect memory growth, leaks, and latency drift. |

Full Docker-based load tests with k6 are configured per the shared benchmark harness at curriculum/_shared/benchmarks/. Execute in a dedicated benchmarking environment for reproducible p50/p95/p99 latency data.

## Go Benchmark Data

| Command | Package/Test | Samples | Result |
| --- | --- | ---: | --- |
| `go test -bench=. -benchmem -count=5 ./...` | `key-value-store-go/cmd/kvstore` | 1 package report | `[no test files]` |
| `go test -bench=. -benchmem -count=5 ./...` | `key-value-store-go/internal/kvstore` | 5 test iterations, no benchmark rows | `ok ... 3.554s` |
| `go test -count=5 -v ./...` | `key-value-store-go/cmd/kvstore` | 1 package report | `[no test files]` |
| `go test -count=5 -v ./...` | `key-value-store-go/internal/kvstore` | 5 test iterations | `ok ... 0.273s` |
| fallback per-test timing | `TestHTTPAPI` | 5 | `0.00s` each |
| fallback per-test timing | `TestHTTPInvalidJSONAndNotFound` | 5 | `0.00s` each |
| fallback per-test timing | `TestHTTPRemainingCommands` | 5 | `0.00s` each |
| fallback per-test timing | `TestHTTPValidationBranches` | 5 | `0.00s` each |
| fallback per-test timing | `TestStoreSetGetAndReplaceTTL` | 5 | `0.00s` each |
| fallback per-test timing | `TestStoreExpiryTTLDelPersistAndKeys` | 5 | `0.00s` each |
| fallback per-test timing | `TestStoreMGetMSetAtomicAndFlush` | 5 | `0.00s` each |
| fallback per-test timing | `TestStoreCapacityMemoryAndListSemantics` | 5 | `0.00s` each |
| fallback per-test timing | `TestStoreExpirePersistErrorBranches` | 5 | `0.00s` each |
| fallback per-test timing | `TestValidationAndConcurrency` | 5 | `0.00s` each |

## Rust Benchmarks

Rust benchmarks require `cargo bench` execution.

## Node Benchmarks

Node benchmarks require `vitest bench` execution.

## Comparative Analysis

Placeholder: compare Go, Rust, and Node after the Rust `cargo bench`, Node `vitest bench`, and Docker-based k6/autocannon runs are collected in the same environment.
