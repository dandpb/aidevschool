# Mini Message Queue — Go

A Kafka-like append-only message broker in Go, implementing the spec in
[`../docs/spec.md`](../docs/spec.md).

## What it does

- HTTP API at `http://localhost:8080`
- Create topics with configurable partitions
- Produce messages with key-based or explicit partition routing
- Consumer groups with independent offset tracking
- At-least-once delivery (fetch does not auto-commit)
- Offset commit API for explicit acknowledgements
- Ring buffer retention by age and/or size
- Replay from explicit offsets within retention window

## Quick start

```sh
# Run locally
go run .

# In another terminal
curl -X POST http://localhost:8080/topics/ \
  -H "Content-Type: application/json" \
  -d '{"name":"orders","partitions":3}'

curl -X POST http://localhost:8080/topics/orders/messages \
  -H "Content-Type: application/json" \
  -d '{"key":"customer-123","value":{"orderId":"o-1"}}'

curl "http://localhost:8080/topics/orders/partitions/0/messages?offset=0&limit=10"
```

## Build

```sh
go build -trimpath -ldflags="-s -w" -o mini-message-queue-go .
```

Static, stripped binary.

## Run

```sh
./mini-message-queue-go                  # listens on :8080
PORT=9000 ./mini-message-queue-go        # custom port
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `8080`  | TCP port to listen on |

## Test

```sh
# All tests with race detector + coverage
go test -race -cover ./...

# Verbose
go test -race -v ./...

# Per-package
go test -race -cover ./broker/...
```

Expected coverage: **>80% per package** (currently 91.4% on `broker/`, 69.9% on `main` with total 80.6%).

## Docker

```sh
docker build -t mmq-go .
docker run --rm -p 8080:8080 mmq-go
```

The image is a 2-stage build: `golang:1.21-alpine` produces a static binary,
copied into `alpine:3.19`. Final image is ~10 MB.

### Smoke test

```sh
docker run --rm -p 8080:8080 mmq-go &
sleep 1
curl -s -X POST http://localhost:8080/topics/ \
  -H "Content-Type: application/json" \
  -d '{"name":"orders","partitions":3}'

curl -s -X POST http://localhost:8080/topics/orders/messages \
  -H "Content-Type: application/json" \
  -d '{"value":{"test":true}}'
```

## Architecture

```
main.go              # entry point: HTTP server, routing, request handling
broker/broker.go     # core broker: topics, partitions, messages, consumer groups
broker/broker_test.go # comprehensive tests (91.4% coverage)
```

### Concurrency model

- `Broker` uses `sync.RWMutex` for topic and consumer group maps.
- Each `Partition` has its own `sync.RWMutex` for message appends and reads.
- Consumer groups use their own mutex for offset tracking.
- This design allows concurrent produces to different partitions without contention.

### Storage model

- In-memory message storage per partition (slice-backed ring buffer).
- Retention enforces age and byte limits by advancing `beginningOffset`.
- Offsets are partition-local integers (Kafka-like semantics).
- Offset commits store the **next** offset to deliver (not last consumed).

## API Examples

### Create topic
```sh
curl -X POST http://localhost:8080/topics/ \
  -H "Content-Type: application/json" \
  -d '{"name":"orders","partitions":3,"retentionMs":86400000}'
```

### Produce message
```sh
curl -X POST http://localhost:8080/topics/orders/messages \
  -H "Content-Type: application/json" \
  -d '{"key":"customer-123","value":{"orderId":"o-1"},"partition":0}'
```

### Read from partition
```sh
curl "http://localhost:8080/topics/orders/partitions/0/messages?offset=0&limit=100"
```

### Create consumer group
```sh
curl -X POST http://localhost:8080/consumers/ \
  -H "Content-Type: application/json" \
  -d '{"groupId":"billing-service","topic":"orders","startFrom":"earliest"}'
```

### Fetch messages for consumer group
```sh
curl "http://localhost:8080/consumers/billing-service/topics/orders/messages?limit=100"
```

### Commit offsets
```sh
curl -X POST http://localhost:8080/consumers/billing-service/topics/orders/offsets \
  -H "Content-Type: application/json" \
  -d '{"offsets":[{"partition":0,"offset":3}]}'
```

## License

Part of AI DevSchool Project 16. See top-level `LICENSE` if present.
