# Benchmark Results: 15_metrics_collector

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/health read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ?   	metrics-collector-go	[no test files] ok  	metrics-collector-go/metrics	(cached) |
| rust | ✅ | ✅ | 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored; 0 measu |
| node | ❌ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/15_metrics_collector/node-impl   ✓ src/__tests__/sto |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2292 | 2.2 | 1.2 | 6.7 | 10.3 | 0.000 | 21.3 |
| rust | 2347 | 2.1 | 1.1 | 6.4 | 10.6 | 0.000 | 12.9 |
| node | 2338 | 2.7 | 2.1 | 7.1 | 10.4 | 0.000 | 88.4 |

## Per-language Detail

### go
- Throughput: **2292 req/s**
- Latency: avg 2.20 ms · p50 1.20 ms · p95 6.70 ms · p99 10.26 ms
- Error rate: 0.000
- Peak RSS: 21.3 MB
- Iterations: 57347

### rust
- Throughput: **2347 req/s**
- Latency: avg 2.09 ms · p50 1.13 ms · p95 6.44 ms · p99 10.58 ms
- Error rate: 0.000
- Peak RSS: 12.9 MB
- Iterations: 58697

### node
- Throughput: **2338 req/s**
- Latency: avg 2.70 ms · p50 2.08 ms · p95 7.05 ms · p99 10.42 ms
- Error rate: 0.000
- Peak RSS: 88.4 MB
- Iterations: 58490

_Generated 2026-07-02 20:51 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._