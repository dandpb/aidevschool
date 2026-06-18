# Distributed Configuration Service — Rust

A distributed configuration service in Rust (Axum + Tokio), implementing the spec in
[`../docs/spec.md`](../docs/spec.md).

## What it does

- HTTP API at `http://localhost:8080`
- Config key-value store with GET/PUT
- Watch/notify via Server-Sent Events
- Versioning with optimistic locking
- Feature flags with targeting rules
- Gradual rollout with deterministic hashing

## Quick start

```sh
# Run locally
cargo run

# In another terminal
curl -X PUT http://localhost:8080/config/payments.retry_limit \
  -H "Content-Type: application/json" \
  -d '{"value":{"maxRetries":3},"contentType":"application/json","reason":"Initial config"}'

curl http://localhost:8080/config/payments.retry_limit
```

## Build

```sh
cargo build --release
```

## Run

```sh
./target/release/distributed-config-service-rust         # listens on :8080
PORT=9000 ./target/release/distributed-config-service-rust  # custom port
```

## Test

```sh
# All tests
cargo test
```

## Docker

```sh
docker build -t dcs-rust .
docker run --rm -p 8080:8080 dcs-rust
```

## Architecture

```
Cargo.toml           # dependencies: axum, tokio, serde, chrono, sha2
src/main.rs          # HTTP server, routing, SSE handling, core logic
```

## License

Part of AI DevSchool Project 17. See top-level `LICENSE` if present.
