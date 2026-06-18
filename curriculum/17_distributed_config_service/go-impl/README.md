# Distributed Configuration Service — Go

A distributed configuration service in Go, implementing the spec in
[`../docs/spec.md`](../docs/spec.md).

## What it does

- HTTP API at `http://localhost:8080`
- Config key-value store with GET/PUT
- Watch/notify via Server-Sent Events
- Versioning with history
- Rollback to previous versions
- Feature flags with targeting rules
- Gradual rollout with deterministic hashing

## Quick start

```sh
# Run locally
go run .

# In another terminal
curl -X PUT http://localhost:8080/config/payments.retry_limit \
  -H "Content-Type: application/json" \
  -d '{"value":{"maxRetries":3},"contentType":"application/json","reason":"Initial config"}'

curl http://localhost:8080/config/payments.retry_limit
```

## Build

```sh
go build -trimpath -ldflags="-s -w" -o distributed-config-service-go .
```

## Run

```sh
./distributed-config-service-go         # listens on :8080
PORT=9000 ./distributed-config-service-go  # custom port
```

## Test

```sh
# All tests with race detector + coverage
go test -race -cover ./...
```

Coverage: **80.5% on config package**, **62.4% on main package**.

## Docker

```sh
docker build -t dcs-go .
docker run --rm -p 8080:8080 dcs-go
```

## Architecture

```
main.go              # entry point: HTTP server, routing, SSE handling
config/service.go    # core service: config store, versioning, flags, watchers
config/service_test.go # tests (80.5% coverage)
main_test.go         # HTTP handler tests
```

## License

Part of AI DevSchool Project 17. See top-level `LICENSE` if present.
