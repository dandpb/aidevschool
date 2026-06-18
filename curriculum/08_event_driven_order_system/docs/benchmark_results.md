# Benchmark Results - Project 08: Event-Driven Order System

## Methodology

Benchmark evidence is collected per runtime with repeatable command lines and at least three samples before cross-runtime comparison. The target scenario set is:

1. Unit/runtime microbenchmarks for core domain operations.
2. HTTP/API scenario load using `k6` or `autocannon` against lifecycle endpoints.
3. Concurrency and idempotency stress for duplicate commands and invalid transitions.
4. Recovery/observability scenario for replay, projection lag, and health reporting.

Acceptance for comparable benchmark claims requires N >= 3 samples and coefficient of variation (CV) < 20%. This run used N=5 for Go. No Go `Benchmark*` functions were present, so Go benchmark execution fell back to verbose test timing as required. Service-level `k6`/`autocannon` scenarios remain pending and should be run without Docker unless a future task explicitly allows it.

## Environment

- OS/arch: macOS arm64
- Go: go1.26.4 darwin/arm64
- Working directory: `curriculum/08_event_driven_order_system/go-impl/`
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
ok  event-driven-order-go  1.251s
```

### Fallback verbose timing command

Command:

```bash
go test -count=5 -v ./... 2>&1
```

Result: tests passed across five repetitions.

```text
PASS
ok  event-driven-order-go  2.197s
```

Selected real test timings observed in the verbose output:

| Test | Observed timings |
| --- | --- |
| `TestCreateOrderAppendsPublishesProjectsAndIsIdempotent` | 0.00s |
| `TestValidationConcurrencyAndInvalidTransitions` | 0.00s |
| `TestSagaConfirmsAndCancelsIdempotently` | 0.00s |
| `TestReplayRebuildsProjectionsAndHealthReportsLag` | 0.00s |
| `TestHTTPContract` | 0.07s, 0.03s, 0.01s, 0.02s, 0.02s |
| `TestFullLifecycleAndReadAPIs` | 0.00s |
| `TestPubSubAndHTTPErrorPaths` | 0.06s, 0.05s, 0.01s, 0.03s, 0.02s |
| `TestIdempotencyConflictAndInventoryCompensation` | 0.00s |
| `TestStateMachineHelpersAndReplayIntegrity` | 0.00s |
| `TestHTTPLifecycleCommands` | 0.08s, 0.05s, 0.02s, 0.04s, 0.04s |

## Rust Results

Pending execution. No Rust benchmark/test numbers were collected in this run.

## Node Results

Pending execution. No Node benchmark/test numbers were collected in this run.

## Analysis and Recommendations

The Go implementation passes its N=5 test-timing fallback, but it currently has no Go benchmark functions, so the result is functional timing evidence rather than microbenchmark evidence. HTTP-oriented tests dominate the visible elapsed time, especially `TestHTTPContract`, `TestPubSubAndHTTPErrorPaths`, and `TestHTTPLifecycleCommands`.

Recommended next steps: add targeted Go `BenchmarkCreateOrder`, `BenchmarkLifecycleCommands`, and `BenchmarkReplayProjection` functions; then run the four service scenarios with `k6` or `autocannon` using N >= 3 and require CV < 20% before comparing against Rust or Node.
