# Benchmark Results: 06_file_upload_pipeline

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
| go | ✅ | ✅ | ok  	file-upload-pipeline-go	(cached) |
| rust | ✅ | ✅ | ignored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored |
| node | ✅ | ✅ | RUN  v2.1.9 /Users/danielbarreto/Development/aidevschool/curriculum/06_file_upload_pipeline/node-impl   ✓ src/__tests__/ |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2317 | 2.5 | 1.8 | 6.6 | 9.1 | 0.000 | 22.1 |
| rust | 2344 | 2.3 | 1.5 | 6.3 | 8.5 | 0.000 | 6.5 |
| node | 2368 | 2.7 | 2.2 | 6.3 | 8.9 | 0.000 | 90.8 |

## Per-language Detail

### go
- Throughput: **2317 req/s**
- Latency: avg 2.52 ms · p50 1.82 ms · p95 6.61 ms · p99 9.10 ms
- Error rate: 0.000
- Peak RSS: 22.1 MB
- Iterations: 57948

### rust
- Throughput: **2344 req/s**
- Latency: avg 2.29 ms · p50 1.54 ms · p95 6.30 ms · p99 8.54 ms
- Error rate: 0.000
- Peak RSS: 6.5 MB
- Iterations: 58622

### node
- Throughput: **2368 req/s**
- Latency: avg 2.67 ms · p50 2.24 ms · p95 6.26 ms · p99 8.86 ms
- Error rate: 0.000
- Peak RSS: 90.8 MB
- Iterations: 59219

_Generated 2026-07-02 20:46 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._