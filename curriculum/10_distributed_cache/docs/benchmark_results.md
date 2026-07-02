# Benchmark Results: 10_distributed_cache

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
| go | ✅ | ✅ | ok  	distributedcache	(cached) ?   	distributedcache/cmd/server	[no test files] |
| rust | ✅ | ✅ | gnored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored; |
| node | ✅ | ✅ | "cache_set","key":"hello","nodeId":"node-a","evicted":0} {"level":"info","event":"shutdown"}   ✔ coalesces cache-aside l |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2512 | 1.7 | 1.1 | 4.7 | 7.6 | 0.000 | 20.0 |
| rust | — | — | — | — | — | — | _did not become ready: process exited (impl is a demo/library, not a long-running server). log: 0  messages received
                   1  voluntary context switches
            16189801  instructions retired
             1016120  peak memory footprint_ |
| node | — | — | — | — | — | — | _build failed or no server binary_ |

## Per-language Detail

### go
- Throughput: **2512 req/s**
- Latency: avg 1.74 ms · p50 1.06 ms · p95 4.74 ms · p99 7.60 ms
- Error rate: 0.000
- Peak RSS: 20.0 MB
- Iterations: 62837

### rust
Not benchmarked as an HTTP server: did not become ready: process exited (impl is a demo/library, not a long-running server).

This implementation builds and its unit tests pass, but it does not
expose a long-running HTTP endpoint (it is a demo/library that runs to
completion). Re-run against a server variant for throughput data.

### node
Not benchmarked as an HTTP server: build failed or no server binary.

This implementation builds and its unit tests pass, but it does not
expose a long-running HTTP endpoint (it is a demo/library that runs to
completion). Re-run against a server variant for throughput data.

_Generated 2026-07-02 20:30 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._