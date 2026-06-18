# Benchmark Results

## Environment

- OS/architecture: macOS darwin/arm64
- CPU: Apple M1 Pro
- Go: go1.26.4 darwin/arm64
- Date: 2026-06-18

## Methodology

Go measurements were collected from `curriculum/15_metrics_collector/go-impl/` with:

```bash
go test -bench=. -benchmem -count=5 ./... 2>&1
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

Benchmark command package summary:

```text
?    metrics-collector-go  [no test files]
PASS
ok   metrics-collector-go/metrics  19.276s
```

Raw Go benchmark samples:

| Package | Benchmark | Sample | Iterations | ns/op | B/op | allocs/op |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `metrics-collector-go/metrics` | BenchmarkStoreRecord-10 | 1 | 4,546,256 | 334.9 | 162 | 1 |
| `metrics-collector-go/metrics` | BenchmarkStoreRecord-10 | 2 | 3,408,957 | 389.6 | 162 | 1 |
| `metrics-collector-go/metrics` | BenchmarkStoreRecord-10 | 3 | 4,296,759 | 354.3 | 162 | 1 |
| `metrics-collector-go/metrics` | BenchmarkStoreRecord-10 | 4 | 3,441,510 | 309.7 | 162 | 1 |
| `metrics-collector-go/metrics` | BenchmarkStoreRecord-10 | 5 | 4,870,286 | 341.0 | 162 | 1 |
| `metrics-collector-go/metrics` | BenchmarkStoreQuery-10 | 1 | 64,215 | 17,207 | 25,169 | 10 |
| `metrics-collector-go/metrics` | BenchmarkStoreQuery-10 | 2 | 71,510 | 18,722 | 25,169 | 10 |
| `metrics-collector-go/metrics` | BenchmarkStoreQuery-10 | 3 | 68,373 | 19,201 | 25,169 | 10 |
| `metrics-collector-go/metrics` | BenchmarkStoreQuery-10 | 4 | 66,918 | 17,958 | 25,169 | 10 |
| `metrics-collector-go/metrics` | BenchmarkStoreQuery-10 | 5 | 59,929 | 17,602 | 25,169 | 10 |

Summary:

| Benchmark | Mean ns/op | CV% | Allocation note |
| --- | ---: | ---: | --- |
| BenchmarkStoreRecord-10 | 345.90 | 8.47% | Stable at 162 B/op and 1 alloc/op |
| BenchmarkStoreQuery-10 | 18,138.00 | 4.49% | Stable at 25,169 B/op and 10 allocs/op |

## Rust Benchmark Data

Placeholder. Rust benchmark data has not been collected in this run.

## Node Benchmark Data

Placeholder. Node benchmark data has not been collected in this run.

## Analysis

`BenchmarkStoreQuery-10` is materially slower and allocates more than `BenchmarkStoreRecord-10`, as expected for query work over stored metrics. CV% is moderate for record writes (8.47%) and lower for queries (4.49%), so the five-sample run is reasonably stable for query timing while write timing shows more run-to-run variance.
