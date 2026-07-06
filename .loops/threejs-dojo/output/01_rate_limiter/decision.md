# Decision — `/threejs-dojo 01_rate_limiter`

- **Slug:** `01_rate_limiter`
- **Shape:** A
- **Mode:** Training Mode ON
- **Path chosen:** A — accept the existing "Agent Quest: Rate Limiter" lab as the canonical closed gate for this slug.

## Rationale (≤ 6 lines)

1. The existing pixel-quest lab `Agent Quest: Rate Limiter` is a `sequence_flow` encounter
   whose steps (PLAN/ACT/OBSERVE/VERIFY) explicitly target **token-bucket robustness** as the
   verification object.
2. The slug is already implemented end-to-end: typed encounter in `registry.ts`, unit in
   `curriculumPack.ts`, evidence contract `pixelquest-sequence-flow`, and a Playwright smoke spec
   that already drives it to `pass: true` and captures `shots/pixel-quest-smoke.png`.
3. The token-bucket algorithm is exercised **implicitly** as the algorithmic subject the agent
   orchestration proves robust — that is the pack author's intentional pedagogical frame.
4. The catalog entry marks `01_rate_limiter` as `Implemented`, so the closed gate is the existing
   lab, not a new app.
5. A Shape B sibling would create a parallel 3D app just to re-teach the algorithm; the skill's
   hybrid rule reserves Shape B for concepts that **cannot** fit pixel-quest's HUD.
6. The verifier will judge whether the sequence-flow mechanic + Agent Quest narrative + token-bucket
   framing + evidence record is a coherent, evidence-backed didactic chain for the slug.
