# Concurrent Task Queue — Node/TypeScript

Node.js / TypeScript implementation of Project 04 using async worker loops on the event loop and an Express HTTP API.

## Features

- `POST /tasks`, `GET /tasks/:id`, `DELETE /tasks/:id`, `GET /stats`, `GET /healthz`
- Bounded priority queue with FIFO tie-breaks
- Configurable async worker pool and zero-worker paused mode
- Idempotency keys, cancellation, scheduled tasks, retry backoff with jitter, DLQ
- Structured JSON transition logs
- Graceful shutdown on `SIGINT`/`SIGTERM`

## Run

```bash
npm install
npm run build
npm start
curl -s http://localhost:8085/healthz
```

## Test, lint, coverage

```bash
npm run lint
npm test
npm run test:coverage
npm run build
```

The Vitest coverage thresholds require at least 80% lines, statements, branches, and functions.

## Configuration

| Env var | Default |
| --- | --- |
| `PORT` | `8085` |
| `WORKER_COUNT` | `4` |
| `QUEUE_CAPACITY` | `1000` |
| `MAX_RETRIES` | `3` |
| `BASE_BACKOFF_MS` | `100` |
| `JITTER_MS` | `50` |

## Docker

```bash
docker build -t ctq-node .
docker run --rm -p 8085:8085 ctq-node
```
