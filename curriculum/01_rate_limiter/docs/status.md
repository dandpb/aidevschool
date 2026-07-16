# Pipeline Status — Rate Limiter

> Superseded 2026-07-06 by the gated cycle `2026-06-04-01-rate-limiter` (this file previously
> reflected the earlier, ungated `2026-06-03-01-rate-limiter` cycle). The machine-readable
> authority is `learner/pipeline_status.yaml`; `learner/pipeline_status.md` is narrative only.

- **project_id:** 01_rate_limiter
- **project_name:** Rate Limiter (Token Bucket)
- **cycle_id:** 2026-06-04-01-rate-limiter
- **complexity_level:** 2
- **phase:** cycle-complete
- **awaiting:** next-curator
- **last_update:** 2026-07-06
- **updated_by:** optimizer (Cowork subagent, manual replication of `/devschool-optimize`)

## Implementations

### Go
- **status:** done (Phase 2, `dev-go`); **not re-executed in this sandbox** (no `go` toolchain, no network egress to install one)
- **coverage (last known, Phase 2):** ~85.9%
- **tests:** not re-run this cycle — see `docs/code_review.md` §7 and `docs/benchmark_results.md` §1.3

### Rust
- **status:** done (Phase 2, `dev-rust`); **not re-executed in this sandbox** (no `cargo`/`rustc`, committed release binary is macOS Mach-O, not Linux-runnable here)
- **tests (last known, Phase 2):** 14 unit + 6 integration tests green

### Node
- **status:** done, re-verified this cycle
- **coverage:** 92.91% (re-measured after the Phase 5 optimization; was 91.86% pre-optimization)
- **tests:** 55/55 pass + 1 pre-existing `it.todo` (unchanged)
- **lint:** clean (`eslint`), `tsc --noEmit` clean, build clean

## Code Review (Phase 3, re-derived from current code — see `docs/code_review.md`)
- 21 issues (0 Critical / 8 Major / 9 Minor / 4 Educational)
- All 7 categories covered

## Benchmarks (Phase 4 — see `docs/benchmark_results.md`)
- **Node.js only, N=10**, native harness (autocannon substitute for k6 — k6 unavailable in this
  sandbox): RPS mean 18,387.2 (CV 5.6%), avg latency 4.93ms (CV 7.0%), peak RSS 113.73MB (CV 0.7%).
  p95/p99 flagged inconclusive (CV 16.3%/18.4%, above the 15% honesty threshold).
- **Go/Rust: not executed** — toolchain unavailable in this sandbox (installation attempt
  documented and failed at the network layer, not skipped).

## Evolution (Phase 5 — see `docs/evolution_report.md`)
- **Node.js**: 1 optimization applied and measured (wired the dead `clientKeyStrategy.ts`
  abstraction into `index.ts`, removing the duplicate inline `resolveClientIp`/`normalizeIp`
  logic — fixes code-review finding XLANG-MAJOR-001). Re-measured N=10: **RPS −5.9% mean, avg
  latency +7.3% mean** — a real, small regression, reported honestly (not a fabricated
  improvement). Retained for maintainability, not performance.
- **Go/Rust**: 0 optimizations applied; 2 proposed for Go (wire `ForwardedHeaderKeyStrategy` for
  the trust-proxy security gap GO-MAJOR-001; or, lower-value, delete the dead `clientkey.go`) and
  1 proposed for Rust (delete `client_key.rs`, which is not even declared as a module in `lib.rs`).
  None applied — no toolchain available in this sandbox to compile/test-verify a Go/Rust change.
- ≥1 rejected optimization documented (extending the pre-allocated-JSON-body pattern to the
  low-traffic 200/`/status` paths — rejected as complexity-for-negligible-value).

## Known Limitations
1. **Go and Rust are execution-unverified for benchmark and optimize phases in this sandbox** —
   code-reviewed only; their Phase 2 test-pass status is carried forward from an earlier session,
   not re-confirmed here.
2. Node's Phase 5 optimization is a real (small) performance regression, not an improvement —
   documented honestly rather than reframed as a win.
3. p95/p99 Node latency remain borderline/inconclusive at N=10 (CV 11-15% after optimization,
   down from 16-18% before, but not comfortably under the 15% bar for p99).
4. Node single-process limitation (in-memory `Map`, no shared state across replicas) — documented,
   not fixed.
