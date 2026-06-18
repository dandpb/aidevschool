# API Gateway with Circuit Breaker — Rust

Lightweight API gateway in Rust with axum/tokio implementing reverse proxy, circuit breaker, retry with backoff+jitter, fallback, bulkheading, and per-tenant rate limiting.

## Quick start

```sh
cargo run
```

## Build

```sh
cargo build --release
```

## Test

```sh
cargo test
```

## Docker

```sh
docker build -t api-gateway-rust .
docker run --rm -p 8080:8080 api-gateway-rust
```
