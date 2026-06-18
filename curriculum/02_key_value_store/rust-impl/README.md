# Key-Value Store — Rust

Rust implementation of AI DevSchool Project 02 using `axum`, `tokio`, `serde_json::Value`, and JSON tracing logs. The storage core is independent from the HTTP framework and keeps state in a `HashMap` behind a mutex for atomic command semantics.

## How to run

```sh
cargo run --release
curl -s http://localhost:8082/health
```

The service listens on `0.0.0.0:8082` by default. Override with `PORT=9000` or `PORT=127.0.0.1:9000`.

## How to test

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## API

Implements the shared HTTP JSON API from `../docs/spec.md`: `SET`, `GET`, `DEL`, `EXPIRE`, `TTL`, `PERSIST`, `KEYS`, `FLUSHDB`, `MGET`, `MSET`, and `GET /health`.

## Docker

```sh
docker build -t kvstore-rust .
docker run --rm -p 8082:8082 kvstore-rust
```

The image is multi-stage (`rust:1.81-alpine` builder to `alpine:3.19` runtime) and ships only the release binary, keeping the final image well under 300 MB.
