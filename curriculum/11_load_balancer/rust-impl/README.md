# Load Balancer — Rust

Project 11 implementation using `tokio` and `axum`/Hyper server primitives with an explicit HTTP/1 upstream forwarder, backend-pool state, active `/health` checks, passive failure tracking, weighted round-robin, least-connections routing, backend add/remove, per-backend circuit breakers, structured `tracing` logs, admin endpoints, and graceful shutdown by task cancellation/server drain.

## Run

```sh
cargo run
BACKENDS=http://127.0.0.1:9001,http://127.0.0.1:9002 cargo run
```

## Verify

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## Admin endpoints

- `GET /__lb/health`
- `GET /__lb/backends`
- `GET /__lb/metrics`

## Docker

```sh
docker build -t load-balancer-rust .
docker run --rm -p 8080:8080 -e BACKENDS=http://host.docker.internal:9001,http://host.docker.internal:9002 load-balancer-rust
```
