# Status: 08_event_driven_order_system

## Phase

phase: cycle-complete

# Status — Project 08 Event-Driven Order System

## Cycle status

**Status:** cycle-complete  
**Implementations:** done for Go, Rust, and Node/TypeScript  
**Review state:** code review and evolution report written for the current implementation cycle

## Implementation inventory

| Language | Path | State | Notes |
| --- | --- | --- | --- |
| Node/TypeScript | `node-impl/` | Done | Express API, in-memory event store/outbox, EventEmitter pub/sub, projections, saga, replay, health, tests. |
| Go | `go-impl/` | Done | `net/http` API, mutex-protected event store/outbox, channel pub/sub, projections, saga, replay, health, race-oriented tests. |
| Rust | `rust-impl/` | Done | Axum API, typed event/status enums, broadcast pub/sub, in-memory projections, saga, replay, health, tests. |

## Completed functional areas

- Command API for create, payment, inventory, cancel, ship, and deliver.
- Immutable event envelopes with per-aggregate sequence and global position.
- Aggregate folding and replay integrity checks.
- Idempotent command handling and optimistic concurrency conflicts.
- Transactional-outbox boundary, at-least-once-style publish path, and subscriber failure visibility.
- Order summary and customer history projections.
- Replay operation for projection rebuilds.
- Fulfillment saga for confirm/cancel/compensation outcomes.
- Health endpoint with backlog/lag/failure fields.
- Automated tests for lifecycle behavior, invalid commands, replay, HTTP, pub/sub, and saga idempotency.

## Known architectural caveats

- The spec requires durable storage; this cycle uses in-memory event stores and outboxes by task constraint and README documentation.
- Background work is modeled synchronously after append, so projection lag and saga backlog are visible as concepts but not stressed as real asynchronous queues.
- Replay is synchronous and returns an immediate completed result rather than a tracked long-running replay resource.

## Completion decision

The project is complete for the current architecture-pattern learning cycle. Future work should be an evolution cycle, not a completion blocker: durable persistence, independent workers, real lag benchmarks, and crash-recovery tests.
