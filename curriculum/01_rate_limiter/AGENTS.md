# PROJECT 01 - RATE LIMITER

## OVERVIEW

`01_rate_limiter/` is the active polyglot challenge: implement the same token-bucket HTTP
service in Go, Node/TypeScript, and Rust, then compare correctness and operational tradeoffs.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Behavior contract | `docs/spec.md` | Source of truth for endpoints, headers, algorithm, ports. |
| Learner gate | `docs/diagnostic.md` | Do not bypass learner-attempt evidence. |
| Node implementation | `node-impl/src/` | Express + Vitest + ESLint. |
| Go implementation | `go-impl/`, `go-impl/ratelimit/` | stdlib HTTP + slog + tests. |
| Rust implementation | `rust-impl/src/`, `rust-impl/tests/` | axum/tokio implementation. |
| Benchmarks | `benchmarks/` | k6 scenarios and generated result evidence. |

## CONTRACT

- Capacity: `10` tokens.
- Refill rate: `2` tokens/second.
- Refill lazily on request arrival, not with a background refill timer.
- Cleanup inactive buckets after 1 hour.
- Ports: Go `8080`, Node `8081`, Rust `8082`.
- `GET /` is rate-limited and must emit rate-limit headers.
- `GET /status` is not rate-limited.
- `429` is expected behavior under load and should not be counted as benchmark failure by itself.

## COMMANDS

```bash
cd node-impl
npm run lint
npm run test
npm run build
```

```bash
cd go-impl
go test -race -cover ./...
```

```bash
cd rust-impl
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## ANTI-PATTERNS

- Do not drift behavior between languages without documenting why in `docs/`.
- Do not use benchmark numbers as superiority claims without repeated samples and caveats.
- Do not edit `node-impl/dist`, `node-impl/coverage`, `node-impl/node_modules`, or `rust-impl/target`.
