# Benchmark Results

## Environment

- OS/architecture: macOS darwin/arm64
- CPU: Apple M1 Pro
- Go: go1.26.4 darwin/arm64
- Date: 2026-06-18

## Methodology

Go measurements were collected from `curriculum/17_distributed_config_service/go-impl/` with:

```bash
go test -bench=. -benchmem -count=5 ./... 2>&1
```

The benchmark command found a benchmark function, but it failed before producing ns/op samples. To capture non-benchmark timing without modifying code, regular tests were also run with:

```bash
go test -count=5 -v ./... 2>&1
```

The broader service benchmark plan uses four HTTP/load scenarios, executed with k6 and autocannon when endpoint-level load testing is available:

| Scenario | Intent | Tooling |
| --- | --- | --- |
| Baseline | Steady low-concurrency reference run | k6 + autocannon |
| Stress | Sustained high-concurrency throughput and latency pressure | k6 + autocannon |
| Spike | Sudden traffic burst and recovery behavior | k6 + autocannon |
| Endurance | Longer-duration stability and allocation drift check | k6 + autocannon |

This file records only the Go command output requested above; Rust and Node sections remain placeholders until those implementations are measured separately.

## Go Benchmark Data

The benchmark command failed in the root package before producing usable benchmark samples:

```text
goos: darwin
goarch: arm64
pkg: distributed-config-service-go
cpu: Apple M1 Pro
BenchmarkPutConfig-10    --- FAIL: BenchmarkPutConfig-10
    main_test.go:324: unexpected status: 200
BenchmarkPutConfig-10    --- FAIL: BenchmarkPutConfig-10
    main_test.go:324: unexpected status: 200
BenchmarkPutConfig-10    --- FAIL: BenchmarkPutConfig-10
    main_test.go:324: unexpected status: 200
BenchmarkPutConfig-10    --- FAIL: BenchmarkPutConfig-10
    main_test.go:324: unexpected status: 200
BenchmarkPutConfig-10    --- FAIL: BenchmarkPutConfig-10
    main_test.go:324: unexpected status: 200
FAIL
exit status 1
FAIL  distributed-config-service-go  3.630s
PASS
ok    distributed-config-service-go/config  0.729s
FAIL
```

Fallback regular test timing from `go test -count=5 -v ./...`:

| Package | Result | Count | Elapsed |
| --- | --- | ---: | ---: |
| `distributed-config-service-go` | PASS | 5 | 0.772s |
| `distributed-config-service-go/config` | PASS | 5 | 1.260s |

## Rust Benchmark Data

Placeholder. Rust benchmark data has not been collected in this run.

## Node Benchmark Data

Placeholder. Node benchmark data has not been collected in this run.

## Analysis

No successful Go benchmark ns/op samples are available because `BenchmarkPutConfig-10` failed all five benchmark attempts with `unexpected status: 200`. CV% is therefore not applicable for Go benchmark timing in this run. Regular tests pass across both packages, so the failure appears isolated to the benchmark expectation rather than the whole test suite.
