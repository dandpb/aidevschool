# voxelDojo — Gap analysis (status ledger)

What was missing, across the whole `aidevschool` ecosystem, to go from "documented engine" to
"three.js didactic games teaching the curriculum skills, with verified evidence" — and what
happened to each gap. Original snapshot 2026-07-05; statuses updated 2026-07-05 after the
implementation pass.

## Status summary

| Gap | Status | Evidence |
| --- | --- | --- |
| G1 pilot game code | **closed (M1–M6)** | `game-10-hash-ring/`: 19 Vitest tests green (M1 edge cases added 2026-07-05: single-node ring, anchor-hash collision tie-break, empty ring), tsc clean, vite build ok, lint green (`biome.jsonc` added 2026-07-05 — mirror of pixel-quest, Biome ^2.3.8; lint had previously run configless and failed), 3 Playwright smoke tests green with screenshots in `.logs/` |
| G2 evidence ingestion | **closed** | Shared verifier is source-agnostic (required fields check passes for a voxeldojo record); substrate now emits a voxelDojo review slice (`sync_voxel_review_slice`, 78 substrate tests green) |
| G3 shared contract | **closed** | `docs/design/teaching-game-contract.md`, cited by both engines' `AGENTS.md` |
| G4 review-not-gating framing | **closed** | `emit.ts` reads the substrate-generated `reviewSlice.ts`: `scheduled_review`/`review_reason` reflect real scheduling truth |
| G5 3D style substrate | **closed** | `docs/3d-style.md` (palette, camera, lighting, HUD rules) |
| G6 WebGL in verification | **closed with caveat** | Smoke ran green in the Linux sandbox via Playwright chromium headless-shell + a stubbed `libXdamage.so.1` (see §G6 notes); unverified on macOS host — expected to just work there |
| G7 ecosystem registration | **closed** | Root `AGENTS.md` (tree + validate row), `docs/handbook/README.md` + `10_engine_voxelDojo.md`, codexDojo `MANIFEST.md`; root `CLAUDE.md` already listed the engine |
| G8 seed map beyond pilot | **closed (spatial concepts) — open (rules-shaped)** | 15 voxelDojo games implemented 2026-07-05 via the threejs-dojo all-18 buildout (games 02, 03, 05, 06, 07, 08, 09, 11, 12, 13, 14, 15, 16, 17, 18 — each full M1–M6: deterministic sim core, Vitest concept proofs, Three.js scene, 4 levels, voxeldojo evidence emit, Playwright smoke). The two rules-shaped seeds (01 rate limiter, 04 task queue) were intentionally routed to the sister pixel-quest engine as Shape A encounters (`tokenBucket`/`sequenceFlow` for 01, new `taskQueue` for 04) because their mental model is a rule, not a shape; GAP_ANALYSIS §G8 had previously flagged these two as retire-from-3D candidates. Pilot `game-10-hash-ring` predates this pass. All 16 voxelDojo games: lint+test+typecheck+build+smoke green (smoke re-verified on a per-wave sample). Each game has a PLAN slice in `docs/plans/` arguing §2 "why 3D". |

## Notes per gap

### G1 — pilot (closed)

Built as PLAN.md milestones M1–M6. The load-bearing detail discovered during M1: raw FNV-1a has
weak avalanche on similar short strings (`st-0#1` vs `st-0#2`), which made measured moved-ratio
~0.30 vs the theoretical 0.20 and load skew ~1.5 even at 64 vnodes — i.e. the K/N lesson would
have been *false* as rendered. Fixed with a murmur3 finalizer (`ringHash = fmix32(fnv1a(s))`);
after the fix, measured moved ≈ 0.20 and skew ≈ 1.15. The Vitest suite pins this
(`src/sim/ring.test.ts`), which is exactly why the sim core must stay headless and provable.

M1 verification pass (2026-07-05, later the same day): re-ran the whole toolchain in the Linux
sandbox (npm fallback per `AGENTS.md`) — lint, 19 Vitest tests, `tsc --noEmit`, `vite build` all
green. Two fixes landed: (1) the project had **no Biome config**, so `pnpm run lint` was running
Biome defaults (tabs) against space-indented code and failing — added `biome.jsonc` (verbatim
mirror of pixel-quest's: `noExplicitAny`/`noNonNullAssertion`/`noUnusedVariables` as errors,
2-space/100-col/asNeeded-semicolons) and bumped `@biomejs/biome` to ^2.3.8 to match; the
substrate-generated `reviewSlice.ts` is already emitted in that style. (2) Added three sim-core
edge-case tests: single-station ring owns all keys and a 1→2 join moves ≈½; anchor-hash
collisions resolve deterministically (stable sort ⇒ insertion order); empty ring throws.
`pnpm run smoke` was not re-run in this pass; the 3 smoke greens + `.logs/` screenshots stand
from the earlier M6 run.

### G2 + G4 — verifier and scheduling (closed)

Audit findings: the gate verifier (`python3 -m engines.pixelDojo.verifier`) validates
`unit_id/project/game/ts/pass` against `active_unit` and has **no source allowlist** — voxelDojo
records are ingestible unchanged. Scheduling truth flows substrate → game via a generated review
slice; added `sync_voxel_review_slice` (+ `render_voxel_review_ts`, `VOXEL_REVIEW_TS`, 3 new
tests) so `python3 -m learner.substrate` now regenerates
`game-10-hash-ring/src/content/reviewSlice.ts` alongside the pixel slice. The game derives
`review_context.scheduled_review` from that slice (`"due"` if `U9-distributed-cache` is in
`nextReviews`, else `"deepening"`). Framing correction (2026-07-05, later the same day): the 18
masteries dated 2026-07-01 turned out to be seeded without evidence and were reverted — only U0
is honestly gated. So HASH RING is not review-only: it can serve the **real first-mastery gate**
for `U9-distributed-cache` when the scheduler activates that unit. The emitter already derives
`review_context` dynamically from the slice, so no code change was needed — the load-bearing
lesson is in [[aidevschool-status-2026-06]]: never trust `learning_state.yaml` claims without
checking `learner/attempts/` and evidence files.

### G6 — WebGL in CI/sandbox (closed with caveat)

In the Linux sandbox: `npx playwright install chromium --only-shell`, then the only missing
system library was `libXdamage.so.1` (no root, apt egress blocked). A 6-symbol no-op stub
compiled with `gcc -shared` and injected via `LD_LIBRARY_PATH` satisfies the loader; headless
WebGL (swiftshader) then renders correctly — screenshots in `game-10-hash-ring/.logs/` show the
actual scene. On the macOS host, `pnpm run smoke` should work without any of this. If CI is ever
Linux, either install `libxdamage1` properly or reuse the stub trick.

### G8 — remaining 17 games (open, by design)

Next strongest "why 3D" candidates: 12 MISSION CONTROL (leader election) and 16 FREIGHT YARD
(partitions/consumer groups). Each new game: copy the PLAN.md template, argue §2 (why 3D), build
sim-core-first, reuse `docs/3d-style.md` and the cross-engine contract. Seeds that fail the
"why 3D" test (01, 04 are rules-shaped and already covered by pixel-quest mechanics) should be
retired, not built.

## Explicit non-goals (unchanged)

Multiplayer/netcode, backends or databases, VR/AR, physics engines, GLTF/model marketplaces,
photorealistic rendering, replacing pixelDojo, and any mechanism by which a game writes learner state.
