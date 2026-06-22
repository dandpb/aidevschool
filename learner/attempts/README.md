# Learner Attempts

This directory holds the learner's **attempts** at diagnostic challenges. Each attempt
is the empirical evidence the learning gate needs to unblock a unit.

## Convention

- **Path:** `learner/attempts/<unit_id>-attempt-<N>.md` where `N` starts at 1 and increments
  on re-attempts.
- **Content:** the apprentice's answer to the 4 tasks in the diagnostic (Test Design,
  Algorithm Sketch, Code Reading Risk Scan, Review Judgment). Pseudocode is OK;
  production code is not required for a diagnostic.
- **Read-by:** Sonda (when invoked via `/devschool-diagnose`) reads the latest attempt,
  classifies Dreyfus/Bloom per concept, and decides whether to unblock the gate.
- **Append-only:** never delete a failed attempt — it is learning evidence.

## State transition

```
diagnostic.md  →  attempt-1.md  →  Sonda → GATE: BLOCKED | UNBLOCK_RECOMMENDED
                                       ↓
                                  retry_count++    OR    implementation_blocked: false
                                  attempt-2.md
```

A unit can have many attempts. The gate stays blocked while the latest attempt scores
below the rubric. The unit never reaches `mastered` from a diagnostic — `mastered`
requires executable evidence (Phase 2's verifier).

## Current state

| Unit ID | Attempts | Status |
| --- | --- | --- |
| `U0-sonda-rate-limiter-robustness` | 0 (none yet) | `state: presenting`, `gate.implementation_blocked: true` |

To start: read `curriculum/01_rate_limiter/docs/diagnostic.md`, write your attempt in
`learner/attempts/U0-sonda-rate-limiter-robustness-attempt-1.md`, then run
`/devschool-diagnose`. Sonda will grade it; if GATE: UNBLOCK_RECOMMENDED, the implementation
phase becomes available.
