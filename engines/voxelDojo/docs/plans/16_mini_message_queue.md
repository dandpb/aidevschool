# PLAN — Game 16: "FREIGHT YARD" (Mini Message Queue / partitioned log)

> One game = one concept. This slice fills all 13 sections of the `engines/voxelDojo/PLAN.md`
> template for the message-queue concept. Scaffolded from `game-10-hash-ring/` (the pilot).

---

**1. Subject & concept**
Curriculum project: `16_mini_message_queue`. The ONE concept this game teaches: **a partitioned
append-only log with consumer-group offset cursors** — a message belongs to exactly one partition
(`hash(key) % N`); within a partition order is preserved; a consumer group owns a subset of
partitions; offsets are per-partition-per-group cursors that survive rebalance; replay = rewind an
offset and re-read. Out of scope: exactly-once semantics, producer acks/idempotence, retention/TTL
compaction, broker replication/ISR, the language-specific client comparison (the curriculum
project's job). One game = one concept: partitioning + ownership + cursors + replay.

**2. Why 3D**
A partitioned log is a set of *parallel lanes*. An offset cursor is a *physical marker on a lane*.
A consumer group is a *crew standing at its marker*. In 3D the player sees parallel track lanes
(partitions) receding across the yard, freight cars (messages) queued along each lane in order,
distinct colored consumer crews camped at their owned lanes, and glowing offset posts marking
each cursor. The three pieces of state that matter — *which crew owns which lane*, *where each
lane's cursor sits*, and *how the cars are ordered within a lane* — are simultaneously visible as a
single spatial layout. On rebalance the crews physically redistribute across lanes while their
posts (the cursors) stay put — that visible split ("people move, markers don't") is the lesson, and
it is intrinsically spatial.

A 2D arcade cannot show N parallel lanes *plus* M independent cursors *plus* per-lane ordering at
once without collapsing into a table; the moment you have multiple consumer groups the 2D layout
becomes a scrolling list, not a map. The freight yard *is* the map.

**3. Player goal**
Route freight cars onto the right track lanes, hand each lane to a crew, and keep deliveries
flowing when crews join or leave — by knowing which lane a car lands on, who owns it, and where
each crew's marker sits.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Partition: `hash(key) % N` | Parallel track lanes across the yard; an incoming freight car rolls onto one | Player predicts which lane a key lands on before it docks |
| Within-partition order | Cars queue head-to-tail along a lane; offsets are 0,1,2,… from the head | Player reads position as offset, not arrival time |
| Consumer group owns a subset of lanes | Distinct colored crews (icosahedra) stand at the heads of their lanes | Player hands every lane to exactly one crew, no orphan/double-up |
| Offset cursor (per-partition-per-group) | A glowing post on each lane at the consumed position | Player reads where the group has read up to |
| Rebalance (join/leave) | A crew walks to a new lane; **its post stays** (cursor keyed by lane, not crew) | Player predicts the new owners AND notices offsets survived |
| Replay (rewind) | Drag the post back along a lane; the cars behind it light up and roll by again | Player picks the rewind point and predicts exactly which cars replay |

**5. Main loop**
A wave streams freight cars onto the lanes. Between waves the membership changes (a crew joins or
leaves) or a replay is requested. Before each event the player **predicts** the outcome (which lane
a key lands on / who owns each lane after rebalance / which cars a rewind re-delivers); the
simulation then animates the truth. Score = routing accuracy + assignment completeness + rebalance
prediction accuracy + replay-exactness, all with offsets preserved as a hard invariant.

**6. Camera & controls**
Mouse-orbit + scroll zoom over the yard (OrbitControls), tilted slightly down so all lanes read in
parallel. Click a lane to predict a route (L1) · click a crew then a lane to assign ownership (L2)
· click a lane to predict its new owner, then resolve (L3) · drag the rewind dial and click cars to
mark the replay set, then resolve (L4). Four actions plus camera.

**7. Win / fail states**
*Win a wave:* routing ≥80% (L1), assignment complete + fair (every lane one owner, every crew ≥1
lane) (L2), rebalance prediction ≥80% AND offsets preserved (L3), replay set exactly matching
ground truth (L4). *Fail:* wrong lane prediction, orphaned/doubled lane, wrong new-owner majority,
offsets not preserved (a rebalance bug — never happens in a correct sim, so it flags a misuse), or a
wrong replay set. Every failure is a misread of partitioning/ownership/cursor semantics.

**8. Progression / difficulty**

- **L1 — Route the freight:** 4 lanes, 1 crew, slow single cars. Learn `hash(key) % N` by
  predicting the lane each incoming car lands on.
- **L2 — Consumer crews:** 6 lanes, 3 crews. Assign every lane to exactly one crew; discover the
  round-robin / range strategies. Auto-assign is available as a "show a valid layout" aid.
- **L3 — Rebalance:** a crew joins (or leaves). Predict the new owner of each lane; the simulation
  proves committed offsets survived (the post didn't move when the crew did).
- **L4 — Replay:** rewind the busiest lane's offset cursor and predict exactly which cars
  re-deliver, in order.

**9. Visual direction**
Single hero object: the freight yard — parallel track lanes (two `BoxGeometry` rails per lane plus
sleeper ties), freight cars as one `InstancedMesh` of boxes tinted by partition (so a lane reads as
one color band), consumer crews as colored icosahedra at lane heads, offset cursors as glowing
yellow cylinder posts. ≤8-color flat palette (`PALETTE`), dark void ground with subtle fog. All
geometry procedural; no GLTF. Load/intensity shown via crew emissive intensity.

**10. Simulation core (headless)**
`src/sim/queue.ts` — pure functions, ZERO `three` imports: `partitionOf(key, n)` (= stable
`fmix32(fnv1a(key)) % n`), `appendLog(log, key, payload)` (immutable, offsets = within-partition
rank), `assignPartitions(partitionCount, consumers, "round-robin"|"range")` (deterministic 1-to-1
from the partition side), `createGroup`, `advanceOffset`/`rewindOffset`, `rebalance(group,
newConsumers)` (reassigns partitions, **carries `offsets` verbatim**), `replay(log, fromOffset)`.
Deterministic seeded RNG (`mulberry32`) for key streams. Vitest proves: same key ⇒ same partition +
within-partition order; rebalance keeps committed offsets and reassigns 1-to-1 (no orphan, no
double-assign); replay from an old offset re-delivers in order. No Three.js imports here.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤200
instanced freight cars across ≤8 lanes and ≤6 crews; one draw call for cars (InstancedMesh), no
postprocessing, no physics — docking/rewind is parametric repositioning on `sync`.

**12. Learning-gate hooks**

- Targets unit **`U16-message-queue`** (project `16_mini_message_queue`). As of 2026-07-05 that
  unit is **not yet seeded** in `learner/learning_state.yaml` (only U0 is honestly gated), so
  FREIGHT YARD's `src/content/reviewSlice.ts` ships a static fallback with `nextReviews: []`:
  every attempt is therefore classified as **deepening** play (`scheduled_review: false`,
  `review_reason: "deepening"`) until the substrate is extended. The emitter derives
  `scheduled_review` / `review_reason` dynamically from the slice, so a regenerated slice flips the
  same record to scheduled-review mode without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U16-message-queue","project":"16_mini_message_queue","scenario_id":"freight-yard-L1","game":"FREIGHT YARD","ts":"<iso>","pass":true,"metrics":{...},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"partitioned log + consumer-group offsets","mechanic":"freight yard of track lanes"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/queue.ts` + Vitest suite proving partitioning/order, rebalance-offset-preservation,
  and replay-order (≥3 concept-proof tests; shipped 12).
- **M2** scene: parallel track lanes + instanced freight cars + crews + glowing offset posts
  rendering a static log/group.
- **M3** interaction: click-to-route (L1), click-to-assign (L2), predict-then-resolve rebalance
  (L3), rewind-dial + mark-replay + resolve (L4).
- **M4** levels L1–L4 with `evaluate*` returning `{pass, metrics}`.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1–L2 headed, asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is "predict the new owner of every lane" too much active recall for L3, or should it suffice to
predict only the lanes that change hands? (Shipped: score all predicted lanes against ground truth,
≥80% to pass, must predict all lanes — keeps it honest without being punitive.) Does the rewind dial
need an explicit "lane selector" when L4 focuses one lane? (Shipped: L4 auto-focuses the busiest
lane; the dial rewinds that lane only — keeps the cognitive load on the replay concept, not lane
picking.)
