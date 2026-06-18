# Multi-Node Verification Plan

Status: planned, not implemented

This document defines the smallest next executable target for proving real multi-node behavior in Project 10. It is a plan/spec only; no production gossip, cluster networking, or verification harness is implemented here.

## Local Simulated 3-Node Harness Specification

1. Spawn 3 nodes in-process on localhost using different ports.
2. Seed keys across shards using the existing consistent-hashing owner calculation.
3. Assert reads route to the owning node rather than silently serving from the caller's local cache.
4. Remove one node, then assert remap/migration status is reported for keys whose owner changes.

## Existing Test Harness Patterns

- Go has local unit and HTTP-handler tests in `go-impl/cache_test.go`, including `httptest` coverage for local API routes and a consistent-hash add/remap check.
- Rust has local integration tests in `rust-impl/tests/cache_behavior.rs`, including `HttpApp::handle` route checks and a consistent-hash add/remap check.
- Node/TypeScript has local `node:test` coverage in `node-impl/src/cache.test.ts`, including `HttpApp` route checks and a consistent-hash add/remap check.

No multi-node test harness exists in any implementation. The existing tests can seed the verification slice, but they currently exercise single-process/local-cache behavior and hash-ring metadata only.

## Expected Outputs

Success for the next executable slice should produce:

- A deterministic 3-node local run that reports node IDs, ports, ring version, and key-to-owner assignments.
- A passing assertion that at least one read requested through a non-owner routes to the owner and returns the owner's stored value.
- A passing assertion that removing one node changes ownership for a bounded subset of keys.
- A reported migration/remap status for changed keys, even if the first implementation only returns `planned` or `pending` migration state.
- A clear failure when the owning node is unavailable and no migration/proxy path exists, rather than a false local-cache hit.

The output must not claim distributed-cache completion unless gossip membership, owner routing, removal, migration, and failure behavior are actually implemented and verified.

## Prerequisites

- A node runtime abstraction that can host multiple independent cache nodes in one test process.
- Per-node identity, bind address/port, and liveness state exposed to tests.
- Owner-enforced routing semantics for GET at minimum, with a defined proxy or `503 shard unavailable` behavior.
- Membership state with join/leave/suspect/failed transitions and ring-version changes.
- Node removal support on the hash ring, not only node addition.
- Migration or remap-status reporting when membership changes affect key ownership.
- A chaos/failure hook that can mark one simulated node unavailable without killing the whole test process.
