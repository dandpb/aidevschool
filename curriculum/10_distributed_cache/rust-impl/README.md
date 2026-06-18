# Distributed Cache — Rust Implementation

Implements Project 10 with thread-safe `Arc<Mutex<_>>`/`RwLock` state, deterministic LRU/LFU eviction, TTL expiry, consistent hashing with virtual nodes, cache-aside loading, write-through failure handling, per-key singleflight using `Condvar`, invalidation, metrics, health checks, structured stdout logging, and graceful shutdown.

## Commands

```bash
cargo test
cargo clippy --all-targets -- -D warnings
cargo build --release
cargo run
```

## API Surface

The tested core exposes `Cache`, `HashRing`, `MemoryStore`, and `HttpApp`. `HttpApp::handle` implements the Project 10 routes (`/cache/:key`, `/cache/invalidate`, `/cluster/ring`, `/metrics`, `/health`) without binding sockets, keeping behavior deterministic for the curriculum tests.

## Docker

```bash
docker build -t distributed-cache-rust .
docker run --rm distributed-cache-rust
```
