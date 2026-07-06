# PLAN — Game 03: "WORMHOLE" (URL Shortener / short-code generation + collision handling)

> One file per game; this is the WORMHOLE plan. Sections 1–13 follow the `PLAN.md` template.
> The pilot is `game-10-hash-ring/`; this game mirrors its structure verbatim and swaps the concept.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/03_url_shortener/`. The ONE concept this game teaches:
**short-code generation + collision handling** — a long URL is mapped to a short code via a strategy
(`hash_trunc` — SHA/base62 truncated; `counter` — monotonic id encoded in base62; `salted` — re-hash
with a salt on collision), looked up by code for a redirect, and collisions are *detected* then
*resolved* (salted re-hash, or increment-until-unique). Out of scope: persistence/backing store
implementation, analytics pipeline, the HTTP 301/302 semantics debate, snowflake/ULID generation
(the curriculum project's comparison job), expiry, custom aliases.

**2. Why 3D**
URL shortening is a wormhole — a short code is a *gate* that instantly transports a traveller (the
request) from one world (the long URL origin planet) to a far-away world (the destination planet).
In 3D the player stamps a code-gate between two planets, watches traveller streaks dive into the
gate on one side and emerge at the destination on the other, and — critically — sees the failure
mode as a **visible misrouting**: when two long URLs collide onto the same code, the second one's
travellers exit at the *wrong* planet and the gate flashes red. That spatial mapping of
"code → destination" whose breakage you can *see* (a traveller materializing on the wrong world) is
the lesson, and it cannot be read off a 2D `code→url` table.

**3. Player goal**
Stamp the correct code-gate for each incoming URL, predict where a code redirects to, and when two
URLs fight for one code, pick the resolution strategy that re-opens a clean wormhole.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Long URL | An origin planet emitting traveller streaks | Player reads the planet as "the URL being shortened" |
| Short code | A labelled ring-portal gate stamped between planets, showing the base62 code | Player reads the code as the gate's identifier |
| `toBase62` / `fromBase62` | The code labelling the gate (and a round-trip the player must predict) | Player can predict the base62 of a known integer |
| `hash_trunc` strategy | Gate code = first N base62 chars of a hash of the URL | Player predicts the truncated code |
| `counter` strategy | Gate code = base62 of a monotonic counter | Player predicts the next sequential code |
| `salted` strategy | On collision, re-hash with a salt for a fresh code | Player picks this to resolve a collision |
| `detectCollision` | Gate flashes amber when a second URL would map to an existing code | Player reads the collision from the flash |
| `resolveCollision` (salted re-hash / increment) | Player picks "re-salt" or "increment" and the gate re-stamps to a unique code | Player knows the fix and applies it |
| `redirect(map, code)` | A traveller dives into the gate and emerges at the destination planet | Player predicts which planet the traveller exits at |

**5. Main loop**
A wave of URLs arrives (each an origin planet lighting up). For each, the player either **predicts
the code** the active strategy will produce (L1 stamp), **predicts the destination** a given code
redirects to (L2 redirect), **predicts whether a new URL collides** with an existing code (L3
collision), or **picks the resolution** when a collision is forced (L4 resolve). Score = prediction
accuracy + correct collision detection + correct resolution choice. Between waves the strategy and
the collision pressure deepen one facet of the concept.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the planet pair (OrbitControls), tilted ~25°. Click a gate / code
button to predict · click a resolution button to fix · type a code to redirect. Four actions plus
camera.

**7. Win / fail states**
*Win a wave:* prediction accuracy ≥ 80% (L1/L2), or correct collision prediction (L3), or correct
resolution choice (L4). *Fail:* prediction accuracy below target (concept not held), wrong collision
call (claims safe when colliding, or colliding when safe), or wrong resolution (the gate still
misroutes after the fix). Every failure is a misread of "code → destination."

**8. Progression / difficulty**

- **L1 — Stamp gate:** all URLs shorten under `hash_trunc`. Predict the base62 code each URL gets
  (active recall on `toBase62` + truncation). (Predict code.)
- **L2 — Redirect:** codes are already stamped. Given a code, predict which destination planet the
  traveller exits at (`redirect(map, code)`). (Predict destination.)
- **L3 — Collision:** two URLs are constructed (deterministic) to hash-truncate to the *same* code.
  Predict that a collision will occur. (Predict collision.)
- **L4 — Resolve:** a collision is forced and shown. Pick the fix — `salted` re-hash or
  `increment` — that yields a unique code and a clean wormhole. (Pick fix.)

**9. Visual direction**
Single hero object: a pair of planets (low-poly icosahedron spheres) linked by a labelled
ring-portal gate (torus + sprite/canvas-text label showing the base62 code). Traveller streaks are
instanced elongated boxes / lines diving into the gate and emerging at the destination. Collision =
the gate and the wrong-planet flash red; clean redirect = travellers emerge at the correct planet in
the strategy colour. ≤8-colour palette; the red collision flash is the load-bearing signal. All
geometry procedural (`IcosahedronGeometry`, `TorusGeometry`, `InstancedMesh` for travellers).

**10. Simulation core (headless)**
`src/sim/shortener.ts` — pure functions with NO `three` import:
`toBase62(n)` / `fromBase62(s)`; `shorten(map, url, strategy)` for
`strategy: "hash_trunc" | "counter" | "salted"`; `detectCollision(map, code)`; `resolveCollision(...)`
(salted re-hash / increment); `redirect(map, code)`. Deterministic SHA-256-trunc style hash
(fnv1a+fmix32, same family as the pilot, truncated to N base62 chars) so collisions are reproducible
under constructed input. A `counter` strategy guarantees no collisions. Vitest covers: base62
round-trip; counter never collides; `hash_trunc` collides under constructed input + `salted`
resolves; determinism.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤8
planets and ~100 instanced traveller streaks; one draw call for travellers (InstancedMesh), no
postprocessing, no physics engine — traversal is parametric animation through the gate.

**12. Learning-gate hooks**

- Targets unit **`U3-url-shortener`** (project `03_url_shortener`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is not yet honestly gated in the
  substrate, so WORMHOLE evidence serves the **real learning gate** for U3 when the scheduler makes
  it the active unit — and serves as scheduled review / deepening afterwards. The emitter derives
  `scheduled_review` / `review_reason` dynamically from the substrate-generated review slice, so
  both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U3-url-shortener","project":"03_url_shortener","scenario_id":"wormhole-L1","game":"WORMHOLE","ts":"<iso>","pass":true,"metrics":{"prediction_accuracy":0.92,"strategy":"hash_trunc"},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"short-code generation + collision handling","mechanic":"wormhole code-gates between planets"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/shortener.ts` + `sim/rng.ts` + Vitest suite proving base62 round-trip, counter never
  collides, hash_trunc collides under constructed input + salted resolves, determinism. (No pixels
  yet.)
- **M2** scene: planet pair + ring-portal gate labelled with a base62 code + instanced traveller
  streaks rendering a static shorten/redirect.
- **M3** interaction: click gate/code to predict; resolution buttons; traversal animation; collision
  red flash.
- **M4** levels L1–L4 (stamp / redirect / collision / resolve) with the strategy + collision
  lifecycle.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 headed, asserts evidence record + WebGL canvas + screenshot.

**Open questions / risks**
Is a truncated fnv1a+fmix32 a faithful stand-in for "SHA-256 truncated" pedagogically? It is — the
*lesson* is "truncated hashes collide, counters don't, salting resolves," not the specific hash —
but the PLAN should say so honestly (it does in §10). Does WebGL run reliably in the Playwright
smoke environment (see `docs/GAP_ANALYSIS.md` §G6)? Resolve during M2–M3 before building L4.
