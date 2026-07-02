# Benchmark Results: 09_plugin_system

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
| go | ✅ | ✅ | ok  	plugin-system-go	(cached) |
| rust | ✅ | ✅ | ignored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored |
| node | ✅ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/node-impl   ✓ src/plugin-system.tes |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2331 | 2.3 | 1.6 | 6.4 | 8.3 | 0.000 | 21.0 |
| rust | — | — | — | — | — | — | _did not become ready: process exited (impl is a demo/library, not a long-running server). log: 0  messages received
                   0  voluntary context switches
            14787845  instructions retired
             1016120  peak memory footprint_ |
| node | 2349 | 3.1 | 2.8 | 6.8 | 9.1 | 0.000 | 88.8 |

## Per-language Detail

### go
- Throughput: **2331 req/s**
- Latency: avg 2.34 ms · p50 1.62 ms · p95 6.38 ms · p99 8.33 ms
- Error rate: 0.000
- Peak RSS: 21.0 MB
- Iterations: 58318

### rust
Not benchmarked as an HTTP server: did not become ready: process exited (impl is a demo/library, not a long-running server).

This implementation builds and its unit tests pass, but it does not
expose a long-running HTTP endpoint (it is a demo/library that runs to
completion). Re-run against a server variant for throughput data.

### node
- Throughput: **2349 req/s**
- Latency: avg 3.08 ms · p50 2.78 ms · p95 6.79 ms · p99 9.05 ms
- Error rate: 0.000
- Peak RSS: 88.8 MB
- Iterations: 58733

_Generated 2026-07-02 20:47 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._