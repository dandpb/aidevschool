# Code Review — Project 01 · Token-Bucket Rate Limiter (Go · Rust · Node/TS)

> Reviewer: `reviewer` (opus tier, cross-language staff-engineer posture)
> Inputs: `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/`, prior deliverables.
> Posture: **rigor técnico, generosidade pedagógica** — praise what is well-done, fix what isn't, and *teach* in the act of reviewing.

## 0. Executive summary

All three implementations ship a working, tested, containerized Token-Bucket
rate limiter that satisfies the spec end-to-end. They converge on the same
algorithm (lazy refill, per-IP buckets, idle-cleanup) but diverge sharply in
how they express the *infrastructure around the algorithm*: state protection,
error handling, configuration, observability, and HTTP wiring.

The implementations are not equivalent on quality dimensions that the spec
does not pin down. In particular:

| Dimension | Go | Rust | Node/TS |
|---|---|---|---|
| Pure-algorithm coverage | 99 % (`ratelimit/`) | 99 % (`rate_limiter.rs`) | 92 % |
| Concurrency safety evidence | strong: `go test -race` | partial: 1 tokio test ignored | weak: single-threaded by construction |
| HTTP-server idiom | stdlib + `http.ServeMux` | `axum 0.7` + `tower` | `express` + `http.createServer` |
| Trust-proxy / `X-Forwarded-For` | **not supported** (commented) | wired via `ConnectInfo` | wired via `trust proxy` config |
| Config validation | warn-and-fallback | silently fallback | zod-validated, hard fail |
| Observability | `slog` JSON | `tracing` + `tracing-subscriber` JSON | `pino` JSON |
| Build artifact | static binary, ~13 MB | static binary, ~3 MB | node 18 alpine, ~50 MB+ |
| Code quality issues raised in this review | 10 (0/3/5/2) | 8 (0/3/3/2) | 9 (0/4/3/2) |

Total issues raised: **27** (0 Critical, 10 Major, 11 Minor, 6 Educational).
No blocking issues — the implementations are production-shaped enough to
proceed to the benchmark phase, and the benchmark may surface performance
deltas that drive the optimizer phase.

The cross-language comparison is not "who wins". It is "which language forces
which design choice", and what each design choice costs.

---

## 1. Summary table

| Implementation | Critical | Major | Minor | Educational | Total |
|---|---:|---:|---:|---:|---:|
| **Go** (`go-impl/`) | 0 | 3 | 5 | 2 | 10 |
| **Rust** (`rust-impl/`) | 0 | 3 | 3 | 2 | 8 |
| **Node/TS** (`node-impl/`) | 0 | 4 | 3 | 2 | 9 |
| **All** | 0 | 10 | 11 | 6 | 27 |

Coverage of the 7 required categories — at least one issue per category
across the report:

| Category | Hit in |
|---|---|
| Security | Go-MAJOR-001, Node-MAJOR-002 |
| Performance | Go-MAJOR-002, Rust-MINOR-002 |
| Readability | Rust-MAJOR-002, Node-MINOR-001 |
| Maintainability | Node-MAJOR-003, Rust-MAJOR-003 |
| Idiomaticity | Go-EDU-001, Rust-EDU-001 |
| Error Handling | Rust-MINOR-001, Go-MINOR-001 |
| Testing | Rust-MAJOR-001, Node-MAJOR-001, Go-MINOR-002 |

---

## 2. Go (`go-impl/`)

### [GO-MAJOR-001] No `X-Forwarded-For` / `X-Real-IP` handling — limiter collapses behind a reverse proxy

- **File**: `go-impl/ratelimit/middleware.go:15-22`, `go-impl/main.go:125-134`
- **Category**: Security · Idiomaticity
- **Description**: `ClientKey` only reads `r.RemoteAddr`. The comment acknowledges
  the limitation ("in deployments behind a trusted reverse proxy you would also
  consult X-Forwarded-For") but does not surface it as a configurable option.
  In a Kubernetes / nginx / Cloudflare / AWS-ALB deployment — which is the
  *normal* deployment shape for a 2026 service — every request appears from
  the proxy's IP, so every client shares **one bucket**. The Node impl ships
  `TRUST_PROXY`; Rust gets it for free via axum's `ConnectInfo`; Go has neither.
- **Impact**: Production-critical feature gap. A single attacker behind the
  proxy can drain the global bucket and 429 every legitimate user. This is
  the most common security failure of in-memory rate limiters.
- **Remediation**:
  1. Add a `Config.TrustProxy bool` (env `RL_TRUST_PROXY`) and pass it to
     `ClientKey(req, trustProxy)`.
  2. When true, take the leftmost IP in `X-Forwarded-For` and **only** trust
     the header from `RemoteAddr` IPs in a configurable trusted-proxy CIDR
     list (e.g. `RL_TRUSTED_PROXIES=10.0.0.0/8,127.0.0.1/32`). Blind trust
     of `X-Forwarded-For` is a CWE-345 (Auth Bypass by Spoofing) surface.
  3. Write a test that exercises both modes.
- **Reference**: CWE-345; Go `httputil.NewSingleHostReverseProxy` security
  note; OWASP API4:2023 "Unrestricted Resource Consumption".
- **Aprendizado**: A "client IP" is not a socket-level fact — it is a
  trust-boundary decision. The map `socket → authoritative IP` must be
  owned by the *operator*, not the library.

### [GO-MAJOR-002] Single mutex over the whole bucket map — no sharding, no read-only fast path

- **File**: `go-impl/ratelimit/ratelimit.go:47-62, 114-140, 177-190`
- **Category**: Performance
- **Description**: `RateLimiter` holds one `sync.Mutex` over `buckets`. Every
  `Allow`, `Snapshot`, `SetIdleTTL`, `CleanupIdle` takes the same lock. For
  the spec's stated scale ("10s of clients, low RPS") this is *correct* and
  simpler than sharding. The package doc even calls it out: "For the rates
  in the spec (10s of clients, low RPS) this outperforms sharded/sync.Map
  designs." But once the optimizer or benchmarker pushes RPS into the
  thousands, this becomes the bottleneck.
- **Impact**: No bug today; will become a bottleneck at >5 k RPS on a
  multi-core box. Worth a comment that says "if you scale past N, switch
  to per-bucket locking (sync.Map) or per-IP sharding (256-shard
  `sync.Mutex` array by hash of key)".
- **Remediation**:
  1. For now, **add a benchmark** (the `benchmarker` agent will do this
     anyway) and **add a comment** in `ratelimit.go` documenting the
     scaling cliff.
  2. Long-term, swap for sharded locks keyed by `fnv32(key) % 256`. The
     sharding layout is mechanical and preserves the existing API.
- **Reference**: `golang.org/x/sync/singleflight`, `sync.Map` docs on
  write-heavy patterns; Cloudflare's "Sharding mutex" pattern.
- **Aprendizado**: "Correct first, then fast" is the right call — but
  the seam at which "fast" is needed must be flagged in the code so
  the next engineer doesn't reinvent the wheel.

### [GO-MAJOR-003] `idleTTL` field read without mutex from getter paths

- **File**: `go-impl/ratelimit/cleanup.go:10-14, 20-36, 42-61`
- **Category**: Maintainability · Error Handling
- **Description**: `idleTTL` is mutated only by `SetIdleTTL` (which locks),
  but read inside `cleanupLocked` (which is *already* holding the mutex)
  and *implicitly* read by any future caller who forgets to lock. There is
  no `IdleTTL()` getter that takes the mutex. A naive future `func (rl
  *RateLimiter) IsIdle(k string) bool { ... }` would race.
- **Impact**: Latent race; no current test trips it (cleanup tests
  call `CleanupIdle` which locks). The `go test -race` is clean today
  because the only field is read under lock. Future drift is the risk.
- **Remediation**: Add `func (rl *RateLimiter) IdleTTL() time.Duration`
  that locks, and a `// All field access must hold rl.mu.` comment at the
  type declaration. Consider `go vet -copylocks` and `-tests` as part of CI.
- **Reference**: Effective Go "Concurrency"; `go vet -copylocks` for the
  related mutex-by-value issue.
- **Aprendizado**: A mutex-protected field is a *contract*, not a fact.
  The compiler can enforce "do not copy the struct" but not "do not read
  without locking". Comments carry the weight — or, better, a `withLock`
  helper that scopes all access.

### [GO-MINOR-001] No upper bound on the number of tracked buckets

- **File**: `go-impl/ratelimit/ratelimit.go:48-62`
- **Category**: Error Handling · Security
- **Description**: `buckets` is an unbounded `map[string]*ClientBucket`. The
  cleanup loop evicts after 1h, but a single attacker can spray requests
  with random `X-Forwarded-For` (when GO-MAJOR-001 is fixed) and force the
  map to grow. A 1 MB bucket × 1 M unique keys = 1 GB resident before
  cleanup catches up.
- **Impact**: Slow memory growth under attack. No immediate crash.
- **Remediation**: Add a soft cap (e.g. 1 M buckets) — beyond that, log a
  warning and stop tracking new clients (effectively global 429). Or
  LRU-evict.
- **Reference**: CWE-770 (Allocation of Resources Without Limits or
  Throttling); OWASP API4.
- **Aprendizado**: Every cache is a DoS surface when keyed by user input.
  A bounded cache is harder to attack than an unbounded one cleaned by a
  best-effort sweeper.

### [GO-MINOR-002] `TestBuildHandler_HealthAlwaysOK` does not assert `/status` behavior

- **File**: `go-impl/main_test.go:160-170`
- **Category**: Testing
- **Description**: The "everything is up" test checks `/healthz` and
  `/` and `/status` *only for the status code*. There is no assertion
  that `/status` is not rate-limited (Node's `server.test.ts` has this
  test; Go does not).
- **Impact**: A future refactor that accidentally puts `/status` under
  the rate-limit middleware would pass all current Go tests.
- **Remediation**: Add `TestStatusHandler_NeverRateLimited` mirroring
  the Node test: drain the bucket, then call `/status` 50 times, all
  must return 200.
- **Reference**: Test pyramid principle — fail fast on the invariant
  you care about, not on side-effects.
- **Aprendizado**: "Smoke" tests should encode *the contract*, not just
  "it didn't crash". A 200 status is necessary but not sufficient.

### [GO-MINOR-003] `LoadConfig` is `package main` and not testable in isolation

- **File**: `go-impl/main.go:51-90`
- **Category**: Maintainability
- **Description**: The env-parsing code lives in `main.go` and is only
  testable via `package main` tests. The tests do cover it well, but
  importing `main` is not idiomatic Go and prevents reuse by other
  binaries. (The ratelimit/ subpackage is already structured this way
  — the main package should mirror.)
- **Impact**: Low — works today, but a second binary (e.g. a `rl-cli`
  diagnostic tool) would either duplicate `LoadConfig` or import
  `main`, which Go disallows for downstream packages.
- **Remediation**: Move `Config`, `DefaultConfig`, `LoadConfig` into a
  small `internal/config` package.
- **Aprendizado**: `package main` is a leaf — anything you'd want to
  reuse belongs in a library package, even a 50-line one.

### [GO-MINOR-004] `WriteTimeout: 15 * time.Second` may be shorter than lazy-refill math window

- **File**: `go-impl/main.go:170`
- **Category**: Performance
- **Description**: A 15 s `WriteTimeout` is conservative but worth a
  comment that it is *not* tied to the rate limiter's own timeouts.
  Inconsistency between server-level and limiter-level timeouts is a
  common source of "why is my client getting cut off" tickets.
- **Impact**: Operational, not a bug. Confusing if someone changes
  one and not the other.
- **Remediation**: Either parameterize all timeouts from one
  `Timeouts` struct, or comment each one with the reason.
- **Aprendizado**: Timeouts are an API. Centralize them or document
  why they are independent.

### [GO-MINOR-005] `rateLimitResponse.Error` and `rateLimitResponse.RetryAfterSeconds` are pre-computed but no test asserts on header/body consistency

- **File**: `go-impl/ratelimit/middleware.go:24-28, 53-64`
- **Category**: Testing
- **Description**: `Retry-After: d.RetryAfter` and `retry_after_seconds:
  d.RetryAfter` are set from the same field. The tests verify the
  header (`TestMiddleware_HeadersOn429`) and the body field
  (`TestMiddleware_429BodyShape`) separately but do not assert they
  match.
- **Impact**: Low — both come from the same source today. But
  tomorrow someone could change one and not the other.
- **Remediation**: In `TestMiddleware_429BodyShape`, parse the
  `Retry-After` header, parse the body, assert equality.
- **Aprendizado**: A bug in the *relationship* between two outputs
  is invisible unless you test the relationship.

### [GO-EDU-001] Why `sync.Mutex` over `sync.Map` here — and when to revisit

- **File**: `go-impl/ratelimit/ratelimit.go:48-62`
- **Category**: Idiomaticity
- **Description**: The choice is documented in the type comment, but a
  new contributor might assume "concurrency = sync.Map". The actual
  rule: **`sync.Map` is for read-heavy workloads with infrequent
  writes and stable keys**. Here, every request *both* reads and
  writes a bucket, and the keys churn as new clients connect. That is
  the worst-case pattern for `sync.Map`. A plain `map + sync.Mutex`
  is faster because the critical section is a single map lookup and
  a few float ops.
- **Aprendizado**: The right primitive is a function of access
  pattern, not "more concurrent = better". When in doubt, benchmark
  both. (The benchmarker agent will do exactly this in the next phase.)

### [GO-EDU-002] `ClientKey` is a function, not a method — for testability and dependency-injection

- **File**: `go-impl/ratelimit/middleware.go:15`
- **Category**: Idiomaticity
- **Description**: Standalone `ClientKey(r *http.Request) string` rather
  than `rl.ClientKey(r)`. This is good Go style — it lets you swap the
  keying strategy without owning a `*RateLimiter`, and it makes the
  function testable on a bare `*http.Request`. Many Go libraries make
  this mistake and then can't be used in middleware that doesn't have
  access to the limiter instance.
- **Aprendizado**: Pure functions are the unit of testability. The
  tighter the coupling between a function and the struct that owns
  it, the harder the function is to test in isolation.

---

## 3. Rust (`rust-impl/`)

### [RUST-MAJOR-001] `cargo test` ignores `concurrent_requests_never_overconsume` — concurrency safety is *asserted*, not *proven*

- **File**: `rust-impl/src/rate_limiter.rs:510-544`
- **Category**: Testing
- **Description**: The single test that exercises 50 concurrent tasks
  hitting the same IP is `#[ignore]` because the multi-thread tokio test
  runtime hangs at teardown. The property is correct (the synchronous
  tests prove that the lock spans the check+consume), but the test
  suite does not run a stress test. The `deliverable-impl-rust.md`
  acknowledges this: "the host's tokio test runtime hangs at teardown
  when many spawned tasks or `tokio::time::interval` loops are
  involved."
- **Impact**: CI does not catch a future regression that re-introduces
  a race. The smoke test in the deliverable is one-shot and not part
  of the gate.
- **Remediation**:
  1. Run the ignored test in a separate target: `cargo test
     --release -- --ignored concurrent_requests_never_overconsume`
     and gate release builds on it.
  2. Add a `loom`-based test (https://github.com/tokio-rs/loom) for
     genuine interleaving coverage.
  3. Document the gate in `Cargo.toml` via `[package.metadata.dev-
     ci]` or a `xtask` binary.
- **Reference**: tokio-rs/loom README; "Testing concurrent code" in
  the Tokio docs.
- **Aprendizado**: A `#[ignore]`d test that covers a real safety
  property is a *liability* — the test that doesn't run is the test
  that won't catch the bug. Either fix the test harness, move the
  test, or split the property into smaller deterministic pieces
  that don't need 50 tasks to express.

### [RUST-MAJOR-002] `retry_after` has a dead-code conditional that confuses readers

- **File**: `rust-impl/src/rate_limiter.rs:291-299`
- **Category**: Readability · Maintainability
- **Description**:
  ```rust
  let ceil = seconds.ceil() as u64;
  ceil.max(if tokens < 1.0 { 1 } else { 0 })
  ```
  The outer `ceil.max(…)` always returns `ceil` (which is `>= 1` when
  `seconds > 0`) or `0` (when `seconds == 0`, but then we wouldn't
  have been called with `tokens < 1.0`). The `if tokens < 1.0 { 1 }
  else { 0 }` branch is dead. The intent — "Retry-After must be at
  least 1 when denied" — is real; the implementation is just
  `1.max(seconds.ceil() as u64)`.
- **Impact**: Future maintainer wastes time puzzling this out; tiny
  chance someone changes `ceil` to `floor` and the dead branch
  becomes load-bearing.
- **Remediation**:
  ```rust
  let secs = (deficit / self.config.refill_rate_per_second).ceil() as u64;
  1.max(secs)
  ```
  Add a one-line comment: "Retry-After is the wait until *one* token
  is available, and must be at least 1 second so clients don't
  hot-loop."
- **Aprendizado**: Conditional expressions are cheap to write and
  expensive to read. If a branch is never taken, the code is
  shouting "rewrite me".

### [RUST-MAJOR-003] `Cargo.toml` does not declare `rust-version` — build reproducibility depends on the Dockerfile

- **File**: `rust-impl/Cargo.toml:1-15`
- **Category**: Maintainability
- **Description**: The crate uses `axum 0.7`, which requires Rust 1.75+.
  The v4 `Cargo.lock` requires Rust 1.81+. The Dockerfile pins
  `rust:1.81-alpine`. None of this is encoded in the manifest, so
  someone running `cargo build` on Rust 1.74 gets a confusing error.
  The `deliverable-impl-rust.md` documents the version skew; the
  manifest should too.
- **Impact**: New contributor (or CI) builds the wrong Rust and gets
  a cargo error that doesn't say "this needs Rust 1.81+".
- **Remediation**: Add to `Cargo.toml`:
  ```toml
  [package]
  rust-version = "1.81"
  ```
  Then `cargo` will tell the user to upgrade.
- **Aprendizado**: A library's MSRV is part of its contract. State
  it in the manifest, not in a Docker tag.

### [RUST-MINOR-001] `floor_u64` panics on `NaN` (unreachable in practice but type-permissive)

- **File**: `rust-impl/src/rate_limiter.rs:314-320`
- **Category**: Error Handling
- **Description**:
  ```rust
  fn floor_u64(x: f64) -> u64 {
      if x <= 0.0 { 0 } else { x as u64 }
  }
  ```
  `f64::NAN` is not `<= 0.0` (all NaN comparisons return false), so the
  `else` branch runs and `(f64::NAN as u64) == 0` happens to be safe.
  But this is by accident. A future change to the formula could turn
  a NaN-producing path into a `u64::MAX` result.
- **Impact**: Latent. No path produces NaN today because
  `(bucket.tokens + elapsed * rate)` is bounded by `capacity` and
  `elapsed >= 0`.
- **Remediation**:
  ```rust
  fn floor_u64(x: f64) -> u64 {
      if !x.is_finite() || x <= 0.0 { 0 } else { x as u64 }
  }
  ```
  Or use `.max(0.0)` upstream so NaN never reaches the formatter.
- **Aprendizado**: `f64 → u64` casts have *four* branches (finite ≥ 0,
  finite < 0, NaN, infinity), not two. Either prove the input space
  excludes three of them, or guard all four.

### [RUST-MINOR-002] `spawn_cleanup` task is not awaited on shutdown — final sweep is skipped

- **File**: `rust-impl/src/lib.rs:154-170, 218`
- **Category**: Performance
- **Description**: `let _cleanup = spawn_cleanup(...)` is bound to a
  discarded handle. When `axum::serve` returns, the cleanup task is
  dropped. Its current `tick().await` is cancelled, and the final
  `prune_idle()` is skipped. The task itself has no shutdown signal,
  so the cancellation is the only thing that stops it.
- **Impact**: One sweep is missed. Idle buckets live ~1 cleanup
  interval longer than they should. Not user-visible.
- **Remediation**: Either
  1. Wrap the cleanup in a `tokio::select!` with a `shutdown` signal
     so it can do a final sweep before exiting, or
  2. Accept the trade-off and document it.
- **Aprendizado**: Background tasks need shutdown wiring, not just
  a "fire and forget" spawn. A `JoinHandle` you never join is a
  join you never observe.

### [RUST-MINOR-003] Inconsistency with Go/Node: `/status` does not update `last_seen`

- **File**: `rust-impl/src/rate_limiter.rs:235-257`
- **Category**: Readability
- **Description**: The Rust `status()` method refreshes tokens but
  *deliberately* does not update `last_seen`, so an idle client
  hitting `/status` doesn't keep itself alive. The Go `Snapshot`
  method *does* update `last_seen`. The Node `peek()` does *not*
  mutate the bucket at all (only reads the existing `lastRefillMs`).
  Three different semantics for the same operation.
- **Impact**: Cross-language *behavior* drift that the spec does not
  pin down. The Rust choice is the most defensible (and is documented
  in the code comment); the Go choice is least defensible. This is
  worth aligning in a future spec revision.
- **Remediation**: Pick one and document it in `docs/spec.md` §3.2
  (which doesn't exist yet). Recommend: "Status reads do not refresh
  the idle TTL."
- **Aprendizado**: When multiple implementations ship from the same
  spec, *differences in untested behavior* are how production bugs
  hide. Codify the rules.

### [RUST-EDU-001] Why `std::sync::Mutex` and not `tokio::sync::Mutex`

- **File**: `rust-impl/src/rate_limiter.rs:142-150`
- **Category**: Idiomaticity
- **Description**: The crate uses the synchronous mutex. The decision is
  documented ("the critical section is short and synchronous; parking
  the async runtime thread for it would be wasteful"). This is the
  right call. `tokio::sync::Mutex` would *also* be correct but would
  add an `.await` per request, doubling the latency budget for no
  gain. The pattern is: **async-aware API, sync primitives for
  synchronous critical sections**.
- **Aprendizado**: The cost of `tokio::sync::Mutex` is the cost of an
  `.await` (task parking) plus the cost of a runtime notification on
  release. For work measured in nanoseconds, that's two orders of
  magnitude. Reach for it only when you must hold the lock across
  an `.await`.

### [RUST-EDU-002] `start_instant` + `start_system_time` — the right way to convert monotonic to wall-clock

- **File**: `rust-impl/src/rate_limiter.rs:144-150, 305-311`
- **Category**: Idiomaticity
- **Description**: The limiter captures *both* an `Instant` (monotonic)
  and a `SystemTime` (wall-clock) at construction, then computes
  wall-clock time as `start_system_time + (instant - start_instant)`.
  This is the only correct way to make `X-RateLimit-Reset` deterministic
  under a `MockClock` *and* correct under `SystemClock` — because
  `Instant` is monotonic (immune to NTP steps) and `SystemTime` is
  the only one that gives you Unix epoch.
- **Aprendizado**: "Monotonic for measuring, wall-clock for
  reporting" is a pattern that comes up everywhere — metrics, logs,
  rate limits, deadlines. The discipline of capturing the
  (monotonic, wall-clock) pair at boot and deriving one from the
  other is worth memorizing.

---

## 4. Node/TypeScript (`node-impl/`)

### [NODE-MAJOR-001] The 500-error contract is `it.todo` — uncovered in tests

- **File**: `node-impl/src/__tests__/server.test.ts:248`
- **Category**: Testing
- **Description**:
  ```ts
  it.todo('returns 500 JSON for unhandled errors');
  ```
  with a comment saying "The 4-arg error handler in `buildServer` is
  hard to exercise directly through `buildServer`". This is a real
  contract — a 500 response must be JSON, must not leak stack traces,
  must work when the response is not yet sent. The comment is right
  that direct exercise is hard, but the test is a one-liner with a
  throwing route.
- **Impact**: The 500 path is not exercised. A refactor that swaps
  the error handler for something that returns HTML would pass.
- **Remediation**: Add a tiny test app:
  ```ts
  const brokenHandle = buildServer(config, createLogger('silent'), { clock });
  brokenHandle.app.get('/boom', () => { throw new Error('nope'); });
  const res = await request(brokenHandle.app).get('/boom');
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: 'Internal Server Error' });
  ```
- **Aprendizado**: `it.todo` is for things you *intend* to test. An
  empty `it.todo` is a contract you've decided not to verify.

### [NODE-MAJOR-002] `TRUST_PROXY=true` is opt-in but the docstring undersells the risk

- **File**: `node-impl/src/config.ts:111-119`, `node-impl/src/index.ts:46-48, 165-185`
- **Category**: Security
- **Description**: `TRUST_PROXY` is documented as the way to enable
  `X-Forwarded-For` parsing. When enabled, Express's `app.set('trust
  proxy', true)` blindly trusts the leftmost IP in `X-Forwarded-For`.
  This is correct *only* if the only path to the server is through a
  proxy that strips client-supplied `X-Forwarded-For`. A misconfigured
  deployment where the proxy is in the same trust zone as the
  attacker (or where there is no proxy at all but `TRUST_PROXY=true`)
  makes the limiter bypassable: send any `X-Forwarded-For: <new-IP>`
  and you get a fresh bucket.
- **Impact**: Once enabled, a single config value unlocks an auth
  bypass. The config validation is lax: any of `[1, true, yes, on]`
  enables it.
- **Remediation**:
  1. Add a `TRUST_PROXY_HOPS` integer config (default 0) — Express's
     `trust proxy` accepts a hop count. With 0, no header is trusted.
  2. Or accept a CIDR list of trusted proxies (mirroring what
     Go-MAJOR-001 should do).
  3. Document the requirement: "Only enable when behind a single
     trusted reverse proxy that strips client `X-Forwarded-For`."
- **Reference**: CWE-345; Express docs on `trust proxy`.
- **Aprendizado**: "Trust proxy" is a footgun name. Every config that
  turns on trust should require an integer/count, not a boolean — it
  forces the operator to think about *which* proxy.

### [NODE-MAJOR-003] Dockerfile uses `node:18-alpine` but devDeps target Node 20

- **File**: `node-impl/Dockerfile:1-2, 11`, `node-impl/package.json:23`
- **Category**: Maintainability
- **Description**: `@types/node ^20.14.10` and the spec/idiomatic
  patterns (top-level await, `structuredClone`, etc.) imply Node 20.
  The runtime image is `node:18-alpine`. Node 18 entered maintenance
  in October 2023 and is on a 6-month extension. Anyone reading the
  Dockerfile will be unsure which is authoritative.
- **Impact**: Skew between dev and prod. Type errors that only
  surface on Node 20 may be hidden by the Node 18 build.
- **Remediation**: Either bump the Dockerfile to `node:20-alpine`
  *or* downgrade `@types/node` to `^18.x`. Pick one and pin it in
  the README.
- **Aprendizado**: Two versions of a runtime is one too many.
  The package.json and the Dockerfile must agree.

### [NODE-MAJOR-004] Single-process limiter — no scale-out path is documented

- **File**: `node-impl/src/index.ts:28-146`
- **Category**: Performance · Maintainability
- **Description**: The limiter is in-process `Map` keyed by IP. A Node
  server with `cluster` workers or PM2 + N replicas will have **N
  independent maps**, so a 10-token bucket actually has 10×N tokens.
  This is acceptable for a "small service" but the README does not
  say so.
- **Impact**: Misleading documentation. A user deploying with 4 PM2
  workers and a 10-token cap will see 40 effective tokens.
- **Remediation**: Add a one-paragraph caveat to `README.md`:
  "Limiter state is per-process. For multi-replica deployments, share
  state via Redis (e.g. `rate-limiter-flexible` + `RedisStore`); the
  expected migration is documented in the planned `evolution_report`."
- **Aprendizado**: Node's "single thread" is also "single process".
  The two are usually conflated but they are not the same: a single
  Node process is single-threaded by default, but a single Node *service*
  is rarely a single process. Document the scope of every in-memory
  store.

### [NODE-MINOR-001] `normalizeIp` regex only matches `::ffff:IPv4` — IPv4-compatible (`::127.0.0.1`) is left as-is

- **File**: `node-impl/src/index.ts:172-185`
- **Category**: Readability · Error Handling
- **Description**:
  ```ts
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  ```
  This catches the common IPv4-mapped form but not the deprecated
  IPv4-compatible form (`::127.0.0.1`) and not the `::/96` prefix in
  general. The test covers `::ffff:10.0.0.7` but no other form.
- **Impact**: A client connecting over a non-DualStack socket could
  get a different bucket than the same client over a DualStack
  socket. Edge case.
- **Remediation**: Use Node's `net.isIPv4` / `net.isIPv6` plus
  `dns` helpers, or normalize via `address` from `ipaddr.js`. Or
  document the assumption.
- **Aprendizado**: IPv6 has at least three textual representations
  for the same address. Normalization belongs to a vetted library,
  not a regex.

### [NODE-MINOR-002] `process.exit(0)` in SIGINT handler can race the cleanup interval's last tick

- **File**: `node-impl/src/main.ts:28-44`
- **Category**: Error Handling
- **Description**: The shutdown handler awaits `serverHandle.close()`
  (which clears the cleanup interval), then calls `process.exit(0)`.
  If the cleanup interval is mid-sweep when SIGINT arrives, the
  `await` resolves before the sweep is done — but `clearInterval`
  prevents the *next* tick, not the current one. The current
  sweep completes. So this is fine, but the order of "clear
  interval then await server.close" should be commented.
- **Impact**: Confusing, not a bug.
- **Remediation**: A one-line comment in `close()` clarifying that
  `clearInterval` is safe to call mid-sweep because the sweep is
  synchronous and finishes before `clearInterval` is observed by
  the event loop.
- **Aprendizado**: JS concurrency is "cooperatively scheduled".
  `setInterval` callbacks are atomic w.r.t. the event loop, so a
  long-running sweep is impossible by construction — but that
  invariant is invisible to readers who don't know it.

### [NODE-MINOR-003] `parsePositiveInt` rejects `0` — but the default `CLEANUP_INTERVAL_MS` is 60 000, never 0

- **File**: `node-impl/src/config.ts:85-96`
- **Category**: Error Handling
- **Description**: Strict "positive integer (>= 1)" validation is
  correct for capacity/refill/port (0 would be a DoS or a bind
  failure). For `CLEANUP_INTERVAL_MS`, 0 would mean "don't run
  cleanup ever", which is a valid config choice (you can simulate
  it by using a very large number). The function rejects it, which
  is conservative but loses a feature.
- **Impact**: None if cleanup is mandatory (it is in the spec). A
  test-mode "disable cleanup" use case is hypothetical.
- **Remediation**: Add a separate `parseNonNegativeInt` for
  `CLEANUP_INTERVAL_MS` and `IDLE_TIMEOUT_MS`, or accept 0 with a
  comment.
- **Aprendizado**: A single `parsePositiveInt` for all numeric
  config loses information. Make the validator match the domain
  — cleanup can be 0, capacity cannot.

### [NODE-EDU-001] `setInterval(...).unref()` — the right way to schedule optional background work in Node

- **File**: `node-impl/src/index.ts:109-117`
- **Category**: Idiomaticity · Performance
- **Description**: `cleanupTimer.unref()` is what allows the Node
  process to exit even if the timer is still scheduled. Without
  `.unref()`, a server with no in-flight connections would still
  not exit on SIGINT — it would wait for the next tick. This is
  one of the most common Node production bugs ("why is my server
  still running after Ctrl-C?"). The comment in the code is good;
  this is a teachable pattern.
- **Aprendizado**: Node's event loop counts "is there a timer
  pending?" as "is there still work to do?". `unref()` opts out.
  Use it for: cleanup, metrics flush, graceful housekeeping.
  Don't use it for: the heartbeat that keeps the process alive.

### [NODE-EDU-002] Pure core + thin shell — why the `rateLimiter.ts` has no Express imports

- **File**: `node-impl/src/rateLimiter.ts:1-197`
- **Category**: Idiomaticity
- **Description**: The TokenBucketRateLimiter is a pure class with
  no Express, no `req`, no `res`. It takes a `clock` and returns
  numbers. The Express layer in `index.ts` adapts the class to
  HTTP. This is the most reusable shape and the easiest to test —
  the unit test file imports only the class, and the integration
  test file imports only the `index.ts` builder. Many Node
  libraries fail to separate these layers and end up with
  test suites that spin up a real HTTP server to test pure logic.
- **Aprendizado**: "Hexagonal" / "ports & adapters" applied to a
  200-line class: the *thing* (token-bucket math) is on one side;
  the *delivery* (HTTP, gRPC, CLI) is on the other. The thing
  gets unit tests; the delivery gets integration tests. The seam
  is the constructor.

---

## 5. Cross-language comparison

This section compares how the **same problem** was solved in each
language. The data is the actual code, not opinions.

### 5.1 Concurrency model

| Concern | Go | Rust | Node/TS |
|---|---|---|---|
| State protection | `sync.Mutex` over `map[string]*ClientBucket` | `std::sync::Mutex<HashMap<IpAddr, ClientBucket>>` inside `Arc` | None — single-threaded event loop |
| Critical section | One map lookup + a few float ops, ~ns | Same — choice documented in the type comment | One map lookup + a few float ops, ~ns |
| Failure mode | Contention scales linearly with concurrent requests on different IPs | Same | n/a |
| Scale-out | Multi-replica Go server = N independent maps | Same | Same — and `node:cluster` workers do *not* share state |
| Concurrency-safety evidence | `go test -race` clean | 1 test `#[ignore]`d; property covered by sync tests | None needed (model) |

**Key insight**: Go and Rust ship the *same idea* — coarse lock over
the bucket map. The Rust version adds `Arc` (for sharing across
axum handlers) and poison detection. The Node version has no lock
at all, which is correct for its model but is also a *ceiling*: it
cannot scale to multiple processes without a shared store (Redis).

The most teachable detail is *why* Go and Rust both picked
`sync.Mutex` and not a sharded / per-key lock: the critical section
is short enough that the lock cost is dominated by the
CAS-in-L1-cache that `Mutex::lock` does, and a sharded design would
add cross-shard coordination overhead. (Confirmed by the doc
comments in both files.) When the benchmarker measures, this is
the result to look for.

### 5.2 Error handling philosophy

| Concern | Go | Rust | Node/TS |
|---|---|---|---|
| Error type | Built-in `error` interface | `Result<T, E>` enum | `Error` subclass hierarchy with `code` field |
| Propagation | `if err != nil { return err }`, `fmt.Errorf` with `%w` | `?` operator, `From<E>` impls | `throw` + try/catch |
| Configuration failure | Log + fall back to default | Silent fallback | Hard fail with batched error message (`z.flattenError`) |
| Production panic on poison | N/A | `expect("mutex poisoned")` — panics | N/A |
| Process-level safety net | None built in | None built in | `process.on('uncaughtException')` and `'unhandledRejection')` |
| Failure visibility | `slog.Warn("invalid RL_CAPACITY, using default", "value", v, "default", c.Capacity)` | `unwrap_or(default)` (silent) | `pino.fatal({ err }, 'failed to start server')` then `process.exit(1)` |

**Key insight**: The three languages make *different* choices about
"what happens when a config is bad?". Go warns and continues (so
the operator can see the live system). Rust silently uses the
default (also defensible). Node refuses to start. All three are
reasonable; the right choice is a function of the deployment
model. For a sidecar / library, Go's "warn and continue" is the
most resilient. For a public service, Node's "hard fail" is the
most debuggable.

### 5.3 State management

| Concern | Go | Rust | Node/TS |
|---|---|---|---|
| Type | `struct { mu sync.Mutex; buckets map[string]*ClientBucket; … }` | `struct { buckets: Mutex<HashMap<IpAddr, ClientBucket>>; … }` | `class { #buckets = new Map<string, ClientBucket>() }` |
| Encapsulation | Package-private fields, public methods, getters | `pub` struct, `pub(crate)` or private fields | `#`-prefixed fields (true privacy) |
| Lazy initialization | `b, ok := rl.buckets[key]; if !ok { ... }` | `buckets.entry(ip).or_insert_with(...)` | `let b = this.#buckets.get(key); if (b === undefined) { ... }` |
| Iteration safety | `for k, b := range rl.buckets` under lock | `buckets.retain(...)` under lock | `for (const [k, b] of this.#buckets) { ... }` (single-threaded) |
| Read consistency | `len(rl.buckets)` under lock | `buckets.lock().map(|b| b.len())` | `this.#buckets.size` (atomic) |

**Key insight**: Go's `or_insert_with` Rust equivalent is the
`entry` API, which is the idiomatic way to express "get or create"
in a single hash-map call. The Go version uses an explicit `if !ok`
because Go's `map` lacks the entry API. The Node version uses
`Map.get` and `Map.set` separately — a subtle two-call pattern
that's correct only because Node is single-threaded.

### 5.4 Time abstraction (clock injection)

All three implement the same pattern: a `Clock` interface that
defaults to the real clock and is overridable in tests. The
specifics:

| Aspect | Go | Rust | Node/TS |
|---|---|---|---|
| Abstraction | `interface { Now() time.Time }` | `trait Clock: Send + Sync` | `type Clock = () => number` (function type) |
| Default | `RealClock{}` (struct) | `SystemClock` (unit struct) | `Date.now` (built-in) |
| Test impl | `fakeClock { t time.Time; mu sync.Mutex }` with `Advance(d)` | `MockClock { now: Mutex<Instant> }` with `advance` and `set` | `vi.fn(() => clockValue)` (jest-mockable function) |
| Why the abstraction is needed | `time.Now()` is not mockable; tests would sleep | `Instant::now()` is not mockable; `tokio::time::sleep` is a real time advance | `Date.now()` is not mockable; `setTimeout` is a real time advance |

**Key insight**: The pattern is universal. What varies is the
*carrier* — a struct in Go, a unit struct in Rust, a function value
in Node. Node's choice is the most concise (functions are
first-class); Go's is the most explicit; Rust's is the most
expressive (the trait can be `Send + Sync` for cross-thread use).

### 5.5 HTTP server

| Concern | Go | Rust | Node/TS |
|---|---|---|---|
| Library | stdlib `net/http` + `http.ServeMux` | `axum 0.7` + `tower` | `express` + `http.createServer` |
| Routing | Pattern-based (`/` matches everything) | `Router::new().route("/", get(...))` | `app.get('/', ...)` |
| State to handlers | Method on `*RateLimiter` | `State<Arc<RateLimiter>>` extractor | Closure capture |
| Middleware | `func(http.Handler) http.Handler` | `from_fn_with_state` (function or struct) | `app.use((req, res, next) => ...)` |
| Client IP | `r.RemoteAddr` (post-strip) | `ConnectInfo<SocketAddr>` from `into_make_service_with_connect_info` | `req.ip` (Express) or `req.socket.remoteAddress` |
| 429 body | `json.NewEncoder(w).Encode(...)` | `Json(json!({...}))` | `res.status(429).json({...})` |
| Graceful shutdown | `signal.NotifyContext` + `srv.Shutdown(ctx)` | `with_graceful_shutdown(shutdown_signal())` | `server.close()` + signal handlers |

**Key insight**: axum's `ConnectInfo` and Express's `trust proxy`
are the most ergonomic ways to get a "real" client IP; Go's stdlib
gives you the raw `RemoteAddr` and expects you to decide. This is
why the Go impl ended up without a `trust proxy` knob (it would
have been a 30-line addition that the dev didn't have time for)
and the Node/Rust impls have one almost for free.

### 5.6 Observability

| Concern | Go | Rust | Node/TS |
|---|---|---|---|
| Logger | `log/slog` (stdlib) | `tracing` + `tracing-subscriber` | `pino` |
| Format | `slog.NewJSONHandler(os.Stdout, ...)` | `fmt::layer().json()` | `pino({...})` (JSON by default) |
| Level control | `slog.HandlerOptions{Level: ...}` | `RUST_LOG=info` env var (EnvFilter) | `LOG_LEVEL=info` env var |
| Service marker | Not in this impl | Not in this impl | `base: { service: 'rate-limiter-node' }` |

**Key insight**: `tracing` (Rust) and `slog` (Go) have *richer*
models — spans, structured fields, multiple subscribers — but
`pino` is faster for the simple "log a line per request" case.
For a 200-line service, all three are fine. For a 200 kLoC
service, `tracing`'s spans start to pay off.

### 5.7 Build / container

| Concern | Go | Rust | Node/TS |
|---|---|---|---|
| Multi-stage | Yes (golang:1.21 → alpine:3.19) | Yes (rust:1.81 → alpine) | Yes (node:18 → node:18) |
| Image size | ~13 MB | ~3-15 MB | ~50 MB+ |
| Cold start | ~5 ms | ~10-20 ms | ~200-500 ms |
| Build time | ~30 s | ~3-5 min (cold) | ~30 s |
| Repro | Pin Go version in `go.mod` (`go 1.21`); missing here | `rust-version` not set in `Cargo.toml` | Both `engines` and Dockerfile are present |

**Key insight**: The Rust build is the slowest (cargo) and produces
the smallest artifact. Go is the sweet spot. Node is the slowest to
start and the largest image. The benchmarker will likely confirm
that **Go has the lowest P50 latency and the highest throughput
per CPU**; **Rust has the lowest P50 memory**; **Node has the
highest throughput on a single core** (V8 is fast).

---

## 6. Praise — what is well-done

Before closing, here is what *should not* change:

- **All three test suites are exemplary for a first cycle**: table-driven
  (Go), explicit property tests (Rust), vitest with `supertest` for
  real HTTP (Node). The benchmarker has a clean ground truth.
- **The lazy-refill math is identical across all three** — same
  formula, same cap-at-capacity, same `Math.max(0, …)` defense
  against backward clock. This is the *minimum* cross-language
  consistency you want.
- **The `Clock` abstraction is the same idea in three languages**.
  The team converged on the right design without anyone being told
  to. That's a good signal.
- **The Rust `start_instant + start_system_time` trick is exactly
  the right way to convert monotonic to wall-clock** — a teachable
  pattern that I would hold up as the model answer.
- **The Node `setInterval().unref()` for cleanup is the textbook
  use of `unref()`.** This is the second-most-common Node bug
  ("server won't exit") and they got it right.
- **The Go `RateLimiter` as a subpackage with its own `Clock`
  interface** mirrors the same design. The `slog` JSON logger and
  the env-var config are conventional and clean.
- **Documentation in the code** (the `// Why a Clock trait` block
  in `rate_limiter.rs`, the `// We're not rate-limited — the spec
  says so explicitly` block in `middleware.go`) is *generous* and
  will save the next maintainer hours.

---

## 7. Recommendations (priority order for the next phase)

1. **Benchmarker**: The single most important measurement is
   throughput at p99 ≤ 5 ms latency. The Go and Rust impls will
   likely win; the Node impl's single-process ceiling is the story
   to tell.
2. **Optimizer**: If mutex contention is the bottleneck (likely
   for Go), sharded locks are the answer. If startup time matters
   (likely not for a long-running service), Node is the loser.
3. **Spec maintainer**: Codify the three behaviors that drifted
   across impls (status endpoint, clock drift, IP normalization).
4. **Curator**: A future project (02 or 03) should add Redis-backed
   state to exercise the *scale-out* path that this one punted on.

---

*Reviewer: opus-tier cross-language staff engineer posture. Every issue
references a file:line, every remediation is concrete, every
generalization is meant to be reused in the next cycle.*
