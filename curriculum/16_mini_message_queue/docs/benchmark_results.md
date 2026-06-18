# Benchmark Results

## Environment

- OS/architecture: macOS darwin/arm64
- CPU: Apple M1 Pro
- Go: go1.26.4 darwin/arm64
- Date: 2026-06-18

## Methodology

Go measurements were collected from `curriculum/16_mini_message_queue/go-impl/` with:

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
PASS
ok  mini-message-queue-go         14.498s
PASS
ok  mini-message-queue-go/broker  17.181s
```

Raw Go benchmark samples:

| Package | Benchmark | Sample | Iterations | ns/op | B/op | allocs/op |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `mini-message-queue-go` | BenchmarkProduceHandler-10 | 1 | 158,313 | 8,900 | 8,774 | 51 |
| `mini-message-queue-go` | BenchmarkProduceHandler-10 | 2 | 109,460 | 11,435 | 8,850 | 51 |
| `mini-message-queue-go` | BenchmarkProduceHandler-10 | 3 | 93,212 | 10,771 | 8,811 | 51 |
| `mini-message-queue-go` | BenchmarkProduceHandler-10 | 4 | 134,516 | 9,992 | 8,741 | 51 |
| `mini-message-queue-go` | BenchmarkProduceHandler-10 | 5 | 170,194 | 7,468 | 8,738 | 51 |
| `mini-message-queue-go/broker` | BenchmarkProduce-10 | 1 | 2,569,308 | 795.1 | 680 | 1 |
| `mini-message-queue-go/broker` | BenchmarkProduce-10 | 2 | 3,460,862 | 430.3 | 638 | 1 |
| `mini-message-queue-go/broker` | BenchmarkProduce-10 | 3 | 4,028,820 | 371.1 | 678 | 1 |
| `mini-message-queue-go/broker` | BenchmarkProduce-10 | 4 | 4,823,232 | 323.4 | 582 | 1 |
| `mini-message-queue-go/broker` | BenchmarkProduce-10 | 5 | 3,835,754 | 321.7 | 585 | 1 |

Summary:

| Benchmark | Mean ns/op | CV% | Allocation note |
| --- | ---: | ---: | --- |
| BenchmarkProduceHandler-10 | 9,713.20 | 16.17% | 51 allocs/op; B/op ranged from 8,738 to 8,850 |
| BenchmarkProduce-10 | 448.32 | 44.36% | 1 alloc/op; B/op ranged from 582 to 680 |

## Rust Benchmark Data

Placeholder. Rust benchmark data has not been collected in this run.

## Node Benchmark Data

Placeholder. Node benchmark data has not been collected in this run.

## Analysis

The HTTP handler benchmark is roughly an order of magnitude slower than direct broker production because it includes request handling overhead. CV% is high for the broker benchmark (44.36%), mainly because the first sample was much slower than later samples; treat the broker mean as noisy and prefer another longer run before comparing implementations. Handler CV% is also non-trivial at 16.17%.
