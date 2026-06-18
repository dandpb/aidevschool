# Event-Driven Order System — Rust

Rust implementation of Project 08 using `axum`, `tokio`, typed order event enums, an in-memory event store/outbox, `tokio::sync::broadcast` pub/sub, projections, saga orchestration, event replay, health reporting, structured tracing, and graceful shutdown.

> Spec note: `docs/spec.md` asks for durable storage, but this task explicitly requested an in-memory event store. The store/outbox boundary is explicit so a durable adapter can replace it later.

## Run

```sh
cargo run
curl -s http://127.0.0.1:8082/health
```

## Verify

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## Endpoints

- `POST /orders`
- `POST /orders/{id}/authorize-payment`
- `POST /orders/{id}/reserve-inventory`
- `POST /orders/{id}/cancel`
- `POST /orders/{id}/ship`
- `POST /orders/{id}/deliver`
- `GET /orders/{id}`
- `GET /orders/{id}/events`
- `GET /customers/{customer_id}/orders`
- `POST /admin/projections/replay`
- `GET /health`

## Docker

```sh
docker build -t edo-rust .
docker run --rm -p 8082:8082 edo-rust
```
