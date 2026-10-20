# Benchmark Results: 04_concurrent_task_queue

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
| go | ✅ | ✅ | ok  	concurrent-task-queue-go	(cached) ok  	concurrent-task-queue-go/taskqueue	(cached) |
| rust | ✅ | ✅ | ignored; 0 measured; 0 filtered out; finished in 0.00s   running 0 tests  test result: ok. 0 passed; 0 failed; 0 ignored |
| node | ✅ | ✅ | ts__/server.test.ts > HTTP API > maps backpressure to 429 {"event":"task_transition","task_id":"093a290a-5079-4d5f-857d- |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2349 | 2.2 | 1.5 | 6.0 | 9.0 | 0.000 | 19.9 |
| rust | 2350 | 2.2 | 1.6 | 5.7 | 8.9 | 0.000 | 10.8 |
| node | 2371 | 2.9 | 2.7 | 6.1 | 9.2 | 0.000 | 88.0 |

## Per-language Detail

### go
- Throughput: **2349 req/s**
- Latency: avg 2.20 ms · p50 1.47 ms · p95 6.03 ms · p99 8.99 ms
- Error rate: 0.000
- Peak RSS: 19.9 MB
- Iterations: 58755

### rust
- Throughput: **2350 req/s**
- Latency: avg 2.24 ms · p50 1.65 ms · p95 5.70 ms · p99 8.93 ms
- Error rate: 0.000
- Peak RSS: 10.8 MB
- Iterations: 58804

### node
- Throughput: **2371 req/s**
- Latency: avg 2.91 ms · p50 2.73 ms · p95 6.13 ms · p99 9.23 ms
- Error rate: 0.000
- Peak RSS: 88.0 MB
- Iterations: 59295

_Generated 2026-07-02 20:19 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._
## Node re-verification — 2026-10-18 (AID-5013, Onda 2)

Single-machine Linux container (sandbox), Node.js v24.18.0 driver with 50
keep-alive workers against `node dist/main.js` (fresh `npm install --include=dev`
+ `npm run build` at main `6bd13ed6`). k6 is unavailable in this sandbox, so the
historical k6 methodology above could not be re-run; this is a real N=1
measurement with an equivalent read workload (`GET /healthz`), not a continuation
of the 2026-07-02 series.

| Metric | Value |
| --- | ---: |
| Requests | 50,000 |
| Errors | 0 (fail rate 0.0000) |
| Throughput | 14,002 req/s |
| Latency | avg 3.50 ms · p50 3.11 ms · p95 6.31 ms · p99 9.44 ms |
| Wall time | 3.57 s |
| Peak RSS (VmHWM) | 93.2 MB |

Functional smoke (same session): `POST /tasks` → task reaches `succeeded` via the
4-worker pump → `GET /stats` reports `completed_count: 1`, `backpressure: open`.

> Do not compare these rows against the 2026-07-02 macOS/k6 table: different
> hardware, OS, and load driver. Cross-language rows above remain historical
> (Go/Rust tracks were removed in `1b0a309` and no longer exist on disk).

_Driver: single-use Node.js script (untracked scratch), session transcript in the
AID-5013 receipt; methodology recorded in
`docs/product-readiness/assessments/2026-10-18-6bd13ed6-onda2-03-04.md`._
