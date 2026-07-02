# Benchmark Results: 05_websocket_chat

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
| go | ✅ | ✅ | ?   	websocket-chat-go	[no test files] ok  	websocket-chat-go/chat	(cached) |
| rust | ✅ | ✅ | ignored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored |
| node | ✅ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/05_websocket_chat/node-impl   ✓ tests/config.test.ts |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2267 | 2.1 | 1.0 | 7.1 | 11.8 | 0.000 | 21.2 |
| rust | — | — | — | — | — | — | _did not become ready: no response on any candidate port (wrong port or blocked). log: _ |
| node | 2355 | 2.5 | 1.9 | 6.1 | 8.5 | 0.000 | 87.2 |

## Per-language Detail

### go
- Throughput: **2267 req/s**
- Latency: avg 2.10 ms · p50 1.03 ms · p95 7.08 ms · p99 11.83 ms
- Error rate: 0.000
- Peak RSS: 21.2 MB
- Iterations: 56717

### rust
Not benchmarked: did not become ready: no response on any candidate port (wrong port or blocked).

### node
- Throughput: **2355 req/s**
- Latency: avg 2.49 ms · p50 1.91 ms · p95 6.15 ms · p99 8.47 ms
- Error rate: 0.000
- Peak RSS: 87.2 MB
- Iterations: 58893

_Generated 2026-07-02 20:45 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._