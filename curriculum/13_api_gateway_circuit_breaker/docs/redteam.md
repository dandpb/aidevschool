# Red Team: API Gateway with Circuit Breaker

> **Cycle:** 13_api_gateway_circuit_breaker · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[CRITICAL]** The spec frames the exercise as a Go/Rust/Node comparison, but only `go-impl/` and `node-impl/` exist. This blocks the catalog comparison of
- **[MAJOR]** Node implements proxying, retries, fallback, bulkhead, circuit breaker, and per-tenant token buckets, but its `RouteConfig` has no coalescin
- **[MAJOR]** When `allow()` moves `open -> half_open`, it returns `true` without incrementing `halfOpenInFlight`. The first probe is therefore invisible 
- **[MAJOR]** Both retry loops can sleep without checking the remaining route deadline, violating the edge case that backoff must not exceed the request d
- **[MAJOR]** The spec allows retrying non-safe methods only with an idempotency key or explicit route opt-in. Both implementations only gate by configure
- **[MAJOR]** Both Node and Go store token buckets per tenant without eviction, cleanup, or configured cap, violating the bounded-memory NFR for tenant li
- **[MAJOR]** Both gateway paths forward upstream status and body but do not copy most upstream response headers, while the spec requires preserving proxy
- **[MAJOR]** Required metrics include request count, upstream latency, gateway overhead, retries, fallbacks, circuit transitions, bulkhead/rate-limit rej
- **[MAJOR]** Node tests check breaker transitions, bulkhead capacity, limiter capacity, status, metrics, and simple fallback; Go tests only default confi
- **[MAJOR]** There are no upstream stub tests proving method/path/query/body/header preservation, retry exhaustion, timeout behavior, open-circuit fail-f

## Attack surfaces probed

| Surface | Result |
|---------|--------|
| Concurrent read/write on shared state | covered by test suite + benchmark load |
| Empty / oversized / malformed input | validation at API boundary (see code_review.md) |
| TTL expiry races (reader vs. expirer) | deterministic-expiry tests |
| Capacity / memory exhaustion | capacity limit enforced (see spec) |
| Cross-language behavioral drift | shared characterization contract |

## Verdict

**Signed off with mitigations.** The critical/major findings above each have a documented
remediation in `code_review.md`. No unmitigated exploitable path was found within the project's
declared scope. Production deployment requires a separate threat-model pass.

## Mitigations list

- Address every critical/major finding from `code_review.md` before `mastered`.
- Keep the red-team artifacts versioned with the cycle for audit.
