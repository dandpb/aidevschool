# Project 01 — Token-Bucket Rate Limiter: Evolution Report

> Phase 5 (`optimize`) deliverable for cycle `2026-06-04-01-rate-limiter`. Producer: `optimizer`
> (Cowork subagent, manually replicating `/devschool-optimize`).
>
> **Top-line honesty statement:** Benchmark and optimization verification is **Node.js-only** in
> this execution environment; Go and Rust changes are **code-reviewed proposals, not
> execution-verified**, due to sandbox toolchain limits (confirmed absent in Phase 3 review and
> Phase 4 benchmark — no `go`/`cargo`/`rustc` on `PATH`, no network egress to install them; see
> `docs/code_review.md` §7 and `docs/benchmark_results.md` §1.3). This report **supersedes** the
> pre-existing `docs/evolution_report.md` from the earlier, ungated `2026-06-03-01-rate-limiter`
> cycle (Docker/k6/N=3, 3-language) — that report is kept in git history but its numbers were
> produced outside the current pipeline and are not reconciled here.

_Run date: 2026-07-06 (also recorded as 2026-07-05 in adjacent same-day artifacts from this cycle).
Cycle: `2026-06-04-01-rate-limiter`. Phase: `optimize`._

---

## 1. Context

| Field | Value |
|-------|-------|
| Project | `01_rate_limiter` |
| Cycle | `2026-06-04-01-rate-limiter` |
| Phase entered | `benchmark-done` → `optimize` (this report closes the phase) |
| Inputs consumed | `docs/code_review.md` (verified, 21 issues), `docs/benchmark_results.md` + raw JSONs in `benchmarks/results/native/node/run-{1..10}.json` (verified, tolerance re-check PASS) |
| Environment | Same Cowork sandbox as Phases 3–4 (`practical-eloquent-bardeen`), aarch64, 4 vCPU, Node v22.22.3, no Docker, no k6, no go/cargo/rustc |

---

## 2. Bottlenecks used as input (from Phase 4, cited verbatim)

1. **[XLANG-MAJOR-001, code_review.md]** All three languages define a `ClientKeyStrategy`-style
   abstraction (`node-impl/src/clientKeyStrategy.ts`, `go-impl/ratelimit/clientkey.go`,
   `rust-impl/src/client_key.rs`) that is **never wired into the live request path** — each
   production code path (`index.ts`'s `resolveClientIp`, `middleware.go`'s `ClientKey`,
   `middleware.rs`/`handlers.rs`'s direct `ConnectInfo` extraction) re-implements the same logic
   inline instead. This is a real, concrete, cited defect — not a benchmark number, but the
   instructed pick for "the dead-code issue" to fix.
2. **[benchmark_results.md §4]** p95 (16.3% CV) and p99 (18.4% CV) latency were flagged
   **inconclusive** at N=10 — noisy tail latency, above the 15% honesty threshold. Bottleneck
   notes (§4) name the 429 hot path (per-request key resolution + token-bucket check +
   JSON-serialize-error) as the most latency-sensitive part of the request lifecycle, since ~99.99%
   of requests take that path under saturating load.
3. **[benchmark_results.md §4]** Peak RSS is stable (CV 0.7%, ~113.7MB) — named as a regression
   canary for the optimizer to watch, not a bottleneck to fix.

**Hypothesis** (per `optimize.md`'s required "if X, then Y improves because Z" form): *If the
duplicate inline `resolveClientIp`/`normalizeIp` logic in `index.ts` is replaced with a single call
into the already-tested `createExpressClientKeyStrategy` object, then maintainability improves
(one implementation instead of two) and the hot-path cost is at worst unchanged — the strategy
object is a thin, allocation-free wrapper over the same string operations, so no latency regression
is expected; a small win is possible if V8 optimizes the extracted closure better than two inlined
call sites.* This is presented as a maintainability fix with a neutral performance hypothesis, not
a performance-first change — see §5 for why a perf-first pick was rejected.

---

## 3. Optimization applied — Node.js (measured)

### 3.1 What changed

**File**: `curriculum/01_rate_limiter/node-impl/src/index.ts`

- Removed the inline, duplicate `resolveClientIp(req, trustProxy)` / `normalizeIp(raw)` function
  bodies from `index.ts` (previously ~25 lines duplicating `clientKeyStrategy.ts` byte-for-byte).
- Added `import { createExpressClientKeyStrategy } from './clientKeyStrategy'` and constructed one
  `clientKeyStrategy` instance per `buildServer()` call (once per process/test, not per request).
- Both call sites (`rateLimitMiddleware` and the `/status` handler) now call
  `clientKeyStrategy.resolve(req)` instead of the old inline function.
- `resolveClientIp` remains as an exported **thin delegator** (`return
  createExpressClientKeyStrategy(trustProxy).resolve(req)`) so `server.test.ts`'s existing
  `resolveClientIp` unit tests keep passing unmodified — there is now exactly **one**
  implementation of the normalization logic (in `clientKeyStrategy.ts`), not two.
- No changes to `rateLimiter.ts`, `config.ts`, or any other file.

This is remediation option (b) from `code_review.md` XLANG-MAJOR-001 ("wire the abstraction in ...
delete the inline duplicate"), applied to Node only, as instructed.

### 3.2 Pattern / risk / mitigation

| Field | Value |
|---|---|
| Catalog pattern | Dead-code elimination / single-source-of-truth refactor (not a classic perf pattern like pooling or batching) |
| Risk | Behavioral drift if the two implementations had silently diverged |
| Mitigation | Read both implementations line-by-line before editing (they were byte-identical); ran the full existing test suite (`clientKeyStrategy.test.ts`, 9 tests, and `server.test.ts`'s `resolveClientIp` describe block, 4 tests) after the change — all green, no test edits needed beyond the source change itself |
| Verification method | `npx tsc --noEmit` (clean), `npx eslint src --ext .ts` (clean), `npx vitest run --coverage` (55 passed / 1 todo, unchanged from before), `npx tsc -p tsconfig.json --outDir dist` (clean build), then re-benchmarked the built `dist/main.js` |

Tests were re-run after the change (not just once) in a fresh `/tmp` install (fresh `npm install`,
not the repo's committed `node_modules`) to rule out stale-build false positives, per the sandbox
methodology already established in the review/benchmark phases of this cycle.

### 3.3 Before / after — N=10, same workload as Phase 4

Same harness substitution as Phase 4 (k6 unavailable in this sandbox — network egress to
`dl.k6.io` blocked; substituted `autocannon` v8.0.0), same workload (`GET /`, 100 connections, 25s
duration, default `capacity=10`/`refillRate=2/s`), same peak-RSS method (`/proc/<pid>/status`
VmHWM sampled every 200ms). Raw JSON: `benchmarks/results/native/node/run-{1..10}.json` (before,
already verified in Phase 4) vs. `benchmarks/results/native-after/node/run-{1..10}.json` (after,
this phase).

| Metric | Before (median, N=10) | After (median, N=10) | Δ (median) | Before CV% | After CV% |
|---|---:|---:|---:|---:|---:|
| RPS (req/s) | 18,748.4 | 17,572.3 | **−6.3%** | 5.6% | 4.8% |
| Latency avg (ms) | 4.81 | 5.20 | **+8.1%** | 7.0% | 5.3% |
| Latency p50 (ms) | 4.00 | 5.00 | +25.0% | 11.2% | 0.0% |
| Latency p90 (ms) | 6.00 | 7.00 | +16.7% | 13.1% | 9.3% |
| Latency p95 (ms) | 8.00 | 8.00 | 0.0% | 16.3% (inconclusive) | 11.2% (now conclusive) |
| Latency p99 (ms) | 9.00 | 10.00 | +11.1% | 18.4% (inconclusive) | 15.2% (borderline) |
| Peak RSS (MB) | 113.88 | 112.75 | −1.0% | 0.7% | 0.8% |

**Honest reading: this did not improve throughput or latency; it made both measurably (not just
noise-level) worse, while genuinely simplifying the code.** The RPS delta (mean before 18,439.9 →
mean after 17,356.4, −5.9%) exceeds both runs' CV (~5%), so this is a real signal, not sampling
noise — though the magnitude is modest. Plausible causes, in order of likelihood:

1. **One extra layer of indirection per request.** The old code called `resolveClientIp(req,
   trustProxy)` — a single top-level function — directly. The new code calls
   `clientKeyStrategy.resolve(req)`, a method on a closure-captured object returned by a factory
   function. V8's inline cache for a method call through an object reference is very slightly more
   expensive than a direct function call in the extreme micro-benchmark regime this workload
   exercises (>99% of requests take the identical 429 short-circuit path, so any per-request fixed
   cost is amplified rather than amortized against real work).
2. **Shared, noisy sandbox.** Per `benchmark_results.md` §6, this sandbox has unknown neighboring
   load and no CPU pinning; the task's own instructions note concurrent activity elsewhere in the
   repo (voxelDojo/pixelDojo) during this session. The delta is larger than the measured CV,
   so noise alone is an incomplete explanation, but it cannot be ruled out as a contributing
   factor given a single 10-run session on a shared host.
3. **Not** a change in algorithmic complexity — the normalization logic itself (regex match, string
   slice) is identical in both versions; only the call shape changed.

This is reported as-is, per the discipline of "measure before and after, including when it doesn't
help." No claim of improvement is made. The change is retained anyway because: (a) its purpose was
maintainability, not performance — it directly fixes a documented code-review defect
(XLANG-MAJOR-001) — and (b) the regression, while real, is small relative to the noise floor of
this specific sandbox and does not represent an algorithmic regression; a re-run on quieter/dedicated
hardware would be needed before treating ~6-8% as a hard verdict on the pattern itself.

### 3.4 Full per-run data (after)

| Run | RPS | avg (ms) | p50 | p90 | p95 | p99 | Peak RSS (MB) |
|----:|----:|---------:|----:|----:|----:|----:|--------------:|
| 1 | 17,460.6 | 5.23 | 5 | 6 | 8 | 10 | 111.54 |
| 2 | 16,548.6 | 5.56 | 5 | 7 | 9 | 11 | 111.87 |
| 3 | 16,695.5 | 5.49 | 5 | 7 | 9 | 11 | 113.28 |
| 4 | 16,641.6 | 5.51 | 5 | 7 | 9 | 11 | 112.58 |
| 5 | 17,684.0 | 5.15 | 5 | 6 | 8 | 10 | 113.07 |
| 6 | 18,362.4 | 4.94 | 5 | 6 | 8 | 9 | 111.91 |
| 7 | 18,646.9 | 4.87 | 5 | 6 | 8 | 9 | 112.93 |
| 8 | 17,753.6 | 5.14 | 5 | 6 | 8 | 9 | 112.57 |
| 9 | 17,688.6 | 5.16 | 5 | 6 | 8 | 9 | 113.29 |
| 10 | 16,081.9 | 5.72 | 5 | 8 | 11 | 14 | 114.52 |

Mean RPS 17,356.4 (CV 4.8%), mean avg latency 5.28ms (CV 5.3%), mean peak RSS 112.76MB (CV 0.8%).
Every number above is traceable to `benchmarks/results/native-after/node/run-{1..10}.json`.

**Tolerance re-check** (verifier-style, ±20% band, same method as Phase 4 §7): one extra run
(`benchmarks/results/native-after/node/tolerance-check-run.json`) was executed after the N=10 set
— RPS 17,385.1 vs. N=10 mean 17,356.4 (deviation **0.17%**), avg latency 5.26ms vs. N=10 mean
5.28ms (deviation **0.4%**). Both comfortably within ±20%, confirming the after-dataset is
reproducible and the reported regression (§3.3) is not a one-off fluke.

---

## 4. Optimizations proposed for Go and Rust — UNVERIFIED, NOT COMPILE/TEST-CHECKED

**These are code-reviewed recommendations only. No Go or Rust code was changed in this phase.**
Reasoning for not applying, per the task's own risk guidance: this sandbox has no `go`, `cargo`, or
`rustc` on `PATH` and no network egress to install them (re-confirmed; same failure mode as Phases
3–4). Any edit to `.go`/`.rs` source here could not be compiled, linted (`go vet`/`clippy`), or
tested (`go test -race`/`cargo test`) before being committed — for Go/Rust specifically, an
unverified edit is strictly worse than a documented, unapplied proposal, because a subtle mistake
(e.g. a typo, an import cycle, a borrow-checker violation) would sit in the repo looking like
verified, working code until someone with a toolchain notices. Per the task's explicit guidance,
proposing without applying is the honest choice here.

### 4.1 Go — proposed, not applied

**Finding**: `go-impl/ratelimit/clientkey.go` defines `ClientKeyStrategy`/`RemoteAddrKeyStrategy`/
`ForwardedHeaderKeyStrategy`, but `middleware.go:15-22` has its own standalone `ClientKey(r
*http.Request) string` function that both `Middleware` and `StatusHandler` call instead — confirmed
by `grep -rn ClientKeyStrategy go-impl` returning zero matches outside `clientkey.go` itself.

**Two candidate fixes, in order of value** (per `code_review.md` GO-MAJOR-001 and
XLANG-MAJOR-001):

1. **Higher-value, higher-risk (not proposed for blind application): wire `ForwardedHeaderKeyStrategy`
   into `main.go`** to fix the real security/correctness gap (GO-MAJOR-001 — behind a reverse proxy,
   every client currently shares one bucket because only `RemoteAddr` is consulted). This requires
   adding a `Config.TrustProxy` field, threading a `ClientKeyStrategy` parameter through
   `Middleware`/`StatusHandler` (currently they call the package-level `ClientKey` func directly, so
   their signatures would need to change), and a new test exercising both modes end-to-end. This is
   a multi-file, behavior-changing edit — exactly the kind of change the task says not to make blind
   in a language with no available compiler/test runner here. **Recommended for a future cycle with
   toolchain access**, not applied now.
2. **Lower-value, lower-risk (proposed, also not applied): delete `clientkey.go`'s dead abstraction**
   (mirroring the Node fix), since nothing outside the file references it. This is a pure deletion
   with no behavior change, which would normally be safe to apply — but this sandbox's mount blocks
   `unlink`/`rm` on files inside the repo tree (confirmed: `rm` on a test file returned "Operation
   not permitted"), so even this low-risk deletion could not be mechanically applied here without
   the documented git-plumbing workaround, which is designed for git-object writes, not for safely
   editing/removing arbitrary source files sight-unseen of a compiler. **Recommended, not applied.**

**If applying (1) in a future cycle**: also fix GO-MINOR-001 (unbounded bucket map — becomes a real
DoS surface once trusted-proxy keys are attacker-influenced) in the same pass, since the two issues
compound.

### 4.2 Rust — proposed, not applied

**Finding**: `rust-impl/src/client_key.rs` defines a `ClientKeyStrategy` trait and
`ConnectInfoClientKey` adapter — but **it is not even declared as a module** anywhere (`grep -rn
"mod client_key" rust-impl/src` returns zero matches in `lib.rs` or `main.rs`). This is a stronger
form of "dead code" than the code review's phrasing suggested: the file isn't just unwired at the
call site, it appears to be **entirely excluded from the crate's module tree**, meaning `cargo
build`/`cargo test` would not compile this file's `#[cfg(test)]` module at all in the current
tree. (This could not be confirmed by an actual `cargo build` dry-run in this sandbox — no `cargo`
available — so it is reported as a strong grep-based inference, not an execution-verified fact.)

**Proposed fix**: delete `client_key.rs` (or, if a future toolchain-equipped pass wants the
trait-based seam for real, add `pub mod client_key;` to `lib.rs` and wire
`ConnectInfoClientKey` into `middleware.rs`/`handlers.rs` in place of the direct `ConnectInfo`
extraction — mirroring the Node fix). Not applied here for the same unlink-permission reason as
Go §4.1(2), and because a module-tree change to a `#[deny(warnings)]`-style Rust crate (if
configured — not verified without `cargo`) carries real risk of an unused-import or dead-code lint
failure that only a real `cargo build` could catch.

**Confidence assessment**: Medium-high that the deletion itself is safe (nothing else in the crate
references `client_key`, confirmed by grep across all of `rust-impl/src`); low-to-medium that a
*wiring* change would compile correctly on the first try without a real `rustc` to check borrow
lifetimes on `req.extensions()`. This is exactly the "not confident enough to safely edit blind"
case the task anticipated — documented as a recommendation, not applied.

---

## 5. Rejected optimization (≥1, with reasoning)

### 5.1 Rejected: extend the pre-allocated JSON body pattern to the 200/`/status` paths in Node

**What it was**: The pre-existing (superseded) `evolution_report.md` from the earlier ungated cycle
had already explored replacing `res.status(429).json({...})` with a pre-allocated string-concat
`res.end(PREFIX + n + SUFFIX)` to avoid a per-request object allocation + `JSON.stringify` call on
the hot 429 path — and that change is, in fact, already present in the current `index.ts` (lines
40-54, `TOO_MANY_REQUESTS_BODY_PREFIX`/`SUFFIX`). Re-reading it as a *candidate to extend further*
this phase (e.g. also hand-rolling the 200 welcome-message JSON and the `/status` JSON the same
way) was considered and **rejected**.

**Why rejected**:

1. **Marginal expected gain, real correctness risk.** The 200 and `/status` paths are a tiny
   fraction of traffic under the benchmark's saturating load (measured: 59 status-2xx out of
   461,124 total requests in one sample run, i.e. ~0.01%). Hand-rolling their JSON bodies would add
   string-formatting code (interpolating `tokens_remaining`, a floating-point value, into a
   hand-built string) with a real chance of a formatting bug (e.g. trailing-zero handling,
   locale-dependent decimal separators) for a path that contributes negligibly to the measured
   RPS/latency numbers. This is the textbook "optimizing what's easy to see, not what's hot"
   mistake the review process is supposed to catch.
2. **Complexity-for-value trade-off is bad.** `res.status(200).json({...})` for a ~0.01%-of-traffic
   path is far more maintainable (one line, self-documenting, correctly handles JSON escaping via
   the standard library) than a hand-built string for a saving that would not be visible above this
   sandbox's own measurement noise floor (CV 5-18% depending on metric).
3. **It would have obscured this phase's actual, instructed optimization.** The task specifies
   picking **one** concrete optimization per language to isolate impact; bundling a second
   micro-optimization into the same before/after measurement would make the §3.3 numbers
   uninterpretable (which change caused which delta?).

**Lesson for the catalog**: "Pre-allocate the hot path" is a real, already-applied pattern in this
codebase (the 429 body) — the mistake to avoid is applying the *same* pattern reflexively to paths
that aren't hot just because the code is nearby and looks similar. Measure which path is actually
hot (here: 429, by two orders of magnitude) before extending a working optimization to neighboring
code.

---

## 6. Cross-language insights anchored in numbers

1. **Node's dead-code-removal fix (§3) shows a real, if small, regression (RPS −5.9% mean, avg
   latency +7.3% mean), not an improvement** — a useful teaching point that *not every
   maintainability fix is performance-neutral*, even when the underlying logic is byte-identical.
   The lesson for the catalog: measure maintainability refactors on the same hot path you'd measure
   a perf change, because "it's just moving code around" is not a synonym for "free."
2. **The `ClientKeyStrategy` dead-code pattern (XLANG-MAJOR-001) recurred in all three languages
   independently** — this is now a confirmed **cross-language anti-pattern**, not a one-off. All
   three implementations built the same kind of pluggable seam and none of the three wired it in.
   Worth adding to the curriculum's pattern catalog as a named anti-pattern ("vestigial
   abstraction") with this project as the worked example, since it recurred by construction rather
   than by copy-paste (the three languages' implementations were written independently).
3. **Rust's dead code was deader than Go's or Node's** — `client_key.rs` isn't merely unwired at the
   call site (like the Go and Node equivalents), it's excluded from the module tree entirely (no
   `mod client_key;` anywhere). Go's `clientkey.go` at least compiles into the `ratelimit` package
   (same-directory files are automatically part of a Go package); Rust requires an explicit `mod`
   declaration that here was apparently never added. This is a small but real cross-language
   difference in how "unwired code" manifests: Go's compiler silently accepts an unreferenced
   exported type in a package; Rust's module system would (unverified — no `cargo` available to
   confirm) likely emit a `dead_code` warning once/if the module were declared, meaning Rust's
   tooling has a stronger structural nudge toward catching this class of issue — that nudge was
   simply never triggered here because the module declaration itself was missing.
4. **Sandbox execution asymmetry is now a two-phase pattern, not a one-off snag.** Benchmark (Phase
   4) and Optimize (Phase 5) both hit the identical toolchain wall for Go/Rust in this environment.
   Any future cycle run in this same sandbox type should budget for "Node-only execution-verified,
   Go/Rust code-reviewed-only" as the expected shape of the deliverable, not an exception to
   escalate each time.

---

## 7. Lessons for the curator

- A `docs/evolution_report.md` from an earlier, ungated cycle already existed for this project
  before this phase ran (2026-06-03/04, Docker+k6, N=3, 3-language). This is now the second time
  in this cycle (after `code_review.md` and `benchmark_results.md`) that a pre-existing artifact
  had to be explicitly superseded rather than trusted. Consider a lighter-weight convention (e.g. a
  `superseded-by:` front-matter field) so future phases don't have to re-derive this provenance
  note from scratch in the prose.
- The dead `ClientKeyStrategy` pattern recurring independently across three languages is a strong
  candidate for a **diagnostic-phase check** in future cycles: "for every interface/trait defined,
  confirm at least one production (non-test) caller exists" is a cheap, mechanical grep-based check
  that would have caught this before the review phase in all three languages.
- This sandbox's Go/Rust toolchain gap should be treated as a standing environment constraint for
  this project family, not re-investigated fresh each phase (Phase 4 already did the exhaustive
  installation-attempt logging in `benchmark_results.md` §1.3; this phase reused that conclusion
  rather than re-attempting installation).

---

## 8. Decision: loop again or project mature?

**Project mature enough to close this cycle's phase, with an explicit residual-work list carried
forward, not a clean bill of health:**

- Node.js: implemented, tested (55/55 + 1 todo), reviewed, benchmarked (N=10, verified), optimized
  (N=10, honestly reported as a regression), fully execution-verified end to end.
- Go/Rust: implemented and tested in their own native environments historically (per
  `learner/pipeline_status.md`'s dev-go/dev-rust `done` status from Phase 2), reviewed
  (Phase 3, static read), but **not** benchmarked or optimization-verified in *this* sandbox for
  this cycle. Their proposed optimizations (§4) are recommendations for a toolchain-equipped
  follow-up, not completed work.

Recommendation: do not loop the `optimize` phase again for Node without new benchmark evidence
motivating a different hypothesis (this phase's change was maintainability-motivated, and further
Node micro-optimization risks chasing noise below the sandbox's own CV floor, per §5). If a
toolchain-equipped environment becomes available, prioritize applying and *measuring* the Go
`TrustProxy`/`ForwardedHeaderKeyStrategy` wiring (§4.1) — it is the one recommendation in this
report that fixes a real production-security gap (GO-MAJOR-001), not just a style/maintainability
issue.

---

## 9. Verifier gate self-check (phase=optimize)

Self-checked honestly against `optimize.md`'s stated gate and `verifier.md`'s "Optimize" checklist,
against the **actual** state produced in this phase (not the ideal state):

| Check | Requirement | Actual state | Result |
|---|---|---|---|
| Tests still pass | All 3 impls' tests green after the change | Node: re-run from a fresh `/tmp` install, 55/55 passed + 1 pre-existing `it.todo` (unchanged), `tsc --noEmit` clean, `eslint` clean, build clean. **Go/Rust: not re-run — no toolchain in this sandbox; last known-good state is Phase 2's `dev-go`/`dev-rust done` status in `learner/pipeline_status.md`, not re-verified here.** | **PASS for Node; N/A (not re-verifiable) for Go/Rust — stated plainly, not glossed over** |
| 1 optimization claim re-verified (±20% tolerance) | Re-run 1 scenario, compare to reported mean | Node: extra run vs. N=10 after-mean — RPS deviation 0.17%, avg latency deviation 0.4%, both within ±20% (§3.3) | **PASS** |
| Before/After complete, traceable to JSONs | Full metric table + raw files for the applied optimization | Node: full table in §3.3, 10 raw JSONs in `benchmarks/results/native-after/node/run-{1..10}.json` + 1 tolerance-check JSON, all present | **PASS** |
| ≥1 rejected optimization documented | With reasoning | §5.1 (extending the pre-allocated-JSON pattern to low-traffic paths) | **PASS** |
| Exactly one optimization applied per language (to isolate impact) | 1 per language | Node: 1 applied (dead-code wiring). Go: 0 applied, 2 proposed. Rust: 0 applied, 1 proposed. | **Partial by design** — Go/Rust intentionally have zero *applied* changes, per the explicit sandbox-safety instruction to prefer an unapplied, documented proposal over an unverifiable blind edit. This is a deliberate deviation from "1 applied per language," disclosed here rather than silently short of the mark. |
| Honest labeling of unverified work | No fabricated Go/Rust before/after numbers | Confirmed: `benchmarks/results/native-after/go/` and `.../rust/` are empty directories, not populated with invented numbers; §4 explicitly labels both proposals "UNVERIFIED, NOT COMPILE/TEST-CHECKED" | **PASS** |

**Overall verdict: PASS for the Node.js track (the only execution-verified track); Go/Rust are
explicitly out-of-gate this phase (proposed-only, not benchmarked/optimized/re-verified) — this is
disclosed as a scope limitation of the sandbox, not claimed as a completed 3-language optimization
pass.** Per the row above, this cycle does not meet a literal "exactly 1 applied optimization per
language" reading of `optimize.md` for Go/Rust; it meets the task's explicit override instruction
that documenting-without-applying is preferable to an unverified blind edit for those two
languages. Recommend the next contributor with `go`/`cargo` access apply and benchmark the Go/Rust
proposals in §4 before those two languages can be said to have completed Phase 5.
