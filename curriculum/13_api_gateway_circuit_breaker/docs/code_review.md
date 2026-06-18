# Code Review — Project 13 API Gateway with Circuit Breaker

> Review cycle: cycle-complete  
> Scope: `docs/spec.md`, Node/TypeScript implementation, Go implementation  
> Review focus: fault tolerance, isolation, retry correctness, and observability

## Severity Key

- **Critical:** violates a core resilience guarantee or prevents language-neutral project completion.
- **High:** important spec behavior is missing or materially incorrect.
- **Medium:** implemented behavior is useful but incomplete, weakly observable, or benchmark-hostile.
- **Low:** documentation, polish, or test-depth gap.

## 1. Spec Coverage and Language Parity

- **Critical — Rust implementation is absent.** The spec frames the exercise as a Go/Rust/Node comparison, but only `go-impl/` and `node-impl/` exist. This blocks the catalog comparison of circuit breaker recovery across concurrency models.
- **High — Node omits whole feature families.** Node implements proxying, retries, fallback, bulkhead, circuit breaker, and per-tenant token buckets, but its `RouteConfig` has no coalescing or adaptive-concurrency policy and no implementation for either requirement.
- **Medium — Go covers more surface but several components are stubs or partial.** Go has coalescer and adaptive-concurrency structs, but coalescing is cache-after-response instead of in-flight sharing, and adaptive concurrency never changes the effective limit based on health signals.

## 2. Circuit Breaker Correctness

- **High — half-open probe accounting permits an extra probe in both Node and Go.** When `allow()` moves `open -> half_open`, it returns `true` without incrementing `halfOpenInFlight`. The first probe is therefore invisible to the configured `half_open_max_probes`, allowing `max_probes + 1` concurrent probes under load.
- **Medium — state transitions are not consistently observable.** Node exposes state and counts but omits `opened_at` and transition reason from status. Go tracks `LastTransitionReason` but metrics do not emit a transition counter, so recovery comparisons require inference.
- **Medium — rolling counters are request-count based only.** Both implementations record success/failure entries but do not classify timeout count separately, which weakens FR-005 and metric comparisons.

## 3. Retry, Timeout, and Idempotency Semantics

- **High — retry is not deadline-aware in Go or Node.** Both retry loops can sleep without checking the remaining route deadline, violating the edge case that backoff must not exceed the request deadline.
- **High — non-idempotent retry policy is incomplete.** The spec allows retrying non-safe methods only with an idempotency key or explicit route opt-in. Both implementations only gate by configured method list; neither checks `Idempotency-Key`.
- **Medium — retry metrics are inaccurate in Go and absent in Node response headers.** Go accumulates total attempts, not retry attempts, under `retry_attempts`; Node does not set `X-Retry-Attempts` on successful proxy responses.

## 4. Isolation, Backpressure, and Resource Bounds

- **High — tenant limiter state is unbounded.** Both Node and Go store token buckets per tenant without eviction, cleanup, or configured cap, violating the bounded-memory NFR for tenant limits.
- **Medium — Go coalescing cache is bounded only by TTL cleanup on writes.** Expired entries are removed during `Store`, not by a dedicated cap or sweeper. Low write volume after a burst can leave stale entries resident.
- **Medium — Node has no request coalescing path.** This loses the required safe-request burst protection and makes Node worse under thundering-herd cache-miss scenarios.

## 5. Proxy and HTTP Semantics

- **High — response headers are not preserved.** Both gateway paths forward upstream status and body but do not copy most upstream response headers, while the spec requires preserving proxy semantics and returning gateway headers.
- **Medium — Node body forwarding assumes JSON.** Node serializes non-GET/HEAD bodies with `JSON.stringify(req.body)`, which breaks arbitrary upstream request bodies and content types.
- **Low — structured error shapes differ from the spec.** Node returns `{ error, route_id, request_id }`; Go is closer but both omit some envelope fields required for deterministic client behavior.

## 6. Observability and Metrics

- **High — metrics endpoint is incomplete in both languages.** Required metrics include request count, upstream latency, gateway overhead, retries, fallbacks, circuit transitions, bulkhead/rate-limit rejections, coalescing, and adaptive changes. Go exposes some counters; Node exposes only circuit and bulkhead basics.
- **Medium — status snapshots are missing adaptive and rate-limit summaries in Node.** Node status has circuit and bulkhead only; Go includes adaptive state but not tenant summaries.
- **Medium — no benchmark evidence exists for the NFRs.** There is no recorded p95 gateway-overhead, fail-fast latency, or circuit open detection evidence.

## 7. Test Quality and Cross-Language Confidence

- **High — tests exercise mostly unit happy paths.** Node tests check breaker transitions, bulkhead capacity, limiter capacity, status, metrics, and simple fallback; Go tests only default config and gateway construction.
- **High — no fault-injection proxy tests exist.** There are no upstream stub tests proving method/path/query/body/header preservation, retry exhaustion, timeout behavior, open-circuit fail-fast without upstream contact, or route isolation.
- **Medium — concurrency/race behavior is under-tested.** Go recommends `go test -race`, but tests do not stress simultaneous half-open probes, tenant isolation, bulkhead release under cancellation, or coalesced callers.

## Cross-Language Summary

Go is the stronger implementation surface because it includes placeholders for coalescing, adaptive concurrency, richer metrics, synchronization, and graceful shutdown. Node is a smaller baseline that covers the central circuit-breaker path but misses several advanced resilience controls. Both need deeper deadline/idempotency correctness and executable fault-injection evidence before the project can claim resilience parity.
