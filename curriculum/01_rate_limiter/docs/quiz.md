# Quiz — Project 01 · Token-Bucket Rate Limiter

> 5 questions testing **comprehension** (not memorization) of the
> design, the algorithm, and the cross-language tradeoffs.
> Mix of multiple-choice and short-answer/essay. Answer key at the
> end with detailed explanations and cross-references to the code.

---

## Q1 — Multiple choice (2 pts)

**Why does the project use *lazy* refill (compute tokens on request
arrival) rather than a background ticker that refills every bucket
on a fixed cadence?**

- A) Lazy refill is faster per request because it avoids acquiring
  the bucket lock twice.
- B) Lazy refill scales to an unbounded number of clients without
  per-client background state mutation, which would be O(N) memory
  and CPU just to keep the buckets "warm".
- C) The spec explicitly forbids background timers.
- D) Lazy refill avoids a race between the ticker and the request
  path that would otherwise need its own mutex.

---

## Q2 — Multiple choice (2 pts)

**In the Go implementation, `RateLimiter.Allow` holds a
`sync.Mutex` for the duration of the lazy-refill + consume path.
What is the main consequence of this design under high concurrent
load with *many distinct client IPs*?**

- A) The implementation is unsafe; `go test -race` would catch it.
- B) All requests for *all* IPs serialize through the same lock,
  so throughput is bounded by the critical-section time, not the
  CPU count.
- C) `sync.Mutex` does not work with `map[string]*ClientBucket` —
  you must use `sync.Map` for thread safety.
- D) The implementation is correct only for IPv4; IPv6 keys would
  race because they are variable-length.

---

## Q3 — Multiple choice (2 pts)

**The Node/TS implementation uses `setInterval(...).unref()` for
the idle-bucket cleanup timer. What would change if the `.unref()`
were removed?**

- A) The cleanup timer would fire 10× faster.
- B) The process would not exit on `SIGINT` until the next
  cleanup tick fired, even if all sockets were closed and no
  in-flight requests remained.
- C) The cleanup would crash with an unhandled error.
- D) The test suite would start to flake.

---

## Q4 — Short answer (2 pts)

**The Rust implementation chose `std::sync::Mutex` over
`tokio::sync::Mutex` for the bucket map, even though the service
itself is fully async on tokio. State one (1) advantage and one
(1) disadvantage of this choice, and explain in one sentence why
the disadvantage does not apply to this codebase.**

*Answer space: ~3 sentences.*

---

## Q5 — Essay (2 pts)

**All three implementations compute `X-RateLimit-Reset` as a Unix
epoch second. The Rust code does it as
`start_system_time + (now - start_instant).as_secs_f64()`. Explain
in 3–5 sentences:**

1. Why is `Instant` (monotonic) used internally and `SystemTime`
   (wall-clock) used externally?
2. What would go wrong if the code used `SystemTime::now()`
   directly in the limiter?
3. Why is the *anchor* (`start_system_time`) captured at
   construction rather than recomputed each call?

*Answer space: a short paragraph.*

---

# Answer key

## A1 — **B**

**Explanation.** Lazy refill means the limiter does no work for
clients who aren't making requests. A background ticker that
refills every bucket on a fixed cadence would have to wake up
*for every tracked client* on every tick, which is O(N) work
per tick — and clients with no activity don't need the refill
calculation at all. The lazy approach defers the math to the
moment the bucket is actually used, and the math itself is
O(1) (one multiplication, one `min`).

(A) is wrong: lazy refill acquires the lock *once* per request,
the same as the ticker would, but the ticker would acquire it
*once per bucket per tick* (so N×ticks locks per second).
(C) is wrong: the spec does not forbid background timers; the
spec calls lazy refill out as a deliberate choice because of
its scaling property. (D) is wrong: a well-designed ticker
*would* take the same lock, and the race is not avoided by lazy
refill — it's a non-issue because the lock serializes both
paths.

**Reference**: `go-impl/ratelimit/ratelimit.go:102-109`,
`rust-impl/src/rate_limiter.rs:65-73`,
`node-impl/src/rateLimiter.ts:108-131`.

## A2 — **B**

**Explanation.** A `sync.Mutex` over the entire `buckets` map
serializes *all* requests, even those for *different* IPs that
have no data dependency. The throughput is therefore bounded
by `1 / (critical-section time)`, not by the number of CPUs.
For the spec's stated scale (tens of clients, low RPS) this is
fine — the critical section is ~100 ns, so a single mutex
handles ~10 M req/s before contention becomes the bottleneck.
For a production service with thousands of distinct IPs, the
right answer is a sharded lock (`fnv32(key) % 256` → 256 mutexes)
or `sync.Map`.

(A) is wrong: the implementation is *correct*; `go test -race`
verifies this. (C) is wrong: `sync.Mutex` works with any type;
`sync.Map` is a different abstraction with different
performance characteristics, not a safety primitive. (D) is
nonsense — Go maps are typed by key, and `string` keys are
safe.

**Reference**: `go-impl/ratelimit/ratelimit.go:48-62` and the
`[GO-MAJOR-002]` issue in `code_review.md`.

## A3 — **B**

**Explanation.** Node's event loop counts "is there a timer
pending?" as "is there still work to do?" Without `.unref()`,
the cleanup timer keeps the event loop alive, so even after
all sockets are closed and all HTTP handlers have returned,
the process will not exit on `SIGINT` — it will wait for the
next tick. With `.unref()`, the timer is *optional* work; if
nothing else is keeping the event loop busy, the process can
exit cleanly.

(A) is wrong: the interval is set with a fixed `ms` argument;
`unref()` does not change the cadence. (C) is wrong: a
synchronous timer callback cannot "crash" in a way the event
loop doesn't recover from. (D) is wrong: the test suite
explicitly avoids relying on the timer by setting
`cleanupIntervalMs: 24 * 60 * 60 * 1000` (24 h).

**Reference**: `node-impl/src/index.ts:109-117` and the
`[NODE-EDU-001]` note in `code_review.md`.

## A4 — Model answer

> **Advantage**: `std::sync::Mutex` is a thin wrapper around a
> futex/CAS — locking and unlocking are two atomic operations
> measured in nanoseconds. It holds the *thread*, not a tokio
> task, so there is no `.await` involved.
>
> **Disadvantage**: A `std::sync::Mutex` cannot be held across
> an `.await` — if you lock it and then yield to the runtime
> (e.g. by making an HTTP call), other tasks block until the
> holder resumes.
>
> **Why the disadvantage does not apply here**: the critical
> section in `RateLimiter::check` is pure CPU (one hash lookup
> and a few float ops); there is no `.await` between the
> `lock()` and the unlock. The code never holds the lock while
> doing I/O.

**Alternative valid answers**:

- The disadvantage could be stated as "if a future
  implementation adds a call to a database inside the
  critical section, it would deadlock", with the explanation
  that the current code doesn't.
- The advantage could be stated as "no async runtime overhead"
  or "no risk of holding the lock across a cancellation point".

**What we are testing**: the distinction between synchronous
and async mutexes in tokio, and the discipline of
"do not hold the lock across `.await`".

**Reference**: `rust-impl/src/rate_limiter.rs:142-150` and the
`[RUST-EDU-001]` note in `code_review.md`.

## A5 — Model answer

> 1. **`Instant` is monotonic** — it is guaranteed to never go
>    backwards (NTP steps, leap seconds, DST changes, manual
>    clock adjustments). For *measuring* elapsed time within a
>    process, monotonic is the only correct choice. **`SystemTime`
>    is wall-clock** — it can jump, but it is the only one that
>    can be converted to a Unix epoch second, which is what
>    `X-RateLimit-Reset` requires.
> 2. **Using `SystemTime::now()` directly in the limiter** would
>    make the lazy-refill math vulnerable to clock jumps: if the
>    system clock steps backwards by 30 seconds (NTP correction),
>    `now - last_refill` would be negative, and the clamp
>    `elapsed_secs.max(0.0)` would silently make the bucket
>    stop refilling for 30 seconds of wall time. More subtly,
>    `SystemTime` is also the input to `Duration::from_secs_f64`
>    for the reset-epoch calculation — if the clock jumps, the
>    reset value would be wrong.
> 3. **The anchor is captured at construction** so that
>    `instant_to_system_time` can compute wall-clock as
>    "what was the system clock when the limiter started,
>    plus how much monotonic time has elapsed since". This
>    gives a deterministic relationship between the monotonic
>    clock (the source of truth for refill math) and the
>    wall-clock clock (the source of truth for the header
>    value). Recomputing it on every call would couple the
>    header to the system clock's instantaneous value, which
>    is exactly the problem the anchor is solving.

**What we are testing**: understanding of the "monotonic for
measuring, wall-clock for reporting" pattern, and why a
construction-time anchor is the right design.

**Reference**: `rust-impl/src/rate_limiter.rs:144-150, 305-311`
and the `[RUST-EDU-002]` note in `code_review.md`.

---

## Grading rubric (for the Sonda / Promotor gate)

| Q | Pts | Pass = | Borderline = | Fail = |
|---|---|---|---|---|
| Q1 | 2 | B | (any other letter with a clear rationale) | blank or A |
| Q2 | 2 | B | (D with a clear rationale about map safety) | blank or A |
| Q3 | 2 | B | (D with a clear rationale about test isolation) | blank or A |
| Q4 | 2 | Names *one* pro AND *one* con AND explains the con's non-applicability | Names pro + con but explanation is hand-wavy | Missing one of the three parts |
| Q5 | 2 | Addresses all 3 sub-points with a coherent thread | Addresses 2 of 3 with clear reasoning | Misses 2+ sub-points |

A score of 7/10 or higher = "dominado" for this project, in the
ÁGORA-Continuum gate. Below 7/10 = the Prometor should re-cycle
the learner on the missed questions.
