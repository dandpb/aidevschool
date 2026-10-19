# Status: 06_file_upload_pipeline

## Phase

phase: impl

> Phase: **impl**
> Present implementation: Node/TypeScript only
> Source status: partially implemented, with dated green Node verification.

## Current State

Project 06 retains the first-cycle Node/TypeScript implementation: streaming multipart parsing via Busboy, incremental SHA-256 while writing through temporary artifacts, size/type policy enforcement with early abort, upload records with progress/status/listing, cancellation via `DELETE /files/:id`, and path-safe identifiers and filenames. `go-impl/` and `rust-impl/` were removed in `1b0a309` quality cuts and do not exist on disk.

The 2026-10-17 Onda 2 pass (AID-5012) added an edge/security contract suite and closed three spec-compliance gaps: zero-byte uploads are now rejected with `400` unless `ALLOW_EMPTY_FILES=true`, `GET /files` validates pagination and status filters with `400` (`invalid_pagination` / `invalid_filter`), and chunked transfer uploads without `Content-Length` are covered by a raw-HTTP streaming test.

The project is ready for pedagogical review. Remaining gaps are runtime-realism gaps, not missing implementation: durable metadata across restart (RNF-008), true thumbnail artifacts (RF-007 currently documented as `thumbnailStatus`), progress cadence guarantees (RNF-005), and the 25×100 MB concurrency benchmark (RNF-003).

## Implementation Matrix

| Language | Directory | Status | Notes |
| --- | --- | --- | --- |
| Go | `go-impl/` | Removed | Removed in `1b0a309`; no Go implementation exists on disk. |
| Node/TS | `node-impl/` | Verified green (Node.js only) | 11/11 tests across `server` (4) and `edge` (7); lint/build/test exit 0 via `curriculum/_shared/verify_node_impl.sh`, verified 2026-10-17 (AID-5012). Registry persistence and real thumbnails need follow-up. |
| Rust | `rust-impl/` | Removed | Removed in `1b0a309`; no Rust implementation exists on disk. |

## Evidence Read

- `docs/spec.md`
- `node-impl/src/server.ts`
- `node-impl/src/registry.ts`
- `node-impl/src/config.ts`
- `node-impl/src/types.ts`
- `node-impl/src/main.ts`
- `node-impl/src/__tests__/server.test.ts`
- `node-impl/src/__tests__/edge.test.ts`
- `curriculum/_shared/verify_node_impl.sh` (verifier, AID-5012)

Earlier Go/Rust review notes are historical and do not establish present implementations.

## Cycle-Complete Definition

This phase records the Node implementation's software cycle and supports a learning review. It does **not** grant learner mastery, claim production readiness, or certify the non-functional targets (memory bound, throughput, restart persistence) that still lack measurements.

## Next Phase

Recommended next phase: **evidence-and-hardening**.

1. Add durable upload metadata records and restart tests (RNF-008).
2. Benchmark memory and throughput under large concurrent uploads (RNF-002/003/004).
3. Implement or explicitly defer real thumbnail artifacts (RF-007).
4. Add progress-cadence tests for active uploads (RNF-005).
