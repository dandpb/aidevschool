# Quiz — Project 01 · Token-Bucket Rate Limiter

> 7 questions testing **comprehension** (not memorization) of the algorithm, the concurrency
> design, and the cross-language trade-offs. All questions are calibrated against the current
> `{go,rust,node}-impl/` source as re-verified in `code_review.md` (cycle `2026-06-04-01-rate-limiter`).
> Mix of multiple-choice and short-answer. Answer key with explanations at the end.

---

## Q1 — Multiple choice (2 pts)

**Why does the project use *lazy* refill (compute tokens on request arrival) rather than a
background ticker that refills every bucket on a fixed cadence?**

- A) Lazy refill is faster per request because it avoids acquiring the bucket lock twice.
- B) Lazy refill scales to an unbounded number of clients without per-client background state
  mutation, which would be O(N) memory and CPU just to keep the buckets "warm".
- C) The spec explicitly forbids background timers.
- D) Lazy refill avoids a race between the ticker and the request path that would otherwise need
  its own mutex.

---

## Q2 — Multiple choice (2 pts)

**Both the Go and Rust implementations shard their bucket store across multiple independent
mutex+map pairs (32 shards in Go, 16 in Rust) instead of using one mutex over one big map. What
problem does sharding solve that a single mutex does not?**

- A) A single mutex is unsafe under `go test -race` / Rust's borrow checker; sharding is required
  for memory safety.
- B) A single mutex serializes every request through the same lock regardless of which client it's
  for; sharding lets requests for clients that hash to different shards proceed in parallel.
- C) Sharding reduces the total memory used to store buckets.
- D) A single mutex cannot be used with `map[string]*ClientBucket` / `HashMap<IpAddr, ClientBucket>`
  at all — the compiler would reject it.

---

## Q3 — Short answer (3 pts)

**In the Rust implementation, the one test that spawns 50 concurrent tokio tasks against the same
IP (`concurrent_requests_never_overconsume`) is marked `#[ignore]`. Does this mean the "no
over-consumption under concurrent access" property is unverified? Explain what evidence does and
doesn't exist for this property in the current test suite, and propose one way to get a
non-ignored test for it.**

---

## Q4 — Multiple choice (2 pts)

**All three implementations (Go, Rust, Node) built a `ClientKeyStrategy`-shaped abstraction
(interface/trait/function) for resolving the client key from a request — with alternate strategies
like a forwarded-header-aware one. In the *current, running* server, which of these is actually
used to determine the bucket key for a live request?**

- A) All three wire their abstraction into the live request path; only the specific strategy
  chosen differs.
- B) None of the three use their abstraction in the live request path — each has an inline
  duplicate of the same logic that the live code calls instead, leaving the abstraction file
  exercised only by its own dedicated unit tests.
- C) Only Node wires it in, via `TRUST_PROXY`.
- D) Only Go wires it in, via `RL_TRUST_PROXY`.

---

## Q5 — Short answer (3 pts)

**The spec requires `X-RateLimit-Reset` to be "the timestamp (Unix Epoch Seconds) when the bucket
will be completely full again." The Rust implementation captures both a `start_instant` (monotonic
`Instant`) and a `start_system_time` (`SystemTime`) once, at construction, and derives every
subsequent wall-clock timestamp as `start_system_time + (now_instant - start_instant)` rather than
calling `SystemTime::now()` directly at request time. Why does this matter for testability, and
what would break if the code called `SystemTime::now()` directly inside a test driven by a
`MockClock`?**

---

## Q6 — Multiple choice (2 pts)

**The spec doesn't say whether calling the un-throttled `GET /status` endpoint should reset a
client's "idle" clock (used to decide when to evict their bucket). What did each implementation
actually do, as verified in this review?**

- A) All three implementations refresh the idle clock on `/status`, matching each other.
- B) Go's `Snapshot` updates `lastSeen` on `/status`; Rust's `status()` deliberately does not
  update `last_seen`; Node's `peek()` doesn't mutate the bucket at all. All three differ.
- C) None of the three update any idle-related state on `/status`; only the rate-limited `/`
  endpoint affects eviction timing.
- D) Only Rust implements idle eviction at all; Go and Node buckets live forever.

---

## Q7 — Short answer (3 pts)

**Node's `TokenBucketRateLimiter` is a plain class with no imports from `express` or `node:http`,
and its unit tests (`rateLimiter.test.ts`) never spin up an HTTP server. Meanwhile
`server.test.ts` drives the same class only through real HTTP via `supertest`. What is this
separation called, why does it let the class reach 98%+ coverage without any HTTP mocking, and
name one other language in this project that applies the same separation (and how).**

---
---

# Answer Key

## A1 — Answer: **B**

Lazy refill computes `tokens = min(capacity, tokens + elapsed_since_last_touch × rate)` only when a
request actually arrives for that specific client. A background ticker, by contrast, would have to
iterate (or schedule a callback for) every tracked client on every tick regardless of whether that
client has sent a request recently — O(N) work per tick just to keep idle buckets "current". Lazy
refill makes an idle client cost exactly zero background work between requests. (C is false — the
spec doesn't forbid timers, it just asks for the lazy formula. A and D describe real properties of
some designs but aren't the actual reason lazy refill was chosen here — the docstrings in all three
codebases give the O(N) background-cost argument as the rationale.)

## A2 — Answer: **B**

A single mutex over one map means every `Allow`/`check` call — regardless of which client it's for
— must wait for the same lock, so throughput under concurrent load from *many distinct clients* is
bounded by the critical section's execution time times the number of concurrent callers, not by
available CPU cores. Sharding (hash the key, route to 1-of-N independent mutex+map pairs) lets
requests for clients that land in different shards proceed truly in parallel. (A and D are false —
both `sync.Mutex` over a map and Rust's `Mutex<HashMap<...>>` are perfectly safe and idiomatic
without sharding; sharding is a scalability optimization, not a correctness requirement. C is false
— sharding adds a small amount of memory overhead, splitting one map's bookkeeping across N smaller
maps, not reducing it.)

## A3 — Model answer

The property is **not unverified — it's verified by a different kind of evidence than a true
concurrent-load test.** The synchronous unit tests (e.g. `consumes_one_token_per_request`,
`different_ips_have_independent_buckets`) prove, by reading the code, that `check()` acquires the
shard's `Mutex` once and holds it across the full refill → compare → decrement sequence — there is
no `.await` inside that critical section, so no other task can interleave partway through. This is
a proof by construction (the lock scope structurally prevents the race), not a proof by
observation (actually running 1000 concurrent attempts and counting how many were allowed). The gap
is that a future refactor could narrow the lock scope "for readability" — say, splitting refill and
consume into two separate lock acquisitions — and every currently-passing synchronous test would
still pass, silently reintroducing a TOCTOU race, because none of them exercise real concurrent
callers.

One way to get a non-ignored test: since `RateLimiter::check()` itself is fully synchronous (no
`.await` anywhere in its body), it doesn't need an async runtime to be called concurrently. Spawn
real OS threads with `std::thread::scope` (stable since Rust 1.63) instead of `tokio::spawn`, have
each thread call `limiter.check(ip)` directly some number of times against the same IP, join all
threads, and assert the total allowed count is exactly `capacity`. This sidesteps the tokio
multi-thread-runtime teardown hang entirely (there's no tokio runtime involved) while still proving
the property under genuine concurrent execution, not just by code inspection.

## A4 — Answer: **B**

Confirmed by direct code reading in this review (`code_review.md` §2, XLANG-MAJOR-001): Go's
`middleware.go` has its own standalone `ClientKey` function duplicating `clientkey.go`'s
`RemoteAddrKeyStrategy.ClientKey`; Rust's `middleware.rs`/`handlers.rs` call axum's
`ConnectInfo<SocketAddr>` extractor directly rather than anything in `client_key.rs`; Node's
`index.ts` defines its own `resolveClientIp`/`normalizeIp` rather than importing
`createExpressClientKeyStrategy` from `clientKeyStrategy.ts`. Each abstraction file is covered only
by its own dedicated unit test — which is precisely why the dead code wasn't caught by a coverage
gate. (C and D are backwards: Node's `TRUST_PROXY` and a hypothetical Go `RL_TRUST_PROXY` are
unrelated to whether the `ClientKeyStrategy` type itself is wired in — as of this review, Go has no
`RL_TRUST_PROXY` at all.)

## A5 — Model answer

`Instant` is Rust's *monotonic* clock — it only ever moves forward and is immune to NTP
adjustments, which is exactly what you want to drive with a `MockClock.advance(Duration)` in a
test: advancing it deterministically simulates "time passing" without any real waiting.
`SystemTime`, on the other hand, is Rust's *wall-clock* type — the only one that can be converted to
a Unix epoch second, which is what the spec requires for `X-RateLimit-Reset`. Neither type alone
gives you both properties (mockable *and* convertible to an epoch second), so the code captures
one fixed pair — "at construction, `Instant::now()` was paired with `SystemTime::now()`" — and
derives every later wall-clock instant as `start_system_time + (some_later_instant - start_instant)`.

If the code called `SystemTime::now()` directly at request time instead, the wall-clock output
would track the *real* system clock regardless of what the `MockClock` was told to report. A test
that does `clock.advance(Duration::from_secs(3600))` to simulate an hour passing would see the
`Instant`-based token math behave correctly (tokens refill as if an hour passed), but
`X-RateLimit-Reset` would still report a timestamp based on the *actual* wall-clock time the test
happened to run at — decoupling the header from the simulated scenario and making the test
either flaky (if it asserts an exact value) or silently wrong (if it doesn't).

## A6 — Answer: **B**

Verified directly against the current code in this review (`code_review.md` RUST-MINOR-003): Go's
`Snapshot` (called by `/status`) does `b.lastSeen = now`, which means repeatedly polling `/status`
alone keeps an otherwise-idle client's bucket alive indefinitely. Rust's `status()` refills the
token count for display but intentionally skips updating `last_seen` (documented in a code
comment). Node's `peek()` doesn't write to the bucket object at all, so `lastRefillMs` (which
doubles as the idle marker) is left exactly as the last *rate-limited* request set it — coincidentally
achieving the same outcome as Rust's explicit choice, but as a side effect of `peek`'s
implementation rather than a deliberate design decision. This is a genuine spec gap: `docs/spec.md`
doesn't say which behavior is correct, so all three teams guessed independently and landed on two
different answers.

## A7 — Model answer

This is the **"pure core, thin shell" / "ports and adapters" (hexagonal architecture)** pattern
applied at the scale of a single class. `TokenBucketRateLimiter` (the "core") depends only on a
`clock: () => number` function and returns plain data (`ConsumeResult`, `PeekResult`) — it has no
notion of HTTP requests, responses, status codes, or headers. `index.ts` (the "adapter" / "shell")
translates between that pure interface and Express's `req`/`res` objects: reading the client IP off
`req`, calling `tryConsume`, and writing the result back as headers and a JSON body. Because the
core has no I/O and no framework dependency, `rateLimiter.test.ts` can drive it directly — call
`tryConsume('some-key')`, inspect the returned object — with zero HTTP server startup cost, which is
exactly why it can hit 98.05% coverage using only 19 fast, synchronous unit tests, while
`server.test.ts` separately exercises the *wiring* (does the class's output actually turn into the
right status code and headers) via real HTTP through `supertest`.

The same separation appears in the other two languages, with more ceremony because the language
doesn't make privacy/module boundaries as lightweight as TypeScript's `class`/private-field syntax:
**Rust** puts the algorithm in `rate_limiter.rs` (zero axum imports) as part of the `rate_limiter_rust`
*library* crate, and wires it to HTTP only in `middleware.rs`/`handlers.rs`, with a separate `main.rs`
*binary* crate that just calls `rate_limiter_rust::run()`. **Go** achieves the same split via
packages: the `ratelimit/` package is framework-agnostic apart from using stdlib `net/http` types
for its `Middleware`/`StatusHandler` return values, while `main.go` (`package main`) owns process
wiring, env parsing, and the HTTP server lifecycle.
