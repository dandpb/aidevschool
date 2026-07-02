# Benchmark Results: 12_distributed_job_scheduler

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
| go | ✅ | ✅ | ?   	distributed-job-scheduler/cmd/scheduler	[no test files] ok  	distributed-job-scheduler/internal/scheduler	(cached) |
| rust | ✅ | ✅ | running 7 tests ....... test result: ok. 7 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s    |
| node | ✅ | ✅ | \| % Stmts \| % Branch \| % Funcs \| % Lines \| Uncovered Line #s       --------------\|---------\|----------\|--------- |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2355 | 2.5 | 2.1 | 5.7 | 10.1 | 0.000 | 20.4 |
| rust | 2402 | 2.2 | 1.9 | 5.3 | 7.8 | 0.000 | 6.1 |
| node | 2442 | 2.3 | 2.1 | 4.8 | 7.2 | 0.000 | 77.1 |

## Per-language Detail

### go
- Throughput: **2355 req/s**
- Latency: avg 2.49 ms · p50 2.11 ms · p95 5.71 ms · p99 10.06 ms
- Error rate: 0.000
- Peak RSS: 20.4 MB
- Iterations: 58909

### rust
- Throughput: **2402 req/s**
- Latency: avg 2.24 ms · p50 1.89 ms · p95 5.27 ms · p99 7.76 ms
- Error rate: 0.000
- Peak RSS: 6.1 MB
- Iterations: 60092

### node
- Throughput: **2442 req/s**
- Latency: avg 2.34 ms · p50 2.15 ms · p95 4.84 ms · p99 7.17 ms
- Error rate: 0.000
- Peak RSS: 77.1 MB
- Iterations: 61084

_Generated 2026-07-02 20:15 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._