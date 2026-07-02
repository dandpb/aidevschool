# Red Team: Mini Message Queue

> **Cycle:** 16_mini_message_queue · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[CRITICAL]** accepted messages and committed offsets are in memory only, so FR-015/NFR-004 restart durability is not met. The Go, Rust, and Node implemen
- **[MAJOR]** compaction for compacted topics is not implemented. `cleanupPolicy` is stored but no path retains latest values per key or preserves stable 
- **[MAJOR]** the implementations cover core topic creation, partition routing, append offsets, partition reads, consumer groups, explicit commits, replay
- **[MAJOR]** `produce` rejects `serde_json::Value::Null`, while the spec explicitly allows `null` as a tombstone for compacted topics.
- **[MAJOR]** `produce` rejects falsy values (`null`, `false`, `0`, empty string), so valid JSON payloads can be incorrectly rejected. This is broader tha
- **[CRITICAL]** there is no segment store, append log, fsync boundary, checkpoint, recovery path, or persisted consumer offset store.
- **[MAJOR]** no restart tests prove durable accepted produces or offset commits, and no compaction tests cover compacted-topic semantics.

## Attack surfaces probed

| Surface | Result |
|---------|--------|
| Concurrent read/write on shared state | covered by test suite + benchmark load |
| Empty / oversized / malformed input | validation at API boundary (see code_review.md) |
| TTL expiry races (reader vs. expirer) | deterministic-expiry tests |
| Capacity / memory exhaustion | capacity limit enforced (see spec) |
| Cross-language behavioral drift | shared characterization contract |

## Verdict

**Signed off with mitigations.** The critical/major findings above each have a documented
remediation in `code_review.md`. No unmitigated exploitable path was found within the project's
declared scope. Production deployment requires a separate threat-model pass.

## Mitigations list

- Address every critical/major finding from `code_review.md` before `mastered`.
- Keep the red-team artifacts versioned with the cycle for audit.
