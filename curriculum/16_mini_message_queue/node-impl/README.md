# Mini Message Queue — Node.js/TypeScript

A Kafka-like append-only message broker in Node.js/TypeScript, implementing the spec in
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
# Install dependencies
npm install

# Run locally
npm run dev

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
npm run build
```

## Run

```sh
npm start                  # listens on :8080
PORT=9000 npm start        # custom port
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `8080`  | TCP port to listen on |

## Test

```sh
# All tests with coverage
npm test

# Watch mode
npm test -- --watch
```

Expected coverage: **>80% statements** (currently 87.8%).

## Docker

```sh
docker build -t mmq-node .
docker run --rm -p 8080:8080 mmq-node
```

The image is a 2-stage build: `node:20-alpine` builds the TypeScript,
the final image only contains production dependencies and compiled JS.

### Smoke test

```sh
docker run --rm -p 8080:8080 mmq-node &
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
src/index.ts      # entry point: Express server, routing, request handling
src/broker.ts     # core broker: topics, partitions, messages, consumer groups
src/broker.test.ts # broker unit tests (90.3% coverage)
src/index.test.ts # HTTP integration tests (82.7% coverage)
```

### Concurrency model

- `Broker` uses synchronous operations with single-threaded event loop.
- Each `Partition` is a plain object with an array of messages.
- No explicit locking needed due to Node.js single-threaded nature.

### Storage model

- In-memory message storage per partition (array-backed ring buffer).
- Retention enforces age and byte limits by advancing `beginningOffset`.
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
