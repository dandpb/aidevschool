# Distributed Job Scheduler — Node/TypeScript Implementation

Teaching implementation for Project 12 with strict TypeScript. The core scheduler supports duration intervals (`5s`, `1m`), highest-process-ID leader leases, in-memory TTL locks with fencing tokens, high/normal/low priority ordering, DAG dependencies, retry backoff, cancellation, status tracking, health reporting, structured JSON logs, and graceful shutdown.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
curl http://127.0.0.1:8080/health
```

Set `PORT=18083` (or another port) to avoid local port conflicts.

## Test and verify

```bash
npm run build
npm run lint
npm test
```

`npm test` enforces at least 80% coverage on `src/scheduler.ts`.

## Docker

```bash
docker build -t project12-scheduler-node .
docker run --rm -p 8080:8080 project12-scheduler-node
```
