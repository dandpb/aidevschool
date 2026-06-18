# Status — Project 05 · WebSocket Chat Server

> Phase: **cycle-complete**
> Implementations reviewed: Go, Node/TypeScript
> Source status: all present implementations are done for the current learning cycle.

## Current State

Project 05 has completed first-cycle implementations in Go and Node/TypeScript. Both include a testable in-memory chat core, WebSocket server wiring, room membership, room messages, private messages, typing indicators, bounded history, presence events, heartbeat helpers, structured errors, and metrics endpoints.

The project is ready for pedagogical review and a benchmark/optimizer follow-up. The remaining gaps are not "missing basic implementation" gaps; they are deeper runtime realism gaps around slow-consumer isolation, heartbeat enforcement, and the spec's 10k-connection measurement targets.

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Done | Strong pure `chat.Hub` tests; server needs heartbeat ticker and delivery decoupling for production-shaped behavior. |
| Node/TS | `node-impl/` | Done | Strong pure `ChatHub` tests; WebSocket send/backpressure semantics need more realistic queue handling. |
| Rust | n/a | Not present in this repo snapshot | The spec includes Rust notes, but no `rust-impl/` exists under Project 05. |

## Evidence Read

- `docs/spec.md`
- `go-impl/chat/hub.go`
- `go-impl/chat/types.go`
- `go-impl/server.go`
- `go-impl/main.go`
- `go-impl/chat/hub_test.go`
- `node-impl/src/chatHub.ts`
- `node-impl/src/server.ts`
- `node-impl/src/config.ts`
- `node-impl/src/types.ts`
- `node-impl/tests/chatHub.test.ts`
- `node-impl/tests/config.test.ts`

## Cycle-Complete Definition

This status means the implementations have enough behavior and tests to support a learning review. It does **not** claim production readiness or benchmark superiority. The next cycle should add measurable load evidence and targeted optimizations.

## Next Phase

Recommended next phase: **benchmark-and-optimize**.

1. Measure idle connection capacity, fan-out latency, memory per connection, heartbeat CPU, and churn cleanup.
2. Add slow-consumer fixtures that prove one stalled client cannot block healthy clients.
3. Align runtime heartbeat behavior across Go and Node/TS.
