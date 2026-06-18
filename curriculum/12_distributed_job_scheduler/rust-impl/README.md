# Distributed Job Scheduler — Rust Implementation

Teaching implementation for Project 12. The library models scheduler behavior with typed states and `Duration`-based time: simple intervals (`5s`, `1m`), highest-process-ID leader leases, in-memory TTL locks with fencing tokens, high/normal/low priority queues, DAG dependency gating, retry backoff, cancellation, status tracking, and health reporting. The binary exposes `/health` through `axum`, emits JSON tracing logs, and shuts down on Ctrl-C/SIGTERM.

## Run

```bash
cargo run
curl http://127.0.0.1:8080/health
```

Set `PORT=18082` (or another port) to avoid local port conflicts.

## Test and verify

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

Core logic lives in `src/lib.rs` behind unit tests under `#[cfg(test)]`.

## Docker

```bash
docker build -t project12-scheduler-rust .
docker run --rm -p 8080:8080 project12-scheduler-rust
```
