# Code Review — Project 08 Event-Driven Order System

## Review scope

Reviewed `docs/spec.md` plus the Go, Rust, and Node/TypeScript source and tests. This is an architecture-focused review: severities describe learning/architecture risk, not production incident priority.

## 1. Specification and contract coverage

| Severity | Finding |
| --- | --- |
| Medium | All three implementations cover the core command/read endpoints, event envelopes, idempotency, optimistic concurrency, replay, health, and saga confirmation/cancellation paths. |
| High | The spec requires durable event/outbox/projection storage, but every implementation is intentionally in-memory. The READMEs document this as a task constraint, so it is acceptable for the cycle but remains the largest spec gap. |
| Low | Replay status is returned synchronously as `replay_latest` rather than modeled as a long-running replay resource with `GET /admin/projections/replay/{id}`. |

## 2. Event-sourcing model and aggregate design

| Severity | Finding |
| --- | --- |
| Low | Each language keeps an append-only event list, per-order sequence, global position, stable envelope fields, and fold/replay helpers. This makes event sourcing visible and testable. |
| Medium | Event payloads are loosely typed in Node (`Record<string, unknown>`), Go (`map[string]any`), and Rust (`serde_json::Value`). This preserves language neutrality but weakens compile-time guarantees for event schema evolution. |
| Low | Sequence-gap detection exists in all three aggregate folds, which is a strong replay-integrity teaching point. |

## 3. Command validation, idempotency, and concurrency

| Severity | Finding |
| --- | --- |
| Low | Create, payment, inventory, cancel, ship, and deliver commands validate inputs and reject invalid transitions before appending. |
| Medium | Idempotency keys are stored globally rather than scoped by command namespace or aggregate. This is simple and testable, but a real system would avoid accidental cross-command collisions. |
| Low | Expected-version conflicts are implemented consistently and leave event counts unchanged in tests. |

## 4. Pub/sub, outbox, projections, and eventual consistency

| Severity | Finding |
| --- | --- |
| Medium | The transactional outbox pattern is structurally present in all languages, but publication is invoked synchronously immediately after append. This demonstrates the boundary without exercising crash-recovery polling. |
| Medium | Projections are updated in-process during publish, so the implementations expose projection shape more than real asynchronous lag. Health reports backlog and lag fields, but lag is effectively always zero once publish completes. |
| Low | Projection rebuilds clear read models and reapply the event log, which cleanly demonstrates replay without mutating events. |

## 5. Saga orchestration and failure semantics

| Severity | Finding |
| --- | --- |
| Low | The fulfillment saga is clear: payment plus inventory success creates exactly one `OrderConfirmed`; payment failure or inventory rejection creates cancellation, with payment-release compensation when inventory fails after payment authorization. |
| Medium | Saga work is recursive/synchronous through `append` and `publishOutbox` rather than a queued worker with bounded retries. This is good for learning determinism, but it does not model backlog/backoff behavior from the spec. |
| Low | Duplicate saga wakeups are guarded by event-existence checks, and tests cover non-duplication. |

## 6. Observability, operations, and API ergonomics

| Severity | Finding |
| --- | --- |
| Low | Go uses `slog`, Rust uses `tracing`, and Node uses `pino` at the server boundary. Health endpoints expose the required shape. |
| Medium | Correlation IDs are mostly synthetic (`corr_http` or idempotency-derived), not request-propagated. That is enough for a teaching API but weak for tracing multi-step workflows. |
| Low | HTTP response envelopes are consistent enough for cross-language clients, with expected command metadata and projection reads. |

## 7. Maintainability, tests, and learning value

| Severity | Finding |
| --- | --- |
| Low | Tests in all languages cover lifecycle commands, idempotency, invalid transitions, saga paths, replay, health, pub/sub, HTTP routes, and compensation. |
| Medium | The Go implementation packs API, store, projections, saga, and helpers into `order.go`, making architectural components less visually separated than the Node and Rust versions. |
| Low | Rust has the strongest type modeling for event/status enums; Node is the easiest to read quickly; Go has the clearest concurrency-ready boundaries through mutexes/channels. |

## Cross-language comparison

| Axis | Node/TypeScript | Go | Rust |
| --- | --- | --- | --- |
| Primary pattern expression | Class-based service with pure fold helper and Express adapter. | Explicit structs, `EventStore`, `PubSub`, `ProjectionStore`, and `Service` with `net/http`. | `AppState` plus typed enums, Axum routes, and broadcast topic. |
| Event safety | Discriminated string unions but untyped payload map. | Constants and structs, but payload remains `map[string]any`. | Strongest event/status enums; payload still dynamic `Value`. |
| Concurrency model | Single-threaded synchronous publish path via `EventEmitter`. | Mutex-protected store and channel-backed pub/sub; closest to worker evolution. | `Arc<Mutex<Inner>>` and `broadcast`; async HTTP but mostly synchronous state mutation. |
| Spec trade-off | Most compact, least durable. | Best stepping stone to durable polling workers. | Strong type story, but global mutex limits async benefits. |
| Overall verdict | Complete and readable teaching implementation. | Complete and architecture-explicit, but monolithic file. | Complete and type-safe, with room to split state/transport layers. |

## Overall assessment

Project 08 is cycle-complete as a learning implementation across Go, Rust, and Node/TypeScript. The implementations intentionally prioritize architecture-pattern visibility over production durability; the next evolution should replace in-memory event/outbox stores with durable adapters and move publisher/projection/saga work to bounded background loops.
