# Log Aggregator — Rust

Structured log aggregation service in Rust with axum implementing JSON log ingestion, filtering, full-text search, retention, and trace lookup.

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
docker build -t log-aggregator-rust .
docker run --rm -p 8080:8080 log-aggregator-rust
```
