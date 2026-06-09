# Sonda Diagnostic: Token-Bucket Robustness

> Unit: `U0-sonda-rate-limiter-robustness`
> State: `apresentando`
> Timebox: 10-15 minutes
> Focus: tests, refactoring, code reading, and robustness reasoning for Project 01.

## Status note (2026-06-03 22:25)

A Node/TS implementation already exists in `projects/01_rate_limiter/node-impl/`. It was shipped by a parallel session (`dev-node`) before this diagnostic was attempted — 40 tests pass, 91.86% line coverage, lint clean, Docker build + smoke test green. Details: `projects/01_rate_limiter/deliverable-impl-node.md`.

**The diagnostic is reframed.** Instead of "design before implementation," you are now **reviewing the existing implementation through the 4 tasks below** and identifying what you would have designed differently, what risks remain, and what tests are missing. Pedagogical value is reduced but not zero — the angle shifts from "design the system" to "critique the system as a senior engineer would, and propose tests the existing suite doesn't have."

A real empirical gate still needs to run: **Stryker mutation testing** on the existing code. 91.86% line coverage means lines were executed; mutation score (≥60-70% target) means the tests actually catch bugs. Prometor will run Stryker in the next team plan. The diagnostic informs what Prometor should look for; it doesn't replace the mutation gate.

## Rules

- Do not look for a finished implementation before answering.
- Do not ask for a full solution first. If you need help, state the exact point of confusion and Socrates will give a graded hint.
- Write enough detail for a verifier to judge your reasoning, but keep the attempt short.
- Pseudocode is acceptable; production code is not required for this diagnostic.

## Task 1: Test Design

Propose six tests for the token-bucket rate limiter. For each test, write:

| Field | What to provide |
|-------|-----------------|
| Name | A precise test name. |
| Setup | Capacity, refill rate, client identity, and clock state. |
| Action | The request or sequence of requests. |
| Assertion | The observable result, including headers or JSON fields when relevant. |
| Risk covered | The bug class this test would catch. |

At minimum, cover under-limit requests, 429 behavior, lazy refill, concurrent bursts, cleanup of idle clients, and rate-limit headers.

## Task 2: Algorithm Sketch

Write pseudocode for `allowRequest(clientID, now)` that returns:

- whether the request is allowed,
- remaining integer tokens for the header,
- reset time as Unix epoch seconds,
- retry-after seconds when denied.

Your sketch must make the lock scope explicit. The verifier will look for lazy refill math and no per-request scan of every client bucket.

## Task 3: Code Reading Risk Scan

Read the current Project 01 skeleton and identify three risks or ambiguities before implementation starts. Use this format:

```text
Risk:
Why it matters:
Smallest safe next step:
```

You may inspect:

- `projects/01_rate_limiter/docs/spec.md`
- `projects/01_rate_limiter/go-impl/main.go`
- `projects/01_rate_limiter/rust-impl/src/main.rs`
- `projects/01_rate_limiter/node-impl/src/index.ts`

## Task 4: Review Judgment

Classify each hypothetical finding as `Critical`, `Major`, `Minor`, or `Educational`, and explain why in one sentence.

| Finding | Your severity | Why |
|---------|---------------|-----|
| A denied request returns 429 but omits `Retry-After`. | | |
| The implementation refills all buckets every 100ms in a background loop. | | |
| `/status` returns `tokens` instead of `tokens_remaining`. | | |
| The README does not mention which port the service uses. | | |
| A concurrent burst can grant more successful requests than the bucket capacity allows. | | |

## Evaluation Rubric

Sonda will classify the attempt across these dimensions:

| Dimension | Evidence |
|-----------|----------|
| Test maturity | Tests name observable behavior, edge cases, and failure modes rather than implementation details only. |
| Concurrency reasoning | Lock scope, shared state, and race risks are explicit. |
| Error and contract handling | Headers, status codes, and JSON shape are treated as part of the contract. |
| Refactoring instinct | Risks are paired with small, reversible next steps. |
| Autonomy | The answer shows an attempt before requesting hints. |

No mastery can be marked from this diagnostic alone. Passing this unit unlocks the first implementation practice target and the verifier-generated executable tests.

