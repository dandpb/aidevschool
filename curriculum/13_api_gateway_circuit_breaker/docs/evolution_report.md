# Evolution Report — Project 13 API Gateway with Circuit Breaker

> Cycle status: **cycle-complete**  
> Focus: resilience-control bottlenecks and next optimizations per language

## System-Level Evolution Theme

The project has evolved from a basic proxy toward a resilience gateway. The next step is to convert implemented controls from local happy-path mechanisms into measurable, bounded, failure-isolating contracts. The most important system-level bottleneck is not raw proxy speed yet; it is correctness under concurrency and failure: half-open probes, deadline-aware retries, in-flight coalescing, adaptive limits, and route/tenant memory bounds.

## Node/TypeScript

### Current Bottleneck

Node's bottleneck is feature coverage and event-loop safety under upstream failure. The implementation performs synchronous in-memory state updates and simple fetch retries, but it lacks coalescing and adaptive concurrency entirely. It also serializes request bodies as JSON and keeps tenant buckets forever, making it fragile for varied HTTP traffic and unbounded tenant cardinality.

### Optimization Path

1. Add a route-scoped in-flight coalescer keyed by method/path/query/tenant/vary headers, storing a shared `Promise<ResponseSnapshot>` instead of a completed response cache.
2. Add an adaptive limiter that updates effective concurrency from latency/failure windows and emits limit-change metrics.
3. Make retry logic deadline-aware by threading an absolute deadline through backoff sleeps and abort controllers.
4. Add tenant-bucket TTL/LRU eviction and expose tenant summary metrics without listing unbounded tenants.
5. Replace JSON-only proxy body forwarding with raw-body forwarding for non-GET/HEAD requests.

### Expected Result

Node becomes a useful contrast point for event-loop resilience: minimal threads, fast single-process control-path updates, but explicitly bounded memory and non-blocking failure handling.

## Go

### Current Bottleneck

Go's bottleneck is correctness of advanced controls rather than feature presence. It already has synchronized components for circuit breaker, bulkhead, limiter, coalescer, adaptive limiter, and metrics, but coalescing is cache-after-response, adaptive concurrency is a fixed limiter, and retry sleeps ignore request deadlines.

### Optimization Path

1. Replace coalescer storage with a singleflight-style in-flight call registry so concurrent identical safe requests share the same upstream attempt.
2. Count the first `open -> half_open` probe in `halfOpenInFlight` and add race tests around concurrent cooldown expiry.
3. Use context-aware backoff sleeps (`select` on timer and `ctx.Done()`) and close failed retry response bodies before retrying.
4. Implement adaptive limit adjustment from rolling p95 latency, failure ratio, and rejection pressure, bounded by min/max.
5. Convert metrics latency slices to bounded histograms or ring buffers to reduce lock hold time and improve benchmarkability.

### Expected Result

Go becomes the strongest near-term implementation for the resilience lesson: explicit synchronization, easy race testing, context cancellation, and a direct path to benchmarkable recovery behavior.

## Rust

### Current Bottleneck

Rust has no implementation, so the bottleneck is absence rather than optimization. This blocks comparison of enum-modeled circuit states, ownership-safe slot release, and async cancellation behavior.

### Optimization Path

1. Add an Axum/Tower-based gateway using typed route policy structs and an explicit `CircuitState` enum.
2. Put shared route state behind `Arc<tokio::sync::Mutex<_>>` or finer-grained locks, then benchmark contention.
3. Use Tower layers or services for rate limit, bulkhead, circuit, retry, and timeout composition.
4. Model bulkhead/adaptive permits with RAII guards so cancellation releases slots safely.
5. Implement status and metrics snapshots from immutable cloned state to avoid mutation during observability reads.

### Expected Result

Rust should become the strictest correctness baseline: more upfront type/modeling work, but strong guarantees around state transitions, cancellation-safe resource release, and explicit error classes.

## Cross-Language Next Benchmark

After the optimizations above, run the same local upstream fault-injection suite across all languages:

- closed-state baseline overhead;
- threshold-crossing time to open;
- open-circuit fail-fast latency;
- half-open probe concurrency under load;
- retry deadline compliance;
- route isolation while one upstream saturates;
- tenant isolation under high-cardinality tenant churn.

The comparison should report both throughput and correctness failures; a faster implementation that violates probe or retry semantics should not be treated as better.
