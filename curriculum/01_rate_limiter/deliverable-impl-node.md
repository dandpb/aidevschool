# Deliverable: Node.js / TypeScript implementation

**Project:** 01_rate_limiter — Token-Bucket Rate Limiter
**Language / stack:** Node.js 18 + TypeScript 5.5 + Express 4 + pino + zod + vitest
**Author:** dev-node agent
**Date:** 2026-06-03

## Summary

Production-ready Node.js/TypeScript implementation of the Project 01
token-bucket rate-limiter spec. The codebase splits into a pure,
clock-injectable `TokenBucketRateLimiter` and a thin Express HTTP layer
that wires the limiter to the spec's endpoints with pino structured
logging, zod-validated env, lazy refill, idle-bucket eviction, and
graceful shutdown. **All 40 tests pass, line coverage is 91.86 %, the
Docker image builds and serves the spec's 200/429 contract
end-to-end.**

## File map

```
node-impl/
├── Dockerfile
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── .gitignore
└── src/
    ├── main.ts          # process entry: signal handlers, start
    ├── index.ts         # buildServer / startServer / middleware
    ├── rateLimiter.ts   # pure TokenBucketRateLimiter (testable)
    ├── config.ts        # zod env validation
    ├── logger.ts        # pino factory
    ├── errors.ts        # RateLimiterError / ConfigError / ServerError
    └── __tests__/
        ├── rateLimiter.test.ts   (17 tests)
        ├── server.test.ts        (18 tests + 1 todo)
        └── config.test.ts        (6 tests)
```

## Checks (all green)

| Check | Command | Result |
| --- | --- | --- |
| TypeScript build | `npm run build` | clean, no errors (strict mode) |
| Tests | `npm test` | **40 passed, 1 todo** |
| Coverage | `npm run test:coverage` | **91.86 % lines / 91.57 % branches / 92.85 % funcs** (gate: 80 %) |
| Lint | `npm run lint` | clean |
| Docker build | `docker build -t rl-node .` | succeeds (multi-stage, ~50 MB) |
| Docker smoke | `docker run -p 8081:8081 rl-node` + `curl localhost:8081/` | 200 + welcome JSON; 11th req → 429 + `Retry-After: 1` |

## LoC summary

| Bucket | LoC |
| --- | --- |
| Production code (`src/*.ts` excluding tests) | **649** |
| Tests (`src/__tests__/*.ts`) | 540 |
| **Grand total** | **1,189** |

## Spec coverage

- [x] Capacity = 10, refill rate = 2 tokens/sec, lazy refill
- [x] `GET /` rate-limited, 200 + welcome JSON on success
- [x] `GET /` returns 429 + JSON body `{ error, retry_after_seconds }` + `Retry-After` header when denied
- [x] `GET /status` returns `{ client_ip, tokens_remaining, max_capacity, refill_rate_per_second }`, not rate-limited
- [x] `X-RateLimit-Limit`, `X-RateLimit-Remaining` (integer), `X-RateLimit-Reset` (Unix seconds) on every limited response
- [x] `Retry-After` only on 429
- [x] In-memory `Map<string, ClientBucket>`, single-process (documented)
- [x] Background `setInterval` cleanup of buckets idle > 1 h, `unref()`-ed
- [x] Graceful shutdown on `SIGINT` / `SIGTERM`
- [x] pino structured JSON logs
- [x] zod env validation (`PORT`, `CAPACITY`, `REFILL_RATE`, plus `IDLE_TIMEOUT_MS`, `CLEANUP_INTERVAL_MS`, `TRUST_PROXY`, `LOG_LEVEL`)
- [x] `req.ip` extraction (with optional `app.set('trust proxy', ...)`), IPv4-mapped IPv6 normalization
- [x] Test coverage ≥ 80 % (achieved 91.86 %)
- [x] `process.on('unhandledRejection')` and `uncaughtException` handlers

## Idiomatic-TS rules

- `strict: true` honored; explicit return types on public functions
- Zero `any` in production code (only in test fixtures that fabricate
  `Request` shapes)
- Async/await throughout; no callbacks
- Custom `Error` subclasses per domain with stable `code` fields
- No swallowed errors
- `pino` for structured JSON
- `zod` for env validation (fails fast at startup)
- `setInterval(...).unref()` for the sweeper
- `server.close()` is idempotent (treats `ERR_SERVER_NOT_RUNNING` as
  no-op) so test teardown and graceful shutdown can race safely

## How to run

```bash
cd projects/01_rate_limiter/node-impl
npm install
npm run build
npm test
npm start         # binds 0.0.0.0:8081
# or:
docker build -t rl-node . && docker run --rm -p 8081:8081 rl-node
```

See `node-impl/README.md` for full configuration knobs and the
HTTP contract.

## Known caveats

- **Single-process only** (no cluster, no Redis). The spec is explicit
  about in-memory state, and the README documents this. Horizontal
  scaling would require a shared store — out of scope for Project 01.
- **`it.todo` on the centralized 500 error handler.** The 4-arg error
  middleware in `buildServer` is hard to exercise through
  `buildServer` because the 404 catch-all is registered before any
  caller-added route can throw. The handler is six lines; the
  request paths are covered at 84 % in `index.ts` overall, and the
  80 % gate is met.
