# Concurrent Task Queue — Go

Go implementation of Project 04 using goroutines, `context.Context`, mutex-protected state, condition-style worker wakeups, and `errgroup` for worker lifecycle.

## Features

- `POST /tasks`, `GET /tasks/:id`, `DELETE /tasks/:id`, `GET /stats`, `GET /healthz`
- Bounded priority queue with FIFO tie-breaks
- Configurable worker pool, including `WORKER_COUNT=0` paused mode
- Idempotency keys, cancellation, scheduled tasks, retry backoff with jitter, DLQ
- Structured JSON transition logs via `log/slog`
- Graceful shutdown on `SIGINT`/`SIGTERM`

## Run

```bash
go run .
curl -s http://localhost:8083/healthz
```

## Test and coverage

```bash
go test -race -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```

Current project-level coverage is above 80%.

## Configuration

| Env var | Default |
| --- | --- |
| `PORT` | `8083` |
| `WORKER_COUNT` | `4` |
| `QUEUE_CAPACITY` | `1000` |
| `MAX_RETRIES` | `3` |
| `BASE_BACKOFF_MS` | `100` |
| `JITTER_MS` | `50` |

## Docker

```bash
docker build -t ctq-go .
docker run --rm -p 8083:8083 ctq-go
```
