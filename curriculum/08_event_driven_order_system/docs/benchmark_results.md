# Benchmark Results: 08_event_driven_order_system

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
| go | ✅ | ✅ | ok  	event-driven-order-go	(cached) |
| rust | ✅ | ✅ | ored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored; 0 |
| node | ✅ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/node-impl   ✓ src/order |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2729 | 1.1 | 0.7 | 2.1 | 5.4 | 0.000 | 20.2 |
| rust | 2781 | 0.8 | 0.7 | 1.5 | 2.8 | 0.000 | 6.9 |
| node | 2732 | 1.4 | 1.0 | 3.6 | 7.8 | 0.000 | 79.3 |

## Per-language Detail

### go
- Throughput: **2729 req/s**
- Latency: avg 1.06 ms · p50 0.73 ms · p95 2.06 ms · p99 5.40 ms
- Error rate: 0.000
- Peak RSS: 20.2 MB
- Iterations: 68267

### rust
- Throughput: **2781 req/s**
- Latency: avg 0.82 ms · p50 0.74 ms · p95 1.55 ms · p99 2.78 ms
- Error rate: 0.000
- Peak RSS: 6.9 MB
- Iterations: 69573

### node
- Throughput: **2732 req/s**
- Latency: avg 1.37 ms · p50 0.97 ms · p95 3.65 ms · p99 7.83 ms
- Error rate: 0.000
- Peak RSS: 79.3 MB
- Iterations: 68349

_Generated 2026-07-02 20:29 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._