# Benchmark Results: 18_search_engine

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
| go | ✅ | ✅ | ok  	search-engine-go	(cached) |
| rust | ✅ | ✅ | ; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored; 0 mea |
| node | ✅ | ✅ | RUN  v1.6.1 /Users/danielbarreto/Development/aidevschool/curriculum/18_search_engine/node-impl   ✓ tests/search.test.ts  |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2357 | 2.4 | 1.9 | 5.9 | 8.6 | 0.000 | 21.4 |
| rust | 2549 | 1.3 | 1.1 | 3.0 | 4.4 | 0.000 | 1.7 |
| node | 2348 | 2.6 | 2.1 | 6.5 | 9.4 | 0.000 | 78.8 |

## Per-language Detail

### go
- Throughput: **2357 req/s**
- Latency: avg 2.36 ms · p50 1.90 ms · p95 5.87 ms · p99 8.55 ms
- Error rate: 0.000
- Peak RSS: 21.4 MB
- Iterations: 58956

### rust
- Throughput: **2549 req/s**
- Latency: avg 1.30 ms · p50 1.15 ms · p95 2.98 ms · p99 4.41 ms
- Error rate: 0.000
- Peak RSS: 1.7 MB
- Iterations: 63768

### node
- Throughput: **2348 req/s**
- Latency: avg 2.59 ms · p50 2.07 ms · p95 6.46 ms · p99 9.41 ms
- Error rate: 0.000
- Peak RSS: 78.8 MB
- Iterations: 58719

_Generated 2026-07-02 20:40 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._