# Distributed Cache — Go Implementation

Implements Project 10 with `net/http`, mutex-protected shard state, deterministic LRU/LFU eviction, TTL expiry, consistent hashing with virtual nodes, cache-aside loading, write-through failure handling, per-key singleflight, invalidation, metrics, health checks, structured `slog` logging, and graceful shutdown.

## Commands

```bash
go test ./...
go test -cover ./...
go run ./cmd/server
```

## HTTP API

- `PUT /cache/:key` with `{ "value": "...", "ttlMs": 60000, "namespace": "users" }`
- `GET /cache/:key?loadOnMiss=true`
- `DELETE /cache/:key`
- `POST /cache/invalidate` with exactly one of `key`, `namespace`, or `prefix`
- `GET /cluster/ring`, `GET /metrics`, `GET /health`

## Docker

```bash
docker build -t distributed-cache-go .
docker run --rm -p 8080:8080 distributed-cache-go
```
