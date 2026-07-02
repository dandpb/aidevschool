# Benchmark Results: 11_load_balancer

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/__lb/health read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ok  	loadbalancer	(cached) ?   	loadbalancer/cmd/server	[no test files] |
| rust | ✅ | ✅ | ored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored; 0 |
| node | ✅ | ✅ | ts > Node load balancer > proxies method, path, query, headers, and exposes admin metrics {"event":"proxy_request","back |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2762 | 0.9 | 0.7 | 1.8 | 3.6 | 0.000 | 20.8 |
| rust | 2787 | 0.8 | 0.7 | 1.5 | 3.4 | 0.000 | 6.5 |
| node | 2784 | 1.0 | 0.8 | 1.8 | 3.2 | 0.000 | 84.9 |

## Per-language Detail

### go
- Throughput: **2762 req/s**
- Latency: avg 0.86 ms · p50 0.72 ms · p95 1.84 ms · p99 3.61 ms
- Error rate: 0.000
- Peak RSS: 20.8 MB
- Iterations: 69092

### rust
- Throughput: **2787 req/s**
- Latency: avg 0.76 ms · p50 0.66 ms · p95 1.49 ms · p99 3.42 ms
- Error rate: 0.000
- Peak RSS: 6.5 MB
- Iterations: 69723

### node
- Throughput: **2784 req/s**
- Latency: avg 0.97 ms · p50 0.84 ms · p95 1.84 ms · p99 3.23 ms
- Error rate: 0.000
- Peak RSS: 84.9 MB
- Iterations: 69650

_Generated 2026-07-02 20:32 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._