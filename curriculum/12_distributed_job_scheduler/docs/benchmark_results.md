# Benchmark Results - Project 12: Distributed Job Scheduler

## Methodology

Benchmark evidence is collected per runtime with repeatable command lines and at least three samples before cross-runtime comparison. The target scenario set is:

1. Unit/runtime microbenchmarks for job submission and priority ordering.
2. HTTP/API scenario load using `k6` or `autocannon` against scheduler endpoints.
3. Coordination scenario for leader election, distributed locks, and fencing tokens.
4. Workflow scenario for DAG dependencies, retries, backoff, cancellation, and health reporting.

Acceptance for comparable benchmark claims requires N >= 3 samples and coefficient of variation (CV) < 20%. This run used N=5 for Go. No Go `Benchmark*` functions were present, so Go benchmark execution fell back to verbose test timing as required. Service-level `k6`/`autocannon` scenarios remain pending and should be run without Docker unless a future task explicitly allows it.

## Environment

- OS/arch: macOS arm64
- Go: go1.26.4 darwin/arm64
- Working directory: `curriculum/12_distributed_job_scheduler/go-impl/`
- Date: 2026-06-18

## Go Results

### Benchmark command

Command:

```bash
go test -bench=. -benchmem -count=5 ./... 2>&1
```

Result: no `Benchmark*` rows were emitted; tests passed.

```text
?   distributed-job-scheduler/cmd/scheduler  [no test files]
PASS
ok  distributed-job-scheduler/internal/scheduler  0.741s
```

### Fallback verbose timing command

Command:

```bash
go test -count=5 -v ./... 2>&1
```

Result: tests passed across five repetitions.

```text
?   distributed-job-scheduler/cmd/scheduler  [no test files]
PASS
ok  distributed-job-scheduler/internal/scheduler  1.241s
```

Selected real test timings observed in the verbose output:

| Test | Observed timings |
| --- | --- |
| `TestSubmitValidatesIntervalAndTracksStatus` | 0.00s |
| `TestLeaderElectionUsesHighestProcessIDWithLease` | 0.00s |
| `TestDispatchOrdersByPriorityDueTimeAndCreation` | 0.00s |
| `TestDistributedLockRejectsConcurrentAndStaleTokens` | 0.00s |
| `TestDAGDependenciesRetryBackoffAndCancellation` | 0.00s |
| `TestHealthReportsLeaderQueuesAndRunningJobs` | 0.00s |

## Rust Results

Pending execution. No Rust benchmark/test numbers were collected in this run.

## Node Results

Pending execution. No Node benchmark/test numbers were collected in this run.

## Analysis and Recommendations

The Go implementation passes its N=5 fallback run. All scheduler unit tests complete below the verbose timer's visible resolution, so package elapsed time is the only useful timing signal from this run.

Recommended next steps: add Go benchmarks for job submission, dispatch ordering, lock acquisition/fencing, and dependency retry processing; then run API-level scheduler load with `k6` or `autocannon` using N >= 3 and CV < 20% before comparing with Rust or Node.
