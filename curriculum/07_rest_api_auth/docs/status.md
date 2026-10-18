# Status: 07_rest_api_auth

## Phase

phase: impl

> Phase: **impl**
> Present implementation: Node/TypeScript only
> Source status: partially implemented, with dated green Node verification.

## Current State

Project 07 retains the first-cycle Node/TypeScript implementation: versioned `/v1` routes, registration, login, refresh-token rotation with replay detection, JWT access tokens, RBAC-protected user listing, ownership-based user updates, validation with field-level details, request IDs, structured errors, and audit entries. `go-impl/` was removed in `1b0a309` quality cuts and does not exist on disk; the spec's Rust notes never had an on-disk implementation.

The 2026-10-17 Onda 2 pass (AID-5012) added a security-edge suite and closed one hardening gap: access-token verification now pins `algorithms: ['HS256']`, so a token signed with any other algorithm is rejected even when the secret is correct. New coverage includes forged/wrong-secret tokens, expired access tokens (clock-advanced), expired refresh tokens, cross-user update denial with audit, unknown-target 404, disabled-user login/refresh denial, replayed ancestors after multi-generation rotation, and password/email shape edges.

Because this project is security-sensitive, "verified green" means the executable contract passes; it is not a production security sign-off. Remaining hardening items: atomic (single-writer) refresh rotation under true concurrency, an audited password KDF choice (PBKDF2 iteration count today), and auth-middleware latency evidence against the 5 ms p95 target.

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Removed | Removed in `1b0a309`; no Go implementation exists on disk. |
| Node/TS | `node-impl/` | Verified green (Node.js only) | 17/17 tests across `app` (6), `jwt-secret` (2), and `security` (9); lint/build/test exit 0 via `curriculum/_shared/verify_node_impl.sh`, verified 2026-10-17 (AID-5012). Atomic rotation and KDF review need follow-up. |
| Rust | n/a | Not present | Spec includes Rust notes, but no `rust-impl/` exists on disk. |

## Evidence Read

- `docs/spec.md`
- `node-impl/src/app.ts`
- `node-impl/src/main.ts`
- `node-impl/src/__tests__/app.test.ts`
- `node-impl/src/__tests__/jwt-secret.test.ts`
- `node-impl/src/__tests__/security.test.ts`
- `curriculum/_shared/verify_node_impl.sh` (verifier, AID-5012)

Earlier Go review notes are historical and do not establish present implementations.

## Cycle-Complete Definition

This phase records the Node implementation's software cycle and supports a learning review. It does **not** grant learner mastery or constitute a production security certification; the benchmark and concurrency-atomicity evidence is still pending.

## Next Phase

Recommended next phase: **security-hardening-and-benchmarking**.

1. Make refresh-token rotation atomic under concurrent replays and add races to prove it.
2. Review the password KDF parameters (iterations, primitive) against current guidance.
3. Benchmark local auth middleware overhead against the 5 ms p95 target.
4. Decide and document a stateless-vs-stateful access-token revocation policy.
