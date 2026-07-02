# Benchmark Results: 17_distributed_config_service

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/__config/health read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ok  	distributed-config-service-go	(cached) ok  	distributed-config-service-go/config	(cached) |
| rust | ✅ | ✅ | running 7 tests ....... test result: ok. 7 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s |
| node | ✅ | ✅ | --------- File      \| % Stmts \| % Branch \| % Funcs \| % Lines \| Uncovered Line #s        ----------\|---------\|---- |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2708 | 1.0 | 0.7 | 3.0 | 5.2 | 0.000 | 20.7 |
| rust | 2419 | 2.0 | 1.4 | 4.8 | 7.4 | 0.000 | 11.0 |
| node | 2378 | 2.8 | 2.7 | 5.4 | 8.9 | 0.000 | 89.8 |

## Per-language Detail

### go
- Throughput: **2708 req/s**
- Latency: avg 1.01 ms · p50 0.75 ms · p95 2.95 ms · p99 5.22 ms
- Error rate: 0.000
- Peak RSS: 20.7 MB
- Iterations: 67763

### rust
- Throughput: **2419 req/s**
- Latency: avg 1.99 ms · p50 1.44 ms · p95 4.81 ms · p99 7.37 ms
- Error rate: 0.000
- Peak RSS: 11.0 MB
- Iterations: 60488

### node
- Throughput: **2378 req/s**
- Latency: avg 2.83 ms · p50 2.69 ms · p95 5.40 ms · p99 8.92 ms
- Error rate: 0.000
- Peak RSS: 89.8 MB
- Iterations: 59481

_Generated 2026-07-02 20:39 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._