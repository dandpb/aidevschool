# rate-limiter-node

Token-bucket rate limiter HTTP service — Node.js / TypeScript implementation of
[AI DevSchool Project 01](../docs/spec.md).

The service exposes:

| Method | Path     | Rate-limited? | Purpose                                       |
| ------ | -------- | ------------- | --------------------------------------------- |
| `GET`  | `/`      | **yes**       | Welcome endpoint; consumes 1 token per call.  |
| `GET`  | `/status`| no            | Reports the current bucket state for the IP.  |
| `*`    | `*`      | n/a           | Any other path returns 404 JSON.              |

Defaults match the spec: **capacity 10**, **refill rate 2 tokens/second**.
A request that finds the bucket empty receives `HTTP 429` with
`Retry-After` (in seconds) and a JSON body.

## Quick start

```bash
# from this directory
npm install
npm run build         # tsc → dist/
npm start             # node dist/main.js, binds 0.0.0.0:8081

# or, for development with auto-reload via ts-node:
npm run dev
```

Smoke test:

```bash
curl -i http://localhost:8081/         # 200 + welcome JSON
for i in $(seq 1 11); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/; done
# 10x 200, 1x 429
curl -s http://localhost:8081/status | jq
```

## Configuration

All settings are environment variables (zod-validated at startup). Bad input
fails fast with a `ConfigError` before the server binds.

| Env var               | Type      | Default       | Notes                                                       |
| --------------------- | --------- | ------------- | ----------------------------------------------------------- |
| `PORT`                | int       | `8081`        | TCP port to listen on.                                      |
| `CAPACITY`            | int       | `10`          | Max tokens per bucket.                                      |
| `REFILL_RATE`         | number    | `2`           | Tokens added per second. Fractional allowed.                |
| `IDLE_TIMEOUT_MS`     | int       | `3600000`     | A bucket idle for longer than this is evicted by the sweeper. |
| `CLEANUP_INTERVAL_MS` | int       | `60000`       | How often the sweeper runs.                                 |
| `TRUST_PROXY`         | bool      | `false`       | When `true`, Express trusts `X-Forwarded-For` (`req.ip`).   |
| `LOG_LEVEL`           | string    | `info`        | pino level (`trace`/`debug`/`info`/`warn`/`error`/`fatal`). |

`TRUST_PROXY` only matters if the service runs behind a reverse proxy /
load balancer that sets `X-Forwarded-For`. With the default `false`, the
client IP is taken from the raw TCP socket (`req.socket.remoteAddress`),
which is what you want for direct connections. IPv4-mapped IPv6 addresses
(`::ffff:127.0.0.1`) are normalized to their IPv4 form so the same
physical client is counted once regardless of socket family.

## API contract

### `GET /`

* Successful response:
  ```http
  HTTP/1.1 200 OK
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 9
  X-RateLimit-Reset: 1730000000
  Content-Type: application/json

  { "message": "Welcome to the rate-limited endpoint!" }
  ```
* Rate-limited response:
  ```http
  HTTP/1.1 429 Too Many Requests
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1730000000
  Retry-After: 1
  Content-Type: application/json

  { "error": "Too Many Requests", "retry_after_seconds": 1 }
  ```

`X-RateLimit-Reset` is a Unix epoch second at which the bucket will be
completely full again. `Retry-After` is the integer number of seconds
the client must wait before another token is available.

### `GET /status`

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "client_ip": "127.0.0.1",
  "tokens_remaining": 8.5,
  "max_capacity": 10,
  "refill_rate_per_second": 2
}
```

`tokens_remaining` is a float (lazy refill is continuous). The endpoint
is **never** rate-limited.

## Architecture notes

* **Pure store, testable core.** `src/rateLimiter.ts` exports
  `TokenBucketRateLimiter` — a class with no Express or HTTP dependencies.
  The clock is injected, so lazy-refill tests run in microseconds and are
  deterministic.
* **Lazy refill.** Tokens are recalculated on every request, not on a
  timer. The bucket is keyed by client IP.
* **Concurrency.** Node.js runs JavaScript on a single thread, so the
  in-memory `Map` needs no locks for the rate-limit critical section.
  *This implementation is single-process.* Horizontal scaling requires
  a shared store (Redis) — out of scope for this project.
* **Memory hygiene.** A `setInterval` sweeper drops buckets idle for
  longer than `IDLE_TIMEOUT_MS`. The timer is `unref()`ed so it never
  keeps the process alive.
* **Graceful shutdown.** `SIGINT` and `SIGTERM` close the HTTP server
  (drain in-flight requests) and clear the sweeper before exiting.
* **Structured logging.** `pino` writes one JSON object per event
  (HTTP listen, idle eviction, fatal errors).
* **Error handling.** A zod-validated `ConfigError` is thrown at boot
  on bad env. `uncaughtException` and `unhandledRejection` log a fatal
  line and exit; the centralized Express error handler returns a clean
  `500` for any uncaught error in a request.

## Testing

```bash
npm test              # runs vitest
npm run test:coverage # also produces coverage/ with v8 report
```

The suite covers:

* Token consumption and per-key isolation
* `429` + correct `Retry-After` math
* Lazy refill at fixed clock (no real `setTimeout` in tests)
* Idle-bucket cleanup
* Header correctness on both 200 and 429
* HTTP integration via `supertest`
* zod env validation (`loadConfig`)

The target is **>= 80% line coverage**; the suite clears that with
margin (see `coverage/index.html` after `npm run test:coverage`).

## Linting

```bash
npm run lint       # eslint over src/**/*.ts
npm run lint:fix   # apply auto-fixes
```

## Docker

The bundled `Dockerfile` is a multi-stage build: the builder compiles
TypeScript with all dev deps, the runtime image is a slim
`node:18-alpine` with only the production `node_modules` and the
compiled `dist/`.

```bash
docker build -t rl-node .
docker run --rm -p 8081:8081 rl-node
curl -i http://localhost:8081/
```

## Project layout

```
node-impl/
├── Dockerfile
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── .gitignore
└── src/
    ├── main.ts            # entry point (signal handlers, start)
    ├── index.ts           # buildServer, startServer, middleware
    ├── rateLimiter.ts     # pure TokenBucketRateLimiter (testable)
    ├── config.ts          # zod env validation
    ├── logger.ts          # pino factory
    ├── errors.ts          # custom error classes
    └── __tests__/
        ├── rateLimiter.test.ts
        ├── server.test.ts
        └── config.test.ts
```

## License

AI DevSchool — internal project scaffold. See project root.
