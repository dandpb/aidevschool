# PLAN slice — Game 12: "MISSION CONTROL" (Distributed Job Scheduler)

> One game = one concept. This slice fills all 13 template sections of `engines/voxelDojo/PLAN.md`
> for the leader-election + DAG-scheduling game. Scaffolds `game-12-mission-control/`.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/12_distributed_job_scheduler/`. The ONE concept this game
teaches: **leader election + DAG-ordered job scheduling** — a cluster of stations votes a leader
per term (simplified Raft: randomized election timeouts, majority wins, ties re-roll into a new
term), and jobs carry DAG dependencies so they must launch in topological order; killing the
leader mid-run triggers a new term that elects a successor, which then resumes the DAG where it
left off. Out of scope: log replication, multi-paxos, network partitions/byzantine faults,
exactly-once semantics, the Go/etcd implementation (the curriculum project's job).

**2. Why 3D**
A leader-election *term* and a job *DAG* are both spatial structures. In 3D the player orbits a
constellation of stations where one is the brightly-lit leader hub, watches vote pulses propagate
between stations during a term, sees the leader-halo transfer to a survivor on a kill, and launches
jobs by clicking DAG nodes whose upstream dependencies are already complete. The "who is leader
right now" + "which jobs are unblocked" state is intrinsically a graph in space: the leader is a
hub with a halo, the DAG is a constellation of nodes joined by directed dependency arrows, and a
topology change (a kill) visibly rewires *which* node wears the halo while the DAG edges stay put.
A 2D rule cannot show the topology change (leader-halo transfer + resume of an in-flight DAG) the
way a 3D constellation can — the player reads the graph as geometry, not as a table.

**3. Player goal**
Keep the mission running: elect a leader, launch jobs in the right dependency order, and recover
when the leader dies — by predicting who wins each election and which jobs are safe to launch.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Election term | A numbered term badge; stations flicker then one wins | Player reads "leader = majority winner of this term" |
| Randomized election timeout | Each station has a hidden countdown; lowest fires first | Player predicts the winner from the seeded timeouts |
| Majority required | A station must win >half the votes; ties re-roll a new term | Player distinguishes a win from a split vote |
| Leader (the hub) | The winning station gets an emissive halo + larger scale | Player tracks "who is leader now" across topology changes |
| Kill the leader | Click the leader; halo vanishes, a new term elects a successor | Player predicts the successor among survivors |
| Strictly greater term | Each new election increments `term` monotonically | Player sees terms only ever go up |
| Job DAG | Jobs as nodes; directed arrows = "depends on" | Player reads the dependency graph as geometry |
| Topological launch order | Click jobs; only deps-complete jobs accept the launch | Player launches in topo order, never a blocked job |
| `readyJobs` (deps satisfied) | Ready jobs pulse; blocked jobs stay dim | Player predicts which jobs are unblocked |
| Completed jobs | Completed jobs glow green and unblock their dependents | Player sees completion propagate downstream |
| Resume after recovery | Mid-run kill: new leader resumes the DAG from completed set | Player keeps launching — completion survives the handoff |

**5. Main loop**
A wave opens with a term: stations run their randomized election-timeout countdowns, vote pulses
race between them, and one station wins the majority and lights up as leader (~20–40s). The player
must **predict the winner** before the term resolves (L1/L2). Then a job DAG appears: the player
launches jobs in dependency order by clicking ready (pulsing) nodes; completed jobs glow green and
unblock dependents (L3). In L4 the leader is killed mid-run — the halo transfers to a new-term
successor and the player resumes launching the remaining jobs from the already-completed set. Score
= leader-prediction accuracy + fraction of jobs launched in valid topo order + DAG progress
resumed after recovery.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the constellation (OrbitControls). Click a station to
predict/vote for it as leader · click the leader to kill it (L2/L4) · click a DAG node to launch
it · **P** not needed. Three actions plus camera.

**7. Win / fail states**
*Win a wave:* predict the correct leader (or correct successor after a kill) AND launch every job
in a dependency-valid order (no blocked job launched) with the DAG fully completed. *Fail:* predict
the wrong leader, or try to launch a job whose deps are not all complete (concept not held), or
leave the DAG incomplete. Every failure is a misread of either the election model or the dependency
graph.

**8. Progression / difficulty**

- **L1 — First election:** 3 stations, one term. Learn "lowest randomized timeout wins the
  majority" by predicting the leader before the term resolves.
- **L2 — Kill the leader:** predict the leader, then kill it; predict the successor among
  survivors under a strictly greater term.
- **L3 — DAG ordering:** a job DAG (≈5 jobs, 2 layers). Launch every job in topological order;
  launching a blocked job fails the wave.
- **L4 — Recover mid-run:** launch some jobs, the leader is killed mid-run, a new-term successor
  resumes — finish the DAG. The completed set survives the handoff.

**9. Visual direction**
Two hero objects in one void: (a) the **station constellation** — flat-shaded icosahedra arranged on
a sphere, the leader wearing an emissive halo + larger scale, vote pulses as short streaks between
stations during a term; (b) the **job DAG** — octahedron nodes laid out by topological layer (roots
at the bottom, leaves at the top), with `ArrowHelper` lines from each dependency to its dependent,
completed jobs glowing green, ready jobs pulsing amber, blocked jobs dim grey. Dark void, subtle
fog, ≤8-color palette. All geometry procedural (`IcosahedronGeometry`, `OctahedronGeometry`,
`ArrowHelper`).

**10. Simulation core (headless)**
Two pure-TypeScript modules, ZERO `three` imports, unit-testable in node:

- `src/sim/election.ts` — seeded election-timeout RNG per station; `electTerm(stations, seed)`
  returns `{leaderId, term, votes}` (majority required; ties → new term with a new RNG draw);
  `killLeader(state, killedId)` re-runs the election among survivors with `term + 1`. Terms are
  strictly monotonic.
- `src/sim/dag.ts` — jobs as `{id, deps: string[]}`; `topoOrder(jobs)` returns a valid launch
  order or throws on a cycle (Kahn's algorithm); `readyJobs(completed, jobs)` returns jobs whose
  deps are all in `completed`; `hasCycle(jobs)` for explicit cycle detection.

Shared `src/sim/rng.ts` (mulberry32 copied from the pilot) gives deterministic, replayable
attempts. Injected seed ⇒ same timeouts ⇒ same winner ⇒ same DAG resume point.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤8
stations and ≤12 DAG nodes; plain meshes (no InstancedMesh needed at this count), no
postprocessing, no physics engine — vote pulses and halo transfer are parametric emissive changes.

**12. Learning-gate hooks**

- Targets unit **`U12-job-scheduler`** (project `12_distributed_job_scheduler`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet seeded** in the
  substrate (only U0 exists), so MISSION CONTROL evidence serves **deepening** play now
  (`scheduled_review: false`, `review_reason: "deepening"`) and will serve the real learning gate
  for U12 when the scheduler makes it the active unit. The emitter derives
  `scheduled_review` / `review_reason` from the substrate-generated review slice, so both modes
  work without code changes.
- On wave clear/fail, emit one evidence record:
  `{"source":"voxeldojo","unit_id":"U12-job-scheduler","project":"12_distributed_job_scheduler","scenario_id":"mission-control-L<n>","game":"MISSION CONTROL","ts":"<iso>","pass":true,"metrics":{"leader_prediction_ok":true,"term":3,"jobs_completed":5,"jobs_total":5,"topo_valid":true},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"leader election + DAG scheduling","mechanic":"station constellation + job DAG"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and owns any
  state transition. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/election.ts` + `sim/dag.ts` + Vitest suite proving majority-wins, strictly-greater
  term on re-election, deterministic seed; topo order respects deps, cycle detection throws,
  `readyJobs` excludes blocked. (No pixels yet.)
- **M2** scene: station constellation (leader halo) + job DAG (arrow deps, green/pulse/dim) rendering
  a static sim snapshot.
- **M3** interaction: click station to predict leader / click leader to kill / click DAG node to
  launch; vote-pulse + halo-transfer animation.
- **M4** levels L1–L4 with deterministic `evaluate*`.
- **M5** evidence emit wired to wave clears/fails; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 (and L2) headed via the `window.__missionControl` hook,
  asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is "predict the leader" enough active recall for the election half, or should L2 also ask the player
to type the expected next term number? Does WebGL run reliably in the Playwright smoke environment
(see `docs/GAP_ANALYSIS.md` §G6)? Resolve both during M1–M3 before building L3–L4.
