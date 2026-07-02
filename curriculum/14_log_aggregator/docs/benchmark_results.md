# Benchmark Results: 14_log_aggregator

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
| go | ✅ | ✅ | ?   	log-aggregator-go	[no test files] ok  	log-aggregator-go/logaggregator	(cached) |
| rust | ✅ | ✅ | ignored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored |
| node | ✅ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/14_log_aggregator/node-impl   ✓ src/__tests__/store. |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2786 | 0.8 | 0.7 | 1.5 | 2.4 | 0.000 | 25.1 |
| rust | 2787 | 0.8 | 0.7 | 1.5 | 2.6 | 0.000 | 11.2 |
| node | 2775 | 1.1 | 0.9 | 1.9 | 5.1 | 0.000 | 88.1 |

## Per-language Detail

### go
- Throughput: **2786 req/s**
- Latency: avg 0.77 ms · p50 0.70 ms · p95 1.45 ms · p99 2.41 ms
- Error rate: 0.000
- Peak RSS: 25.1 MB
- Iterations: 69655

### rust
- Throughput: **2787 req/s**
- Latency: avg 0.79 ms · p50 0.71 ms · p95 1.51 ms · p99 2.56 ms
- Error rate: 0.000
- Peak RSS: 11.2 MB
- Iterations: 69706

### node
- Throughput: **2775 req/s**
- Latency: avg 1.12 ms · p50 0.95 ms · p95 1.91 ms · p99 5.10 ms
- Error rate: 0.000
- Peak RSS: 88.1 MB
- Iterations: 69391

_Generated 2026-07-02 20:35 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._