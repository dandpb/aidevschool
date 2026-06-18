# Code Review — Distributed Configuration Service

## Scope

Reviewed `docs/spec.md` and the authored source in `go-impl`, `rust-impl`, and `node-impl`. Generated dependency/build output was not reviewed as source. This is a documentation-only review.

## Severity legend

- **Critical**: violates a core distributed-consistency or security guarantee.
- **High**: materially misses a functional requirement.
- **Medium**: useful baseline behavior but incomplete or inefficient for the capstone target.
- **Low**: polish, documentation, or test-depth issue.

## 1. Specification coverage

- **Critical — all languages:** writes do not pass through a real consensus mechanism. Go increments a local `logIndex`, Rust mutates local maps, and Node mutates local maps. There is no quorum, leader, follower, replication log, fail-closed quorum behavior, or failover path for RF-004/RNF-005/RNF-006.
- **Critical — all languages:** ACLs are absent. The spec requires per-key actions for read/write/watch/rollback/admin/evaluate and denied-access auditing; the implementations expose protected state without authorization decisions.
- **High — Go:** rollback, version history, watches, feature flags, health, and metrics are present, making it the broadest implementation, but still local-only and non-secure.
- **High — Rust/Node:** rollback endpoint/operation, ACLs, audit records, metrics depth, and history retention/resume behavior are missing or very thin.

## 2. Correctness and edge cases

- **High — Go:** `notifyWatchers` runs while `Put`/`Rollback` holds the service write lock. A full watcher channel silently drops notifications, which violates the resume/no-missed-updates intent unless explicitly surfaced as backpressure.
- **High — Rust/Node:** watch events carry the current config object rather than the required key, previous version, change type, log index, and committed timestamp metadata.
- **High — Rust/Node:** feature flag updates do not share the same version-history mechanism as config entries, missing RF-017.
- **Medium — all languages:** expected-version conflicts are covered for config writes, but idempotency keys and duplicate-timeout behavior are not implemented.
- **Medium — Go/Node:** targeting operator support is partial (`equals`, `in`, `contains` or `equals`/`contains` only), far short of the spec's full operator list.

## 3. Consensus, versioning, and rollback

- **Strong point — Go:** per-key versions and a global log index are explicit, and rollback appends a new version rather than mutating history.
- **Medium — Rust:** config values track per-key versions and an in-memory history vector, but there is no globally comparable log index and no rollback operation.
- **Medium — Node:** config history is retained and versions increment, but entries do not include log indexes or structured version metadata.
- **Critical — all languages:** health endpoints report standalone/ok rather than real consensus state; quorum availability is either hard-coded or absent.

## 4. Watch semantics and backpressure

- **Strong point — Go:** SSE streaming is implemented with per-watcher buffered channels and heartbeat events.
- **Strong point — Rust:** `tokio::sync::broadcast` gives a concise local fan-out primitive for SSE.
- **Tradeoff — Node:** callback fan-out is simple and readable, but does not model backpressure or disconnected clients beyond unregistering callbacks.
- **High — all languages:** watchers cannot resume from `Last-Event-ID`, `fromVersion`, or log index and receive retained missed changes. The capstone watch semantics are therefore not satisfied.
- **Medium — all languages:** watcher limits, idle timeouts, queue-depth metrics, and permission-revoked close behavior are absent.

## 5. Feature flags and deterministic rollout

- **Strong point — Go:** feature flags include targeting rules, rollout seed, deterministic SHA-256 bucket, disabled behavior, and evaluation metadata.
- **Medium — Rust/Node:** feature flags support enabled/default treatment, simple targeting rules, and deterministic hashing, but response metadata is sparse and rollout semantics are inverted/confusing: with percentage below 100, excluded users return reason `rollout` while included users fall through to default.
- **High — all languages:** feature flag state lacks ACL enforcement and consensus-backed version history, so protected flag state can be exposed and updates can split-brain in a cluster.

## 6. Tests and benchmark evidence

- **Strong point — Go:** service tests cover put/get, version mismatch, rollback, watch callback, flags, targeting, rollout, health, and metrics.
- **Medium — Rust:** tests cover basic HTTP put/get, not-found, flag evaluation, health, and version conflict, but not rollback, watcher delivery, resume, ACLs, or metrics.
- **Medium — Node:** tests cover service and HTTP basics, targeting, rollout exclusion, history, and watch callback.
- **High — all languages:** no multi-node cluster tests, quorum-unavailable rejection tests, failover tests, watch p95 tests, ACL overhead tests, or benchmark evidence for the RNF latency targets.

## 7. Maintainability and observability

- **Medium — Go:** service responsibilities are mostly separated from HTTP handlers, but consensus, ACL, audit, and notification abstractions should become first-class modules before more features are added.
- **Medium — Rust:** all core logic lives in `src/main.rs`; extracting store, history, flags, watch, and consensus interfaces would improve capstone readability.
- **Medium — Node:** `ConfigService` is compact, but it has no typed error model and conflates state mutation, watch notification, and flag logic.
- **Medium — all languages:** metrics endpoints are absent or shallow; required latency histograms, watcher counts, notification outcomes, ACL denials, and consensus metrics are not emitted.

## Cross-language comparison

| Area | Go | Rust | Node/TypeScript |
| --- | --- | --- | --- |
| State model | `Service` with maps, global `logIndex`, history, flags, watchers. | `AppState` maps behind `Arc<RwLock<_>>`, broadcast channel. | `ConfigService` maps plus callback watcher list. |
| Consensus approach | Local log counter only. | None beyond local mutation. | None beyond local mutation. |
| Rollback | Implemented as new version. | Missing. | Missing. |
| Watch approach | SSE with buffered channels and heartbeat. | SSE over broadcast stream. | SSE callback writes. |
| Flags | Most complete targeting and rollout metadata. | Simple targeting and rollout. | Simple targeting and rollout. |
| Main advantage | Broadest feature coverage. | Clean async SSE primitive. | Smallest, easiest to inspect. |
| Main gap | No quorum/ACL/audit despite broad API. | Thin capstone coverage. | Thin capstone coverage and untyped errors. |

## Overall assessment

The implementations are useful local configuration-store exercises, with Go reaching the most capstone features. They are not yet distributed configuration services in the specification's sense because consensus, ACL enforcement, watch resume/backpressure, audit records, and benchmark evidence are missing. The next iteration should introduce an explicit consensus interface and ACL/audit layer before expanding endpoint polish.
