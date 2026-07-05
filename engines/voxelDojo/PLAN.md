# PLAN.md — voxelDojo game definition

> Fill this **before** scaffolding. A simulation with a vague plan teaches nothing measurable.
> One file per game; each game lives in its own `game-<NN>-<slug>/` subfolder. Sections 1–13 are the
> template; the WORKED EXAMPLE fills all of them for the Distributed Cache pilot.

---

## TEMPLATE (copy this block for a new game)

**1. Subject & concept**
Curriculum project: `../../curriculum/<NN_subject>/`. The ONE concept this game teaches: `<concept>`.
(Out of scope: everything else in that project. One game = one concept.)

**2. Why 3D** — what does the 3D simulation teach that a 2D arcade (pixelDojo) cannot? If you can't
answer this, build it in pixelDojo instead.

**3. Player goal** — one sentence a 10-year-old understands.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| `<e.g. consistent hash ring>` | `<e.g. orbital ring of stations>` | `<player predicts which keys move>` |

**5. Main loop** — the 20–60s cycle the player repeats.

**6. Camera & controls** — orbit/first-person/fixed? Keep it ≤4 actions plus camera. Mouse-orbit +
click-to-act is the default; no WASD mazes unless space itself is the lesson.

**7. Win / fail states** — both must be direct consequences of using the concept correctly/incorrectly.

**8. Progression / difficulty** — levels that each deepen ONE facet of the concept.

**9. Visual direction** — procedural low-poly, flat palette (≤8 colors), fog for depth. Name the one
"hero" object the concept lives in (the ring, the grid, the delta).

**10. Simulation core (headless)** — the deterministic TypeScript module(s) implementing the concept,
with injected clock/RNG. Must be unit-testable in Vitest with no WebGL. The scene only renders state.

**11. Stack & performance budget** — Vite + TS + plain `three`. Target 60fps with `<N>` animated
entities; instanced meshes above ~100 entities; no postprocessing in MVP.

**12. Learning-gate hooks**

- Targets unit `<unit_id>` (project `<NN_slug>`) in `../../learner/learning_state.yaml` — read the
  real id from the file, never invent one.
- On level clear, emit one evidence record (schema: `docs/ARCHITECTURE.md` §Evidence) via
  `window.__voxelDojoEvidence` + `EVIDENCE <json>` console line: `{source:"voxeldojo", unit_id,
  project, scenario_id, ts, pass, metrics{...}, review_context{...}}`.
- A **separate verifier** (Prometor) checks it against `empirical_gate` / review scheduling and owns
  any state transition. The game never does this.

**13. Milestones** — M0 plan → M1 headless sim core + tests → M2 scene renders sim state → M3 interaction
loop → M4 levels → M5 evidence emit → M6 verify (Playwright playthrough + screenshots to `.logs/`).

---

## WORKED EXAMPLE — Game 10: "HASH RING" (Distributed Cache / Consistent Hashing)

**1. Subject & concept**
Curriculum project: `../../curriculum/10_distributed_cache/`. Concept: **consistent hashing** — keys
and nodes hash onto the same ring; a key belongs to the next node clockwise; adding/removing a node
re-homes only the neighboring arc of keys (~K/N, not K). Out of scope: eviction policies, gossip,
stampede prevention, the Go/Rust/Node comparison (the curriculum project's job).

**2. Why 3D**
The ring *is* a shape. In 3D the player orbits a physical ring, watches key-satellites slide to their
new home station when topology changes, and can visually compare "naive modulo rehash" (everything
moves — a storm) vs "consistent hashing" (one arc moves — a ripple). The delta between those two
animations is the lesson, and it is intrinsically spatial.

**3. Player goal**
Keep a ring of cache stations serving lookups fast while stations join and leave — by placing them so
that as few keys as possible have to move.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Hash ring (0..2³²) | A glowing orbital ring; angle = hash value | Player reads position as hash, not geography |
| Key → next node clockwise | Key-satellites drift clockwise and dock at the first station | Player predicts a key's owner before it docks |
| Node join | Player places a new station on the ring | Player picks the arc that off-loads the hottest station |
| Node leave / crash | A station explodes; its arc of keys undocks | Player predicts *which* keys move (only that arc) |
| Virtual nodes | One station projects `v` ghost-anchors around the ring | Player uses vnodes to fix load skew |
| Naive rehash contrast | "Modulo mode" lever: same event, ALL keys undock | Player articulates why consistent hashing wins |

**5. Main loop**
A lookup storm streams key-satellites toward the ring (~30s waves). Between waves the topology
changes (join/leave events, scripted or player-initiated). Before each change, the player must
**predict** the affected arc by selecting it; the simulation then animates the truth. Score = predicted
arc accuracy + load balance (max/min station load) + cache hit latency (misses spike when keys move).

**6. Camera & controls**
Mouse-orbit + scroll zoom around the ring (OrbitControls). Click a ring position to place a station ·
click a station to remove it · drag the vnode slider · **P** toggles predict-mode arc selection.
Four actions plus camera.

**7. Win / fail states**
*Win a wave:* moved-key ratio ≤ theoretical K/N + tolerance, load skew below threshold, and arc
prediction ≥ target accuracy. *Fail:* prediction wrong twice in a row (concept not held), or load
skew starves a station (misplaced nodes), or the player used modulo mode and the miss-storm overwhelmed
origin. Every failure is a misread of the hashing model.

**8. Progression / difficulty**

- **L1 — First Ring:** 3 stations, slow keys. Learn "next clockwise" ownership by predicting docks.
- **L2 — Join & Leave:** topology events; predict the moving arc before it moves.
- **L3 — Skewed World:** hot keyspace region; fix load skew with placement, discover you can't — then
  unlock **virtual nodes** and fix it properly.
- **L4 — Modulo Storm:** same events replayed in naive-modulo mode; survive (you mostly can't), then
  articulate the contrast — the game asks the player to state expected moved-fraction for both modes.

**9. Visual direction**
Single hero object: the ring, tilted ~30°, in a dark void with subtle fog. Flat-shaded low-poly
stations (icosahedra), key-satellites as small cubes color-coded by owner, arcs highlighted as glowing
ring segments. ≤8-color palette; load shown as station glow intensity. All geometry procedural
(`RingGeometry`, `IcosahedronGeometry`, `InstancedMesh` for keys).

**10. Simulation core (headless)**
`src/sim/ring.ts` — pure functions: `hash(key)`, `ownerOf(hash, stations)`, `movedKeys(before, after)`,
`loadSkew(assignments)`, plus `vnodes(station, v)` expansion and a `moduloAssign(keys, n)` contrast
model. Deterministic seeded RNG for key streams; injected clock for waves. Vitest covers: K/N moved
bound on join/leave, vnode skew reduction, modulo moves ≈ (1 − 1/N) of keys. No Three.js imports here.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with 500
instanced key-satellites and ≤12 stations; one draw call for keys (InstancedMesh), no postprocessing,
no physics engine — docking is parametric animation along the ring.

**12. Learning-gate hooks**

- Targets unit **`U9-distributed-cache`** (project `10_distributed_cache`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet mastered** (the
  2026-07-01 seeded masteries were reverted; only U0 is honestly gated), so HASH RING evidence can
  serve the **real learning gate** for U9 when the scheduler makes it the active unit — and serves
  as scheduled review / deepening afterwards. The emitter derives `scheduled_review` /
  `review_reason` dynamically from the substrate-generated review slice, so both modes work
  without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U9-distributed-cache","project":"10_distributed_cache","scenario_id":"hash-ring-L2","game":"HASH RING","ts":"<iso>","pass":true,"metrics":{"moved_ratio":0.24,"theoretical_kn":0.25,"load_skew":1.3,"arc_prediction_accuracy":0.9,"modulo_contrast_stated":false},"review_context":{"unit_kind":"concept","scheduled_review":true,"review_reason":"due","verifier_required":true}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/ring.ts` + Vitest suite proving K/N bound, vnode skew fix, modulo contrast. (No pixels yet.)
- **M2** scene: ring + stations + instanced keys rendering a static assignment.
- **M3** interaction: place/remove stations, docking animation, predict-mode arc selection.
- **M4** levels L1–L4 with the modulo lever.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1–L2 headed, asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is "predict the arc" enough active recall, or should L2 also ask the player to type the expected
moved-fraction? Does WebGL run reliably in the Playwright smoke environment (see
`docs/GAP_ANALYSIS.md` §G6)? Resolve both during M1–M3 before building L3–L4.
