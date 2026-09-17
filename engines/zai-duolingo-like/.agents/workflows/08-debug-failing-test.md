# 08 — Debug a failing test

**Trigger:** a vitest or Playwright test is red or flaky, locally or after a change.

## Steps

1. **Reproduce in isolation** — run the single file before touching anything:
   ```bash
   npx vitest run tests/unit/<file>.test.ts        # or tests/api/...
   npx playwright test e2e/<file>.spec.ts
   ```
2. Classify the failure before fixing:
   - **Assertion on async server effect?** Switch to `expect.poll` (the playground save/render race was exactly this).
   - **Stale build?** E2E serves the last `npm run build` output. Rebuild, rerun.
   - **Clock/time logic?** Check for wall-clock `new Date()` inside code that accepts an injected `now` — test with past and future clocks to expose it.
   - **DB state leaking between tests?** Each suite recreates its own DB in global setup; if a test depends on order, that is the bug — make it self-sufficient.
3. Fix **test-first when the failure reveals missing coverage**: write the red test that pins the bug, then fix (the clock-consistency fix shipped this way).
4. Re-verify upward: single file → suite → [verify before done](02-verify-before-done.md).

## Verification

- The failing test is green in isolation **and** in the full serial run.
- For flakes: three consecutive full-suite runs green before calling it fixed.

## Pitfalls

- Do not widen timeouts to silence a race; find the missing poll/await.
- Do not parallelize to "see if it passes" — serial execution is load-bearing (shared DB file).
- E2E traces and screenshots are retained on failure: `npx playwright show-trace test-results/...` beats console guessing.
- If the fix changes behavior documented in a note or workflow, update that doc in the same commit.

## Sources

- [code-review-followups](../notes/implemented/architecture/2026-08-18-code-review-followups.md)
- [lesson-attempt-clock-consistency](../notes/implemented/architecture/2026-08-19-lesson-attempt-clock-consistency.md)
- [playwright-e2e-suite](../notes/implemented/process/2026-08-18-playwright-e2e-suite.md)
