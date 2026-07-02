# Benchmark Results: 02_key_value_store

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/v1/kv/k0_0 read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ?   	key-value-store-go/cmd/kvstore	[no test files] ok  	key-value-store-go/internal/kvstore	(cached) |
| rust | ✅ | ✅ | running 6 tests ...... test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s   r |
| node | ✅ | ✅ | GET","path":"/health","msg":"request"} {"level":30,"time":1783019414021,"pid":61843,"hostname":"Daniels-MacBook-Pro.loca |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2101 | 2.3 | 1.5 | 6.3 | 14.2 | 0.000 | 10.6 |
| rust | 2425 | 2.3 | 1.8 | 5.9 | 8.7 | 0.000 | 2.6 |
| node | 2649 | 2.0 | 1.7 | 4.5 | 6.3 | 0.000 | 67.8 |

## Per-language Detail

### go
- Throughput: **2101 req/s**
- Latency: avg 2.31 ms · p50 1.46 ms · p95 6.31 ms · p99 14.23 ms
- Error rate: 0.000
- Peak RSS: 10.6 MB
- Iterations: 52590

### rust
- Throughput: **2425 req/s**
- Latency: avg 2.33 ms · p50 1.83 ms · p95 5.86 ms · p99 8.73 ms
- Error rate: 0.000
- Peak RSS: 2.6 MB
- Iterations: 60672

### node
- Throughput: **2649 req/s**
- Latency: avg 1.99 ms · p50 1.72 ms · p95 4.45 ms · p99 6.31 ms
- Error rate: 0.000
- Peak RSS: 67.8 MB
- Iterations: 66285

_Generated 2026-07-02 19:10 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._