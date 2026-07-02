# Lesson: Mini Message Queue

> **Cycle:** 16_mini_message_queue · **Generated:** 2026-07-02 · **Levels:** intuition → formal → practical
> DoD §7: *"lesson.md explains the concept at 3 levels (intuition, formal, practical)."*

## Overview

Mini Message Queue is a Kafka-like append-only message broker for learning how distributed log systems work.



## 1. Intuition

Mini Message Queue is a deceptively simple system whose difficulty lives in the edges: deterministic
semantics, shared-mutable state under concurrency, and failure modes that only appear under
load. The mental model is a **hash map behind an API**: clients address opaque values by string
keys and expect the store to honor create/read/update/delete/expire/enumerate predictably —
even when many clients race. The key insight is that "correct" here means *deterministic under
concurrency*, not just "works on my machine."

## 2. Formal

The three implementations expose behaviorally-equivalent contracts over the same data model
(a hash-map of string→value with TTL metadata), but express the guarantees differently per
language: Go uses `sync.RWMutex` + goroutines, Rust leans on the borrow checker + `tokio`
async, Node relies on the single-threaded event loop. The formal tension is between
**throughput** (lock-free / channel-based concurrency) and **correctness** (serializability of
read/write on shared state). The benchmark measures exactly this trade-off — see
`benchmark_results.md` for the empirical p50/p95/p99 and RSS across the three runtimes.

## 3. Practical — learning objectives addressed

- Primary concept: log-structured message storage with partitioned ordered offsets.
- Secondary concepts: topics, partitions, producer routing, consumer groups, offset tracking, at-least-once delivery, retention, log compaction, replay, backpressure, and performance benchmarking.

The worked exercise is the project itself: implement the store in go, rust, node,
write characterization tests that hold for all three, and observe where each language's
concurrency model helps or hurts under the k6 workload. Productive struggle lives in TTL
expiry races, capacity eviction, and serialization-boundary validation — not in the happy path.

## Self-check

1. Explain why a naive `map[string]string` without synchronization is incorrect under concurrent
   writers — in all three languages.
2. What invariant does the TTL-expiry path need to preserve even when a reader and an expirer
   race?
3. Which finding from `code_review.md` would surface in production first, and why?
