# Benchmark Results: 03_url_shortener

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
| go | ✅ | ✅ | ok  	url-shortener-go/cmd/server	(cached) ok  	url-shortener-go/internal/shortener	(cached) |
| rust | ✅ | ✅ | running 5 tests ..... test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.03s   ru |
| node | ✅ | ✅ | local","code":"one","msg":"short_url_created"} {"level":30,"time":1783023428586,"pid":68471,"hostname":"Daniels-MacBook- |

## Comparative Results

| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| go | 2362 | 2.5 | 2.1 | 6.0 | 9.6 | 0.000 | 20.2 |
| rust | 2376 | 2.4 | 2.1 | 5.4 | 7.3 | 0.000 | 10.8 |
| node | 2377 | 3.0 | 2.8 | 6.4 | 8.9 | 0.000 | 89.3 |

## Per-language Detail

### go
- Throughput: **2362 req/s**
- Latency: avg 2.52 ms · p50 2.12 ms · p95 5.97 ms · p99 9.61 ms
- Error rate: 0.000
- Peak RSS: 20.2 MB
- Iterations: 59104

### rust
- Throughput: **2376 req/s**
- Latency: avg 2.38 ms · p50 2.05 ms · p95 5.36 ms · p99 7.30 ms
- Error rate: 0.000
- Peak RSS: 10.8 MB
- Iterations: 59457

### node
- Throughput: **2377 req/s**
- Latency: avg 3.04 ms · p50 2.79 ms · p95 6.42 ms · p99 8.90 ms
- Error rate: 0.000
- Peak RSS: 89.3 MB
- Iterations: 59464

_Generated 2026-07-02 20:17 UTC by `curriculum/_shared/benchmarks/bench_orchestrator.py`._
## Node re-verification — 2026-10-18 (AID-5013, Onda 2)

Single-machine Linux container (sandbox), Node.js v24.18.0 driver with 50
keep-alive workers against `node dist/main.js` (fresh `npm install --include=dev`
+ `npm run build` at main `6bd13ed6`). k6 is unavailable in this sandbox, so the
historical k6 methodology above could not be re-run; this is a real N=1
measurement with an equivalent read workload (`GET /health`), not a continuation
of the 2026-07-02 series.

| Metric | Value |
| --- | ---: |
| Requests | 50,000 |
| Errors | 0 (fail rate 0.0000) |
| Throughput | 12,566 req/s |
| Latency | avg 3.91 ms · p50 3.58 ms · p95 7.12 ms · p99 10.39 ms |
| Wall time | 3.98 s |
| Peak RSS (VmHWM) | 91.6 MB |

Functional smoke (same session): `POST /shorten` → `GET /:code` returns HTTP 301
to the original URL → `GET /:code/stats` reports the click with hashed client IP.

> Do not compare these rows against the 2026-07-02 macOS/k6 table: different
> hardware, OS, and load driver. Cross-language rows above remain historical
> (Go/Rust tracks were removed in `1b0a309` and no longer exist on disk).

_Driver: single-use Node.js script (untracked scratch), session transcript in the
AID-5013 receipt; methodology recorded in
`docs/product-readiness/assessments/2026-10-18-6bd13ed6-onda2-03-04.md`._
