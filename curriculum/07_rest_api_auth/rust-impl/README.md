# REST API with Auth — Rust

Project 07 implementation using Axum, `jsonwebtoken`, in-memory repositories, injectable app state and clock, refresh-token rotation, RBAC checks, audit logging, structured tracing, and graceful shutdown.

## Run

```sh
cargo run
curl http://localhost:8080/healthz
```

## API

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/users` — admin role required
- `PUT /v1/users/:id` — admin or self-service `display_name`
- `GET /healthz`

## Verify

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```
