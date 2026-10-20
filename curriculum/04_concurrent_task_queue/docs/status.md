# Status: 04_concurrent_task_queue

## Phase

phase: impl

> Phase: **impl**
> Present implementation: Node/TypeScript only
> Source status: first-cycle Node implementation with dated green Node verification and a dated local benchmark.

## Current State

Project 04 retains the first-cycle Node/TypeScript implementation: in-memory task queue with priority/FIFO scheduling, an event-loop worker pump (4 workers by default), retries with `maxRetries`, dead-letter flagging, cancellation, scheduled tasks, backpressure mapped to HTTP 429, and an Express HTTP API. `go-impl/` and `rust-impl/` were removed in `1b0a309` (ponytail quality cuts, 2026-07-19) and do not exist on disk.

The known gaps are durability (in-memory only) and deeper cancellation/backpressure validation under adversarial scheduling. These are next-cycle realism gaps, not missing-basic-implementation gaps.

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Removed | Removed in `1b0a309`; no Go implementation exists on disk. |
| Node/TS | `node-impl/` | Verified green (Node.js only) | 5/5 tests across `taskQueue` (3) and `server` (2); install/lint/build/test exit 0; live smoke (enqueue → succeeded via 4 workers → stats) and local HTTP benchmark recorded 2026-10-18 @ `6bd13ed6` (AID-5013). |
| Rust | `rust-impl/` | Removed | Removed in `1b0a309`; no Rust implementation exists on disk. |

## Evidence Read

- `docs/spec.md`
- `docs/benchmark_results.md` (historical 2026-07-02 polyglot table + dated 2026-10-18 Node re-verification)
- `docs/code_review.md`, `docs/evolution_report.md`
- `node-impl/src/taskQueue.ts`, `node-impl/src/server.ts`, `node-impl/src/main.ts`
- `node-impl/src/__tests__/taskQueue.test.ts`, `node-impl/src/__tests__/server.test.ts`
- [Onda 2 verification, 2026-10-18 @ `6bd13ed6`](../../../docs/product-readiness/assessments/2026-10-18-6bd13ed6-onda2-03-04.md)

Earlier Go/Rust review notes and the 2026-07-02 polyglot benchmark rows are historical and do not establish present implementations.

## Cycle-Complete Definition

This phase records the Node implementation's software cycle and supports a learning review. It does **not** grant learner mastery or claim production readiness, durability, or cross-language throughput parity. The 2026-10-18 benchmark is a single-machine Linux measurement with a Node.js driver (k6 unavailable in the sandbox); treat numbers as relative evidence for this hardware only.

## Next Phase

Recommended next phase: **benchmark-and-optimize**.

1. Adversarial scheduling pass: cancellation racing retries, DLQ poison-task storms, and backpressure under burst enqueue.
2. Durability pass: queue state snapshot/restore across restarts before claiming cycle-complete.
3. Re-run the shared `bench_orchestrator.py` with k6 on benchmark hardware for publication-grade p95/p99.
