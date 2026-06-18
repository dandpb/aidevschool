# Benchmark Results: 07 REST API Auth

## Methodology

Go measurements were collected from `curriculum/07_rest_api_auth/go-impl/` on macOS arm64 with Go 1.26.4. The benchmark command was run first with `go test -bench=. -benchmem -count=5 ./... 2>&1`. No `Benchmark*` functions were present, so the fallback command `go test -count=5 -v ./... 2>&1` was run and its package/test timings are recorded below.

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
| `go test -bench=. -benchmem -count=5 ./...` | `rest-api-auth-go/cmd/server` | 1 package report | `[no test files]` |
| `go test -bench=. -benchmem -count=5 ./...` | `rest-api-auth-go/internal/authapi` | 5 test iterations, no benchmark rows | `ok ... 1.456s` |
| `go test -count=5 -v ./...` | `rest-api-auth-go/cmd/server` | 1 package report | `[no test files]` |
| `go test -count=5 -v ./...` | `rest-api-auth-go/internal/authapi` | 5 test iterations | `ok ... 1.258s` |
| fallback per-test timing | `TestRegisterValidationHashingAndAudit` | 5 | `0.01s, 0.04s, 0.02s, 0.03s, 0.04s` |
| fallback per-test timing | `TestLoginJwtAndCredentialFailure` | 5 | `0.04s, 0.07s, 0.04s, 0.05s, 0.06s` |
| fallback per-test timing | `TestRBACAndOwnership` | 5 | `0.08s, 0.09s, 0.04s, 0.09s, 0.07s` |
| fallback per-test timing | `TestRefreshRotationReplayHealthAndVersion` | 5 | `0.04s, 0.05s, 0.06s, 0.03s, 0.04s` |

## Rust Benchmarks

Rust benchmarks require `cargo bench` execution.

## Node Benchmarks

Node benchmarks require `vitest bench` execution.

## Comparative Analysis

Placeholder: compare Go, Rust, and Node after the Rust `cargo bench`, Node `vitest bench`, and Docker-based k6/autocannon runs are collected in the same environment.
