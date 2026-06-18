# Mini Message Queue — Rust

A Kafka-like append-only message broker in Rust, implementing the spec in
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
cargo run

# In another terminal
curl -X POST http://localhost:8080/topics \
  -H "Content-Type: application/json" \
  -d '{"name":"orders","partitions":3}'

curl -X POST http://localhost:8080/topics/orders/messages \
  -H "Content-Type: application/json" \
  -d '{"key":"customer-123","value":{"orderId":"o-1"}}'

curl "http://localhost:8080/topics/orders/partitions/0/messages?offset=0&limit=10"
```

## Build

```sh
cargo build --release
```

## Run

```sh
./target/release/mini-message-queue-rust         # listens on :8080
PORT=9000 ./target/release/mini-message-queue-rust  # custom port
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `8080`  | TCP port to listen on |

## Test

```sh
# All tests
cargo test

# With output
cargo test -- --nocapture
```

## Docker

```sh
docker build -t mmq-rust .
docker run --rm -p 8080:8080 mmq-rust
```

The image is a 2-stage build: `rust:1.75-alpine` produces a static binary,
copied into `alpine:3.19`. Final image is ~10 MB.

### Smoke test

```sh
docker run --rm -p 8080:8080 mmq-rust &
sleep 1
curl -s -X POST http://localhost:8080/topics \
  -H "Content-Type: application/json" \
  -d '{"name":"orders","partitions":3}'

curl -s -X POST http://localhost:8080/topics/orders/messages \
  -H "Content-Type: application/json" \
  -d '{"value":{"test":true}}'
```

## Architecture

```
src/main.rs     # entry point: axum HTTP server, routing, request handling
src/lib.rs      # core broker: topics, partitions, messages, consumer groups
```

### Concurrency model

- `Broker` uses `tokio::sync::RwLock` for topic and consumer group maps.
- Each `Partition` has its own `tokio::sync::RwLock` for message appends and reads.
- Consumer groups use their own mutex for offset tracking.
- This design allows concurrent produces to different partitions without contention.

### Storage model

- In-memory message storage per partition (Vec-backed ring buffer).
- Retention enforces age and byte limits by advancing `beginning_offset`.
- Offsets are partition-local integers (Kafka-like semantics).
- Offset commits store the **next** offset to deliver (not last consumed).

## API Examples

### Create topic
```sh
curl -X POST http://localhost:8080/topics \
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
curl -X POST http://localhost:8080/consumers \
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
