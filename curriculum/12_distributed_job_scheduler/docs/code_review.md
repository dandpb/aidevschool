# Code Review — Project 12 · Distributed Job Scheduler (Go · Rust · Node/TS)

> Inputs: `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/` source and tests.  
> Review focus: leader fencing, lease safety, retry/cancellation semantics, queue ordering, worker recovery, and distributed durability.  
> Severity scale: Critical, Major, Minor, Educational.

## Executive Summary

All three implementations are consistent teaching implementations of a local scheduler core. They cover job submission, simple duration intervals (`5s`, `1m`), highest-process-ID leader leases, in-memory locks with monotonic fencing tokens, priority/dependency ordering, retry backoff, cancellation, status lookup, JSON logging, and health summaries. Go and Rust include strong core tests; Node includes Vitest coverage for the same core paths.

The implementations do not yet satisfy the distributed scheduler spec as written. They are missing durable state, real Raft-style terms/votes/quorum/heartbeats, cron expressions, idempotency keys, worker heartbeat/dispatch/ack endpoints, attempt history, audit events, recurring run records, API coverage beyond health/basic submission, and failure recovery after leader crash.

| Implementation | Critical | Major | Minor | Educational |
| --- | ---: | ---: | ---: | ---: |
| Go | 1 | 5 | 3 | 1 |
| Rust | 1 | 5 | 3 | 1 |
| Node/TS | 1 | 5 | 3 | 1 |

## Security

- **[Major][All] No authentication or actor identity on leader/worker/client actions.** The spec's audit model includes actor identity, stale terms, and worker fencing. Current APIs/core calls trust the caller and do not distinguish client, leader, worker, or system actors.
- **[Major][All] Fencing tokens are local-memory only.** Tokens increase per process, not in durable shared state. After restart or split-brain, another node can recreate token state from zero, invalidating the safety guarantee that fencing tokens are monotonically authoritative across leaders.
- **[Minor][Go/Node] HTTP errors expose raw validation strings.** `POST /jobs` in Go and Node's route-not-found shape do not consistently return the spec's structured `{ error: { code, message, field } }` model.

## Performance

- **[Major][All] Ready-job selection scans and sorts all jobs on every dispatch.** `DispatchNext`/`dispatchNext` rebuilds candidates from the full in-memory map and sorts them. This is simple and deterministic, but it is O(n log n) per dispatch and will dominate under large queues.
- **[Minor][All] No retention or paging for completed history.** Jobs stay in memory forever. NFR-007 explicitly requires avoiding unbounded growth by pruning/paging historical attempts.
- **[Minor][Node] `compareJobs` ties only by millisecond timestamp.** Multiple submissions with the same `createdAtMs` can compare equal, relying on JS sort stability rather than an explicit sequence tie-breaker.

## Readability

- **[Minor][All] Spec names and implementation names diverge.** Spec statuses are `queued`, `scheduled`, `blocked`, `running`, `cancelling`, `retry_scheduled`, `succeeded`, `failed`, `cancelled`; implementations use `pending`, `running`, `completed`, `failed`, `cancelled`. This makes acceptance mapping harder to audit.
- **[Educational][Rust] Strong typed state is the clearest implementation.** Rust's enums and builder-style `JobRequest` make invalid priority/status values impossible at compile time, which is helpful for a scheduler state machine.

## Maintainability

- **[Critical][All] Due time is not enforced when selecting dispatch candidates.** Candidates are `pending` with completed dependencies, regardless of `DueAt`/`due_at`/`dueAtMs`. Tests even dispatch a high-priority job with `RunAfter`/`run_after`/`runAfterMs` before its due time because priority wins. This violates FR-003, FR-009, NFR-001, and scheduler correctness.
- **[Major][All] Leader election is not Raft-style.** Highest process ID plus a local lease is not terms, votes, quorum, or heartbeats. It cannot prove a single active leader in a three-node cluster and cannot fence stale leaders after partitions.
- **[Major][All] Durable state is absent.** Jobs, locks, election state, attempts, and dependency state are process-local maps. FR-016/NFR-002/NFR-006 cannot be met because accepted jobs disappear on restart and new leaders cannot reconstruct queues.
- **[Major][All] Cron/recurring schedules are not implemented.** The spec requires cron validation, schedule identity, next-run calculation, and distinct run records. The implementations parse duration intervals only and do not create recurring executions.
- **[Major][All] Idempotency keys are absent.** FR-018 requires repeat submission behavior and conflict detection. No language stores request fingerprints or idempotency keys.

## Idiomaticity

- **[Educational][Go] The injected `Clock` is a good testing seam.** Go's `Clock` makes lease/backoff tests deterministic without sleeping, which is the right pattern for scheduler logic.
- **[Minor][Rust] The binary wraps a synchronous scheduler in `Arc<Mutex<_>>`.** Fine for a health endpoint, but it would block async request handling if more endpoints were added; a `tokio::sync::Mutex` or command actor would be safer for async expansion.
- **[Minor][Node] Plain `Error` strings stand in for domain errors.** TypeScript would benefit from explicit `SchedulerError` codes for `not_leader`, `stale_fencing_token`, `lock_expired`, and validation failures.

## Error Handling

- **[Major][All] Cancellation of running jobs is immediate, not a `cancelling` handshake.** FR-013 requires notifying the worker, releasing/expiring the lock, and eventually reaching `cancelled` or `failed`; current `Cancel`/`cancel` directly sets terminal `cancelled` and releases the lock.
- **[Major][All] Retry policy is incomplete.** Backoff is exponential, but there is no jitter, max backoff cap, retry deadline, retryable/non-retryable error distinction, or `retry_scheduled` status.
- **[Minor][Go/Rust] Lock expiry checks use strict-after semantics.** A completion exactly at `lease_expires_at` is accepted because checks use `After`/`>` rather than `>=`. Distributed lease systems usually treat the expiry instant as no longer valid.

## Testing

- **[Major][All] Tests prove local core behavior, not distributed failure recovery.** Missing coverage includes three-node election quorum, leader failover within 5s, worker heartbeat fencing, stale leader dispatch rejection, durable restart reconstruction, duplicate submission idempotency, recurring overlap policy, and cancellation races.
- **[Major][All] No tests assert due-time gating.** Existing tests assert a high-priority future job dispatches before a low-priority due job, which encodes the bug rather than the spec.
- **[Minor][Go] HTTP surface tests are absent.** Core package tests are useful, but `cmd/scheduler` exposes only `/health` and `POST /jobs` and lacks tests for request/response shape, structured errors, and missing endpoint behavior.
- **[Minor][Rust/Node] API tests are mostly absent.** Rust binary only exposes `/health`; Node only exposes `/health`; the spec's job, worker, internal completion, and cluster routes are not exercised.

## Recommended Next Fixes

1. Fix dispatch eligibility to require `job.due_at <= now` after dependencies are satisfied.
2. Add idempotency key storage and structured domain errors before expanding HTTP routes.
3. Introduce durable-state interfaces for jobs, locks, election terms/votes, attempts, and audit events.
4. Replace highest-ID election with a minimal term/vote/heartbeat/quorum model and fencing term in locks.
5. Add worker heartbeat/dispatch/ack/completion endpoints with stale token and lock expiry tests.
