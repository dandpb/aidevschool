# AI DevSchool — Learning Journal

> Global, append-only knowledge base. Each entry is a generalization reusable
> across projects. Format: date + context + application + result + generalization
> + where to apply.

---

## How to add an entry

Append at the bottom of the relevant section. Do not edit past entries — that
breaks the audit trail. If an entry is wrong, add a correction entry below it
dated today.

---

## 🧱 Concurrency patterns

### Lazy refill is a universal pattern for stateful counters (2026-06-03, project 01)
- **Context**: Implementing a per-key token-bucket rate limiter in Go,
  Rust, and Node/TS, all sharing the same algorithm.
- **Application**: All three impls compute tokens on demand
  (`tokens = min(C, tokens + (now - last) * r)`) rather than
  refilling on a background timer. Idle clients cost zero CPU and
  zero memory write.
- **Result**: The implementation is O(1) per request and the bucket
  map can grow without bound without proportional background work.
  Tests with thousands of distinct keys stayed under millisecond
  latencies.
- **Generalization**: When a per-key counter needs to track
  *elapsed-since-last-event*, do the math lazily on the next
  read. Reserve background tickers for cases where (a) the
  counter has side effects beyond the read, (b) the value is
  consumed by readers other than the writer, or (c) the
  write-rate is bounded and a tick is the natural cadence.
- **Where to apply**: rate limiters, sliding-window counters,
  circuit breakers with decay, idle-resource eviction, "N
  events per T seconds" quotas, debounce/throttle with TTL.

### `Clock` injection is the universal testability seam (2026-06-03)
- **Context**: All three impls needed deterministic time for tests.
- **Application**: Go: `interface { Now() time.Time }`; Rust:
  `trait Clock: Send + Sync { fn now(&self) -> Instant }`; Node:
  `type Clock = () => number`. All three default to the system
  clock and accept a fake in tests.
- **Result**: 100% of the lazy-refill tests are deterministic —
  no `time.Sleep`, no flake. The Rust `MockClock` doubles as the
  way to make `X-RateLimit-Reset` deterministic.
- **Generalization**: Any time-dependent code (TTL, debounce,
  retry-after, idle eviction) should accept a clock from the
  outside. The shape varies by language but the abstraction is
  universal. The cost of the wrapper is one virtual call per
  request — negligible compared to the test stability gained.
- **Where to apply**: every time-dependent module. The seam
  should be added at design time, not retrofitted after the
  first flake.

### `std::sync::Mutex` for short critical sections, even in async code (2026-06-03)
- **Context**: Rust rate limiter is fully async on tokio but uses
  `std::sync::Mutex<HashMap<IpAddr, ClientBucket>>` inside
  `Arc<RateLimiter>`.
- **Application**: The critical section is one hash lookup + a
  few float ops. No `.await` is held under the lock.
- **Result**: Zero async-runtime overhead per request. `tokio::
  sync::Mutex` would have added an `.await` and a task
  notification — 2 orders of magnitude more expensive for no
  gain.
- **Generalization**: Reach for `std::sync::Mutex` when the
  critical section is synchronous and short (< 1 µs). Reach
  for `tokio::sync::Mutex` only when you must hold the lock
  across an `.await` (e.g. an I/O call inside the critical
  section). The `Send + Sync` requirement for shared state is
  satisfied automatically by `Arc<Mutex<T>>`.
- **Where to apply**: any in-memory shared state in an async
  service. Counter caches, rate limiters, feature flags, ID
  generators.

---

## 🌐 HTTP server idioms by language

### Go: stdlib `net/http` is the answer for plain HTTP services (2026-06-03)
- **Context**: Go impl uses `http.ServeMux` + `http.Server` +
  `signal.NotifyContext` + `srv.Shutdown` — zero third-party deps
  for the HTTP layer.
- **Application**: Routing via `mux.Handle("/", rl.Middleware(…))`.
  Shutdown via `signal.NotifyContext(ctx, SIGINT, SIGTERM)` then
  `srv.Shutdown(shutdownCtx)`. The race detector (`go test
  -race`) covers the rest.
- **Result**: ~13 MB image, 5 ms cold start, 100% race-free.
  All timeouts (`ReadHeaderTimeout`, `ReadTimeout`,
  `WriteTimeout`, `IdleTimeout`) configurable.
- **Generalization**: For a service that doesn't need streaming,
  websockets, or a custom router, Go's stdlib HTTP is the
  smallest possible production-grade answer. Reach for `chi`,
  `gin`, or `echo` only when you need middleware chaining
  ergonomics or a complex router.
- **Where to apply**: REST APIs, BFFs, sidecars, anything that
  fits in a `func(http.ResponseWriter, *http.Request)`.

### Rust: axum + tower is the canonical async HTTP stack (2026-06-03)
- **Context**: Rust impl uses axum 0.7 + tower +
  `tower-http` (trace) on top of tokio.
- **Application**: `Router::new().route("/", get(handler))
  .route_layer(from_fn_with_state(limiter, middleware))
  .route("/status", get(handler)).with_state(limiter)`. State
  is shared via `State<Arc<RateLimiter>>`; client IP via
  `ConnectInfo<SocketAddr>`.
- **Result**: Middleware applied to selected routes only (not
  globally), deterministic tests via
  `tower::ServiceExt::oneshot`, graceful shutdown via
  `axum::serve(...).with_graceful_shutdown(signal)`.
- **Generalization**: axum's `route_layer` is the right primitive
  for "apply middleware to a subset of routes". For global
  middleware, use `.layer(...)`. The `ConnectInfo` extractor
  replaces Go's `r.RemoteAddr` for production-grade client-IP
  handling. Tokio's test runtime can hang on `interval` loops in
  teardown — prefer synchronous tests where possible.
- **Where to apply**: any tokio-based HTTP service in Rust.
  Pin axum to a major version; the API churns.

### Node/TS: pure class + Express adapter is the most reusable shape (2026-06-03)
- **Context**: Node impl splits the codebase into
  `rateLimiter.ts` (pure class, zero HTTP imports) and
  `index.ts` (Express wiring).
- **Application**: The class takes a `clock: () => number` and
  returns numbers. The Express layer adapts it to
  `req`/`res`. Two test files: one for the class (no
  supertest), one for the server (with supertest).
- **Result**: Unit tests run in <100 ms (no HTTP overhead).
  Integration tests are independent and can be added without
  touching the class. The class is reusable from a WebSocket
  server, CLI tool, or queue worker.
- **Generalization**: The "pure core, thin shell" pattern
  applies to every transport-agnostic module. The seam is the
  constructor. The test seam and the deployment seam are
  the same seam.
- **Where to apply**: any business logic in a TypeScript
  service. Keep `req`/`res`/`req.ip` out of the class; pass
  them in.

### Cross-language: trust-proxy is a config decision, not a fact (2026-06-03)
- **Context**: All three impls extract a "client IP" for
  bucketing. Go uses `r.RemoteAddr`; Rust uses
  `ConnectInfo<SocketAddr>`; Node uses Express's
  `req.ip` (which honors `trust proxy`).
- **Application**: Trusting `X-Forwarded-For` is a security
  decision: a misconfigured deployment where the header is
  attacker-controlled makes the limiter bypassable.
- **Result**: Node exposes `TRUST_PROXY` config; Rust gets it
  for free via axum; Go lacks the knob entirely (see
  `[GO-MAJOR-001]`). Three different defaults for the same
  spec.
- **Generalization**: The right design is a *hop count* (or
  CIDR list of trusted proxies), not a boolean. `trust proxy =
  true` is a footgun; `trust proxy = 1` forces the operator
  to think about which proxy is in front of the service.
- **Where to apply**: every service that sits behind a load
  balancer, reverse proxy, or CDN. Codify the rule in the
  spec.

---

## ⚡ Performance optimizations

### Single-mutex coarse lock is the right answer for short critical sections (2026-06-03)
- **Context**: Go and Rust impls both use a single mutex over
  the bucket map. The critical section is ~100 ns.
- **Application**: A `sync.Mutex` (Go) or `std::sync::Mutex`
  (Rust) is two atomic operations; a sharded design (e.g.
  256 locks keyed by `fnv32(key)`) adds cross-shard
  coordination overhead.
- **Result**: At the spec's scale (10s of clients, low RPS),
  the single mutex is the fastest design. At 1 k+ distinct
  IPs and 5 k+ RPS, contention becomes the bottleneck and
  sharding is the right next step.
- **Generalization**: Coarse locking beats fine-grained
  locking *as long as the critical section is shorter than
  the lock overhead*. The threshold is roughly 1 µs on
  modern hardware. Beyond that, shard. The seam should be
  documented in the code so the next engineer doesn't
  reinvent.
- **Where to apply**: in-memory caches, config maps,
  small-keyspace lookups. *Not* the right answer for
  I/O-bound critical sections.

### `setInterval(...).unref()` in Node — the right way to schedule optional work (2026-06-03)
- **Context**: Node impl uses `setInterval` for idle-bucket
  cleanup and calls `.unref()` so the process can exit even
  if the timer is pending.
- **Application**: `cleanupTimer.unref()` after
  `setInterval(...)`. The timer is *optional* — if nothing
  else keeps the event loop busy, the process can exit.
- **Result**: `SIGINT` produces a clean exit in <100 ms even
  if the next cleanup tick is 10 minutes away. Without
  `unref()`, the process would wait for the next tick.
- **Generalization**: `unref()` is for timers that perform
  housekeeping — cleanup, metrics flush, cache eviction.
  Do *not* use it for: heartbeats that keep the process
  alive, scheduled jobs that must run, or anything that
  the operator expects to fire on a cadence.
- **Where to apply**: any Node service with a background
  timer that doesn't need to keep the process alive.

### Monotonic + wall-clock anchor for time-dependent headers (2026-06-03)
- **Context**: Rust impl captures both `Instant` and
  `SystemTime` at construction and derives wall-clock from
  monotonic + anchor.
- **Application**: `start_system_time + (now - start_instant)`
  gives deterministic `X-RateLimit-Reset` values under
  `MockClock` *and* correct values under `SystemClock`.
- **Result**: Tests can drive the clock forward and predict
  the exact `X-RateLimit-Reset` value. NTP steps do not break
  the limiter (monotonic is immune).
- **Generalization**: For any time-derived output (HTTP
  header, log timestamp, metric label) that must be
  deterministic in tests *and* correct in production, use
  monotonic for the math and wall-clock only for the output
  representation. Capture the anchor at construction.
- **Where to apply**: rate limiter headers, retry-after,
  request deadlines, scheduled task ETAs.

### Update to single-mutex: shard when you outgrow the spec (2026-06-04)
- **Context**: Cycle 1 optimization. The "Single-mutex coarse
  lock" entry above (2026-06-03) was correct for the spec's
  "10s of clients, low RPS". The reviewer flagged
  GO-MAJOR-002 / RUST-MAJOR-002 as the scale-out cliff.
- **Application**: Go: 32-shard `sync.Mutex` array
  (`[32]struct{ mu sync.Mutex; buckets map[string]*… }`),
  FNV-1a hash of the key, bitmask modulo because
  `NUM_SHARDS` is a power of two. Rust: 16-shard
  `[Mutex<HashMap<IpAddr, ClientBucket>>; 16]` built with
  `std::array::from_fn`, `std::hash::DefaultHasher` for
  `IpAddr`.
- **Result**: All tests pass (-race clean for Go, 14/14 + 1
  ignored for Rust, clippy/fmt clean). The single-IP
  benchmark cannot show the win (all hits go to one shard);
  this is a *future-proofing* change. The cost on the
  single-IP path is ~1 ns FNV hash + a slightly larger map
  header (32 small maps vs 1 big map).
- **Generalization**: Sharded mutex is the canonical
  scale-out for a key-keyed in-memory state store
  (Cloudflare, Discord, Envoy, `dashmap` all use it). The
  *number* of shards should be cache-friendly (16–64) and
  a power of two for bitmask modulo. **Document the scale
  cliff in the type comment** so the next engineer
  doesn't see "32 mutexes" and "fix" it back to 1. Pick
  the hasher for the key type: `fnv` for short ASCII
  (Go strings), `DefaultHasher` for `Hash`-implementing
  types (Rust).
- **Where to apply**: in-memory caches with hot key access
  (session stores, idempotency keys, rate limiters, feature
  flags), anywhere the access pattern is "key → short
  critical section".

### Pre-allocate hot-path response bodies for high-4xx-rate services (2026-06-04)
- **Context**: Cycle 1 optimization. Node 429 path was
  `res.status(429).json({ error: '…', retry_after_seconds: N })`
  — fresh object literal + `JSON.stringify` on every denied
  request. At 200 RPS oversubscribed to a 10-token bucket,
  ~96% of requests are 429. The spike scenario showed 2×
  p99 vs Go/Rust.
- **Application**: Pre-allocate the constant parts of the
  body as module-scope `const` strings. In the 429 path,
  set `Content-Type: application/json` and `statusCode = 429`
  explicitly, then `res.end(PREFIX + String(N) + SUFFIX)`.
  Add a `prewarmJit()` method to the rate limiter that runs
  8 dummy `tryConsume` calls on throwaway keys before
  `app.listen()`.
- **Result**: Tests still pass (the 429 body shape on the
  wire is unchanged; supertest parses it identically).
  Coverage went 91.86% → 92.2%. Lint clean. (N=3 benchmark
  pending — see `docs/evolution_report.md` §4.2.)
- **Generalization**: For any "high-4xx-rate" service
  (rate limiter, gateway, throttler, WAF, idempotency
  cache), the hot path is the *denied* path. Pre-allocate
  the response body once. The savings are 1 object
  allocation + 1 `JSON.stringify` per request — invisible
  at 10 RPS, measurable at 10 k RPS. The prewarm pattern
  is universal: any Node service with a hot method that
  fires the first 5–20 requests under load should
  pre-warm the JIT before `listen()`.
- **Where to apply**: any service where the same denial
  response is sent > 10% of the time. Also: any Node
  service with a hot-path function that V8 has not seen
  before `app.listen()` returns.

### V8 JIT pre-warm is cheap insurance for first-request p99 (2026-06-04)
- **Context**: Cycle 1 hypothesis. Node spike p99 was
  13.44 ms (vs Go 6.79 / Rust 7.34). The pattern (low at
  baseline, peak at spike, normal at endurance) is
  classic V8 inline-cache transitions during the first
  5–20 requests of a fresh process.
- **Application**: Add a `prewarmJit(iterations = 8)` method
  to the rate-limiter class. Call it from `startServer`
  immediately after `buildServer`, before `server.listen`.
  The method runs N dummy `tryConsume` calls on throwaway
  keys and then deletes them.
- **Result**: Cost is ~1 ms of synchronous startup time
  (8 tryConsume calls). Benefit is a measurable drop in
  the first-request p99 because the inline caches for
  the hot path are warm before the first real request
  lands. (Pending N=3 measurement.)
- **Generalization**: For any Node service that serves a
  hot path with a function-shape that V8 has not yet
  stabilized, pre-warm. The cost is bounded (you only
  need ~8 iterations to trigger inline-cache
  transitions). The benefit is bounded (V8 will warm
  the path after the first 5–20 real requests anyway),
  but if the first 5–20 requests are in a k6 spike
  scenario, the benefit is visible in p99.
- **Where to apply**: any Node service that uses
  complex conditional logic in a hot path, any service
  with polymorphic dispatch (different key types),
  any service that uses class-based OOP heavily. Less
  applicable to simple JSON-in/JSON-out REST handlers.

---

## 🐛 Anti-patterns observed

### "Client IP" without a trust model is a security bug (2026-06-03)
- **Context**: All three impls use the client IP as the bucket
  key. None of them ship a robust trust-proxy model.
- **Application**: Go uses raw `RemoteAddr`; Node exposes
  `TRUST_PROXY` but trusts any `X-Forwarded-For`; Rust gets
  the IP from axum's `ConnectInfo<SocketAddr>` (which is the
  socket IP, not the forwarded one).
- **Result**: In a production deployment behind an LB, Go
  collapses all clients to one bucket (limiter becomes a
  global 429). Node is bypassable if `TRUST_PROXY=true` is
  enabled without a proxy. Rust is correct for direct
  connections only.
- **Generalization**: The bucket key is a *security
  decision*. The right abstraction is a hop count (or
  trusted-proxy CIDR list), not a boolean. A test for
  "client X-Forwarded-For: 1.2.3.4 from raw socket 5.6.7.8"
  is mandatory in any production-grade limiter.
- **Where to apply**: every service that sits behind a
  reverse proxy.

### `#[ignore]` on a safety property is a liability (2026-06-03)
- **Context**: Rust impl ignored
  `concurrent_requests_never_overconsume` because the tokio
  test runtime hangs at teardown. The same property is
  *asserted* by synchronous tests, but not *proven* under
  concurrent load.
- **Application**: The fix is to either (a) run the ignored
  test in a separate CI target, (b) add a `loom`-based test
  for genuine interleaving coverage, or (c) split the
  property into smaller deterministic pieces that don't
  need 50 tasks to express.
- **Result**: A future regression that re-introduces a race
  would not be caught by `cargo test`. CI is green; the
  bug ships.
- **Generalization**: A test you don't run is a bug you
  don't catch. `#[ignore]` is for "temporarily skip this",
  not for "this is hard to test so we'll skip it
  forever". The gate should never depend on a test that
  doesn't run.
- **Where to apply**: every safety-property test in every
  language. The mechanism varies (`#[ignore]`, `it.skip`,
  `@pytest.mark.skip`) but the discipline is the same.

### Unbounded `Map<key, state>` is a DoS surface (2026-06-03)
- **Context**: All three impls keep an unbounded map keyed
  by client IP. The cleanup loop evicts after 1 hour, but
  the map can grow without bound between sweeps.
- **Application**: An attacker spraying requests with
  random `X-Forwarded-For` values (when trust-proxy is on)
  can grow the map to millions of entries in minutes.
- **Result**: Slow memory growth under attack. No
  immediate crash, but the service becomes a target.
- **Generalization**: Every cache keyed by user input
  needs a bound. The right primitive is a soft cap
  (e.g. 1 M entries → log and drop new keys) or an
  LRU-eviction policy. An unbounded cache with a
  best-effort sweeper is *eventually* bounded, but the
  window is the attacker's weapon.
- **Where to apply**: every in-memory store keyed by
  external input. Rate limiters, session stores, nonce
  caches, idempotency keys.

### `parsePositiveInt` for all numeric config loses information (2026-06-03)
- **Context**: Node impl uses a single `parsePositiveInt`
  helper for all integer env vars. Capacity and refill
  rate should be > 0; `CLEANUP_INTERVAL_MS = 0` is a
  valid config choice ("don't sweep") but is rejected.
- **Application**: A one-size-fits-all validator hides
  the domain semantics. The fix is per-config helpers
  (`parsePositiveInt`, `parseNonNegativeInt`,
  `parseBoundedInt`).
- **Result**: The Node impl rejects `CLEANUP_INTERVAL_MS=0`
  even though the spec doesn't forbid it. A user who
  wants to disable cleanup in tests has to set it to
  `Number.MAX_SAFE_INTEGER` instead of `0`.
- **Generalization**: Validators should match the
  domain. When the same helper is used for "must be > 0"
  and "must be ≥ 0", one of the two is wrong.
- **Where to apply**: every config-validation layer.
  Zod's `z.number().positive()` vs `.nonnegative()` vs
  `.int()` etc. exist for a reason.

### Optimizing for a benchmark that can't show the win is "metric gaming" (2026-06-04)
- **Context**: Cycle 1 optimization. The sharded mutex
  for Go/Rust cannot show a win in the single-IP
  benchmark used in this cycle. All requests hash to
  one shard, so contention is identical.
- **Application**: The right call is (a) *implement* the
  change because the code review and the
  real-world-scaling argument are sound, (b) *report*
  the optimization in the evolution report with the
  explicit caveat that the benchmark cannot show the
  win, (c) *recommend* a multi-IP scenario for the
  next cycle so the next optimizer can validate the
  change.
- **Result**: The optimization is in the codebase, the
  test suite is green, the report is honest about the
  measurement gap. This is a future-proofing change,
  not a "win" claim.
- **Generalization**: When a real improvement is invisible
  to the available measurement, document *why* it's
  still the right call. "We can't measure it" is not
  the same as "it doesn't work". A optimizer who
  can't show a delta in the benchmark should (a) add
  a measurement to the benchmark, (b) accept the gap
  and document it, or (c) find a different bottleneck.
  Never (d) skip the change to game the report.
- **Where to apply**: any future cycle where the
  measured workload doesn't exercise the bottleneck
  you're fixing.

### "Drop per-request logs" is not a free p99 win (2026-06-04)
- **Context**: Cycle 1 considered skipping the per-request
  `slog.Info` log in the Go `loggingHandler` when the
  response is 429. The benchmarker's report flagged
  "Tighten Go's slog hot path" as a LOW-priority
  optimization.
- **Application**: A 200-line service's per-request log
  line is ~5 µs (JSON encode + os.Stdout write). At
  200 RPS with 96% being 429, that's 1 ms of syscall
  time per second — invisible in p99.
- **Result**: The optimization was rejected (see
  `docs/evolution_report.md` §5.1). The Go impl won
  p99 in 3/4 scenarios on the baseline (N=1), so
  optimizing the wrong thing for a noise-level win
  would have traded observability for a measurement
  artifact.
- **Generalization**: "Logging is slow" is true at
  10 k+ RPS, false at 200 RPS. The threshold is
  approximately the syscall cost × log-write rate.
  Measure the actual cost (`perf stat -e
  syscalls:sys_enter_write ./binary`) before claiming
  a logging optimization is worth it. And never drop
  a useful operational log line for a benchmark win
  that you can't reproduce.
- **Where to apply**: any service that logs per
  request. The right answer is usually "buffer the
  log writes" (`bufio.Writer` + flush goroutine), not
  "drop the log".

---

## 📊 Benchmark methodology

### k6 + autocannon is the right toolset for HTTP rate-limiter benchmarks (2026-06-03)
- **Context**: This project's benchmark phase will use k6
  (Go-based) and autocannon (Node) to measure p50/p99 latency
  and throughput under sustained load.
- **Application**: Drive the `/` endpoint with N concurrent
  VUs, hold for T seconds, then read the X-RateLimit-Remaining
  header to verify the limiter actually limited.
- **Result**: A reproducible number that survives the
  Docker-throttling-on-macOS caveat (≥10% delta = real).
- **Generalization**: For HTTP services, the right
  benchmark tool is a real HTTP client (not an in-process
  loop). k6 has the best metric output; autocannon is
  the lowest-friction for Node services. Always drive
  *more* than the spec's stated capacity to find the
  ceiling, not just the spec's expected load.
- **Where to apply**: every benchmark cycle in this
  dojo.

### Concurrency safety must be measured under the test runner's own runtime (2026-06-03)
- **Context**: Go's `go test -race` is the gold standard.
  Rust's tokio test runtime can hang. Node has no
  equivalent in the stdlib.
- **Application**: For Go, always run `go test -race`.
  For Rust, use `loom` for genuine interleaving coverage
  when the property is async. For Node, the
  single-threaded model is correct by construction, so
  the test is a "model check" rather than a "race
  detector".
- **Result**: Each language's tooling has a different
  failure mode for concurrency bugs. Know which one
  your codebase relies on.
- **Generalization**: The benchmark is not the only
  evidence of correctness. The test runner's concurrency
  story is part of the test suite.
- **Where to apply**: every test suite that exercises
  shared state.

### Bash `for` inside a function clobbers parent-scope variables (2026-06-03)
- **Context**: A `run_matrix.sh` had `cleanup() { for lang in
  go rust node; do ...; done; }`. Bash's `for` loop variable
  is *not* function-local — it lives in the calling scope.
  Calling `cleanup` from inside `for lang in go rust node;
  do; cleanup; done; ...` set the parent `$lang` to the last
  value in the cleanup loop (i.e. "node"), regardless of what
  the outer loop intended.
- **Result**: All 12 result files were saved to `node/` even
  though the outer for loop was iterating over `go`, `rust`,
  `node` in sequence. The data inside the files was correct
  (container name in `docker stats` JSON confirmed the real
  source impl); only the file *labels* were wrong.
- **Generalization**: In bash, function-scoped variables
  require the `local` builtin. Inside a function body, every
  variable assignment without `local` modifies the parent
  shell. The `for VAR in LIST; do ...; done` construct uses
  the *current* `$VAR` in scope and reassigns it on each
  iteration — which means a `for` in a helper function
  *replaces* the outer loop's variable, even though the
  helper function only "looks" at it.
- **Fix**: rename the inner loop variable (`for cl in ...`)
  AND mark it `local cl` for defense-in-depth. Or pass the
  values as function arguments.
- **Where to apply**: every bash script with a helper
  function that iterates over a list. A `shellcheck` rule
  (SC2034) catches dead variables; we should add a custom
  rule for "helper function iterates over a variable with
  the same name as the caller".
- **Lesson**: When in doubt, treat bash helper functions as
  if they could clobber any global. The cost of `local` is
  zero; the cost of debugging the wrong-directory bug is
  5–10 min.

### N=1 is too noisy for single-host benchmarks — commit to N=3+ (2026-06-04)
- **Context**: Cycle 1 first ran benchmarks at N=1 per
  (lang, scenario) to ship in time. The N=1 baseline Rust
  p99 was 8.98 ms. After we re-ran at N=3, the same baseline
  Rust p99 was 18.30 ms with std=15.9. A single noisy run
  had hidden a true median that was *2× higher* than the
  reported number.
- **Result**: The N=1 "Rust wins baseline p99" claim
  evaporated. The N=3 data showed Go and Rust are within
  noise on baseline, and Node pre-allocation was the only
  reproducible optimization.
- **Generalization**: For single-host benchmarks
  (especially on macOS with Docker throttling, where
  std is high), **N=1 is a research prototype, not a
  measurement**. The threshold for a "real" delta is
  roughly std(measured). Always run N≥3 and report
  median + std. A single number that contradicts N=3 is
  almost always an outlier, not a discovery.
- **Where to apply**: every optimization cycle. The
  N=1→N=3 surprise is a general property of small-sample
  measurements under non-trivial variance, not a quirk of
  rate limiters.

### `docker stats --no-stream` is sufficient for end-of-scenario CPU/RAM (2026-06-03)
- **Context**: The original plan called for a 2-second
  background poller to capture `docker stats` continuously
  during each k6 run. The plan owner pivoted to "use a
  single JSON snapshot between scenarios" to save time.
- **Result**: A single `docker stats --no-stream --format
  json <container>` taken right after the k6 run ends gives
  valid instantaneous CPU% and RAM-used. It is *not* an
  average over the scenario, but for a low-RPS rate limiter
  (where CPU is mostly 0%) the snapshot is enough to
  distinguish the languages.
- **Generalization**: For the question "did anything bad
  happen in the container during the run?", a single
  end-of-scenario snapshot is enough. For "what was the
  peak RAM during a GC pause?", you need continuous polling.
  Pick the right tool. The poller approach is ~3× more code
  and the same execution time per scenario; the savings
  come from *not having to debug the poller's bash race
  conditions* (see entry above).
- **Where to apply**: any benchmark where the answer is
  "stable" rather than "peak". The poller is the right
  choice for GC tuning investigations; the snapshot is
  the right choice for cross-language ranking.

### p50/p99 are *not* in k6 v2's default summary-export (2026-06-03)
- **Context**: k6 v2.0.0's `--summary-export` only emits
  `avg`, `min`, `med`, `max`, `p(90)`, `p(95)` by default.
  p50 and p99 are not in the summary.
- **Application**: To get p50/p99/p99.9 in the summary,
  add `--summary-trend-stats=avg,min,med,max,p(50),p(90),p(95),p(99),p(99.9)`.
  Alternatively, parse the raw `--out json=...` stream and
  compute percentiles in post.
- **Result**: For the first run of the matrix I forgot to
  add this flag, so p50/p99 came back as `0.0` in the
  summary. I recovered by re-parsing the raw JSON stream
  with a Python helper that reads every `Point` for
  `http_req_duration` and computes the percentiles
  in-memory. This is more accurate anyway because it's
  exact percentiles, not interpolated.
- **Generalization**: When a metric *should* be there but
  isn't, check the raw data stream before assuming the
  metric is missing. k6's raw JSON output is a
  one-event-per-line log; easy to parse; more accurate
  than the summary.

---

## 📐 Architecture patterns

### "Pure core, thin shell" is the most reusable shape for transport-agnostic logic (2026-06-03)
- **Context**: All three impls separate the algorithm (token
  bucket math) from the transport (HTTP).
- **Application**: The pure core takes a clock and
  returns numbers. The shell (HTTP handler) adapts the
  result to the wire format. Two test files: one for
  the core (fast, no I/O), one for the shell (slower,
  with real HTTP).
- **Result**: Reusable from multiple transports. Easy
  to unit test. The seam is the constructor.
- **Generalization**: Hexagonal/ports-and-adapters for
  a 200-line service. The "thing" and the "delivery"
  are separate. The thing gets unit tests; the
  delivery gets integration tests.
- **Where to apply**: every business-logic module.
  Keep `req`/`res`/socket/stream out of the class.

### Lazy state + periodic sweep is the universal eviction pattern (2026-06-03)
- **Context**: All three impls lazy-create buckets on first
  request and sweep idle buckets on a fixed cadence.
- **Application**: `cleanupInterval` is 5 min (Rust) or
  10 min (Go) or 1 min (Node). Idle TTL is 1 h. Sweep is
  O(N) over the bucket map.
- **Result**: Bounded memory in the steady state.
  Unbounded under attack (see anti-patterns above).
- **Generalization**: For any map of "user-keyed state",
  the canonical pattern is: lazy create on first access,
  periodic sweep, idle TTL. The TTL should be longer than
  the cleanup interval (typically 10×).
- **Where to apply**: rate limiters, session stores,
  nonce caches, idempotency keys, "N events per T
  seconds" quotas.

### Spec-driven + spec-pinned = reproducible cross-language implementations (2026-06-03)
- **Context**: The three impls are independent but
  converge on the same algorithm, the same wire
  format, the same HTTP headers, the same JSON shape.
- **Application**: The spec (`spec.md`) is the single
  source of truth. Each impl is a translation. The
  benchmarker measures the *translated* behavior, not
  the *source* behavior.
- **Result**: 27 review issues, but no surprise
  algorithmic differences. The reviewer could focus on
  idiomaticity and cross-cutting concerns, not
  correctness.
- **Generalization**: A good spec is a precondition
  for a polyglot project. The spec must pin: input
  shape, output shape, error behavior, edge cases,
  and the *properties* the implementation must
  preserve (idempotency, monotonicity, etc.).
- **Where to apply**: every polyglot project. The
  spec is the contract; the impls are the
  translations.

---

## How to add an entry

Append at the bottom of the relevant section. Do not edit past entries — that
breaks the audit trail. If an entry is wrong, add a correction entry below it
dated today.
