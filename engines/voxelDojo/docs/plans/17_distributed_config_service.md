# PLAN — Game 17: "LIGHTHOUSE NETWORK" (Distributed Config Service / Consensus Quorum)

> One game = one concept. The ONE concept here is **consensus quorum + watch/notify**: a config
> value is only "the truth" once a MAJORITY of nodes have acknowledged it; a minority partition
> can never commit (split-brain prevention); watchers subscribed to a key are notified on commit.
> Everything else in the distributed-config project (linearizability proofs, the Paxos/Raft
> protocol internals, snapshotting, membership change protocols) is out of scope — that is the
> curriculum project's job, not this game's.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/17_distributed_config_service/`. Concept: **consensus
quorum + watch/notify** — a config change is *proposed*, then must collect acks from a strict
majority of nodes (`> n/2`) before it is *committed*; until then it is merely proposed and
notifies no one. A network partition leaves the minority side unable to reach quorum, so two
sides of a split can never both commit conflicting values (split-brain prevention). Once
committed, watchers subscribed to that key are notified. Out of scope: leader election internals,
multi-Paxos/Raft protocol details, linearizability formal proofs, log compaction/snapshotting,
dynamic membership reconfiguration. One game = one concept = **quorum is what makes a value
"the truth."**

**2. Why 3D**
A consensus quorum is a *spatial/voting structure*. In 3D the player sees a constellation of
lighthouses around a coast, each with a beam. To commit a new heading, a majority of beams must
re-aim (ack) to the new value; the player watches the beams sweep and align one by one, then sees
the synchronized gold **commit flash** the instant majority is reached. A network partition
visibly splits the ring into two arcs — the minority arc's beams stay split and pink (stale),
unable to reach the threshold; the majority arc's beams align and flash. Watchers appear as small
buoys that light up only on commit. The "have we reached quorum" state is a *count of aligned
beams in space* — exactly the structure consensus operates on. A 2D arcade could show a tally, but
it cannot make the *majority-as-a-spatial-threshold* and the *minority-cannot-win* properties
visceral the way watching disjoint arcs of beams fail to align does. That delta is the lesson, and
it is intrinsically spatial.

**3. Player goal**
Get a new lighthouse heading accepted as "the truth" by getting a MAJORITY of lighthouses to
re-aim to it — and predict, before each event, when the commit will flash, which watchers light
up, and which side of a split can win.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Proposal (not yet the truth) | A new heading is announced; beams begin to sweep but no flash yet | Player knows a proposal ≠ a committed value |
| Ack | Click a lighthouse; its beam re-aims/aligns to the new value (green) | Player drives the vote physically |
| Quorum = `> n/2` | The commit gold-flash fires the instant the majority-th ack lands | Player predicts the exact quorum size before driving it |
| Commit = the truth | All aligned beams flash synchronized gold; holdouts go pink (stale) | Player reads "majority reached" from space, not a number |
| Watch/notify | Small buoys (one per subscribed watcher) light up only on commit | Player predicts which buoys light — only those subscribed to this key |
| Partition (split-brain) | The ring splits into two arcs; the minority arc cannot reach quorum | Player predicts which side can commit (the majority side) |
| Re-merge / catch-up | The split heals; stale minority nodes sync to the committed value | Player identifies & syncs the stale nodes — quorum protected the truth |

**5. Main loop**
A 20–40s wave: (1) a new config value is **proposed**; (2) the player makes a **prediction**
(quorum size / which watchers / which partition side); (3) the player drives acks by clicking
lighthouses, watching beams sweep and align; (4) the commit flash fires at quorum, watchers light
up; (5) the player locks in their prediction and is judged. Score = prediction correctness +
whether the concept's rule (majority threshold, minority-can't-commit, watchers-fire-only-on-commit)
held in the player's model.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the lighthouse ring (OrbitControls), target fixed on the ring
centre. Click a lighthouse to **ack** it (L1/L2) or **sync** it (L4); click HUD buttons for quorum
prediction (L1), watcher selection (L2), and partition-side choice (L3). Four actions plus camera.

**7. Win / fail states**
*Win a wave:* the player's prediction matches the consensus truth — correct quorum size AND quorum
actually reached (L1); correct watcher set AND committed (L2); correct majority side AND exactly
one side can commit (L3); correct stale-node sync (L4). *Fail:* prediction wrong (concept not held
in the player's model), or quorum not reached / wrong side named. Every failure is a misread of
the quorum model — never an arbitrary punishment.

**8. Progression / difficulty**

- **L1 — Reach quorum:** 5 lighthouses. Predict how many acks commit takes, then drive the acks
  and watch the flash fire at exactly quorum (3 of 5). Lesson: majority, not unanimity.
- **L2 — Watchers:** add subscribed watchers (buoys). Predict which light up on commit — only
  those subscribed to the changed key, and only after commit (not on proposal).
- **L3 — Partition:** a network split. The ring breaks into two arcs; the player predicts which
  side can commit (the majority). The minority side stays pink and split — split-brain prevented.
- **L4 — Re-merge:** the partition heals; the formerly-disconnected (stale) node must catch up to
  the committed value. Quorum is what let the truth survive the split.

**9. Visual direction**
Single hero object: the **ring of lighthouses** on a dark water disc with subtle fog. Each
lighthouse is a tapered cylinder (CylinderGeometry, radiusTop < radiusBottom) with a lamp cap and
a sweeping cone beam (ConeGeometry, transparent, pivoting). Aligned/acked beams share a colour
(green → gold on commit); unacked holdouts and minority-partition nodes glow pink (stale).
Watchers are small icosahedron buoys just outside the ring that light up on notify. ≤8-colour flat
palette; all geometry procedural. The commit is a synchronized cap-emissive flash that decays.

**10. Simulation core (headless)**
`src/sim/consensus.ts` — pure functions, ZERO three imports:
`propose(nodes, key, value) → Ballot`; `ack(ballot, nodeId)`; `isCommitted(ballot, n) = acks > n/2`;
`quorumOf(n) = floor(n/2)+1`; `commit(ballot) → Commit`; `partition(nodes, sideIds) → Partition`;
`tryCommitInPartition(group, totalN) = group.length > totalN/2` (minority can't commit);
`notifyWatchers(commit, watchers) → nodeId[]` (fires only on commit); `isStale`/`syncNode` for
re-merge. Deterministic seeded RNG (mulberry32 + Fisher–Yates shuffle) fixes which nodes ack first
→ replayable beam-sweep animation. Vitest covers: majority commits; minority partition cannot
commit (split-brain prevented); watchers fire only on commit; deterministic ordering; stale catch-up.
No Three.js imports here.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤8
lighthouses + ≤8 watcher buoys (well under 30 animated meshes); no instancing needed at this
count; no postprocessing, no physics engine — beam sweep is parametric rotation, commit flash is
emissive-intensity decay in the render loop.

**12. Learning-gate hooks**

- Targets unit **`U17-config-service`** (project `17_distributed_config_service`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet in the substrate**
  (only U0 is honestly gated), so LIGHTHOUSE NETWORK evidence serves **deepening** play now and
  becomes the real learning gate for U17 when the scheduler makes it the active unit. The emitter
  derives `scheduled_review` / `review_reason` dynamically from the substrate-generated review
  slice, so both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U17-config-service","project":"17_distributed_config_service","scenario_id":"lighthouse-network-L1","game":"LIGHTHOUSE NETWORK","ts":"<iso>","pass":true,"metrics":{"cluster_size":5,"quorum_required":3,"quorum_predicted_ok":true,"acks_given":3,"committed":true},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"consensus quorum + watch/notify","mechanic":"lighthouse quorum re-aiming beams"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and owns any
  state transition. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/consensus.ts` + Vitest suite proving majority commits, minority-can't-commit
  (split-brain prevented), watchers-fire-only-on-commit, deterministic ack ordering. (No pixels yet.)
- **M2** scene: ring of tapered-cylinder lighthouses with sweeping cone beams + water disc, rendering
  a static ack/commit state.
- **M3** interaction: click lighthouse to ack; beam re-aims; commit flash at quorum; watcher buoys.
- **M4** levels L1–L4 (quorum / watchers / partition / re-merge) with `evaluate*` judges.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records with the U17 schema.
- **M6** verify: Playwright plays L1 + L3 headed, asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is "predict the quorum size" enough active recall for L1, or should it also ask the player to name
which specific nodes will form the majority? Does WebGL run reliably in the Playwright smoke
environment (see `docs/GAP_ANALYSIS.md` §G6)? Both resolved during M1–M3: the quorum-size
prediction plus driving the acks proved sufficient, and WebGL boots cleanly in the smoke run.
