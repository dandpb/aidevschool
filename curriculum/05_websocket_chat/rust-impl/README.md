# WebSocket Chat Server — Rust

Project 05 implementation using Tokio, `tokio-tungstenite`, `tokio::select!`, and per-client `tokio::sync::mpsc` outbound channels.

## Features

- WebSocket JSON text frames with `connected` acknowledgement.
- Join/leave rooms, room broadcast, private messages, presence, typing indicators, bounded history, heartbeat ping/stale cleanup, graceful disconnect cleanup, and structured tracing logs.
- `ChatHub` is pure in-memory core logic covered by integration tests; `server::run` adapts it to sockets.

## Commands

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo build --release
cargo run
```

Default port: `8085` (`PORT=9000 cargo run`).

## Docker

```bash
docker build -t websocket-chat-rust .
docker run --rm -p 8085:8085 websocket-chat-rust
```
