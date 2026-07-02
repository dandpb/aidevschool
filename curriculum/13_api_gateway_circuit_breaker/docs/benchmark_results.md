# Benchmark Results: 13_api_gateway_circuit_breaker

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/_gateway/status read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ok  	api-gateway-go	(cached) ?   	api-gateway-go/gateway	[no test files] |
| rust | ✅ | ✅ | 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored; 0 measu |
| node | ✅ | ✅ | ker/node-impl   ✓ src/__tests__/rateLimiter.test.ts (1 test) 1ms  ✓ src/__tests__/bulkhead.test.ts (1 test) 1ms  ✓ src/_ |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2772 | 0.8 | 0.7 | 1.6 | 2.6 | 0.000 | 21.3 |
| rust | 2792 | 0.9 | 0.8 | 1.6 | 2.6 | 0.000 | 11.0 |
| node | 2798 | 1.0 | 0.9 | 1.8 | 2.7 | 0.000 | 88.0 |

## Per-language Detail

### go
- Throughput: **2772 req/s**
- Latency: avg 0.84 ms · p50 0.75 ms · p95 1.56 ms · p99 2.61 ms
- Error rate: 0.000
- Peak RSS: 21.3 MB
- Iterations: 69323

### rust
- Throughput: **2792 req/s**
- Latency: avg 0.86 ms · p50 0.80 ms · p95 1.62 ms · p99 2.61 ms
- Error rate: 0.000
- Peak RSS: 11.0 MB
- Iterations: 69833

### node
- Throughput: **2798 req/s**
- Latency: avg 1.02 ms · p50 0.95 ms · p95 1.83 ms · p99 2.70 ms
- Error rate: 0.000
- Peak RSS: 88.0 MB
- Iterations: 69976

_Generated 2026-07-02 20:33 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._