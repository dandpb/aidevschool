# Distributed Cache — Node/TypeScript Implementation

Implements Project 10 with a `Map`-backed cache, custom deterministic LRU/LFU eviction, TTL expiry, consistent hashing with virtual nodes, cache-aside loading, write-through failure handling, per-key promise singleflight, invalidation, metrics, health checks, structured JSON logging, and graceful shutdown.

## Commands

```bash
npm install
npm run lint
npm test
npm run coverage
npm start
```

## HTTP API

- `PUT /cache/:key` with `{ "value": "...", "ttlMs": 60000, "namespace": "users" }`
- `GET /cache/:key?loadOnMiss=true`
- `DELETE /cache/:key`
- `POST /cache/invalidate` with exactly one of `key`, `namespace`, or `prefix`
- `GET /cluster/ring`, `GET /metrics`, `GET /health`

## Docker

```bash
docker build -t distributed-cache-node .
docker run --rm -p 8080:8080 distributed-cache-node
```
