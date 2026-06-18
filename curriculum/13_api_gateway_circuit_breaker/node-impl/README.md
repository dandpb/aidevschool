# API Gateway with Circuit Breaker — Node.js/TypeScript

Lightweight API gateway in Node.js/TypeScript with Express implementing reverse proxy, circuit breaker, retry with backoff+jitter, fallback, bulkheading, and per-tenant rate limiting.

## Quick start

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Test

```sh
npm test
npm run test:coverage
```

## Docker

```sh
docker build -t api-gateway-node .
docker run --rm -p 8080:8080 api-gateway-node
```
