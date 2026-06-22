# Tentativa — U0-sonda-rate-limiter-robustness — 2026-06-21 (stub)

> **This is a starter stub.** The four sections below are the diagnostic's
> required sections; the content is intentionally marked `TODO` so the
> apprentice can fill it in. Once you have a real attempt here, run
> `/devschool-diagnose` — Sonda will grade it and either keep the gate blocked
> or unblock the implementation phase.

## Tarefa 1: Test Design

Propose six tests for the token-bucket rate limiter. For each, fill in:

| Field | What to provide |
|-------|-----------------|
| Name | A precise test name. |
| Setup | Capacity, refill rate, client identity, and clock state. |
| Action | The request or sequence of requests. |
| Assertion | The observable result, including headers or JSON fields when relevant. |
| Risk covered | The bug class this test would catch. |

Tests to cover (at minimum):

1. **Under-limit requests stay 200.**
   - Name: TODO
   - Setup: TODO
   - Action: TODO
   - Assertion: TODO
   - Risk covered: TODO

2. **Burst over capacity returns 429 + Retry-After.**
   - Name: TODO
   - Setup: TODO
   - Action: TODO
   - Assertion: TODO
   - Risk covered: TODO

3. **Lazy refill restores tokens after time passes.**
   - Name: TODO
   - Setup: TODO
   - Action: TODO
   - Assertion: TODO
   - Risk covered: TODO

4. **Concurrent burst never grants more than capacity.**
   - Name: TODO
   - Setup: TODO
   - Action: TODO
   - Assertion: TODO
   - Risk covered: TODO

5. **Idle client buckets get cleaned up.**
   - Name: TODO
   - Setup: TODO
   - Action: TODO
   - Assertion: TODO
   - Risk covered: TODO

6. **Rate-limit headers are correct on every limited response.**
   - Name: TODO
   - Setup: TODO
   - Action: TODO
   - Assertion: TODO
   - Risk covered: TODO

## Tarefa 2: Algorithm Sketch

Pseudocode for `allowRequest(clientID, now)` that returns `{ allowed, remaining, reset, retryAfter? }`.

```ts
// TODO — write pseudocode. The verifier will look for:
//   1. lazy refill math (tokens = min(C, lastTokens + (now - lastRefill) * r))
//   2. NO per-request scan of every client bucket (O(1) per request)
//   3. lock scope that does NOT hold during HTTP write
//   4. correct integer remaining and epoch-seconds reset for headers
```

## Tarefa 3: Code Reading Risk Scan

Read the current Project 01 skeleton (`curriculum/01_rate_limiter/`) and identify three risks or ambiguities:

1. **Risk:** TODO
   **Why it matters:** TODO
   **Smallest safe next step:** TODO

2. **Risk:** TODO
   **Why it matters:** TODO
   **Smallest safe next step:** TODO

3. **Risk:** TODO
   **Why it matters:** TODO
   **Smallest safe next step:** TODO

## Tarefa 4: Review Judgment

Classify each hypothetical finding. One sentence per row.

| Finding | Severity | Why |
|---------|----------|-----|
| A denied request returns 429 but omits `Retry-After`. | TODO | TODO |
| The implementation refills all buckets every 100ms in a background loop. | TODO | TODO |
| `/status` returns `tokens` instead of `tokens_remaining`. | TODO | TODO |
| The README does not mention which port the service uses. | TODO | TODO |
| A concurrent burst can grant more successful requests than the bucket capacity allows. | TODO | TODO |

---

## Next step

After you replace the `TODO`s with real answers, run:

```bash
/devschool-diagnose
```

Sonda will:
1. Read this file.
2. Classify Dreyfus/Bloom per concept (test maturity, concurrency, error/contract, refactoring, autonomy).
3. Update `learner/learner_profile.md` and (if applicable) `learner/pitfalls.md`.
4. Return GATE: BLOCKED (keep `implementation_blocked: true`) or GATE: UNBLOCK_RECOMMENDED (set `implementation_blocked: false`).
5. If unblocked, run `python3 -m learner.substrate` to regen derived views, then `/devschool-implement`.