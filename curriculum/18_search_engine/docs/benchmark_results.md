# Benchmark Results

## Environment

- OS/architecture: macOS darwin/arm64
- CPU: Apple M1 Pro
- Go: go1.26.4 darwin/arm64
- Date: 2026-06-18

## Methodology

Go measurements were collected from `curriculum/18_search_engine/go-impl/` with:

```bash
go test -bench=. -benchmem -count=5 ./... 2>&1
```

No Go benchmark functions emitted benchmark rows for this project, so fallback timing was collected with:

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

The benchmark command completed but produced no `Benchmark*` rows:

```text
PASS
ok  search-engine-go  2.969s
```

Fallback test timing from `go test -count=5 -v ./...`:

| Package | Result | Count | Elapsed |
| --- | --- | ---: | ---: |
| `search-engine-go` | PASS | 5 | 0.822s |

## Rust Benchmark Data

Placeholder. Rust benchmark data has not been collected in this run.

## Node Benchmark Data

Placeholder. Node benchmark data has not been collected in this run.

## Analysis

No Go microbenchmark samples were available, so ns/op, B/op, allocs/op, and CV% are not applicable. The fallback test suite completed five repetitions in 0.822s. CV% should be reported once at least two successful benchmark samples exist for a comparable metric.
