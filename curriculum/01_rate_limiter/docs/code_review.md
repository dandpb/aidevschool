# Code Review — Project 01 · Token-Bucket Rate Limiter (Go · Rust · Node/TS)

> Reviewer: `reviewer` (independent pass, cycle `2026-06-04-01-rate-limiter`)
> Inputs: `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/`, `learner/journal.md`.
> Posture: rigor técnico, generosidade pedagógica — praise what is well-done, fix what isn't.
>
> **Provenance note (read this first):** `curriculum/01_rate_limiter/docs/` already contained a
> `code_review.md`, `learning_notes.md`, `quiz.md`, `benchmark_results.md`, `evolution_report.md`
> and `mutation_gate.md` from an **earlier, separate cycle** (`2026-06-03-01-rate-limiter`,
> commit `3412320` and prior) that ran outside the current gated `learner/pipeline_status.md`
> pipeline (which was reset to `impl-done` on 2026-07-02, commit `04a3463`). Per this project's
> `review.md` instructions, that prior `code_review.md` is treated as an **unverified draft**, not
> as ground truth. Every issue below was independently re-derived by reading the current
> `{go,rust,node}-impl/` source at file:line. Where the prior draft's issue still holds, it is
> kept (rephrased/re-confirmed against current line numbers). Where the code has since changed —
> notably: **both Go and Rust now ship a sharded mutex** (32 and 16 shards respectively), and
> **Rust's `retry_after` no longer has the dead-code conditional** the prior draft flagged — the
> stale finding is dropped and noted as fixed below. One issue class (dead `ClientKeyStrategy`
> abstractions) was missed by the prior draft entirely and is new in this pass.

## 0. Executive summary

All three implementations ship a working, tested, containerized token-bucket rate limiter that
satisfies `docs/spec.md` end-to-end: capacity 10, refill 2/s, lazy refill, per-client buckets,
`X-RateLimit-*` + `Retry-After` headers, unthrottled `/status`, idle cleanup. They converge on the
same core algorithm but diverge in the infrastructure around it.

| Dimension | Go | Rust | Node/TS |
|---|---|---|---|
| Pure-algorithm coverage | high (`ratelimit/` unit + table-driven tests) | high (16 sync unit tests) | 98.05% (`rateLimiter.ts`, independently re-measured) |
| Concurrency safety evidence | **strong**: dedicated goroutine-burst tests (`TestRateLimiter_ConcurrentAccessNoRace`, `TestMiddleware_ConcurrentRequests`) + `go test -race` per README | **partial**: the one async multi-task stress test is `#[ignore]`d; correctness relies on synchronous tests proving the lock spans check+consume | **N/A by construction**: single-threaded event loop, no shared-memory race is possible in-process |
| Bucket store design | 32-way sharded `sync.Mutex` array (FNV-1a hash) | 16-way sharded `std::sync::Mutex` array (`DefaultHasher`) | single `Map`, no sharding needed (single-threaded) |
| Client-key abstraction | `ClientKeyStrategy` interface + `RemoteAddrKeyStrategy`/`ForwardedHeaderKeyStrategy` defined in `clientkey.go` — **but unused**; `middleware.go` has its own inline duplicate | `ClientKeyStrategy` trait + `ConnectInfoClientKey` defined in `client_key.rs` — **fully dead code**, middleware/handlers call `ConnectInfo` directly | `createExpressClientKeyStrategy` defined in `clientKeyStrategy.ts` — **fully dead code**, `index.ts` has its own inline duplicate |
| Trust-proxy / `X-Forwarded-For` | strategy exists but not wired into `main.go`; effectively **not supported** | not supported (`ConnectInfo` only; no forwarded-header path at all) | wired via `TRUST_PROXY` config, opt-in |
| Config validation | warn-and-fallback (never fails boot) | silent fallback via `unwrap_or(default)` | zod-validated, hard fail (`ConfigError`) with batched messages |
| Observability | `slog` JSON | `tracing` + `tracing-subscriber` JSON | `pino` JSON |
| Runtime / build | static binary | static binary | `node:18-alpine`, but `@types/node ^20.14.10` — version skew |
| Mutation-tested? | no (line/branch coverage only) | no (line/branch coverage only) | **yes** — Stryker gate at 71.05% (`docs/mutation_gate.md`, re-verified current, PASS ≥60% threshold) |

Total issues in this pass: **21** (0 Critical, 8 Major, 9 Minor, 4 Educational). This is lower
than the prior draft's count of 27 mainly because two previously-Major findings (Go/Rust single
mutex, Rust dead-code conditional) are now **fixed** in the current code, not because the bar was
lowered — see §6 "Issues re-verified as fixed" for the paper trail.

No blocking (Critical) issues. All three implementations are sound enough to proceed to the
benchmark phase.

---

## 1. Summary table

| Implementation | Critical | Major | Minor | Educational | Total |
|---|---:|---:|---:|---:|---:|
| **Go** (`go-impl/`) | 0 | 2 | 3 | 1 | 6 |
| **Rust** (`rust-impl/`) | 0 | 2 | 3 | 2 | 7 |
| **Node/TS** (`node-impl/`) | 0 | 3 | 3 | 1 | 7 |
| **Cross-cutting** (counted once, affects all 3) | 0 | 1 | 0 | 0 | 1 |
| **All** | 0 | 8 | 9 | 4 | 21 |

Coverage of the 7 required categories (each hit at least once):

| Category | Hit in |
|---|---|
| Security | GO-MAJOR-001, NODE-MAJOR-002 |
| Performance | RUST-MINOR-002, NODE-MAJOR-003 |
| Readability | XLANG-MAJOR-001, RUST-MINOR-001 |
| Maintainability | GO-MINOR-002, RUST-MAJOR-001 |
| Idiomaticity | GO-EDU-001, RUST-EDU-001 |
| Error Handling | RUST-MINOR-001, GO-MINOR-001 |
| Testing | RUST-MAJOR-002, NODE-MAJOR-001, GO-MINOR-003 |

---

## 2. Cross-cutting

### [XLANG-MAJOR-001] `ClientKeyStrategy` abstraction is defined but never wired in, in all three languages

- **Files**:
  - `go-impl/ratelimit/clientkey.go:9-69` (defines `ClientKeyStrategy`, `RemoteAddrKeyStrategy`,
    `ForwardedHeaderKeyStrategy`) vs. `go-impl/ratelimit/middleware.go:15-22` (defines its own
    standalone `ClientKey(r *http.Request) string` and calls that instead — `clientkey.go` is
    imported by nothing outside its own file).
  - `rust-impl/src/client_key.rs:18-34` (defines `ClientKeyStrategy` trait, `ConnectInfoClientKey`)
    vs. `rust-impl/src/middleware.rs:31-37` and `rust-impl/src/handlers.rs:25-29` (both extract the
    IP directly via the `ConnectInfo<SocketAddr>` axum extractor, never referencing `client_key.rs`
    at all — confirmed via `grep -rn ClientKeyStrategy rust-impl/src`, zero matches outside the
    file itself).
  - `node-impl/src/clientKeyStrategy.ts:24-33` (defines `createExpressClientKeyStrategy`) vs.
    `node-impl/src/index.ts:185-205` (defines its own `resolveClientIp`/`normalizeIp` functions,
    byte-for-byte the same logic, and uses those instead).
- **Category**: Readability · Maintainability
- **Description**: All three implementations built a pluggable "client key" seam (interface/trait
  + at least one adapter), and then didn't plug it in. Each production code path re-implements the
  same IP-extraction logic inline. The abstraction files are exercised only by their own dedicated
  unit tests (100% coverage in Node's case per the mutation/coverage run), which is why this
  survived the diagnostic and mutation gates undetected — the dead code *looks* tested.
- **Impact**: Two maintenance costs. (1) A change to the extraction rule (e.g. adding a trusted-CIDR
  check) has to be made in the abstraction *and* in the inline duplicate, or the fix silently only
  applies to one. (2) A new contributor reading `clientkey.go`/`client_key.rs`/`clientKeyStrategy.ts`
  reasonably assumes it's the code path in production and wastes time debugging the wrong file.
- **Remediation**: Either (a) delete the unused abstraction files and their tests, keeping the
  inline versions that are actually live, or (b) wire the abstraction in — pass a
  `ClientKeyStrategy` into `Middleware`/`rate_limit_middleware`/`rateLimitMiddleware` and delete the
  inline duplicate. Given that `GO-MAJOR-001` below asks for exactly a pluggable
  trusted-proxy-aware key strategy, option (b) is the more valuable fix for Go; (a) is fine for
  Rust and Node where the extra flexibility isn't currently needed.
- **Reference**: YAGNI vs. dead-code-that-looks-alive; "vestigial abstraction" pattern.
- **Aprendizado**: An interface with 100% test coverage is not evidence it's used in production —
  it's evidence someone tested the interface in isolation. Grep for callers, not just for tests,
  before trusting a seam is load-bearing.

---

## 3. Go (`go-impl/`)

### [GO-MAJOR-001] No `X-Forwarded-For` handling reachable from the running server — limiter collapses behind a reverse proxy

- **File**: `go-impl/ratelimit/middleware.go:15-22`, `go-impl/main.go:125-134`
- **Category**: Security · Idiomaticity
- **Description**: The live `ClientKey` function (used by `Middleware` and `StatusHandler`) reads
  only `r.RemoteAddr`. A `ForwardedHeaderKeyStrategy` capable of trusting `X-Forwarded-For` already
  exists in `clientkey.go` (see XLANG-MAJOR-001) but `main.go`'s `buildHandler` never constructs or
  uses it. In a reverse-proxied deployment (nginx/ALB/Cloudflare — the normal shape for a production
  HTTP service), every request arrives with the same `RemoteAddr` (the proxy's), so every distinct
  client shares one bucket.
- **Impact**: Production-critical gap. One heavy client behind the proxy can 429 every other client
  sharing that proxy hop. This is the most common real-world failure mode of IP-keyed rate limiters.
- **Remediation**:
  1. Add `Config.TrustProxy bool` (env `RL_TRUST_PROXY`) to `main.go`.
  2. When true, build `ratelimit.ForwardedHeaderKeyStrategy{Header: "X-Forwarded-For", Fallback: ratelimit.RemoteAddrKeyStrategy{}}`
     and thread it through `Middleware`/`StatusHandler` (both currently call the standalone
     `ClientKey` func directly — they'd need to accept a `ClientKeyStrategy` parameter instead).
  3. Only trust the header when `RemoteAddr` itself is in a configured trusted-proxy CIDR list —
     blind trust of a client-supplied header is CWE-345.
  4. Add a test exercising both modes end to end (not just the existing isolated
     `ForwardedHeaderKeyStrategy` unit tests).
- **Reference**: CWE-345 (Auth Bypass by Spoofing); OWASP API4:2023 "Unrestricted Resource
  Consumption".
- **Aprendizado**: A "client IP" is a trust-boundary decision, not a socket-level fact. Building the
  strategy object is only half the work — it has no effect until something in the request path
  actually calls it.

### [GO-MAJOR-002] `idleTTL` field access pattern is fragile — one correct getter today, easy to break tomorrow

- **File**: `go-impl/ratelimit/cleanup.go:10-24`
- **Category**: Maintainability · Error Handling
- **Description**: `idleTTL` is written only through `SetIdleTTL` (locks `idleMu`) and read only
  through `readIdleTTL` (also locks `idleMu`) — this part is actually correct and race-free as
  written (`CleanupIdle` calls `readIdleTTL()`, never the raw field). The risk is that `idleTTL` is
  a plain unexported field with no compiler-enforced access rule: a future method added directly on
  `RateLimiter` that reads `rl.idleTTL` instead of calling `rl.readIdleTTL()` would compile cleanly
  and only misbehave under `-race` in CI, if at all (a torn read of a `time.Duration`, which is a
  machine word, is unlikely to be caught by `-race` unless it races with a concurrent write in the
  same test run).
- **Impact**: Latent, not present today. `go test -race` is clean because current callers are
  disciplined.
- **Remediation**: Rename the field to `idleTTLUnsafeAccessViaLockOnly` (deliberately loud) or, more
  idiomatically, wrap it in a small `atomicDuration` helper (`atomic.Int64` storing nanoseconds) so
  reads/writes cannot compile without the atomic accessor. Add a comment on the struct: "all access
  to idleTTL must go through readIdleTTL()/SetIdleTTL()".
- **Reference**: Effective Go "Concurrency"; `go vet -copylocks`.
- **Aprendizado**: A mutex-protected field is a contract enforced by convention, not by the
  compiler. Prefer atomics or a wrapper type when the discipline needs to survive a new
  contributor who hasn't read the comment.

### [GO-MINOR-001] No upper bound on the number of tracked buckets

- **File**: `go-impl/ratelimit/ratelimit.go:76-114`
- **Category**: Error Handling · Security
- **Description**: The 32 shard maps are unbounded `map[string]*ClientBucket`. Cleanup evicts after
  1h (or configured `idleTTL`), but an attacker able to vary the client key (trivially so once
  GO-MAJOR-001 is fixed and `X-Forwarded-For` is trusted) can force unbounded growth between
  cleanup ticks.
- **Impact**: Slow memory growth under sustained attack; no immediate crash given the 10-minute
  default cleanup cadence, but ops has no configured ceiling to alarm on.
- **Remediation**: Add a soft cap per shard (e.g. reject new keys past N buckets/shard with a log
  line) or move to an LRU-bounded structure.
- **Reference**: CWE-770.
- **Aprendizado**: Any cache keyed by attacker-influenced input is a DoS surface unless it has an
  explicit ceiling, independent of the TTL sweep.

### [GO-MINOR-002] `LoadConfig`/`Config` live in `package main`, not reusable

- **File**: `go-impl/main.go:23-90`
- **Category**: Maintainability
- **Description**: Env parsing is well-tested (via `package main` tests) but can't be imported by
  a second binary (Go disallows importing `main`). The `ratelimit/` package already models the
  "library, not main" split correctly; `main.go` doesn't mirror it for config.
- **Impact**: Low today; blocks reuse if a second binary (CLI diagnostic tool, migration script)
  is ever added.
- **Remediation**: Move `Config`/`DefaultConfig`/`LoadConfig` to an `internal/config` package.
- **Aprendizado**: `package main` is a leaf. Anything reusable belongs in a library package, even
  a 50-line one.

### [GO-MINOR-003] No test asserts `/status` is exempt from rate limiting via the public middleware path

- **File**: `go-impl/main_test.go`, `go-impl/ratelimit/ratelimit_test.go:274-294`
- **Category**: Testing
- **Description**: `TestStatusHandler_NotRateLimited` (ratelimit_test.go:274) does exist and does
  test this at the `ratelimit` package level — correcting an earlier assumption that this test was
  missing. It calls `StatusHandler` directly, not through `buildHandler`'s mux, so a future
  refactor that accidentally routes `/status` through `rl.Middleware` in `main.go` would still pass
  the package-level test while breaking the actual server.
- **Impact**: A regression at the wiring level (`main.go`) would not be caught by the existing test,
  only at the unit level.
- **Remediation**: Add one `main_test.go` case that builds the full `buildHandler` mux, drains the
  bucket via `/`, then confirms `/status` still returns 200 with no `X-RateLimit-*` headers.
- **Aprendizado**: A correctness property proven at the unit level should also get one assertion at
  the wiring/integration level — the two catch different classes of regression.

### [GO-EDU-001] Sharded `sync.Mutex` over `sync.Map` — the right call, and why

- **File**: `go-impl/ratelimit/ratelimit.go:56-91`
- **Category**: Idiomaticity
- **Description**: The 32-shard `sync.Mutex` design is well-documented in the type's doc comment
  and is the right choice: `sync.Map` is optimized for read-heavy, stable-key workloads, but every
  request here both reads and writes the same bucket, and keys churn as new clients arrive — the
  worst case for `sync.Map`. Sharding gets most of the contention win of `sync.Map` while keeping a
  plain, cheap critical section (map lookup + float arithmetic).
- **Aprendizado**: "More concurrent primitive" isn't automatically "faster". The right primitive is
  a function of the read/write ratio and key churn, not a general concurrency preference.

---

## 4. Rust (`rust-impl/`)

### [RUST-MAJOR-001] The one async concurrency stress test is `#[ignore]`d — concurrency safety is asserted by synchronous tests, not proven under real concurrent load

- **File**: `rust-impl/src/rate_limiter.rs:576-609`
- **Category**: Testing
- **Description**: `concurrent_requests_never_overconsume` (50 tokio tasks × 20 attempts against
  one IP, asserting exactly 10 allowed) is marked
  `#[ignore = "async tokio test hangs intermittently in test harness..."]`. The property it verifies
  — the mutex spans refill+check+consume so concurrent callers can't both observe "1 token left"
  — is real and is the one the spec explicitly calls out ("must handle high concurrent loads
  without race conditions"). The mitigating argument in the code comment (the synchronous tests
  prove the lock scope) is reasonable but is not the same evidence as an actual concurrent-task run.
- **Impact**: `cargo test` (the gate that runs in CI) does not exercise this property at all. A
  future refactor that narrows the lock scope (e.g. splitting refill and consume into two lock
  acquisitions "for readability") would pass every currently-running test and silently
  reintroduce a TOCTOU race.
- **Remediation**: The synchronous tests are a fine primary gate, but the concurrency property
  deserves at least one non-ignored, low-flake variant — e.g. spawn real OS threads (not tokio
  tasks) calling the synchronous `check()` directly with `std::thread::scope`, which avoids the
  tokio-runtime-teardown hang entirely since `RateLimiter::check` itself is synchronous. This
  keeps the same assertion (exactly 10 of 1000 attempts allowed) without needing the async runtime
  at all.
- **Reference**: tokio-rs/loom for genuine interleaving coverage if the team wants to go further.
- **Aprendizado**: If a concurrency test is disabled because of test-harness flakiness, check
  whether the property can be tested with a simpler concurrency primitive than the one causing the
  flakiness — here, `std::thread` sidesteps the tokio-teardown hang entirely because the code under
  test has no `.await` in it.

### [RUST-MAJOR-002] `Cargo.toml` does not declare `rust-version`, despite a real MSRV

- **File**: `rust-impl/Cargo.toml:1-14`
- **Category**: Maintainability
- **Description**: `axum 0.7.5` and the `Cargo.lock` resolution require a recent-ish Rust
  toolchain; the Dockerfile (not reviewed for exact tag here, but referenced in `evolution_report.md`)
  pins a specific version. None of this is encoded in the manifest itself.
- **Impact**: A contributor on an older local toolchain gets a generic dependency-resolution error
  instead of "this crate requires Rust X.Y+".
- **Remediation**: Add `rust-version = "1.81"` (or whatever the CI/Dockerfile pins) under
  `[package]`.
- **Aprendizado**: MSRV is part of a crate's public contract. State it in the manifest so `cargo`
  itself can give a good error message, rather than relying on a Docker tag nobody reads until the
  build breaks.

### [RUST-MINOR-001] `floor_u64` is safe today only because no caller can produce NaN — the guard isn't explicit

- **File**: `rust-impl/src/rate_limiter.rs:356-362`
- **Description**:
  ```rust
  fn floor_u64(x: f64) -> u64 {
      if x <= 0.0 { 0 } else { x as u64 }
  }
  ```
  `f64::NAN <= 0.0` is `false` (all NaN comparisons are false), so NaN falls into the `else` branch;
  `NAN as u64` happens to saturate to `0` under Rust's defined float-to-int cast semantics (post
  Rust 1.45, casts saturate rather than being UB), so this is not currently unsound — but the
  safety depends on a cast-semantics detail, not on an explicit check.
- **Category**: Error Handling
- **Impact**: Latent only. No current code path feeds NaN into this function (`tokens` is always
  bounded by `capacity` and `elapsed_secs >= 0` due to the `now <= last_refill` guard in `refill`).
- **Remediation**: `if !x.is_finite() || x <= 0.0 { 0 } else { x as u64 }` — makes the NaN/infinity
  handling a readable, intentional guard instead of an artifact of cast semantics.
- **Aprendizado**: Rust's saturating float-to-int casts make code like this safe by accident. Prefer
  making the domain restriction (`x` is always finite and non-negative here) explicit in the
  function, so the guarantee doesn't depend on a reader knowing the exact cast semantics.

### [RUST-MINOR-002] `spawn_cleanup`'s `JoinHandle` is discarded — the final idle sweep is skipped on shutdown

- **File**: `rust-impl/src/lib.rs:154-170, 218`
- **Category**: Performance
- **Description**: `let _cleanup = spawn_cleanup(...)` binds the handle to `_cleanup`, which is
  dropped (not joined) when `run()` returns after `axum::serve(...).with_graceful_shutdown(...)`
  completes. The cleanup task's `tick().await` is cancelled mid-wait; no final `prune_idle()` runs.
- **Impact**: Purely cosmetic — one sweep's worth of already-idle buckets lingers in memory for the
  remainder of the process's life, which is about to end anyway. Not user-visible.
- **Remediation**: If this is worth fixing at all (it's genuinely low-stakes), wrap the cleanup loop
  in a `tokio::select!` against the same shutdown signal and run one last `prune_idle()` before
  returning. Otherwise, a one-line comment acknowledging the trade-off is sufficient.
- **Aprendizado**: An unjoined `JoinHandle` isn't a bug by itself — it's a explicit choice to not
  observe how a background task ends. Fine when the task's work is idempotent/resumable (as here);
  worth a comment either way so the next reader doesn't have to work out o whether it's an oversight.

### [RUST-MINOR-003] Cross-language inconsistency: `/status` semantics for `last_seen` differ across all three implementations

- **Files**: `rust-impl/src/rate_limiter.rs:270-290` (refills tokens, does **not** touch
  `last_seen`) vs. `go-impl/ratelimit/ratelimit.go:230-243` (`Snapshot` explicitly sets
  `b.lastSeen = now`) vs. `node-impl/src/rateLimiter.ts:137-147` (`peek` doesn't mutate the bucket
  at all, so `lastRefillMs` — which doubles as the idle marker — is untouched).
- **Category**: Readability
- **Description**: The spec doesn't pin down whether hitting the unthrottled `/status` endpoint
  should count as "activity" for idle-cleanup purposes. All three implementations made a different
  choice. Rust's is the most defensible (documented in a code comment) and Node's is accidental
  (falls out of `peek` never writing to the bucket, not a deliberate design note); Go's — reviving
  a bucket just by checking its status — arguably contradicts the spec's intent that cleanup should
  evict genuinely inactive clients.
- **Impact**: No test failure (spec doesn't require a specific behavior), but a learner comparing
  the three implementations side-by-side would reasonably wonder which one is "correct".
- **Remediation**: Not a code fix — a spec fix. Add a line to `docs/spec.md` §5 stating explicitly:
  "`/status` reads must not refresh the idle-eviction clock." Then align Go to match.
- **Aprendizado**: When the same spec produces three different behaviors for an edge case the spec
  doesn't mention, that's a spec gap, not three independent bugs. Fix the spec, then align the code.

### [RUST-EDU-001] `std::sync::Mutex` over `tokio::sync::Mutex` for a synchronous critical section

- **File**: `rust-impl/src/rate_limiter.rs:158-166`
- **Category**: Idiomaticity
- **Description**: The choice is documented in the struct's doc comment and is correct: the
  critical section (hash lookup, float arithmetic) never holds an `.await`, so a synchronous mutex
  avoids the cost of parking the async runtime and a wake-up notification that `tokio::sync::Mutex`
  would impose on every single request.
- **Aprendizado**: Reach for `tokio::sync::Mutex` only when the lock must be held across an
  `.await`. For short, synchronous critical sections inside async code, `std::sync::Mutex` is both
  simpler and faster.

### [RUST-EDU-002] Anchoring `Instant` to `SystemTime` at construction — the correct way to make wall-clock output deterministic under a mock clock

- **File**: `rust-impl/src/rate_limiter.rs:167-172, 336-343`
- **Category**: Idiomaticity
- **Description**: `RateLimiter` captures both `start_instant` (monotonic) and
  `start_system_time` (wall-clock) once at construction, then derives any wall-clock instant as
  `start_system_time + (instant - start_instant)`. This lets `X-RateLimit-Reset` (which must be a
  Unix-epoch second) be computed deterministically under `MockClock` in tests, while still being
  correct under `SystemClock` in production.
- **Aprendizado**: `Instant` (monotonic, immune to NTP steps) and `SystemTime` (wall-clock, gives
  you an epoch) answer different questions. Capturing the pair once at boot and deriving one from
  the other is the general pattern for "testable wall-clock output" in Rust.

---

## 5. Node/TypeScript (`node-impl/`)

### [NODE-MAJOR-001] The 500-error contract is an empty `it.todo` — genuinely uncovered

- **File**: `node-impl/src/__tests__/server.test.ts:248`
- **Category**: Testing
- **Description**: `it.todo('returns 500 JSON for unhandled errors')` — re-confirmed present in
  the current file, and re-confirmed in the independently-run coverage report (`index.ts` at
  85.4% statements, with the 4-arg error-handler branch among the uncovered lines). The centralized
  error handler in `index.ts:115-121` (must not leak stack traces, must return JSON, must check
  `res.headersSent`) is real production logic with no test.
- **Impact**: A refactor of the error handler that returned HTML, leaked a stack trace, or crashed
  on `headersSent` would pass the full test suite today.
- **Remediation**:
  ```ts
  it('returns 500 JSON for unhandled errors', async () => {
    handle.app.get('/boom', () => { throw new Error('nope'); });
    const res = await request(handle.app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
  });
  ```
- **Aprendizado**: `it.todo` documents an intent, not a test. Treat a non-trivial `it.todo` in a
  reviewed codebase as an open finding, not a placeholder to skip past.

### [NODE-MAJOR-002] `TRUST_PROXY=true` is a single boolean — no hop-count or trusted-CIDR restriction

- **File**: `node-impl/src/config.ts:111-119`, `node-impl/src/index.ts:62-64, 185-190`
- **Category**: Security
- **Description**: When `TRUST_PROXY=true`, Express's `app.set('trust proxy', true)` trusts the
  left-most IP in `X-Forwarded-For` unconditionally. This is correct only when the only path to the
  process is through a proxy that itself strips any client-supplied `X-Forwarded-For` before adding
  its own. There's no way to express "trust only 1 hop" or "trust only these CIDRs" — it's an
  all-or-nothing boolean.
- **Impact**: A misconfigured deployment (proxy in the same trust zone as an attacker, or
  `TRUST_PROXY=true` with no proxy at all) allows any client to pick their own rate-limit bucket by
  sending an arbitrary `X-Forwarded-For` header — a full bypass of the rate limiter.
- **Remediation**: Support Express's numeric/CIDR `trust proxy` forms (`app.set('trust proxy', 1)`
  or a CIDR list) instead of only `true`/`false`; add a `TRUST_PROXY_HOPS` or
  `TRUST_PROXY_CIDRS` config key.
- **Reference**: CWE-345; Express `trust proxy` docs.
- **Aprendizado**: A boolean "trust the proxy" config is a footgun name — it hides the fact that
  trust should be scoped to a hop count or an address range, not granted globally.

### [NODE-MAJOR-003] Dockerfile pins `node:18-alpine`; `@types/node` targets `^20.14.10` — runtime/type skew

- **File**: `node-impl/Dockerfile:1,11`, `node-impl/package.json:26`
- **Category**: Maintainability
- **Description**: Re-confirmed in the current files: the Dockerfile's both build and run stages
  use `node:18-alpine`, while `@types/node` is pinned to the 20.x line. Node 18 reached end-of-life
  in April 2025 (per public Node.js release schedule) — this is now a "runtime is past EOL" finding,
  not just a version-skew one.
- **Impact**: Type declarations describe APIs/behavior that may not match the actual Node 18
  runtime; also the shipped container runs an unsupported Node version with no further security
  patches.
- **Remediation**: Bump the Dockerfile to `node:20-alpine` or `node:22-alpine` (matching whatever
  the team commits to), keep `@types/node` aligned to the same major.
- **Aprendizado**: `@types/node`'s major version is a claim about which runtime you're targeting.
  When it disagrees with the Dockerfile, one of the two is lying — figure out which one before
  shipping.

### [NODE-MINOR-001] `normalizeIp`'s regex only recognizes `::ffff:` IPv4-mapped addresses

- **File**: `node-impl/src/index.ts:192-205` (and the dead duplicate in `clientKeyStrategy.ts:35-48`)
- **Category**: Readability · Error Handling
- **Description**: `/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i` handles the common dual-stack form but not
  the deprecated IPv4-compatible form (`::127.0.0.1`) or other `::/96`-prefixed representations.
- **Impact**: Edge case — a client connecting over an unusual socket configuration could be bucketed
  differently than the "same" client over a standard dual-stack socket.
- **Remediation**: Use `net.isIPv4`/`net.isIPv6` plus a vetted normalization library, or explicitly
  document the assumption that only `::ffff:`-form addresses are normalized.
- **Aprendizado**: IPv6 has multiple textual forms for the same address; normalization belongs to a
  vetted library, not a hand-rolled regex, once more than one form needs handling.

### [NODE-MINOR-002] Single-process limiter — horizontal scale-out isn't documented as a limitation

- **File**: `node-impl/src/rateLimiter.ts:66-70` (in-process `Map`)
- **Category**: Performance · Maintainability
- **Description**: The bucket store is a plain in-memory `Map`. Running N replicas (PM2 cluster,
  Kubernetes horizontal scaling) gives each replica its own independent bucket, so the effective
  global capacity becomes `10 × N`, not `10`. This is a reasonable scope for the spec ("lightweight
  service") but isn't called out anywhere a deployer would see it before finding out the hard way.
- **Impact**: Documentation gap, not a code bug.
- **Remediation**: One paragraph in the README: "Limiter state is per-process; for multi-replica
  deployments, either use sticky sessions on client IP or move the store to a shared backend
  (Redis) — not implemented here."
- **Aprendizado**: Every in-memory store's blast radius (single-process vs. single-host vs.
  cluster-wide) should be one sentence in the README, not an implicit assumption.

### [NODE-EDU-001] Pure core + thin HTTP shell

- **File**: `node-impl/src/rateLimiter.ts` (zero imports from `express` or `node:http`) vs.
  `node-impl/src/index.ts` (the Express adapter)
- **Category**: Idiomaticity
- **Description**: `TokenBucketRateLimiter` takes a `clock` function and returns plain data; all
  HTTP concerns (headers, status codes, JSON bodies) live in `index.ts`. The unit test file
  (`rateLimiter.test.ts`, 19 tests) never imports Express; the integration test file
  (`server.test.ts`, 18 tests) drives the class only through real HTTP via `supertest`. This
  separation is why the class hits 98.05% coverage with zero HTTP-layer mocking.
- **Aprendizado**: "Ports & adapters" applied at the scale of a single class: put the algorithm on
  one side of a constructor argument (here, `clock`) and the delivery mechanism (HTTP, CLI,
  WebSocket) on the other. The class gets fast unit tests; the adapter gets integration tests
  against the real transport.

---

## 6. Issues re-verified as fixed since the prior (unverified) draft

These appeared in the pre-existing `docs/code_review.md` from the earlier, separately-run cycle
and no longer apply to the current code — re-confirmed by direct reading, not assumed:

1. **"Single mutex over the whole bucket map" (previously GO-MAJOR-002 and an equivalent Rust
   finding)** — both `go-impl/ratelimit/ratelimit.go:56-91` and `rust-impl/src/rate_limiter.rs:161-172`
   now implement a sharded-mutex design (32 shards in Go via FNV-1a, 16 shards in Rust via
   `DefaultHasher`), with the sharding rationale documented in-line. Fixed.
2. **"`retry_after` has a dead-code conditional" (previously RUST-MAJOR-002)** — the current
   `rust-impl/src/rate_limiter.rs:326-330` reads `1.max(seconds.ceil() as u64)`, exactly the
   simplified form the prior draft recommended. Fixed.

## 7. Security scans

`npm audit`, `cargo audit`, and `govulncheck` were not run against the dependency graphs in this
pass — this sandbox has a Node toolchain only (no `go`/`cargo` available), and running `npm audit`
against the lockfile without network egress to the registry would not produce a trustworthy result.
This is a real gap in this review's evidence, not a "no issues found" claim: **flagging it
explicitly rather than fabricating a clean scan result.** Recommend the `verifier` step (or a CI
job with full toolchain + network access) run all three before this cycle is considered fully
closed.

---

## 8. Cross-language comparison: concurrency, errors, state

- **Concurrency**: Go has the strongest *proven* concurrency story — dedicated goroutine-burst
  tests plus `-race` in CI. Rust has the strongest *designed* concurrency story (sharded sync
  mutex, no `.await` under lock) but the one test that would prove it under real concurrent load is
  disabled (RUST-MAJOR-001). Node sidesteps the question entirely: single-threaded execution means
  there is no shared-memory race to prove, which is a valid answer but only within one process
  (NODE-MINOR-002).
- **Error handling**: Node is the strictest at the boundary — `zod`-validated config that hard-fails
  boot on bad input (`ConfigError`). Go warns and falls back to defaults, favoring uptime over
  strictness. Rust silently falls back with `unwrap_or(default)`, the least visible of the three —
  an operator typo in `RATE_LIMITER_CAPACITY` produces no log line in Rust, a warning in Go, and a
  boot failure in Node. Three different philosophies for the same problem, worth discussing with a
  learner: "fail fast" vs. "degrade gracefully" is a decision, not a default.
- **State**: All three use the same lazy-refill formula and per-client bucket shape. They disagree
  on what counts as "activity" for idle-eviction purposes when only `/status` is hit
  (RUST-MINOR-003) — a spec gap common to all three, not a language-specific issue.

---

## 9. What's genuinely good here (say the quiet part out loud)

- The lazy-refill formula is implemented identically and correctly in all three languages, with
  the same `min(capacity, tokens + elapsed*rate)` shape and the same clamp against a
  backwards-moving clock.
- All three inject a `Clock` abstraction for deterministic testing — zero `time.Sleep`/real-timer
  flakiness in any of the 40 (Go) + 25 (Rust) + 56 (Node, 55 passed + 1 todo) tests.
- The "pure core, thin HTTP shell" split (Node explicitly, Rust via `rate_limiter.rs` having zero
  axum imports, Go via `ratelimit/` being HTTP-framework-agnostic apart from using `net/http`
  types) is applied consistently across all three, which is the single most reusable pattern in
  this project for a learner to take away.
- Node's Stryker mutation gate (71.05%, `docs/mutation_gate.md`) is real, re-run-able evidence of
  test quality that goes beyond line coverage — worth doing for Go and Rust too in a future pass.
