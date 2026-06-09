# Rate Limiter — Go

A token-bucket rate-limited HTTP service in Go, implementing the spec in
[`../docs/spec.md`](../docs/spec.md).

## What it does

- HTTP API at `http://localhost:8080`
- Per-client (by IP) token bucket: capacity **10**, refill rate **2 tokens/sec**
- `GET /`         — rate-limited welcome endpoint
- `GET /status`   — current bucket state for the caller (not rate-limited)
- `GET /healthz`  — liveness probe (always 200, not rate-limited)
- Lazy token refill on request arrival
- Background cleanup of buckets idle for more than 1 hour
- Graceful shutdown on `SIGINT` / `SIGTERM`
- Structured JSON logs via `log/slog` (stdlib)

## Quick start

```sh
# Run locally
go run .

# In another terminal
curl -i http://localhost:8080/        # 200 OK, with X-RateLimit-* headers
curl -i http://localhost:8080/status  # 200 OK, JSON with bucket state
```

After 10 fast requests the 11th returns `429 Too Many Requests` with a
`Retry-After` header.

## Build

```sh
go build -trimpath -ldflags="-s -w" -o rate-limiter-go .
```

Static, stripped binary; ~5–6 MB.

## Run

```sh
./rate-limiter-go                 # listens on :8080
PORT=9000 ./rate-limiter-go       # custom port
```

### Environment variables

| Variable                        | Default | Description                                |
|---------------------------------|---------|--------------------------------------------|
| `PORT`                          | `8080`  | TCP port to listen on                      |
| `RL_CAPACITY`                   | `10`    | Bucket capacity (max tokens)               |
| `RL_REFILL_PER_SEC`             | `2`     | Refill rate in tokens/second               |
| `RL_IDLE_TTL_SECONDS`           | `3600`  | Idle bucket TTL before cleanup evicts it   |
| `RL_CLEANUP_INTERVAL_SECONDS`   | `600`   | How often the cleanup loop runs            |
| `RL_SHUTDOWN_TIMEOUT_SECONDS`   | `15`    | Max time to drain in-flight on shutdown    |

Invalid values log a warning and fall back to the default.

## Test

```sh
# All tests with race detector + coverage
go test -race -cover ./...

# Verbose
go test -race -v ./...

# Per-package
go test -race -cover ./ratelimit/...
```

Expected coverage: **>80% per package** (currently 99% on `ratelimit/`, 86% on `main`).

## Docker

```sh
docker build -t rl-go .
docker run --rm -p 8080:8080 rl-go
```

The image is a 2-stage build: `golang:1.21-alpine` produces a static binary,
copied into `alpine:3.19`. Final image is ~10 MB.

### Smoke test

```sh
docker run --rm -p 8080:8080 rl-go &
sleep 1
curl -s -i http://localhost:8080/ | head -10
# expect: HTTP/1.1 200 OK, X-RateLimit-Limit: 10, X-RateLimit-Remaining: 9, ...

curl -s http://localhost:8080/status
# expect: {"client_ip":"...","tokens_remaining":...,"max_capacity":10,"refill_rate_per_second":2}
```

## Architecture

```
main.go              # entry point: config, signal handling, server lifecycle
ratelimit/clock.go   # Clock interface (real + injectable for tests)
ratelimit/ratelimit.go  # RateLimiter, ClientBucket, Decision (lazy refill, mutex)
ratelimit/middleware.go # HTTP middleware: 200/429 + X-RateLimit-* headers, /status
ratelimit/cleanup.go    # Idle-bucket eviction goroutine
ratelimit/ratelimit_test.go # 99% covered, table-driven
main_test.go         # config + server lifecycle + logging tests
```

### Concurrency model

- `RateLimiter` uses a single `sync.Mutex` guarding a `map[string]*ClientBucket`.
- The critical section is short (lazy refill arithmetic + a map lookup).
- For the spec's rates this outperforms sharded locks or `sync.Map` because
  there is no read-heavy-fast-path optimization to maintain.
- All HTTP request paths go through the same mutex; `CleanupLoop` and
  `Allow` are mutually exclusive — no deadlock risk.

### Time abstraction

The limiter takes a `Clock` interface so tests can drive time
deterministically. Production wires it to `RealClock{}`; tests use a
`fakeClock` that supports `Advance(d)`.

## Rate-limit response shape

```sh
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1735689601
Content-Type: application/json

{"message":"Welcome to the rate-limited endpoint!"}
```

```sh
$ curl -i http://localhost:8080/   # 11th request
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735689602
Retry-After: 1
Content-Type: application/json

{"error":"Too Many Requests","retry_after_seconds":1}
```

## License

Part of AI DevSchool Project 01. See top-level `LICENSE` if present.
