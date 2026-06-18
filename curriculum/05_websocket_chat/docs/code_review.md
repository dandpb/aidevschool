# Code Review — Project 05 · WebSocket Chat Server

> Inputs: `docs/spec.md`, `go-impl/`, `node-impl/` source and tests.
> Posture: pedagogical review — identify gaps, explain tradeoffs, and preserve the learning value of each implementation.

## Executive Summary

The Go and Node/TypeScript implementations both deliver a functional in-memory chat core with connection acknowledgements, rooms, bounded history, private messages, typing, presence, heartbeat helpers, structured errors, and metrics. The strongest shared design choice is the deterministic core (`chat.Hub` / `ChatHub`) separated from WebSocket transport, which makes most behavior testable without real sockets.

The main quality gap is not basic feature coverage; it is production realism around slow consumers, heartbeat semantics, and benchmark evidence for the spec's 10k-connection comparison target. Both implementations are good learning submissions, but neither yet proves the non-functional goals around 10k sockets, p95 fan-out latency, per-connection memory, or heartbeat CPU cost.

## Severity Summary

| Implementation | Critical | Major | Minor | Educational | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Go | 0 | 3 | 2 | 2 | 7 |
| Node/TS | 0 | 3 | 3 | 2 | 8 |
| Cross-language | 0 | 2 | 1 | 1 | 4 |
| **Total** | **0** | **8** | **6** | **5** | **19** |

## Seven-Category Coverage

| Category | Representative findings |
| --- | --- |
| Security | oversized/event validation, origin policy, anonymous handshake caveat |
| Performance | synchronous fan-out, missing 10k benchmark evidence |
| Readability | clear pure-core split, but dense event-switch handlers |
| Maintainability | testable hub core; config/env parity incomplete in Go |
| Idiomaticity | Go mutex core vs Node event-loop core are idiomatic for each runtime |
| Error Handling | structured event errors present; WebSocket parse/fatal handling is shallow |
| Testing | strong unit coverage; weak real-socket/load/slow-consumer coverage |

## Go Findings

### [GO-MAJOR-001] Broadcast holds the hub mutex while writing to client transports

- **Category:** Performance · Error Handling
- **Evidence:** `go-impl/chat/hub.go` calls `broadcastLocked` → `deliverLocked` while `Hub.mu` is held; `server.go` transport writes via `conn.WriteJSON`.
- **Impact:** One slow network write can hold the global state lock, blocking joins, leaves, private messages, heartbeat scans, and other room broadcasts. That violates the spirit of RNF-007: a stalled client must not block healthy clients.
- **Pedagogical fix:** Keep the lock only long enough to choose recipients and copy events; hand delivery to per-client bounded outbound goroutines/channels outside the hub mutex.

### [GO-MAJOR-002] Heartbeat is core-only; server does not run ping/timeout loop

- **Category:** Error Handling · Testing
- **Evidence:** `Hub.SendHeartbeat` and `DisconnectStale` exist, but `go-impl/server.go` only reads JSON events in a loop.
- **Impact:** Unit tests prove stale cleanup in the core, but the running server does not automatically send heartbeats or disconnect missed clients. RF-010 is partially implemented at the library level, not at the transport lifecycle level.
- **Pedagogical fix:** Add a server-level ticker with context cancellation; test with a fake transport or short interval integration test.

### [GO-MAJOR-003] WebSocket origin policy accepts every origin

- **Category:** Security
- **Evidence:** `websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}`.
- **Impact:** This is acceptable for local learning but unsafe as a default. Browser-hosted attackers can initiate cross-site WebSocket attempts against a user's reachable server.
- **Pedagogical fix:** Document anonymous/local mode and add configurable allowed origins for production-shaped runs.

### [GO-MINOR-001] Message delivery metrics count acknowledgements, pings, errors, and presence as delivered messages

- **Category:** Readability · Maintainability
- **Evidence:** `deliverLocked` increments `MessagesDelivered` for every event type.
- **Impact:** Metrics do not distinguish chat payloads from protocol/control events, making fan-out comparisons less precise.
- **Pedagogical fix:** Split `eventsDelivered` from `chatMessagesDelivered`, or label by event type.

### [GO-MINOR-002] Pagination/history `limit` accepts fractional JSON numbers through float conversion

- **Category:** Error Handling
- **Evidence:** `historyLocked` accepts `limit` as `float64` and casts to `int`.
- **Impact:** A request like `limit: 1.9` silently becomes `1`; the spec asks for structured invalid-format behavior.
- **Pedagogical fix:** Require whole numbers before conversion.

### [GO-EDU-001] Coarse mutex is a good first concurrency model, but know the cliff

- **Category:** Idiomaticity · Performance
- **Lesson:** A single mutex over room/client maps is easy to reason about and excellent for correctness-first learning. The scaling cliff appears when network delivery happens inside the lock; the optimization is not "use sync.Map", it is "separate state mutation from I/O".

### [GO-EDU-002] Pure hub tests are a strong design pattern

- **Category:** Testing · Maintainability
- **Lesson:** `captureTransport` lets the tests cover join/history/private/typing/errors without a socket. Keep this seam; add integration/load tests around it rather than replacing it.

## Node/TypeScript Findings

### [NODE-MAJOR-001] `WebSocketTransport.send` treats queued writes as immediate successful delivery

- **Category:** Performance · Error Handling
- **Evidence:** `socket.send(JSON.stringify(event)); return true;` in `src/server.ts` ignores callback errors and buffered amount.
- **Impact:** Metrics can report success before the frame is actually flushed. Slow-consumer detection in `ChatHub.deliver` is ineffective because `outboundQueueDepth` increments and decrements synchronously around an async WebSocket send.
- **Pedagogical fix:** Track `socket.bufferedAmount`, use send callbacks, and disconnect when queued bytes exceed a limit.

### [NODE-MAJOR-002] Heartbeat pings are application messages, but `pong` correlation is not tracked

- **Category:** Error Handling · Testing
- **Evidence:** `sendHeartbeat` generates IDs; `handle(... pong ...)` only validates a string and updates `lastSeenAt` for any event.
- **Impact:** A client can keep itself alive with arbitrary valid events or stale pong IDs. This is useful for a teaching simplification, but it does not prove heartbeat threshold semantics in RF-010.
- **Pedagogical fix:** Store outstanding heartbeat IDs/deadlines per client and accept only the latest expected response.

### [NODE-MAJOR-003] Invalid JSON is converted into a generic missing-type event

- **Category:** Error Handling · Readability
- **Evidence:** `server.ts` catches parse errors and calls `hub.handle(clientId, { type: undefined })`.
- **Impact:** The structured error works, but the original failure reason is lost and all parse failures look like a missing type.
- **Pedagogical fix:** Add an explicit `invalidJson` path or parse error wrapper so metrics/audit can distinguish malformed JSON from semantically invalid envelopes.

### [NODE-MINOR-001] `/metrics` and `/healthz` exact URL checks ignore query strings

- **Category:** Maintainability
- **Evidence:** `request.url === '/metrics'` and `request.url === '/healthz'`.
- **Impact:** `/metrics?format=json` returns 404 even though most HTTP handlers treat the path separately from query parameters.
- **Pedagogical fix:** Parse `new URL(request.url, base).pathname` for routing.

### [NODE-MINOR-002] Display-name sanitization only truncates length

- **Category:** Security · Readability
- **Evidence:** `displayName: displayName?.slice(0, 64)`.
- **Impact:** No immediate server exploit because the value is not rendered here, but downstream UIs could echo control characters or HTML-looking text.
- **Pedagogical fix:** Trim and reject/control characters; document that UI escaping is still required.

### [NODE-MINOR-003] `history.beforeMessageId` is typed but not implemented

- **Category:** Maintainability · Testing
- **Evidence:** `ClientEvent` includes `beforeMessageId`; `history()` only slices the latest `limit` messages.
- **Impact:** The API surface promises pagination-like behavior that is not present.
- **Pedagogical fix:** Either remove the field from the type until implemented or support lookup before the specified message.

### [NODE-EDU-001] Event-loop state makes the core simple, not automatically scalable

- **Category:** Idiomaticity · Performance
- **Lesson:** The lack of locks is correct in a single Node process. It also means one CPU-bound validation or large synchronous broadcast loop can stall every connection. Load testing should measure event-loop lag, not only request counts.

### [NODE-EDU-002] Runtime validation is the right next TypeScript lesson

- **Category:** Testing · Security
- **Lesson:** Static `ClientEvent` types do not protect the WebSocket boundary. The implementation hand-validates fields; a schema layer would make error behavior easier to keep consistent as event shapes grow.

## Cross-Language Comparison

| Concern | Go | Node/TS | Teaching takeaway |
| --- | --- | --- | --- |
| Core state | `sync.Mutex` over maps | event-loop `Map` state | Go needs lock discipline; Node needs event-loop latency discipline. |
| Transport delivery | direct `WriteJSON` under lock | async `socket.send` counted synchronously | Both need real outbound queues to satisfy slow-consumer isolation. |
| Heartbeat | helpers in core, not wired in server loop | ticker wired, weak pong correlation | Go is incomplete at runtime; Node is present but too permissive. |
| Metrics | exposed via `/metrics`, coarse counters | exposed via `/metrics`, coarse counters | Add event-type latency and queue metrics before benchmarking. |
| Tests | strong pure-core Go tests | strong pure-core Node tests | Both need WebSocket integration/load tests for the spec's concurrency goals. |

### Cross-language findings

- **[CROSS-MAJOR-001] No implementation proves RNF-001 through RNF-004.** The spec is explicitly about 10k persistent connections, p95 fan-out latency, memory/connection, and heartbeat overhead. Current tests are correctness tests, not capacity evidence.
- **[CROSS-MAJOR-002] Slow-consumer handling is nominal, not real.** Both implementations have an `outboundQueueLimit`, but neither has a true asynchronous per-client queue with backpressure-aware drain behavior.
- **[CROSS-MINOR-001] Message/event metrics are too coarse for fair comparison.** Delivered control frames inflate message delivery counts.
- **[CROSS-EDU-001] The pure-domain-core seam is the best shared design choice.** Preserve it while adding real socket/load tests.

## Priority Recommendations

1. Add a benchmark harness before optimizing: idle 10k sockets, 100-member fan-out, churn, and slow-consumer scenarios.
2. Introduce per-client outbound queues in both languages; delivery should not happen while holding global state locks.
3. Tighten heartbeat semantics with tracked outstanding heartbeat IDs and runtime server loops in Go.
4. Split metrics by event type and add fan-out latency histograms.
