# Distributed Job Scheduler — Go Implementation

Teaching implementation for Project 12. It focuses on the simplified task scope: duration intervals (`5s`, `1m`), highest-process-ID leader leases, in-memory TTL locks with fencing tokens, high/normal/low priority ordering, DAG dependencies, retry backoff, cancellation, status tracking, health reporting, JSON `slog`, and graceful shutdown.

## Run

```bash
go run ./cmd/scheduler
curl http://127.0.0.1:8080/health
```

Set `PORT=18081` (or another port) to avoid local port conflicts.

## Test and verify

```bash
gofmt -w ./cmd ./internal
go test -race -cover ./...
```

The core scheduler package is covered by table-driven/unit tests and is expected to stay above 80% coverage.

## Docker

```bash
docker build -t project12-scheduler-go .
docker run --rm -p 8080:8080 project12-scheduler-go
```
