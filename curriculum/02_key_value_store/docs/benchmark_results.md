# Project 02 — In-Memory Key-Value Store: Benchmark Results

> Phase 4 (`benchmark`) deliverable for cycle `2026-07-06-02-key-value-store`. Producer:
> `benchmarker` (Cowork subagent, manually replicating `/devschool-benchmark`).
> Honest, statistically grounded performance measurement — **Node.js/TypeScript only**;
> Go and Rust are **explicitly out of scope this cycle** (repo owner decision for Fase 2.1,
> not an oversight — see `learner/pipeline_status.md` notes for this cycle and §1.3 below).
> This **replaces the prior N=1, macOS/k6-based, single-endpoint report** produced on
> 2026-07-02 by `curriculum/_shared/benchmarks/bench_orchestrator.py` as part of an earlier
> ungated backfill for this project (kept in git history) — this pass targets a proper
> **N=10** statistical sample with a realistic multi-operation KV workload, mirroring the
> format and honesty conventions of `curriculum/01_rate_limiter/docs/benchmark_results.md`
> (same cycle family, same sandbox).

_Run date: 2026-07-06. Cycle: `2026-07-06-02-key-value-store`. Phase: `benchmark`._

---

## 1. Environment & Methodology

### 1.1 Hardware & Runtime

| Item | Value |
|------|-------|
| Machine | Cowork sandbox VM (`practical-eloquent-bardeen`), shared/isolated Linux container |
| CPU | aarch64 (arm64), 4 cores |
| RAM | 3.8 GiB total (~3.3 GiB available at run time) |
| OS | Ubuntu 22.04.5 LTS, kernel 6.8.0-124-generic (aarch64) |
| Node.js | v22.22.3 |
| npm | 10.9.8 |
| autocannon | v8.0.0 (npm-installed into a fresh `/tmp` tree, not the committed `node_modules`) |
| Docker | not available (no daemon) — native (no-Docker) harness only, same as project 01 |
| k6 | **not available** — network egress to `dl.k6.io` is blocked by the sandbox's proxy allowlist, identical constraint already documented for `01_rate_limiter`; substituted with `autocannon`, the sanctioned fallback per `.claude/agents/benchmarker.md` |
| Go toolchain | **not attempted this cycle** — Go is explicitly out of scope for Fase 2.1 (Node-only per repo owner decision), not a network-failure finding. `go-impl/` exists in the repo from an earlier ungated backfill but was not touched. |
| Rust toolchain | **not attempted this cycle** — same rationale as Go. `rust-impl/` exists but was not touched. |

This is a materially different environment from the prior 2026-07-02 backfill benchmark
(native macOS + Homebrew toolchain + real k6). Absolute numbers are **not comparable**
across the two reports. This is the same sandbox class used for the `01_rate_limiter` N=10
benchmark pass (2026-07-05); numbers are internally comparable to that report to the extent
both ran on this VM family, but not to any macOS/Docker/k6 numbers recorded elsewhere in
this repo's history.

### 1.2 What we measure

- **autocannon** (host-side HTTP load generator, in-process client): delivered RPS
  (`requests.average`), latency avg/p50/p90/p95(`p97_5` bucket)/p99/max, HTTP status class
  counts (2xx/4xx/5xx), transport errors, and timeouts.
- **`/proc/<pid>/status` VmHWM**, sampled every 200 ms for the lifetime of the server
  process, as the Linux substitute for `/usr/bin/time -l` peak RSS (same method used for
  the 01_rate_limiter report; that flag is macOS-only, this sandbox is Linux).
- **Workload — mixed KV operations, not a single endpoint.** Unlike the prior N=1 backfill
  (single `/v1/kv/k0_0` read target) or the rate-limiter benchmark (single `GET /` target),
  this store exposes 8 distinct operations (SET, GET, DEL, EXPIRE, TTL, PERSIST, KEYS,
  MGET/MSET, FLUSHDB). A custom autocannon load script
  (`curriculum/02_key_value_store/benchmarks/kv_load_autocannon.js`) was written because
  autocannon has no native "weighted multi-endpoint" mode like k6's per-iteration script
  logic; the script uses autocannon's `requests[].setupRequest` hook to pick a pseudo-random
  verb + key per HTTP request according to a fixed mix, over a 10,000-key keyspace
  (`k0`..`k9999`), mirroring the ratios already established in this repo's shared k6 fixture
  `curriculum/_shared/benchmarks/kv_workload.js` (80% GET / 15% PUT / 5% DELETE) and
  extending it with the TTL operations this project's spec requires that the rate-limiter
  project never needed:

  | Operation | Weight | Endpoint |
  |-----------|-------:|----------|
  | GET (read) | 68% | `GET /v1/kv/{key}` |
  | SET (write) | 15% | `PUT /v1/kv/{key}` — ~1/3 of these carry `ttlSeconds: 5` |
  | DELETE | 5% | `DELETE /v1/kv/{key}` |
  | EXPIRE (TTL churn) | 7% | `POST /v1/kv/{key}/expire` (`ttlSeconds: 10`) |
  | TTL read (TTL churn) | 5% | `GET /v1/kv/{key}/ttl` |

  Combined, **12% of traffic is TTL-related** (EXPIRE + TTL reads), covering RF-004/RF-005
  from `docs/spec.md` under load, in addition to the baseline CRUD mix. `MGET`/`MSET`/`KEYS`/
  `FLUSHDB`/`PERSIST` were **not** included in the load mix — they are exercised by the
  functional test suite (`tests/server.test.ts`), not this throughput benchmark; see §6
  limitations.
- Server config: default (`PORT=28081`, all limits at spec defaults — 512B max key, 1MiB
  max value, 100k max keys, 256MiB max approx memory). No artificial network delay.
  50 concurrent connections, 25 s duration per run, pipelining=1 (one in-flight request per
  connection, matching HTTP/1.1 keep-alive without pipelining abuse).
- **4xx responses are expected and correct, not failures.** GET/DELETE/EXPIRE/TTL against a
  key that was never set (or has expired) legitimately return `404 KEY_NOT_FOUND` or, for
  DELETE, a `200` with `deleted:0` — but because keys are drawn pseudo-randomly from a
  10,000-key space that starts empty, a large fraction of GET/EXPIRE/TTL calls in any given
  run land on not-yet-created keys, producing real, valid 404s (~35-38% of requests across
  runs). `errors` (transport-level) and `timeouts` are the only fields treated as failures;
  both were **0 in all 11 runs** (10 statistical + 1 tolerance re-check).

### 1.3 Scope confirmation (Go/Rust out of scope, not blocked)

Per the task instructions for this Fase 2.1 benchmark pass and per
`learner/pipeline_status.md`'s existing notes for this cycle ("Escopo desta sessão... somente
Node.js recebe implementação real e verificada neste ciclo"), Go and Rust were **not
attempted** in this benchmark phase — this is a scope decision carried over from the `impl`
and `review` phases of this same cycle, not a new finding. A quick `which go cargo rustc k6`
check (no installation attempt, per instructions not to re-attempt known-blocked network
installs) confirms none of the four are on `PATH` in this sandbox, consistent with the
`01_rate_limiter` cycle's independently-documented network-layer failures. No numbers are
fabricated or carried over for Go/Rust; they are simply absent from this report. (The prior
N=1 backfill report, superseded by this one, did include Go/Rust numbers from a macOS run —
those are preserved in git history but not merged with or reconciled against this report.)

### 1.4 Run matrix

| Language | Runs | Port | Tool | Status |
|----------|------|------|------|--------|
| Node.js/TypeScript | **N = 10** (`run-1.json` … `run-10.json`) + 1 tolerance-check run | 28081 | autocannon v8.0.0 | executed |
| Go | 0 | — | — | **out of scope this cycle** (§1.3) |
| Rust | 0 | — | — | **out of scope this cycle** (§1.3) |

Raw JSON per run: `curriculum/02_key_value_store/benchmarks/results/native/node/run-{1..10}.json`.
Tolerance re-check raw JSON: `.../native/node/tolerance-check-run.json`.
Load script: `curriculum/02_key_value_store/benchmarks/kv_load_autocannon.js`.

Build/run procedure (identical pattern to `01_rate_limiter`, since the committed
`node-impl/node_modules` is macOS-built and does not run on this Linux sandbox — missing
`@rollup`/native bindings for the wrong platform):

1. Fresh copy of `node-impl/{src,tests,package.json,package-lock.json,tsconfig.json,vitest.config.ts}`
   into `/tmp/kv-node-bench/`.
2. `npm install` (360 packages, 0 vulnerabilities reported at install time) + `npm install --no-save autocannon`.
3. `npx tsc` (clean build) and `npx vitest run` (6/6 tests passing — reconfirms the review
   phase's numbers) before benchmarking, as a build/correctness gate.
4. Per run: start `node dist/src/main.js` on `PORT=28081`, poll `/health` until `200`,
   background-sample `/proc/<pid>/status` VmHWM every 200ms, run the load script for 25s,
   stop sampling, kill the server, compute peak RSS from the sample max.

---

## 2. Summary Table — Node.js/TypeScript, N=10

| Metric | Mean | Median | Stdev | CV % | Min | Max |
|--------|-----:|-------:|------:|-----:|----:|----:|
| RPS (req/s) | 7,924.0 | 8,042.2 | 420.5 | 5.3% | 7,046.2 | 8,439.2 |
| Latency avg (ms) | 5.82 | 5.71 | 0.35 | 6.1% | 5.42 | 6.59 |
| Latency p50 (ms) | 5.30 | 5.00 | 0.48 | 9.1% | 5 | 6 |
| Latency p90 (ms) | 7.80 | 7.50 | 1.03 | 13.2% | 7 | 10 |
| Latency p95 (ms) | 10.50 | 10.00 | 2.01 | **19.2%** | 9 | 15 |
| Latency p99 (ms) | 12.80 | 12.00 | 2.57 | **20.1%** | 11 | 19 |
| Latency max (ms) | 229.6 | 231.0 | 22.66 | 9.9% | 201 | 280 |
| Peak RSS (MB) | 119.26 | 119.28 | 0.90 | 0.8% | 117.68 | 120.41 |
| Requests total (25s) | 198,133.4 | 201,090.5 | 10,514.8 | 5.3% | 176,182 | 211,014 |
| Fail rate (transport errors + timeouts) | 0.0 | 0.0 | — | — | 0 | 0 |

**Honesty flags per the CV>15% rule** (`benchmark.md`: "Se CV > 15% numa métrica-chave, rode
runs adicionais ou declare a métrica inconclusiva"): **p95 (19.2%) and p99 (20.1%) latency
are flagged as noisy/inconclusive** at this N — same pattern already observed in the
`01_rate_limiter` N=10 report on this same sandbox family (there: 16.3%/18.4%). Tail latency
is consistently the metric most sensitive to this VM's scheduler jitter (4 vCPUs, no CPU
pinning, unknown neighboring load from concurrent voxelDojo/pixelDojo/housekeeping activity
elsewhere in the repo). RPS, avg, p50, p90, max, peak RSS, and total-requests are all under
15% CV and are reported with confidence.

No cross-language winner is declared anywhere in this report — Go and Rust have no data
this cycle.

---

## 3. Per-run raw data (Node.js)

| Run | RPS | avg (ms) | p50 | p90 | p95 | p99 | max (ms) | Requests | Peak RSS (MB) |
|----:|----:|---------:|----:|----:|----:|----:|---------:|---------:|--------------:|
| 1 | 8,196.24 | 5.60 | 5 | 7 | 9 | 11 | 207 | 204,936 | 119.43 |
| 2 | 7,855.84 | 5.85 | 5 | 8 | 11 | 14 | 230 | 196,426 | 120.19 |
| 3 | 7,904.08 | 5.82 | 5 | 8 | 10 | 12 | 218 | 197,638 | 118.39 |
| 4 | 7,046.16 | 6.59 | 6 | 10 | 15 | 19 | 239 | 176,182 | 118.79 |
| 5 | 8,439.21 | 5.42 | 5 | 7 | 9 | 11 | 232 | 211,014 | 118.74 |
| 6 | 8,180.40 | 5.60 | 5 | 7 | 9 | 11 | 239 | 204,543 | 119.44 |
| 7 | 8,194.88 | 5.60 | 5 | 7 | 9 | 11 | 211 | 204,917 | 117.68 |
| 8 | 7,446.32 | 6.21 | 6 | 9 | 13 | 15 | 239 | 186,184 | 120.41 |
| 9 | 8,212.64 | 5.58 | 5 | 7 | 10 | 12 | 201 | 205,348 | 119.12 |
| 10 | 7,764.32 | 5.93 | 6 | 8 | 10 | 12 | 280 | 194,146 | 120.38 |

Every number above is traceable to
`benchmarks/results/native/node/run-{1..10}.json`. Every run recorded `errors: 0`,
`timeouts: 0`, `status_5xx: 0` — no transport failures or server errors across 1,987,334
total requests issued in the N=10 sample.

---

## 4. Bottlenecks / input for the optimizer

- Unlike the rate-limiter benchmark (which mostly measured a single short-circuit path),
  this workload exercises the real storage engine: `Map` lookups/inserts, TTL comparison
  (`process.hrtime.bigint()` per spec), JSON body parsing for SET/EXPIRE, and JSON
  serialization for every response envelope. RPS (~7,900-8,400 req/s at 50 connections) is
  meaningfully lower than the rate-limiter's ~18,000-19,000 req/s under a comparable
  connection count — expected, since this workload does real map mutation + TTL bookkeeping
  on every request instead of a single early-exit check.
- **Runs 4 and 8 are outliers** (7,046 and 7,446 RPS vs. a ~7,900-8,400 range for the other
  8 runs), with correspondingly worse p90/p95/p99 latency — likely explains most of the CV
  inflation on the tail-latency metrics. Worth re-running at higher N (20-30) on a quieter
  machine to see if this is sandbox noise or a real bimodal pattern (e.g. GC pause
  correlating with keyspace fill level as more of the 10k-key space gets populated over a
  25s run).
- **Latency max (~200-280ms) vs. p99 (~11-19ms)** — a roughly 15-20x gap between p99 and max
  suggests a small number of very slow outlier requests per run (likely GC pauses or event-
  loop stalls under Node's single-threaded model), not a systemic tail-latency problem. This
  is a good target for the optimizer to investigate (e.g. via `--trace-gc` or clinic.js) if
  tail-latency matters for this project's use case.
- Peak RSS is stable and low-variance (CV 0.8%) — a good baseline to check the optimizer
  hasn't introduced a leak (should stay within roughly 117-121 MB absent code changes, for a
  keyspace that churns up to 10,000 keys under this specific load shape).
- TTL-churn operations (EXPIRE + TTL reads, 12% of traffic) did not visibly separate from
  the rest of the mix in this aggregate view (autocannon does not report per-endpoint
  breakdowns) — if the optimizer wants isolated TTL-path numbers, a follow-up run restricted
  to 100% EXPIRE or 100% TTL-read traffic would be needed.
- **No data exists on Go or Rust** for this project — the optimizer cannot use this report
  for any cross-language comparison, only for Node-specific regression-checking against
  these N=10 numbers.

---

## 5. Recommendations

1. Do not treat this report as a 3-language comparison — it isn't one, by explicit scope
   decision for this cycle (§1.3), not by omission.
2. Investigate the run-4/run-8 outliers before the optimizer treats the current p95/p99
   numbers as a hard baseline — re-run at N=20-30, and consider correlating with GC activity
   or keyspace-fill progression within a run.
3. If cross-language comparison becomes in-scope in a future cycle, get Go and Rust
   toolchains onto a capable machine (this sandbox categorically lacks them, and network
   installs are blocked at the proxy layer) and re-run this same `kv_load_autocannon.js`
   workload (or an equivalent k6 port) against all three implementations at N≥10.
4. Re-run p95/p99 with a larger N (20-30) or on dedicated/quieter hardware before using
   those two metrics in any decision — they are the only ones that failed the CV≤15%
   honesty bar in this report.
5. Consider adding autocannon-level per-endpoint tagging (or switching to a tool that
   supports it) in a future cycle if the optimizer needs isolated SET vs. GET vs. TTL-path
   latency rather than an aggregate mixed-workload number.

---

## 6. Limitations & caveats

- **Only 1 of 3 languages executed, by explicit scope decision.** Go and Rust are absent
  from this report entirely — not estimated, not carried over, not fabricated. See §1.3.
- **k6 substituted with autocannon**, and a **custom weighted-mix script** was written
  (`kv_load_autocannon.js`) since autocannon has no native equivalent to k6's per-iteration
  scripting. This script's operation-mix ratios are a reasonable approximation of the
  existing `curriculum/_shared/benchmarks/kv_workload.js` k6 fixture (extended with TTL
  churn) but is not byte-for-byte the same tool or algorithm; numbers here should not be
  directly compared to any k6-based numbers elsewhere in this repo, including the superseded
  2026-07-02 backfill report for this same project.
- **MGET/MSET/KEYS/FLUSHDB/PERSIST are not part of the load-test mix.** Only SET/GET/DEL/
  EXPIRE/TTL-read were benchmarked under load; the other four endpoints are covered by
  functional tests, not throughput measurement. A future benchmark cycle could extend the
  mix if those operations' performance becomes a concern (e.g. FLUSHDB or large-KEYS-result
  latency under a full 100k-key store).
- **Single sustained-load shape, not the original 4-scenario matrix** referenced in
  `curriculum/02_key_value_store/benchmarks/scenarios/{baseline,stress,spike,endurance}.js`
  (pre-existing k6 scenario files from an earlier ungated backfill, not re-verified this
  cycle). autocannon has no equivalent to k6's `constant-arrival-rate` executor or staged
  ramps, so this report collapses baseline/stress/spike/endurance into one 25s/50-connection
  sustained-load run, repeated 10 times for statistical grounding. This satisfies the
  **N≥10 sample-count gate** for the one workload shape that was run, but does not reproduce
  the original 4-scenario coverage.
- **Empty-keyspace-at-start effect.** Because each of the 10 statistical runs starts a fresh
  server process (empty store), the first fraction of each 25s run is population-time
  (mostly SETs landing on genuinely new keys, GETs mostly missing). Runs are not "warmed"
  beforehand. This is consistent across all 10 runs (same procedure every time), so relative
  comparison between runs remains valid, but absolute numbers may differ from a
  long-running, fully-populated 10k-key store (the RNF-001/RNF-002 target scenario in
  `docs/spec.md`, which specifies "10,000 resident keys").
- **Shared, resource-constrained sandbox** (4 vCPU, 3.8 GiB RAM, unknown neighboring load).
  Absolute throughput numbers are not meaningful outside this exact sandbox and this exact
  run; only internal consistency (CV, tolerance re-check) is claimed.
- **Prior report superseded for this metric set.** The 2026-07-02 macOS/k6/3-language, N=1
  backfill report remains in git history and is still directionally informative for that
  hardware/toolchain combination, but is not merged with or reconciled against this report.
- **Verifier tolerance re-check performed and passed** for Node.js only (§7); no re-check
  was possible for Go/Rust since no baseline exists for them here.

---

## 7. Verifier gate (phase=benchmark) — tolerance re-check

Per `.claude/commands/devschool/benchmark.md`, an extra sample was re-run for Node.js and
checked against the recorded N=10 mean, tolerance ±20%:

| Language | Re-run RPS | Mean RPS (N=10) | Deviation | Re-run avg latency | Mean avg latency (N=10) | Deviation | Result |
|----------|-----------:|-----------------:|----------:|--------------------:|--------------------------:|----------:|--------|
| Node.js | 7,429.60 | 7,924.01 | 6.24% | 6.23 ms | 5.82 ms | 7.04% | **PASS** (within ±20%) |
| Go | — | — | — | — | — | — | not applicable — out of scope this cycle |
| Rust | — | — | — | — | — | — | not applicable — out of scope this cycle |

Node.js passes the tolerance check comfortably (both key metrics within ~7% of the N=10
mean, far inside the ±20% band), supporting that the N=10 dataset is reproducible and not
fabricated/noise-driven for this language. Raw tolerance-check JSON:
`benchmarks/results/native/node/tolerance-check-run.json`.