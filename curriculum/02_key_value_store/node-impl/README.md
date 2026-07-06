# Key-Value Store — Node/TypeScript

Strict TypeScript implementation of AI DevSchool Project 02 using Express, zod request validation, pino JSON logs, and an in-memory `Map` with synchronous mutation sections for atomic command semantics.

## How to run

```sh
npm install
npm run build
npm start
curl -s http://localhost:8081/health
```

The service listens on `127.0.0.1:8081` by default, per `docs/spec.md`'s
loopback-only default (no authentication is implemented, so network-wide
exposure must be an explicit opt-in). Override the port with `PORT=9000` and
the bind address with `HOST=0.0.0.0` (e.g. for container deployments where the
host network boundary is enforced elsewhere).

## How to test

```sh
npm run lint
npm run test:coverage
npm run build
```

Coverage thresholds are configured in `vitest.config.ts` and require at least 80% line/function/statement coverage for `src/**/*.ts` excluding the process entrypoint.

## API

Implements the shared HTTP JSON API from `../docs/spec.md`: `SET`, `GET`, `DEL`, `EXPIRE`, `TTL`, `PERSIST`, `KEYS`, `FLUSHDB`, `MGET`, `MSET`, and `GET /health`.

## Docker

```sh
docker build -t kvstore-node .
docker run --rm -p 8081:8081 kvstore-node
```

The Dockerfile is multi-stage: the builder installs dev dependencies and compiles TypeScript, while the runtime image installs production dependencies only on `node:20-alpine`, staying well under 300 MB.
