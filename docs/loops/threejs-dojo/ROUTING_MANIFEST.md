# threejs-dojo — module routing manifest (all-18 buildout, 2026-07-05)

> Single source of truth for which engine each curriculum concept lands in, the unit_id each
> game targets, the Vite dev port (so parallel `pnpm run smoke` doesn't collide), and the
> directory. **Status: all 18 implemented and committed 2026-07-05.** Source of unit_ids:
> `learner/learning_state.yaml` (only U0 exists today) — for units not yet in the substrate,
> the games use the conventional `U<NN>-<slug-stem>` id and emit `scheduled_review: false`,
> `review_reason: "deepening"` until the substrate is extended. The game never writes learner
> state; the id is for the evidence record only.

## Routing rule

- **voxelDojo** (`engines/voxelDojo/game-<NN>-<slug>/`) — concepts whose mental model is a
  *shape/structure/dynamic* (rings, topologies, partitions, quorums, flows). Stack: Vite + strict
  TS + plain `three` + Vitest + Biome + Playwright. Mirror `game-10-hash-ring/` exactly.
- **pixel-quest Shape A** (`engines/pixelDojo/pixel-quest/src/game/encounters/<kind>.ts`) —
  concepts whose mental model is a *rule/budget* (admit/reject, ordering, policy). Reuse the
  existing encounter shell; add a typed encounter + pack entry.
- The `01` rate-limiter is **done** (token-bucket + sequence-flow encounters exist; closed gate
  for U0). The `10` hash-ring pilot is **done** in voxelDojo. The `04` task-queue encounter is
  **done** in pixel-quest (this buildout). Do not rebuild any of these.

## All 18 modules (status as of 2026-07-05)

| NN | slug | engine | dir / file | unit_id (evidence) | port | concept (the ONE thing) | 3D hero | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | rate_limiter | pixel-quest | encounters/tokenBucket.ts + sequenceFlow.ts | U0-sonda-rate-limiter-robustness | — | token-bucket capacity vs refill | (n/a) | ✅ DONE (prior) |
| 02 | key_value_store | voxelDojo | game-02-warehouse | U2-key-value-store | 5202 | hash → shelf; TTL decay | warehouse of hash-addressed shelves | ✅ DONE |

> **Note on game-02:** a richer "KV Warehouse" greenfield design (forklift-driven, collision
> chains, EXPIRE/PERSIST tokens, sweeper drone) exists as an aspirational plan at
> `engines/pixelDojo/docs/plans/02_key_value_store.md`. The shipped game at `game-02-warehouse/`
> teaches the same concept (hash→shelf, CRUD, TTL decay) via a prediction-based interaction model
> with 18 passing tests. The evidence contract aligns: `game: "KV WAREHOUSE"`,
> `scenarioSlug: "kv-warehouse"`, `metrics.kind: "voxeldoj-kv-warehouse"`. The greenfield rebuild
> remains a future enhancement; the current game is the gate-eligible producer.
| 03 | url_shortener | voxelDojo | game-03-wormhole | U3-url-shortener | 5203 | short-code collision; base62 | wormhole gates between planets | ✅ DONE |
| 04 | concurrent_task_queue | pixel-quest | encounters/taskQueue.ts (NEW) | U4-task-queue | — | retry/backpressure/DLQ ordering | (2D encounter) | ✅ DONE |
| 05 | websocket_chat | voxelDojo | game-05-relay-station | U5-websocket-chat | 5205 | persistent conns; fan-out; heartbeat | orbiting relay stations, laser links | ✅ DONE |
| 06 | file_upload_pipeline | voxelDojo | game-06-pipeline-plant | U6-file-upload | 5206 | streaming vs buffering; bounded memory | fluid pipeline + overflow tanks | ✅ DONE |
| 07 | rest_api_auth | voxelDojo | game-07-checkpoint-city | U7-rest-api-auth | 5207 | middleware layers; JWT verify | concentric city walls, badge gates | ✅ DONE |
| 08 | event_driven_order_system | voxelDojo | game-08-timeline-tower | U8-event-driven | 5208 | append-only log; projection; replay | tower of stacked event floors | ✅ DONE |
| 09 | plugin_system | voxelDojo | game-09-docking-bay | U9-plugin-system | 5209 | sandboxing; interface contracts | docking pods, force-field sandbox | ✅ DONE |
| 10 | distributed_cache | voxelDojo | game-10-hash-ring | U9-distributed-cache | 5210 | consistent hashing + rebalancing | orbital hash ring | ✅ DONE (pilot) |
| 11 | load_balancer | voxelDojo | game-11-air-traffic | U11-load-balancer | 5211 | health checks; routing policy | air-traffic to landing pads | ✅ DONE |
| 12 | distributed_job_scheduler | voxelDojo | game-12-mission-control | U12-job-scheduler | 5212 | leader election; DAG deps | stations vote; launch in DAG order | ✅ DONE |
| 13 | api_gateway_circuit_breaker | voxelDojo | game-13-breaker-grid | U13-circuit-breaker | 5213 | circuit breaker open/closed/half-open | 3D power grid, tripping breakers | ✅ DONE |
| 14 | log_aggregator | voxelDojo | game-14-river-delta | U14-log-aggregator | 5214 | pipelines; correlation IDs | converging log tributaries, dye trace | ✅ DONE |
| 15 | metrics_collector | voxelDojo | game-15-observatory | U15-metrics-collector | 5215 | histograms; percentiles; alerting | histogram terrain + alert plane | ✅ DONE |
| 16 | mini_message_queue | voxelDojo | game-16-freight-yard | U16-message-queue | 5216 | partitions; consumer groups; offsets | freight yard of track lanes | ✅ DONE |
| 17 | distributed_config_service | voxelDojo | game-17-lighthouse-network | U17-config-service | 5217 | consensus; watch/notify | lighthouse quorum re-aiming beams | ✅ DONE |
| 18 | search_engine | voxelDojo | game-18-stacks | U18-search-engine | 5218 | inverted index; ranking | 3D library, word-card catalog | ✅ DONE |

**Note on unit_id collisions:** `09 plugin_system` and `10 distributed_cache` both stem from a
project-9/10 area in the substrate. The ids are distinct (`U9-plugin-system` vs
`U9-distributed-cache`); the verifier keys on `unit_id` + `project`.

## Per-game M1–M6 done-rule (voxelDojo) — met by all 15 voxelDojo games

For each `game-<NN>-<slug>` the following is green (verified 2026-07-05):

1. `pnpm run lint` (Biome) — green
2. `pnpm run test` (Vitest) — green, ≥3 concept-proof tests in `src/sim/<core>.test.ts`
3. `pnpm run typecheck` (`tsc --noEmit`) — green
4. `pnpm run build` (`tsc --noEmit && vite build`) — green
5. `pnpm run smoke` (Playwright) — green, ≥1 `EVIDENCE {` console record captured, ≥1 screenshot
   in `.logs/`
6. PLAN slice at `engines/voxelDojo/docs/plans/<NN>_<slug>.md` with all 13 sections, esp. §2
   "why 3D" and §4 concept→mechanic table.

## Stack invariants (copied from game-10-hash-ring)

- `package.json`: scripts `dev|lint|test|typecheck|build|smoke`; deps `three ^0.170.0`; devDeps
  `@biomejs/biome ^2.3.8`, `@playwright/test ^1.49.0`, `@types/three ^0.170.0`, `typescript ^5.7.0`,
  `vite ^6.0.0`, `vitest ^2.1.0`.
- `tsconfig.json`, `biome.jsonc`, `vite.config.ts` — copied verbatim from `game-10-hash-ring/`.
- `playwright.config.ts` — copied verbatim **except** the port is set to the game's port (both
  `baseURL` and `webServer` command's `--port`).
- File layout: `src/sim/<core>.ts` + `<core>.test.ts` (deterministic, no `three` import),
  `src/sim/rng.ts` (`mulberry32` + `keyStream`), `src/sim/levels.ts`, `src/game/controller.ts`,
  `src/scene/<scene>.ts`, `src/scene/hud.ts`, `src/evidence/emit.ts`, `src/content/types.ts`,
  `src/content/reviewSlice.ts`, `src/main.ts`, `index.html`, `playwright/<spec>.spec.ts`.
- Evidence record shape: `source: "voxeldojo"`, `unit_id`, `project: "<NN>_<slug>"`,
  `scenario_id: "<slug>-L<n>"`, `game: "<NAME>"`, `ts`, `pass`, `metrics{}`, `review_context`
  (`scheduled_review`, `review_reason`, `verifier_required: true`), `curriculum_context`
  (`concept`, `mechanic`). Pushed to `window.__voxelDojoEvidence` AND `console.log("EVIDENCE " + json)`.
- Test hook on `window` (e.g. `window.__<camelSlug>`) so the Playwright smoke can drive the
  deterministic public API — the `__hashRing` pattern.

## Known coordination hazard (read before any future multi-agent run)

A parallel session ("Maestro") is building the same all-18 scope into the **stale, wrong** path
`engines/pixelDojo/games/<NN>_<slug>/` (low quality: 0–6 src files, no tests, no smoke). That
directory's contents are NOT canonical — ignore them. The canonical 3D location is
`engines/voxelDojo/game-<NN>-<slug>/`. The parallel session also runs a clean cycle that removes
untracked source every ~3 minutes, so **commit each game the instant its agent returns**.
