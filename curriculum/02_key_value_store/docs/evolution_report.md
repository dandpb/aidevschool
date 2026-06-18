# Evolution Report: Project 02 Key-Value Store

## Summary

Project 02 now has complete Go, Rust, and Node implementations of the in-memory key-value store. The next evolution step should focus on measuring the cost of each runtime’s simplest concurrency model before introducing more advanced storage structures.

## Language Bottlenecks

### Go

- **Identified bottleneck**: The store uses a central lock path, and read-like operations do not fully benefit from read locking.
- **Why it matters**: A key-value store is often read-heavy. Serializing reads hides the main performance advantage Go could demonstrate with `RWMutex`.

### Rust

- **Identified bottleneck**: A single shared `Mutex` protects the whole store, and expiry cleanup can scan broad state.
- **Why it matters**: Rust’s ownership model can make safe concurrency explicit, but one coarse lock prevents learners from seeing that advantage under contention.

### Node

- **Identified bottleneck**: JSON validation and deep cloning happen synchronously on the event loop.
- **Why it matters**: Node can be very responsive for I/O-heavy work, but CPU-heavy hot paths block all other requests.

## Suggested Optimization

Introduce a benchmark suite first, then optimize only the measured bottleneck:

- Go: use `RLock` for read-only commands and move expiry cleanup away from the hottest read paths where possible.
- Rust: split read-heavy and write-heavy state with `RwLock`, sharding, or a dedicated expiry index.
- Node: reduce repeated deep cloning and keep expensive cleanup away from the hottest request paths.

## Before / After Placeholder

Benchmarks pending.

| Language | Before | After |
| --- | --- | --- |
| Go | Pending benchmark of current global-lock behavior. | Pending benchmark after read-lock/cleanup optimization. |
| Rust | Pending benchmark of current single-mutex behavior. | Pending benchmark after lock-splitting or expiry-index optimization. |
| Node | Pending benchmark of current event-loop cloning/validation behavior. | Pending benchmark after clone/cleanup reduction. |
