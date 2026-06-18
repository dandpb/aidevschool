# Evolution Report — Project 11 · Load Balancer

> Scope: one bottleneck and one optimization path per language, grounded in the reviewed implementation.  
> No source code was modified for this report.

## Go

### Bottleneck

The data plane builds a fresh `httputil.ReverseProxy` and director/error-handler closures on every request. That keeps the implementation compact, but it hides connection-pool configuration and creates avoidable allocation/dispatch overhead in the exact hot path RNF-001/RNF-002 will measure.

### Optimization

Create a `backendRuntime.proxy` and `backendRuntime.transport` during backend registration. Reuse them for all requests, set `MaxIdleConnsPerHost`/idle timeout explicitly, and move failure accounting into a shared result wrapper. This exposes connection-pooling knobs and reduces per-request proxy setup cost.

## Rust

### Bottleneck

The Rust upstream forwarder buffers request and response bodies and opens a new TCP connection with `Connection: close` for each request. This prevents keep-alive benchmarks from measuring a realistic Rust proxy and makes large/streaming responses memory-bound.

### Optimization

Replace `raw_http_request()` with a reusable Hyper client per backend and stream `Body` through without full buffering. Keep routing/circuit logic framework-independent, but let Hyper own HTTP parsing, keep-alive, chunking, and TLS-capable connector behavior.

## Node/TypeScript

### Bottleneck

`maxConnections` is accepted in `BackendConfig` but ignored by selection and dispatch. Under backend saturation the balancer can continue assigning work to an overloaded backend, making least-connections advisory rather than protective.

### Optimization

Enforce per-backend concurrency limits in `weightedEligible()`: exclude backends at `maxConnections`, expose active/limit in admin status, and add a bounded queue only if the spec explicitly allows queueing. Pair this with keep-alive `http.Agent` options passed to `http-proxy`.

## Cross-Language Evolution Note

Before micro-optimizing algorithm selection, add the missing behavior that changes routing outcomes: consistent hashing, sticky sessions, retry-safe failover, and half-open probe limits. Without those, the load balancers mostly compare simple proxy overhead rather than the spec's intended failover and connection-management tradeoffs.
