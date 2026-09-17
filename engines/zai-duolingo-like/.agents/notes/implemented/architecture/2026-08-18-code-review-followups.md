# Agent Note: Code-review follow-up fixes (standards + spec axes)

Status: implemented

> Shipped 2026-08-18. All findings from the two-axis review of the architecture+E2E diff are resolved: grader casts removed (discriminated-union narrowing suffices); E2E helpers typed (`Page`, `APIRequestContext`, `Exercise`); the playground stub route is a RegExp (`?XTransformPort` glob matched a literal `?` by luck — a latent flake); `GameSnapshot` is deeply `readonly`; `createGameState({ clock, store })` is the real construction seam (TestClock test added); the lesson pipeline takes an explicit `now`; heart regen baseline moved to a dedicated `Learner.heartsUpdatedAt` column (any unrelated write used to delay regen); practice-mode achievement payloads have a real shape test. One race found and fixed while verifying: the playground save fires after the reply renders — DB assertions now poll. Verified: vitest 100/100, playwright 29/29, tsc clean, eslint clean.

## Deferred deliberately

- "Mutações retornam GameSnapshot" (design-it-twice) stays staged out — recorded in the snapshot note.
- The order-exercise E2E test verifies the UI and verify/reveal flow but not a correct drag answer (random scramble) — documented in e2e/lesson-flow.spec.ts.
