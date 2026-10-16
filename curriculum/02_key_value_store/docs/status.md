# Status: Project 02 Key-Value Store

## Phase

phase: cycle-complete

## Implementation Status

| Language | Status | Notes |
| --- | --- | --- |
| Go | done | In-memory HTTP key-value store with TTL, batch operations, limits, and tests. |
| Rust | done | In-memory Axum-backed key-value store with explicit errors, TTL behavior, and tests. |
| Node | done | Express/Zod TypeScript key-value store with clear store/server split and tests. |

## Verifier Evidence

Pending full benchmark.

Observed review evidence:

- Go tests cover TTL, persistence, atomic MSET, capacity, memory limits, duplicate keys, concurrency, HTTP envelopes, invalid JSON, missing keys, key listing, TTL/PERSIST/EXPIRE, and flush behavior.
- Rust tests cover store semantics, atomic MSET, validation, HTTP routes, capacity, memory accounting, and expiry.
- Node tests cover store semantics, atomicity, validation, HTTP envelopes, MGET, KEYS, health, and error responses.

## Current Assessment

All three implementations are complete enough to mark the project cycle complete for learning purposes. The next verification step is not more feature work; it is benchmarking and contract-hardening, especially around validation consistency and concurrent read/write behavior.
