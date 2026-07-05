# PLAN — voxelDojo game 08: "TIMELINE TOWER" (Event-Driven Order System / Event Sourcing)

> One file per game; each game lives in its own `game-08-timeline-tower/` subfolder. Fill all 13
> sections before scaffolding. A simulation with a vague plan teaches nothing measurable.

**1. Subject & concept**
Curriculum project: `../../curriculum/08_event_driven_order_system/`. The ONE concept this game
teaches: **event-sourcing** — an append-only log of domain events IS the source of truth; a
*projection* (read model) is built by *folding* the log in order; *replay* = re-running the fold
from the beginning (or a checkpoint) to rebuild state; events are **immutable**. The canonical
insight: the log is the truth, projections are derived and rebuildable. Out of scope: optimistic
concurrency / version conflicts, the transactional outbox, saga orchestration, pub/sub delivery,
idempotency keys, cross-language benchmarks, durable storage (all are the curriculum project's job).
The game teaches the *shape* of event sourcing, not the operational machinery.

**2. Why 3D**
An event log is a vertical stack — oldest at the bottom, newest at the top — a **tower of floors**,
each floor one immutable event. A projection is a *building built FROM those floors* by folding
upward. In 3D the player watches events land as new floors rising on the tower, rides an **elevator**
that ascends through the floors during replay (rebuilding the projection as it climbs), and sees a
floating readout above the tower showing the *derived* state — `order_status` and `shipment_list` —
that was computed by folding. The L4 lesson — *two different folds (order view vs shipment view)
come from the SAME stack* — is a vertical/structural relationship a 2D rule list cannot show: in 3D
the player sees one physical tower producing two different readouts depending on how you fold it.
"Log is truth, projections are derived and rebuildable" is intrinsically spatial: the floors are
permanent and immutable, the readout above them is a recomputable shadow.

**3. Player goal**
Stack an order's lifecycle as a tower of events, then ride the elevator replaying the floors to
rebuild the order's status — and learn that one tower can be folded into several different views.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Append-only event log | A tower of stacked BoxGeometry floors; append adds a floor on top | Player predicts the next event to append (the next floor) |
| Events are immutable | Appended floors never move or change; a new floor is a new object | Player learns you edit state by appending, never by mutating |
| Ordered by ts | Floors stack bottom→top in ts order; the spine holds the order | Player reads the vertical position as sequence, not time-of-day |
| Projection = fold | A floating "PROJECTION" readout above the tower updates as floors fold | Player predicts the readout produced by folding the whole stack |
| Replay = re-run the fold | An elevator ascends floor-by-floor, recomputing the readout as it climbs | Player sees replay is deterministic: same tower ⇒ same readout |
| Checkpoint replay | Elevator can start partway up (a checkpoint) and rebuild upward | Player predicts status at the checkpoint vs after full replay |
| One log, many projections | One tower produces BOTH an `order_status` and a `shipment_list` readout | Player predicts both views from the same stack |

**5. Main loop**
A 20–60s cycle: the player is handed an order's lifecycle scenario and must (a) predict the append
order (L1), then (b) predict the projection the folded log produces (L2), then (c) predict the
state at a checkpoint and after a full replay (L3), then (d) predict two different projections from
the same log (L4). Each correct prediction is "playing the concept right" and clears the wave with
emitted evidence. The tower visibly grows as events append; the elevator visibly climbs during
replay; the readout visibly recomputes.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the tower (OrbitControls), target locked near the middle of the
stack so the camera rides up as the tower grows. The only actions are HUD button choices (pick the
next event / pick a status / pick a view) — four actions plus camera, no WASD. Clicking is the
predict-and-commit gesture; the 3D view is the feedback.

**7. Win / fail states**
*Win a wave:* the player's prediction matches the projection the sim computes by folding the log
(L1: ≥80% append-order accuracy; L2: exact final status; L3: both checkpoint and replay status
exact; L4: both views exact). *Fail:* any prediction disagrees with the folded truth. Every failure
is a misread of the event-sourcing model — either treating the projection as primary (not the log),
forgetting the fold is ordered, or assuming two projections share state when they only share the log.

**8. Progression / difficulty**

- **L1 — Stack the events:** 6-step order lifecycle; predict the next event type to append as the
  next floor. Learn "the log is an ordered append-only stack."
- **L2 — Build the projection:** fold the whole stack; predict the order's final status. Learn "a
  projection is built by folding the log in order."
- **L3 — Replay:** rewind to a checkpoint floor, predict the status there, then predict the status
  after a full replay. Learn "replay deterministically rebuilds state from the log."
- **L4 — Two views:** the same log is folded two different ways; predict both the `order_status`
  and `shipment_list` projections. Learn "one log, many derived views — projections are derived,
  not stored."

**9. Visual direction**
Single hero object: the **tower**, centered, in a dark void with subtle fog. Each floor is a
flat-shaded BoxGeometry slab tinted by event type (≤8-color palette: created=blue, paid=green,
failed=pink, shipped=purple, delivered=gold…). The newest floor glows brightest (emissive). A
glowing gold **elevator** (torus) rides the central spine and ascends during replay. A
canvas-texture **sprite** floats above the tower labeled "PROJECTION (derived)" showing the two
readouts in different colors — making "derived, not stored" legible. All geometry procedural
(`BoxGeometry`, `TorusGeometry`, `Sprite`+`CanvasTexture`).

**10. Simulation core (headless)**
`src/sim/sourcing.ts` — pure functions, ZERO three imports:
- `Event = { type, ts, streamId, payload }` (immutable, typed); `Log = readonly Event[]`.
- `append(log, event)` returns a NEW log (immutable); `appendAll` for batches.
- `Projection<S> = { name, init, fold(state, event) }`; `fold(projection, state, event)` pure reducer.
- `replay(log, projection, fromIndex=0, state?)` folds in **ts order** from a checkpoint;
  `project(log, projection)` = full replay from the start.
- `stableSortByTs` (deterministic, ties broken by log position), `isStrictlyOrdered`,
  `checkpointIndex(log, ts)`, `length`.
- Two concrete projections folding the SAME `OrderEvent` log differently: `order_statusProjection`
  (current status of every order) and `shipmentListProjection` (only shipped/delivered orders, with
  tracking fields). Deterministic seeded scenarios via `mulberry32`. Vitest covers: determinism
  (same log ⇒ same projection on every replay), immutability (append never mutates prior log or
  prior projections), two-projections-fold-differently, checkpoint replay, ordering helpers.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤10
event floors (one Mesh per floor — well under the instancing threshold) plus one elevator and one
readout sprite; no postprocessing, no physics — the elevator's ascent is parametric easing toward a
target y. The sim core is WebGL-free so the concept math runs identically in Vitest and the browser.

**12. Learning-gate hooks**

- Targets unit **`U8-event-driven`** (project `08_event_driven_order_system`). As of 2026-07-05 this
  unit is **not yet in the substrate's review slice** (`src/content/reviewSlice.ts` ships an empty
  `nextReviews` static fallback until `python3 -m learner.substrate` is regenerated), so TIMELINE
  TOWER evidence is recorded as **deepening play** (`scheduled_review:false`,
  `review_reason:"deepening"`) and can serve the real learning gate for U8 the moment the scheduler
  makes it the active unit — the emitter derives `scheduled_review`/`review_reason` from the slice,
  so both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U8-event-driven","project":"08_event_driven_order_system","scenario_id":"timeline-tower-L2","game":"TIMELINE TOWER","ts":"<iso>","pass":true,"metrics":{"events_folded":6,"predicted_status_ok":true,"final_status_correct":1},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"append-only log + projection replay","mechanic":"tower of stacked event floors"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state** (evidence-only).

**13. Milestones**

- **M0** this plan.
- **M1** `sim/sourcing.ts` + Vitest suite proving determinism, immutability, two-projection fold,
  checkpoint replay. (No pixels yet.)
- **M2** scene: tower of event floors + elevator + floating projection readout rendering a static log.
- **M3** interaction: HUD-driven append / predict / replay; elevator ascends on replay; readout
  recomputes.
- **M4** levels L1–L4 with their evaluate functions.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 (and L2) headed, asserts evidence records + screenshots to
  `.logs/`.

**Open questions / risks**
Is "predict the projection" enough active recall, or should L2/L3 also ask the player to enumerate
which events contributed to a status transition? Does WebGL run reliably in the Playwright smoke
environment (see `docs/GAP_ANALYSIS.md` §G6)? Both resolved during M1–M3 before building L4.
