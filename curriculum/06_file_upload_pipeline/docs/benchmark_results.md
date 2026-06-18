# Benchmark Results: 06 File Upload Pipeline

## Methodology

Go measurements were collected from `curriculum/06_file_upload_pipeline/go-impl/` on macOS arm64 with Go 1.26.4. The benchmark command was run first with `go test -bench=. -benchmem -count=5 ./... 2>&1`. No `Benchmark*` functions were present, so the fallback command `go test -count=5 -v ./... 2>&1` was run and its package/test timings are recorded below.

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
| `go test -bench=. -benchmem -count=5 ./...` | `file-upload-pipeline-go` | 5 test iterations, no benchmark rows | `ok ... 0.803s` |
| `go test -count=5 -v ./...` | `file-upload-pipeline-go` | 5 test iterations | `ok ... 0.629s` |
| fallback per-test timing | `TestMalformedMissingAndMemoryBounded` | 5 | `0.02s, 0.02s, 0.02s, 0.04s, 0.07s` |
| fallback per-test timing | `TestStreamPartHonorsPreCancelledContextAndNilLogger` | 5 | `0.00s, 0.00s, 0.00s, 0.01s, 0.00s` |
| fallback per-test timing | `TestRejectsInvalidTypeSizeAndChecksum` | 5 | `0.00s` each |
| fallback per-test timing | other file upload tests | 5 each | `0.00s` each |

## Rust Benchmarks

Rust benchmarks require `cargo bench` execution.

## Node Benchmarks

Node benchmarks require `vitest bench` execution.

## Comparative Analysis

Placeholder: compare Go, Rust, and Node after the Rust `cargo bench`, Node `vitest bench`, and Docker-based k6/autocannon runs are collected in the same environment.
