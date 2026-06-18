# Concurrent Task Queue — Rust

Rust implementation of Project 04 using Tokio tasks, `Arc<Mutex<_>>` state, explicit status enums, async handlers, and Axum for the HTTP surface.

## Features

- `POST /tasks`, `GET /tasks/:id`, `DELETE /tasks/:id`, `GET /stats`, `GET /healthz`
- Bounded priority queue with FIFO tie-breaks
- Configurable Tokio worker pool, including zero-worker paused mode
- Idempotency keys, cancellation, scheduled tasks, exponential retry, DLQ
- Structured transition logs through `tracing`
- Graceful drain through `TaskQueue::shutdown(timeout)`

## Run

```bash
cargo run
curl -s http://localhost:8084/healthz
```

## Test and lint

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
rustup run stable cargo llvm-cov --summary-only
```

`cargo llvm-cov` currently clears the 80% target when run through the rustup-managed toolchain on this machine.

## Docker

```bash
docker build -t ctq-rust .
docker run --rm -p 8084:8084 ctq-rust
```
