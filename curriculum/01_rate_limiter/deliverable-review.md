# Deliverable — Phase 3 · Code Review (Project 01)

> Reviewer: `reviewer` · Cycle: `2026-06-03-01-rate-limiter` · Phase: `review-done`
> Inputs: 3 implementations in `go-impl/`, `rust-impl/`, `node-impl/`.
> Outputs: `docs/code_review.md`, `docs/learning_notes.md`, `docs/quiz.md`,
> 4 new sections in `learning_journal.md`, status bumped to `review-done`.

## Top 3 issues per implementation

### Go (`go-impl/`)
1. **[GO-MAJOR-001] No `X-Forwarded-For` / `X-Real-IP` handling** —
   `ClientKey` reads only `r.RemoteAddr`. Behind any reverse proxy
   the limiter collapses all clients into one bucket. The Node
   impl ships `TRUST_PROXY`; Rust gets it via axum's `ConnectInfo`;
   Go has neither. This is the most common production failure for
   in-memory rate limiters.
2. **[GO-MAJOR-002] Single mutex over the whole bucket map** —
   documented as fine for the spec's scale, but no benchmark exists
   to validate the cliff. Add a comment with the threshold (5 k
   RPS) at which sharding is needed.
3. **[GO-MINOR-001] No upper bound on tracked buckets** — combined
   with MAJOR-001, an attacker behind the proxy can grow the map
   unbounded. Soft cap (1 M buckets → log + drop) is the fix.

### Rust (`rust-impl/`)
1. **[RUST-MAJOR-001] `cargo test` ignores the one test that
   exercises 50 concurrent tasks** — the safety property is
   *asserted* by synchronous tests but not *proven* under
   interleaving. The fix is to run the ignored test in a separate
   CI target or add `loom`-based coverage.
2. **[RUST-MAJOR-002] `retry_after` has a dead-code conditional**
   that confuses readers. The intent is `1.max(seconds.ceil())`;
   the implementation is `ceil.max(if tokens < 1.0 { 1 } else { 0 })`
   where the conditional is never load-bearing.
3. **[RUST-MAJOR-003] `Cargo.toml` does not declare `rust-version`
   / MSRV** — the v4 `Cargo.lock` requires Rust 1.81+, which is
   pinned in the Dockerfile but not in the manifest. A new
   contributor on Rust 1.74 will get a confusing error.

### Node/TS (`node-impl/`)
1. **[NODE-MAJOR-001] 500-error contract is `it.todo`** — the
   4-arg error handler in `buildServer` is hard to test directly
   but a one-liner with a throwing route covers it. A regression
   in the handler (e.g. one that returns HTML) would ship.
2. **[NODE-MAJOR-002] `TRUST_PROXY=true` is opt-in but undersells
   the risk** — a boolean turns on `X-Forwarded-For` parsing
   without a hop count. A misconfigured deployment is
   bypassable: send any `X-Forwarded-For: <new-IP>` for a fresh
   bucket. Fix: require `TRUST_PROXY_HOPS` integer or a
   trusted-proxy CIDR list.
3. **[NODE-MAJOR-003] Dockerfile uses `node:18-alpine` but
   devDeps target Node 20** — skew between dev and prod. Pick
   one and pin it in the README.

## Top 3 cross-language insights

1. **The `Clock` trait/interface is a universal testability seam.**
   All three impls converged on the same design (a single-method
   abstraction that defaults to the system clock and accepts a
   fake in tests). The shape varies — struct in Go, trait in
   Rust, function in Node — but the abstraction is identical and
   the test stability gained is the same.
2. **Concurrency model is a function of the critical section
   length, not the language.** Go and Rust both ship
   `sync.Mutex`-over-`HashMap` for a 100-ns critical section
   because the lock cost dominates. Node doesn't need a lock at
   all because the section is run on a single thread. The right
   concurrency primitive is the one whose overhead is below the
   critical section's time.
3. **"Client IP" is a trust-boundary decision, not a fact.** All
   three impls extract a client IP for bucketing, and all three
   make different trust assumptions. The right design is a *hop
   count* (or trusted-proxy CIDR list), not a boolean. Codify in
   the spec.

## Top 3 quiz takeaways

1. **Lazy refill scales to unbounded clients** (Q1) — the
   mathematical reason: an idle client costs zero CPU and zero
   memory writes. A background ticker would be O(N) per tick
   regardless of activity.
2. **`setInterval(...).unref()` is the textbook use of `unref()`**
   (Q3) — without it, the process would not exit on SIGINT
   because the timer keeps the event loop alive. This is the
   second-most-common Node production bug; the Node impl gets
   it right.
3. **Monotonic for measuring, wall-clock for reporting** (Q5) —
   `Instant` is immune to NTP steps; `SystemTime` is the only
   one that gives you a Unix epoch. Capturing the (monotonic,
   wall-clock) pair at construction is the right pattern for any
   time-derived output (HTTP headers, log timestamps, metrics).

## Status

- `docs/status.md` updated to `phase: review-done, awaiting:
  benchmark, updated_by: reviewer, last_update: 2026-06-03T23:25:00-03:00`.
- `learning_journal.md` populated across all 6 sections with 19
  new generalizations (covering concurrency, HTTP idioms,
  performance, anti-patterns, benchmark methodology, and
  architecture patterns).
- Reviewer is now idle; benchmarker should pick up next.
