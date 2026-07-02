# Benchmark Results: 07_rest_api_auth

## Methodology

Each implementation was built and its test suite run natively on macOS arm64
(Apple Silicon) with the Homebrew toolchain. The server was then started on a
dedicated port and driven by `k6` (/healthz read workload, ramp 0→50→100→0
VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles
and throughput come from k6's summary export.

> These are real single-machine measurements (N=1 run each), not Docker-based
> load tests. Use them for relative cross-language comparison on this hardware;
> re-run on dedicated benchmark hardware for publication-grade p95/p99.

## Build & Test Status

| Lang | Built | Tests | Test detail |
| --- | :---: | :---: | --- |
| go | ✅ | ✅ | ?   	rest-api-auth-go/cmd/server	[no test files] ok  	rest-api-auth-go/internal/authapi	(cached) |
| rust | ✅ | ✅ | running 3 tests ... test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.20s   runn |
| node | ✅ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/07_rest_api_auth/node-impl   ✓ src/__tests__/app.tes |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2358 | 2.5 | 1.9 | 6.3 | 10.7 | 0.000 | 21.3 |
| rust | 2411 | 2.0 | 1.3 | 5.0 | 8.8 | 0.000 | 10.7 |
| node | 2691 | 1.5 | 0.8 | 3.8 | 11.2 | 0.000 | 80.3 |

## Per-language Detail

### go
- Throughput: **2358 req/s**
- Latency: avg 2.50 ms · p50 1.88 ms · p95 6.28 ms · p99 10.72 ms
- Error rate: 0.000
- Peak RSS: 21.3 MB
- Iterations: 58980

### rust
- Throughput: **2411 req/s**
- Latency: avg 1.99 ms · p50 1.28 ms · p95 4.99 ms · p99 8.82 ms
- Error rate: 0.000
- Peak RSS: 10.7 MB
- Iterations: 60296

### node
- Throughput: **2691 req/s**
- Latency: avg 1.47 ms · p50 0.85 ms · p95 3.82 ms · p99 11.16 ms
- Error rate: 0.000
- Peak RSS: 80.3 MB
- Iterations: 67305

_Generated 2026-07-02 20:27 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._