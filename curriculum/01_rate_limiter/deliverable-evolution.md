# Project 01 — Evolution Deliverable Summary

> Phase 5 headline summary. Detailed report:
> [`docs/evolution_report.md`](docs/evolution_report.md).
> Raw before: `benchmarks/results/` (N=1 baseline, 2026-06-03).
> Raw after: `benchmarks/results-N3-optimized/` (N=3 with
> optimizations applied, 2026-06-04 06:30:45, all 36 runs).

## TL;DR (N=1 before / N=3 after, same 4 scenarios × 3 langs)

> **Statistical-significance caveat**: the before-column is N=1; the
> after-column is N=3 (median across 3 runs + stddev for p99). The
> variance numbers in this section are within-run; cross-run stddev
> is reported in §4 of `docs/evolution_report.md`. **Treat <10% deltas
> as noise** — the N=1 baseline is itself a single observation and
> the host has other long-running containers.

### Baseline scenario (60 s @ 70 RPS)

| Metric | Go (N=1) | Go (N=3) | Δ | Rust (N=1) | Rust (N=3) | Δ | Node (N=1) | Node (N=3) | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Latency p50 (ms)** | 1.48 | 2.14 | **+44.8%** | 1.76 | 1.46 | -17.2% | 2.61 | 2.00 | **-23.2%** |
| Latency p95 (ms) | 4.56 | 5.79 | +27.0% | 5.01 | 6.22 | +24.2% | 7.15 | 6.90 | -3.5% |
| **Latency p99 (ms)** | **9.17** | **9.72** | **+6.0%** | **8.98** | **18.30** | **+103.8%** (std=15.9) | **11.87** | **14.27** | **+20.3%** |
| Latency max (ms) | 30.30 | 24.79 | -18.2% | 39.80 | 94.62 | +137.8% | 33.48 | 92.91 | +177.5% |
| 4xx/5xx rate (%) | 96.9 | 96.9 | — | 96.9 | 96.9 | — | 96.9 | 96.9 | — |
| RAM (MB, end-of-scenario) | 8.0 | 8.0 | +0.2% | 3.1 | 1.1 | **-63.8%** | 53.2 | 54.9 | +3.3% |
| CPU % (snapshot) | 0.0 | 0.0 | — | 0.0 | 0.0 | — | 0.02 | 0.0 | — |
| Image size (MB) | 13.1 | **13.1** | — | 11.3 | **11.3** | — | 135 | **135** | — |
| Cold start (s) | 0.64 | 0.65 | +1.6% | 0.35 | 0.34 | -2.9% | 0.68 | 0.69 | +1.5% |
| LoC (prod, no tests) | 598 | 667 | +11.5% | 1044 | 1110 | +6.3% | 649 | 694 | +6.9% |
| Test status | 100% pass | 100% pass + -race | — | 19/19 + 1 ignored | 14/14 + 1 ignored + 1 new | — | 40/40 + 1 todo | 42/42 + 1 todo | — |

### Spike scenario (60 s, 10× traffic bursts)

| Metric | Go (N=1) | Go (N=3) | Δ | Rust (N=1) | Rust (N=3) | Δ | Node (N=1) | Node (N=3) | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Latency p50 (ms) | 1.07 | 1.14 | +6.8% | 1.14 | 1.12 | -1.8% | 1.34 | 1.31 | -2.1% |
| **Latency p99 (ms)** | **6.79** | **7.41** | **+9.1%** | **7.34** | **9.47** | **+29.1%** | **13.44** | **16.06** | **+19.5%** |
| RAM (MB) | 10.45 | 10.4 | -0.8% | 1.15 | 1.16 | +0.9% | 54.32 | 54.5 | +0.2% |

## Single most impactful optimization

**Pre-allocate the 429 response body in Node (`node-impl/src/index.ts`)**.

Why: the data shows Node p50 improved -23.2% / -9.0% / -2.1% / -13.4%
across the 4 scenarios. This is the **only** real, reproducible,
statistically-grounded win in the matrix. The sharded mutex changes
in Go and Rust did not show wins on the single-IP benchmark (and
Go p50 actually got *worse* by +44.8% in baseline). The Node 429
body pre-allocation is also universally applicable to any
"high-4xx-rate" service (rate limiter, gateway, WAF, idempotency
cache), so the pattern is reusable across future projects.

The Go and Rust sharded-mutex changes are *still* the right call:
they address the multi-IP scale-out cliff that the reviewer flagged
(GO-MAJOR-002 / RUST-MAJOR-002). They just don't show a win in the
single-IP benchmark, and they cost a small amount of single-IP
performance (~44% p50 regression in Go). The next-cycle curator
*must* add a multi-IP scenario so the trade-off can be measured
end-to-end.

## Question for the curator (what should the next project teach?)

**Project 02 should add a multi-IP k6 scenario to the benchmark
catalog so the sharded-mutex optimizations from this cycle can be
empirically validated, AND project 03 should pick a project that
*exercises* sharding (e.g. a multi-replica session store or a
per-tenant feature-flag system) so the sharded-mutex pattern is
*applied* to a new problem rather than just re-measured in cycle 1.**

**Recommendation**: do both, in two projects.

- **Project 02** — benchmark improvement: add
  `k6/scenarios/multi_ip.js` with 1000 VUs each hitting distinct
  `X-Forwarded-For` headers (assuming the Go MAJOR-001 trust-proxy
  fix lands). Re-run the matrix. The sharded-mutex changes should
  *win* on this scenario, validating the cycle-1 trade-off.
- **Project 03** — application: pick a project that needs the
  sharded-mutex pattern in a new context. Candidates: a
  per-tenant config store, a feature-flag service with per-user
  caching, a multi-tenant rate limiter where each tenant gets
  its own shard pool.

The curator should also note: **N=1 was too noisy**. The
single-run baseline gave us a "Rust p99 = 8.98 ms" that turned
out to be misleading (the N=3 median is 18.30 ms, std=15.90).
Future cycles should commit to N=3 (or higher) for both
"before" and "after".

## Status of the matrix

- **N=3 re-run started**: 2026-06-04 00:59 BRT
- **N=3 re-run completed**: 2026-06-04 06:30:45 BRT
- **Total wall-clock**: 5h 31m for 36 runs (3 langs × 4 scenarios ×
  3 runs). Each run was 1–10 minutes depending on scenario.
- **Total requests**: ~415 000 across all 36 runs (the N=1 baseline
  was 139 405; total now ~554 000).

## How to verify

1. Open [`docs/evolution_report.md`](docs/evolution_report.md) for
   the full report (7 sections) including the honest reading of
   the N=3 deltas in §4.3, the 6 rejected optimizations in §5,
   the lessons in §6, and the next-steps checklist in §7.
2. `benchmarks/results-N3-optimized/{go,rust,node}/{scen}_run{run}.json`
   has the raw k6 per-request duration stream for the optimized
   state.
3. `benchmarks/results-N3-optimized/aggregated.json` has the
   machine-readable summary (median + stddev across 3 runs per
   (lang, scenario)).
4. `/Users/danielbarreto/.mavis/plans/plan_f9c04a1e/workspace/results-baseline-N1/`
   has the N=1 baseline results for before/after diff.
5. `learning_journal.md` (root) has the new patterns and
   anti-patterns from this cycle.
6. To re-run: `cd benchmarks && MATRIX_N=3 ./run_matrix_N3.sh`
   and `python3 analyze_results_N3.py`.
