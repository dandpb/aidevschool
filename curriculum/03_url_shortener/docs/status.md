# Status: 03_url_shortener

## Phase

phase: impl

> Phase: **impl**
> Present implementation: Node/TypeScript only
> Source status: first-cycle Node implementation with dated green Node verification and a dated local benchmark.

## Current State

Project 03 retains the first-cycle Node/TypeScript implementation: pure base62/SHA-256-truncation shortening core, Express HTTP adapter with 301 redirects, aliases, pagination, batch creation, per-client rate limiting, async click analytics with hashed client IPs, and structured errors. `go-impl/` and `rust-impl/` were removed in `1b0a309` (ponytail quality cuts, 2026-07-19) and do not exist on disk.

The known gaps are durability (store is in-memory; no persistence across restarts) and expiry semantics depth. These are next-cycle realism gaps, not missing-basic-implementation gaps.

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Removed | Removed in `1b0a309`; no Go implementation exists on disk. |
| Node/TS | `node-impl/` | Verified green (Node.js only) | 8/8 tests across `core` (4) and `server` (4); install/lint/build/test exit 0; live smoke (shorten → 301 redirect → stats) and local HTTP benchmark recorded 2026-10-18 @ `6bd13ed6` (AID-5013). |
| Rust | `rust-impl/` | Removed | Removed in `1b0a309`; no Rust implementation exists on disk. |

## Evidence Read

- `docs/spec.md`
- `docs/benchmark_results.md` (historical 2026-07-02 polyglot table + dated 2026-10-18 Node re-verification)
- `docs/code_review.md`, `docs/evolution_report.md`
- `node-impl/src/core.ts`, `node-impl/src/server.ts`, `node-impl/src/main.ts`, `node-impl/src/logger.ts`
- `node-impl/src/__tests__/core.test.ts`, `node-impl/src/__tests__/server.test.ts`
- [Onda 2 verification, 2026-10-18 @ `6bd13ed6`](../../../docs/product-readiness/assessments/2026-10-18-6bd13ed6-onda2-03-04.md)

Earlier Go/Rust review notes and the 2026-07-02 polyglot benchmark rows are historical and do not establish present implementations.

## Cycle-Complete Definition

This phase records the Node implementation's software cycle and supports a learning review. It does **not** grant learner mastery or claim production readiness, durability, or benchmark superiority across languages. The 2026-10-18 benchmark is a single-machine Linux measurement with a Node.js driver (k6 unavailable in the sandbox); treat numbers as relative evidence for this hardware only.

## Next Phase

Recommended next phase: **benchmark-and-optimize**.

1. Add a durability-focused pass: persistence across restarts (snapshot/WAL) before claiming cycle-complete.
2. Re-run the shared `bench_orchestrator.py` with k6 on benchmark hardware for publication-grade p95/p99.
3. Cover expiry (TTL) semantics and analytics-drain shutdown with dedicated tests.
