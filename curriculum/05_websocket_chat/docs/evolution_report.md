# Evolution Report — Project 05 · WebSocket Chat Server

> Phase: **cycle-complete**
> Focus: one bottleneck and one optimization suggestion per implementation language.

## Go

- **Bottleneck:** Broadcast delivery happens while holding the hub mutex. Because `broadcastLocked` calls `deliverLocked`, and the WebSocket transport writes directly to the socket, a slow `WriteJSON` can block unrelated room state changes and fan-out.
- **Optimization suggestion:** Split state selection from transport delivery. Under the mutex, copy recipient IDs and event payloads; outside the mutex, push events into per-client bounded outbound channels serviced by writer goroutines. This preserves correctness while making slow-consumer isolation real.

## Node/TypeScript

- **Bottleneck:** `socket.send()` is treated as synchronous success, so `outboundQueueDepth` does not model actual bytes waiting in the WebSocket library. Under fan-out, memory pressure and slow clients will be hidden until the process is already buffering heavily.
- **Optimization suggestion:** Track `socket.bufferedAmount` and send callbacks. Disconnect or shed clients whose buffered bytes exceed a configured threshold, and expose that threshold through metrics so benchmarks can compare dropped slow consumers fairly.

## Rust

- **Bottleneck:** No Rust implementation is present under `05_websocket_chat/` in this repo snapshot, so Rust cannot yet participate in the runtime comparison requested by the spec.
- **Optimization suggestion:** If Rust is added, start with an Axum/Tokio WebSocket gateway plus `Arc`-owned room state and per-client `mpsc` send queues. Build the slow-consumer queue from the start rather than porting the synchronous fan-out shape.

## Cross-Language Evolution Theme

The next learning step is to move from "correct in-memory chat behavior" to "operationally believable persistent-connection behavior." That means the optimizer should not begin with micro-optimizations; it should first make the delivery model measurable: queue depth, buffered bytes, fan-out latency, heartbeat timeout count, and memory per idle client.
