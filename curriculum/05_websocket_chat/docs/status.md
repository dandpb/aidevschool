# Status: 05_websocket_chat

## Phase

phase: impl

> Phase: **impl**
> Present implementation: Node/TypeScript only
> Source status: partially implemented, with dated green Node verification.

## Current State

Project 05 retains the first-cycle Node/TypeScript implementation with a testable in-memory chat core, WebSocket server wiring, room membership, room messages, private messages, typing indicators, bounded history, presence events, heartbeat helpers, structured errors, and metrics endpoints. `go-impl/` and `rust-impl/` were removed in `1b0a309` quality cuts and do not exist on disk.

The project is ready for pedagogical review and a benchmark/optimizer follow-up. The remaining gaps are not "missing basic implementation" gaps; they are deeper runtime realism gaps around slow-consumer isolation, heartbeat enforcement, and the spec's 10k-connection measurement targets.

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Removed | Removed in `1b0a309`; no Go implementation exists on disk. |
| Node/TS | `node-impl/` | Verified green (Node.js only) | 10/10 tests across `chatHub` and `config`; lint/build/test exit 0, verified 2026-09-13 @ `05fca349`. WebSocket send/backpressure semantics need more realistic queue handling. |
| Rust | `rust-impl/` | Removed | Removed in `1b0a309`; no Rust implementation exists on disk. |

## Evidence Read

- `docs/spec.md`
- `node-impl/src/chatHub.ts`
- `node-impl/src/server.ts`
- `node-impl/src/config.ts`
- `node-impl/src/types.ts`
- `node-impl/tests/chatHub.test.ts`
- `node-impl/tests/config.test.ts`
- [Wave 1 verification, 2026-09-13 @ `05fca349`](../../../docs/product-readiness/assessments/2026-09-13-05fca349-devjourneys-wave1.md)

Earlier Go/Rust review notes are historical and do not establish present implementations.

## Cycle-Complete Definition

This phase records the Node implementation's software cycle and supports a learning review. It does **not** grant learner mastery or claim production readiness or benchmark superiority. The next cycle should add measurable load evidence and targeted optimizations.

## Next Phase

Recommended next phase: **benchmark-and-optimize**.

1. Measure idle connection capacity, fan-out latency, memory per connection, heartbeat CPU, and churn cleanup.
2. Add slow-consumer fixtures that prove one stalled client cannot block healthy clients.
3. Verify runtime heartbeat enforcement in Node/TS.
