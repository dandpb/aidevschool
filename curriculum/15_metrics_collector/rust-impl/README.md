# Metrics Collector — Rust

Metrics collection service in Rust with Axum implementing counters, gauges, histograms, timers, aggregation, Prometheus export, and alert rules.

## Quick start

```sh
cargo run
```

## Test

```sh
cargo test
```

## Docker

```sh
docker build -t metrics-collector-rust .
docker run --rm -p 8080:8080 metrics-collector-rust
```
