# Benchmark Results: 04 Concurrent Task Queue

## Methodology

Go measurements were collected from `curriculum/04_concurrent_task_queue/go-impl/` on macOS arm64 with Go 1.26.4. The benchmark command was run first with `go test -bench=. -benchmem -count=5 ./... 2>&1`. No `Benchmark*` functions were present, so the fallback command `go test -count=5 -v ./... 2>&1` was run and its package/test timings are recorded below.

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
| `go test -bench=. -benchmem -count=5 ./...` | `concurrent-task-queue-go` | 5 test iterations, no benchmark rows | `ok ... 0.739s` |
| `go test -bench=. -benchmem -count=5 ./...` | `concurrent-task-queue-go/taskqueue` | 5 test iterations, no benchmark rows | `ok ... 26.151s` |
| `go test -count=5 -v ./...` | `concurrent-task-queue-go` | 5 test iterations | `ok ... 1.162s` |
| `go test -count=5 -v ./...` | `concurrent-task-queue-go/taskqueue` | 5 test iterations | `ok ... 26.169s` |
| fallback per-test timing | `TestMainStartsAndStopsOnSignal` | 5 | `0.03s` each |
| fallback per-test timing | `TestPoisonTimeoutAndInvalidBranches` | 5 | `5.02s, 5.03s, 5.04s, 5.03s, 5.03s` |
| fallback per-test timing | `TestWorkerPoolRetriesBackoffDeadLetterAndStats` | 5 | `0.06s, 0.09s, 0.05s, 0.07s, 0.05s` |
| fallback per-test timing | `TestConcurrentWorkersRespectLimitAndGracefulDrain` | 5 | `0.01s, 0.02s, 0.01s, 0.02s, 0.02s` |
| fallback per-test timing | other taskqueue tests | 5 each | `0.00s` to `0.02s` as emitted |

## Rust Benchmarks

Rust benchmarks require `cargo bench` execution.

## Node Benchmarks

Node benchmarks require `vitest bench` execution.

## Comparative Analysis

Placeholder: compare Go, Rust, and Node after the Rust `cargo bench`, Node `vitest bench`, and Docker-based k6/autocannon runs are collected in the same environment.
