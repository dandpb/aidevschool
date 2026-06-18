# Code Review — Project 11 · Load Balancer (Go · Rust · Node/TS)

> Inputs: `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/` source and tests.  
> Review focus: routing correctness, health/failover semantics, concurrency counters, and distributed-systems resilience.  
> Severity scale: Critical, Major, Minor, Educational.

## Executive Summary

All three implementations provide a useful health-aware HTTP load balancer core: backend pools, weighted round-robin, least-connections selection, active health checks, passive failure tracking, circuit-breaker states, forwarding headers, admin health/backends/metrics endpoints, and graceful-ish shutdown hooks. Go and Node use established proxy machinery; Rust exposes more of the forwarding internals for teaching.

The implementations remain below the full spec for a production Layer 7 balancer. The largest common gaps are missing consistent-hash routing, sticky sessions, TLS termination, retry-safe failover, configurable connection pools, strict half-open probe accounting, and evidence for streaming/high-concurrency behavior.

| Implementation | Critical | Major | Minor | Educational |
| --- | ---: | ---: | ---: | ---: |
| Go | 0 | 5 | 3 | 1 |
| Rust | 1 | 5 | 2 | 1 |
| Node/TS | 0 | 5 | 3 | 1 |

## Security

- **[Major][All] TLS termination is absent.** RF-011 requires certificate/key loading and HTTPS listener behavior. All three run plain HTTP and hard-code `X-Forwarded-Proto: http`, so downstream services cannot distinguish secure client context.
- **[Major][All] Forwarded-header trust is append-only and unauthenticated.** The load balancers propagate/append `X-Forwarded-For` without a trusted-proxy model. This is fine in a private benchmark harness, but unsafe if exposed behind another proxy because clients can spoof upstream IP chains.
- **[Minor][Go/Node] Backend URLs from environment/config are accepted with limited policy.** URL scheme is checked, but there is no blocklist/allowlist for loopback, link-local, or internal metadata addresses. That is an SSRF risk when backend config becomes user/admin supplied.

## Performance

- **[Major][Rust] Proxying buffers the full request and full response.** `forward()` reads request bodies with an 8 MiB limit and `raw_http_request()` reads the entire upstream response into memory. This violates the streaming intent in the spec and limits large/streaming responses.
- **[Major][Go] A new `httputil.ReverseProxy` is allocated per request.** `ServeHTTP` builds a proxy and closures every time. Correct but unnecessary overhead at high RPS; proxies/transports should be reused per backend to expose connection-pool behavior.
- **[Major][Node] `maxConnections` exists in config but is never enforced.** Backend concurrency limits are part of RF-002/RNF-007, but selection and proxy dispatch ignore `BackendConfig.maxConnections`, so overload isolation is not implemented.
- **[Minor][All] Weighted least-connections is incomplete.** Weight affects round-robin by duplicating backends; least-connections collapses duplicated candidates to the same active-connection comparison, so weight does not meaningfully change least-connections distribution.

## Readability

- **[Minor][Go/Node] Several hot paths compress multiple responsibilities.** Go `ServeHTTP` selects, mutates counters, builds proxy, handles errors, and updates circuit state in one function. Node `handler()` similarly mixes routing, metrics, proxy callbacks, and circuit transitions. Splitting selection/accounting/proxy result handling would make correctness easier to audit.
- **[Minor][Rust] Raw HTTP implementation is educational but surprising beside Axum.** Using Axum for inbound and manual TCP parsing for upstream makes the architecture harder to classify as a normal Layer 7 balancer. A comment explaining that this is intentional teaching code would help.

## Maintainability

- **[Major][All] Consistent-hash routing is missing.** RF-008 requires stable-key routing, but `RoutingAlgorithm` is only round-robin/least-connections in every language. Sticky/hash behavior cannot be benchmarked or compared.
- **[Major][All] Sticky sessions are missing.** RF-010 and the session admin endpoint contract are not implemented: no cookie assignment, no session TTL, no rebalance behavior, and no `/__lb/sessions/:id` route.
- **[Major][All] Retry policy is missing.** RF-013 requires retry on another eligible backend for retry-safe conditions before response headers are sent. Current behavior returns `502/504` after one selected backend fails and may open that backend's circuit.
- **[Minor][All] Half-open probe limits are modeled but not enforced.** `halfOpenProbe`/`halfOpenProbeInFlight` fields exist, but selection never sets them when allowing a probe. Multiple concurrent requests can enter a half-open backend instead of the configured limited probe behavior.

## Idiomaticity

- **[Educational][Go] `httputil.ReverseProxy` is a good base, but per-backend reuse matters.** The stdlib proxy correctly handles many HTTP details; the next idiomatic step is constructing one reverse proxy and transport per backend rather than per request.
- **[Critical][Rust] Only `http://` upstreams work despite config accepting `https://`.** `validate_backend` accepts HTTPS URLs, but `parse_http_url()` rejects anything except `http://`. A valid HTTPS backend can pass startup and fail only when traffic or health checks reach it.
- **[Educational][Node] `http-proxy` is a pragmatic choice.** It avoids hand-rolled proxy parsing and keeps request streaming mostly delegated to a battle-tested package, matching Node's ecosystem strengths.

## Error Handling

- **[Major][All] Timeouts are incomplete or misclassified.** Go uses one `http.Client` timeout for health checks only; data-plane proxy timeout behavior depends on default transport/proxy behavior. Rust maps all forward failures to `502`, including timeouts from `raw_http_request`. Node maps timeout-looking proxy errors to `504`, but only by substring inspection.
- **[Major][Go/Node] In-flight counters rely on callback/finish paths but lack abort tests.** The spec requires decrement exactly once on success, failure, timeout, cancellation, or client disconnect. Tests cover normal/failure responses, not client disconnects or aborted upstreams.
- **[Minor][Rust] Health-check path configuration is ignored.** `BackendConfig` has `health_path`, but `check_backend()` always builds `format!("{}/health", ...)`, so custom health-check config is silently unused.

## Testing

- **[Major][All] Missing acceptance coverage for several required algorithms/features.** There are no tests for consistent hashing, sticky cookies, TLS startup failure/success, retry-safe failover, connection-pool limits, max body handling, WebSocket/upgrade rejection, or session admin lookup.
- **[Minor][All] No sustained concurrency/failover stress tests.** Existing tests prove basic counter increments and circuit opening, but not 10k keep-alive connections, metrics responsiveness under load, half-open probe contention, or failover within one health interval.
- **[Minor][Rust] Manual HTTP parser needs protocol edge tests.** It parses simple HTTP/1.1 responses but lacks coverage for chunked responses, large headers, malformed status lines, and connection reuse boundaries.

## Recommended Next Fixes

1. Add `consistent_hash` to the router interface and test stable-key affinity under backend-set changes.
2. Implement sticky session cookie assignment/lookup with bounded TTL storage and admin lookup behavior.
3. Add per-backend reusable proxy/transport/client state with explicit timeout and connection-pool settings.
4. Enforce half-open probe limits and test concurrent half-open traffic.
5. Add retry-safe failover tests for GET before response headers and non-retry tests for unsafe POST/body cases.
