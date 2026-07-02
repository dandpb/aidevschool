# ADR-0001: Core architecture for Mini Message Queue

> **Cycle:** 16_mini_message_queue · **Generated:** 2026-07-02 · **Format:** MADR
> DoD §7: *"ADR.md (Architecture Decision Record) if there is a new decision."*

## Context and Problem Statement

Mini Message Queue must be implemented in go, rust, node with behavioral equivalence so that tests,
reviews, and benchmarks compare runtime trade-offs rather than feature drift. The core decision
is the data model and concurrency strategy that all three implementations share.

## Decision Drivers

- **Behavioral equivalence** across runtimes (shared characterization contract).
- **Concurrency correctness** — shared mutable state under read/write pressure.
- **Comparability** — the benchmark must measure the same workload against each runtime.

## Considered Options

1. **Hash-map behind a synchronous HTTP API** (chosen) — simplest model that exposes the
   concurrency tension the project teaches.
2. Persistent/disk-backed store — rejected: out of scope for a fundamentals-level cycle and
   would conflate storage with the concurrency learning objective.
3. Event-sourced model — rejected: adds complexity inappropriate to the level; reserved for the
   event-driven cycle (Project 08).

## Decision Outcome

Chosen: **Option 1** — in-memory hash-map behind an HTTP API, with TTL metadata and capacity
limits, protected per-language idiomatically (`sync.RWMutex` / borrow checker / event loop).

### Consequences

- **Positive:** isolates the concurrency + serialization learning objective; benchmark compares
  runtimes cleanly.
- **Negative:** state is lost on restart (acceptable for the lab scope).
- **Risks:** behavioral drift between runtimes if validation differs — mitigated by the shared
  characterization tests.

## Compliance

The benchmark (`benchmark_results.md`) and code review (`code_review.md`) confirm all three
runtimes honor this contract within the declared scope.
