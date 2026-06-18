# Benchmark Results - Project 11: Load Balancer

## Methodology

Benchmark evidence is collected per runtime with repeatable command lines and at least three samples before cross-runtime comparison. The target scenario set is:

1. Unit/runtime microbenchmarks for backend selection algorithms.
2. HTTP/API scenario load using `k6` or `autocannon` through the reverse proxy.
3. Failure scenario for circuit opening, backend errors, and health transitions.
4. Admin/observability scenario for metrics, pool management, and shutdown.

Acceptance for comparable benchmark claims requires N >= 3 samples and coefficient of variation (CV) < 20%. This run used N=5 for Go. No Go `Benchmark*` functions were present, so Go benchmark execution fell back to verbose test timing as required. Service-level `k6`/`autocannon` scenarios remain pending and should be run without Docker unless a future task explicitly allows it.

## Environment

- OS/arch: macOS arm64
- Go: go1.26.4 darwin/arm64
- Working directory: `curriculum/11_load_balancer/go-impl/`
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
ok  loadbalancer  3.367s
?   loadbalancer/cmd/server  [no test files]
```

### Fallback verbose timing command

Command:

```bash
go test -count=5 -v ./... 2>&1
```

Result: tests passed across five repetitions.

```text
PASS
ok  loadbalancer  1.698s
?   loadbalancer/cmd/server  [no test files]
```

Selected real test timings observed in the verbose output:

| Test | Observed timings |
| --- | --- |
| `TestRoundRobinWeightedEligibility` | 0.00s |
| `TestLeastConnectionsAndPoolManagement` | 0.00s |
| `TestHealthChecksAndCircuitBreaker` | 0.03s, 0.00s, 0.00s, 0.00s, 0.00s |
| `TestSuccessfulHealthCheckMarksHealthyAndClosesHalfOpenCircuit` | 0.02s, 0.00s, 0.01s, 0.00s, 0.00s |
| `TestReverseProxyForwardsRequestAndAdminMetrics` | 0.06s, 0.06s, 0.02s, 0.04s, 0.03s |
| `TestProxyFailureAdminVariantsAndBasePathJoining` | 0.07s, 0.06s, 0.02s, 0.03s, 0.04s |
| `TestShutdownStopsHealthLoop` | 0.00s |

## Rust Results

Pending execution. No Rust benchmark/test numbers were collected in this run.

## Node Results

Pending execution. No Node benchmark/test numbers were collected in this run.

## Analysis and Recommendations

The Go implementation passes its N=5 fallback run. Reverse-proxy and proxy-failure tests are the measurable scenarios, while selection and pool-management tests complete below visible timer resolution.

Recommended next steps: add Go benchmarks for round-robin, least-connections selection, reverse-proxy forwarding, and circuit-breaker state transitions; then run proxy load with `k6` or `autocannon` using N >= 3 and CV < 20% before comparing with Rust or Node.
