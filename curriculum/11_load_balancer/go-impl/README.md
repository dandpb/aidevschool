# Load Balancer — Go

Project 11 implementation using `net/http`, `httputil.ReverseProxy`, `sync.RWMutex` protected backend state, active `/health` checks, passive failure tracking, round-robin and least-connections routing, weighted distribution, backend add/remove, per-backend circuit breakers, structured `slog` logging, admin endpoints, and graceful shutdown.

## Run

```sh
go run ./cmd/server
BACKENDS=http://127.0.0.1:9001,http://127.0.0.1:9002 go run ./cmd/server
```

## Verify

```sh
go test ./...
go test -cover ./...
```

## Admin endpoints

- `GET /__lb/health`
- `GET /__lb/backends`
- `GET /__lb/metrics`

## Docker

```sh
docker build -t load-balancer-go .
docker run --rm -p 8080:8080 -e BACKENDS=http://host.docker.internal:9001,http://host.docker.internal:9002 load-balancer-go
```
