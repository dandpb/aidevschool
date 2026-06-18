# URL Shortener — Rust

Rust implementation of AI DevSchool Project 03 using `axum`, `tokio`, in-memory `Arc<Mutex<_>>` state, base62 generated codes, custom aliases, asynchronous click analytics via `tokio::mpsc`, structured `tracing` logs, and graceful shutdown.

## Run

```sh
cargo run
curl -s -X POST http://localhost:8082/shorten -H 'content-type: application/json' -d '{"url":"https://example.com","custom_alias":"abc"}'
curl -i http://localhost:8082/abc
curl -s http://localhost:8082/abc/stats
```

`PORT` defaults to `8082` and may be either a bare port or `host:port`.

## Test and lint

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

If `cargo llvm-cov` is installed, run `cargo llvm-cov --fail-under-lines 80` for the coverage gate. The tests exercise the HTTP contract through the public router plus pure validation/store behavior.

The implementation is in-memory as requested, so mappings do not survive restarts. Analytics use a bounded channel; if the queue is full, redirects still return `301` and the event loss is logged.

## Docker

```sh
docker build -t url-shortener-rust .
docker run --rm -p 8082:8082 url-shortener-rust
```
