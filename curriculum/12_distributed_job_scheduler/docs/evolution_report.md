# Evolution Report — Project 12 · Distributed Job Scheduler

> Scope: one bottleneck and one optimization path per language, grounded in the reviewed implementation.  
> No source code was modified for this report.

## Go

### Bottleneck

Go's `DispatchNext` scans every job, filters candidates, then sorts the candidate slice on each dispatch. More importantly, that candidate filter ignores due time, so the scheduler does work on jobs that should not be eligible yet.

### Optimization

Fix eligibility first (`StatusPending`, dependencies complete, `DueAt <= now`), then maintain separate ready and delayed priority queues. Use a min-heap for delayed jobs by due time and a priority heap for ready jobs by priority/due/creation. This reduces dispatch from full-map sorting to heap operations and makes scheduler accuracy testable.

## Rust

### Bottleneck

Rust's core is synchronous and deterministic, but `dispatch_next` clones and sorts all pending dependency-ready jobs each time. The binary also wraps the scheduler in `Arc<Mutex<_>>`, which would serialize all future HTTP endpoints through one blocking mutex.

### Optimization

Introduce a scheduler actor/task that owns state and receives commands over channels. Internally use due/ready heaps so dispatch does not clone the full job map. The actor model keeps async HTTP handlers from blocking on a standard mutex while preserving Rust's strong typed transitions.

## Node/TypeScript

### Bottleneck

Node's `dispatchNext` spreads all jobs into an array and sorts it for every dispatch. Since all state is in one event loop, a large queue will block unrelated health/status requests while sorting.

### Optimization

Maintain an incremental ready queue plus delayed timer wheel/min-heap. Move due jobs into the ready queue on a scheduler tick, and make `dispatchNext` pop one item instead of sorting the whole map. Add an explicit sequence number to avoid relying on millisecond timestamp ties.

## Cross-Language Evolution Note

The next optimization is not raw speed; it is semantic scalability. All languages need the same durable-state seam for jobs, locks, attempts, election terms/votes, and audit events. Once that seam exists, benchmarks can measure failover recovery and duplicate-dispatch prevention instead of just local in-memory sorting.
