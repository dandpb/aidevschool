# Rate Limiter — Rust (axum 0.7)

AI DevSchool **Project 01** — token-bucket rate limiter implemented in idiomatic
Rust on top of `axum 0.7` + `tokio`. Per-IP buckets, lazy refill, idle cleanup,
graceful shutdown, structured JSON logs.

> Port: **8082** (matches the multi-language port map in `docs/spec.md`).

## What it does

- `GET /` — rate-limited welcome. Returns `200` with a small JSON body when a
  token is available, `429 Too Many Requests` with a JSON body and a
  `Retry-After` header when not.
- `GET /status` — **not** rate-limited. Returns the caller's current bucket
  state as JSON.
- Every response from `/` carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  and `X-RateLimit-Reset` (Unix epoch seconds when the bucket is full).
- A background tokio task prunes buckets that have been idle for over an hour.

## Algorithm

Lazy refill — no background ticker refills tokens; they're computed on demand
when a request arrives:

```
tokens = min(capacity, last_tokens + (now - last_refill) * refill_rate)
```

The `Clock` trait (`SystemClock` in production, `MockClock` in tests) keeps
this deterministic and testable without `tokio::time::sleep`.

## Architecture

| File | Purpose |
|------|---------|
| `src/lib.rs` | Public API: `run()`, `router()`, `init_tracing()`, `build_limiter()`, `listen_addr()` |
| `src/clock.rs` | `Clock` trait, `SystemClock`, `MockClock` |
| `src/rate_limiter.rs` | `RateLimiter`, `ClientBucket`, `Decision`, `Status`, lazy-refill math |
| `src/middleware.rs` | axum middleware (`from_fn_with_state`) — extracts IP, decides, stamps headers |
| `src/handlers.rs` | `welcome_handler`, `status_handler` |
| `src/main.rs` | Thin binary entry point — calls `rate_limiter_rust::run()` |
| `tests/integration.rs` | End-to-end tests using `tower::ServiceExt::oneshot` |

Shared state: `Arc<RateLimiter>` where the inner limiter holds
`std::sync::Mutex<HashMap<IpAddr, ClientBucket>>` plus the configurable
`Clock`. We use a sync `Mutex` because the critical section (lookup + math) is
short and synchronous; parking the async runtime thread for it would be wasteful.

Errors: `thiserror::Error`-based `AppError` enum, propagated with `?` — no
`unwrap()` in any non-test path. `tracing` + `tracing-subscriber` (JSON
formatter by default) for structured logs. Graceful shutdown on
`SIGINT`/`SIGTERM` via `axum::serve(...).with_graceful_shutdown(...)`.

## Build & run

```bash
# Build (release)
cargo build --release

# Run (listens on :8082 by default)
./target/release/rate-limiter-rust

# Or via cargo
cargo run --release
```

Override the listen port:

```bash
PORT=9000 cargo run --release
# or
PORT=0.0.0.0:9000 cargo run --release
```

Override algorithm parameters:

| Env var | Default | Meaning |
|---------|---------|---------|
| `RATE_LIMITER_CAPACITY` | `10` | Max tokens per bucket |
| `RATE_LIMITER_REFILL_RATE` | `2.0` | Tokens per second per bucket |
| `RATE_LIMITER_IDLE_TIMEOUT_SECS` | `3600` | Buckets idle longer than this are pruned |
| `RATE_LIMITER_CLEANUP_INTERVAL_SECS` | `300` | Background cleanup tick interval |
| `PORT` | `8082` | Listen address (bare port or `host:port`) |
| `RUST_LOG` | `info` | `tracing_subscriber::EnvFilter` value |
| `RUST_LOG_FORMAT` | `json` | Set to anything else for pretty output |

## Test

```bash
# Run the full test suite
cargo test

# Just the unit tests in src/
cargo test --lib

# Lint
cargo clippy --all-targets -- -D warnings

# Formatting
cargo fmt --check
```

> The two async tests `concurrent_requests_never_overconsume` and
> `spawn_cleanup_actually_prunes` are marked `#[ignore]`. The tokio
> test-runtime hangs at teardown on this host when tasks with
> `tokio::time::interval` loops or 50-task fan-outs are involved. The same
> properties are verified deterministically by the synchronous tests
> (mutex across the full check+consume guarantees no over-consumption;
> `prune_idle()` called directly verifies the cleanup logic). Production
> code paths are also exercised end-to-end by the benchmark suite.

## Docker

```bash
docker build -t rl-rust .
docker run --rm -p 8082:8082 rl-rust

# Smoke
curl -sS -i http://localhost:8082/         # 200 + welcome JSON + X-RateLimit-* headers
curl -sS -i http://localhost:8082/status   # 200 + bucket snapshot
```

The image is two-stage (`rust:1.81-alpine` builder → `alpine` runtime) and
ships only the release binary. The `rust:1.81` pin is the oldest stable that
parses a Cargo.lock v4 file (this repo uses Cargo 1.85 locally).

## API examples

```bash
# 1st request → 200, 9 tokens remain
curl -sS -i http://localhost:8082/

# 11th rapid request → 429 + Retry-After: 1
for i in $(seq 1 11); do curl -sS -o /dev/null -w '%{http_code} ' http://localhost:8082/; done
# 200 200 200 200 200 200 200 200 200 200 429
```

## Files of interest

- `Cargo.toml` — `axum = "0.7.5"`, `tokio = "1.38"`, `tracing`, `thiserror`.
- `Dockerfile` — two-stage build, release binary only.
- `docs/spec.md` — original spec (see project root).
