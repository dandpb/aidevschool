# Evolution Report: Project 04 Concurrent Task Queue

## Summary

Project 04 now demonstrates a concurrent task queue in Go, Rust, and Node. The next evolution should focus on replacing simple sorted-list queue maintenance with data structures that match the queue’s scheduling semantics.

## Language Bottlenecks

### Go

- **Identified bottleneck**: The queue uses slice sorting plus repeated active-count scans.
- **Why it matters**: The implementation is easy to understand, but each scheduling/backpressure decision becomes more expensive as tasks accumulate.

### Rust

- **Identified bottleneck**: The ready queue uses vector sorting and front removal on the hot path.
- **Why it matters**: `remove(0)` shifts elements and compounds the cost of sorting, so the queue structure fights the scheduler’s needs.

### Node

- **Identified bottleneck**: The queue performs full array sorts and filter-based counting during stats/backpressure checks.
- **Why it matters**: This work runs on the event loop, so bookkeeping overhead can delay unrelated requests and worker progress.

## Suggested Optimization

Use a priority-aware queue structure and cached counters:

- Go: replace repeated slice sorting with a heap and maintain active/dead-letter counters incrementally.
- Rust: use `BinaryHeap` or separate ready/scheduled structures and avoid front-removal shifts.
- Node: use a binary heap or indexed queue plus cached counters so the pump stays O(log n), not O(n log n).

## Before / After Placeholder

Benchmarks pending.

| Language | Before | After |
| --- | --- | --- |
| Go | Pending benchmark of current sort/scan queue maintenance. | Pending benchmark after heap and cached-counter optimization. |
| Rust | Pending benchmark of current vector sort/remove behavior. | Pending benchmark after heap or split ready/scheduled queues. |
| Node | Pending benchmark of current array sort/filter event-loop behavior. | Pending benchmark after heap/indexed queue and cached counters. |
