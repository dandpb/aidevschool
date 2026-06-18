# Status — Project 07 · REST API with Auth

> Phase: **cycle-complete**
> Implementations reviewed: Go, Node/TypeScript
> Source status: all present implementations are done for the current learning cycle.

## Current State

Project 07 has first-cycle implementations in Go and Node/TypeScript. Both implement versioned `/v1` routes, registration, login, refresh-token rotation, JWT access tokens, RBAC-protected user listing, ownership-based user updates, validation, request IDs, structured errors, audit entries, and tests.

The implementations are ready for pedagogical review. Because this project is security-sensitive, "cycle-complete" should be read as "feature-complete enough for review and next hardening cycle," not as a production security sign-off.

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Done | Good standard-library middleware shape; needs vetted password KDF and atomic refresh rotation. |
| Node/TS | `node-impl/` | Done | Good Fastify route/preHandler composition; needs async hashing and atomic refresh rotation. |
| Rust | n/a | Not present in this repo snapshot | The spec includes Rust notes, but no `rust-impl/` exists under Project 07. |

## Evidence Read

- `docs/spec.md`
- `go-impl/internal/authapi/app.go`
- `go-impl/internal/authapi/app_test.go`
- `go-impl/cmd/server/main.go`
- `node-impl/src/app.ts`
- `node-impl/src/main.ts`
- `node-impl/src/__tests__/app.test.ts`

## Cycle-Complete Definition

This status means the available services implement the requested API surface and can be reviewed. It does **not** mean the security model is fully hardened. The next cycle should focus on refresh-token atomicity, password hashing, JWT negative tests, and auth middleware latency evidence.

## Next Phase

Recommended next phase: **security-hardening-and-benchmarking**.

1. Make refresh-token rotation atomic and add concurrent replay tests.
2. Use vetted password-hashing primitives and configurable cost in both runnable entries.
3. Add JWT negative tests and access-token JTI/session-state verification or a documented stateless-token decision.
4. Benchmark local auth middleware overhead against the 5 ms p95 target.
