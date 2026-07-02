# Benchmark Results: 16_mini_message_queue

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/topics read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ok  	mini-message-queue-go	(cached) ok  	mini-message-queue-go/broker	(cached) |
| rust | ✅ | ✅ | running 16 tests ................ test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished  |
| node | ✅ | ✅ | broker.ts \|   90.32 \|    73.01 \|   92.85 \|   90.19 \| 65,117,168,183,198,206,220,242,263,279,291,312,318,325,355   i |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2288 | 2.1 | 1.1 | 6.7 | 11.2 | 0.000 | 21.0 |
| rust | 2325 | 2.0 | 1.1 | 6.2 | 9.7 | 0.000 | 10.9 |
| node | 2280 | 2.7 | 2.0 | 7.4 | 11.8 | 0.000 | 84.4 |

## Per-language Detail

### go
- Throughput: **2288 req/s**
- Latency: avg 2.11 ms · p50 1.08 ms · p95 6.75 ms · p99 11.20 ms
- Error rate: 0.000
- Peak RSS: 21.0 MB
- Iterations: 57250

### rust
- Throughput: **2325 req/s**
- Latency: avg 2.01 ms · p50 1.10 ms · p95 6.24 ms · p99 9.71 ms
- Error rate: 0.000
- Peak RSS: 10.9 MB
- Iterations: 58151

### node
- Throughput: **2280 req/s**
- Latency: avg 2.75 ms · p50 2.00 ms · p95 7.36 ms · p99 11.79 ms
- Error rate: 0.000
- Peak RSS: 84.4 MB
- Iterations: 57044

_Generated 2026-07-02 20:53 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._