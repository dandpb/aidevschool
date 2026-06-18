# API Gateway with Circuit Breaker — Go

Lightweight API gateway implementing reverse proxy, circuit breaker, retry with backoff+jitter, fallback, bulkheading, and per-tenant rate limiting.

## Quick start

```sh
go run .
```

## Build

```sh
go build -o api-gateway-go .
```

## Test

```sh
go test -race -cover ./...
```

## Docker

```sh
docker build -t api-gateway-go .
docker run --rm -p 8080:8080 api-gateway-go
```
