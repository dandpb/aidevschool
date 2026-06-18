# Code Review: Project 04 Concurrent Task Queue

## Scope

Reviewed the Project 04 specification and the Go, Rust, and Node implementations. This review focuses on how each implementation teaches task-queue concurrency and where the next learning iteration should improve correctness evidence and performance.

## Severity Legend

- **Critical**: breaks a core contract or creates unacceptable risk.
- **Major**: likely to cause incorrect behavior, poor scalability, or drift from the spec.
- **Minor**: improves clarity, ergonomics, or robustness without changing the core design.
- **Educational**: useful teaching point rather than a required fix.

## 7-Category Review

### Security

- **Minor**: The HTTP surfaces do not include authentication, tenant isolation, or a strong request-size policy. That is acceptable for an in-memory lab queue, but the docs should warn learners not to treat it as a multi-tenant production queue.

### Performance

- **Major**: All three implementations repeatedly sort or scan queue state on hot paths. This keeps the data structure easy to understand, but it means scheduling/backpressure costs grow with queue size instead of staying near logarithmic or constant time.

### Readability

- **Minor**: The task lifecycle is understandable in all three languages. The main readability cost is that queue policy, retry policy, backpressure, stats, worker coordination, and HTTP mapping are close together.

### Maintainability

- **Major**: Each implementation centralizes too much policy in one queue type or file. Adding pause/resume, retention windows, richer DLQ handling, or persistence would require touching broad areas of the same module.

### Idiomaticity

- **Educational**: Go is idiomatic in its use of contexts, goroutines, condition variables, and errgroup-style shutdown. Rust is idiomatic in explicit enums and Axum routing, though the global mutex is intentionally simple. Node is approachable but does more manual pump scheduling than a production queue would.
- **Minor**: Node declares a logger stack but still relies on `console.info` in places, which weakens observability consistency.

### Error Handling

- **Major**: Running-task cancellation is mostly status-based. The worker/handler is not robustly signaled in a consistent cross-language way, so “cancel requested” can be recorded without the running work being promptly interrupted.

### Testing

- **Minor**: Core behavior tests are strong across languages: priority/FIFO, idempotency, retries, DLQ, scheduling, worker limits, shutdown, and HTTP mapping are represented. The remaining gaps are deterministic timing, real cancellation of running work, and measured backpressure/performance thresholds.

## Cross-Language Comparison

- **Go** is clearest for teaching goroutine lifecycle, condition-variable coordination, context cancellation, and graceful shutdown.
- **Rust** is strongest for teaching explicit state and error modeling through enums and typed handlers.
- **Node** is easiest to read for learners familiar with promises and Express, and it shows how an event-loop queue can still model worker concurrency.
- **All three** expose the same state machine, which is ideal for comparing concurrency tradeoffs. The shared weakness is the simple sorted-list queue strategy.

## Issue Summary by Severity

### Critical

- None identified during this review.

### Major

- O(n log n) sorting/scanning appears on hot queue paths across languages.
- Running-task cancellation is not strongly propagated to active work.
- Queue policy is centralized in large modules, making future feature evolution harder.

### Minor

- Security posture is lab-only: no auth, tenant isolation, or explicit request-size contract.
- Logging/observability conventions are inconsistent in Node.
- Tests need stronger timing and performance evidence.

### Educational

- The implementations are strong teaching artifacts because they show the same task lifecycle through goroutines, Tokio tasks, and the Node event loop.
