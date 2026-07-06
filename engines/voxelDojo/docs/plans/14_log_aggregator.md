# PLAN slice — Game 14: "RIVER DELTA" (Log Aggregator)

> One game = one concept. This slice fills all 13 template sections of `engines/voxelDojo/PLAN.md`
> for the log-pipeline + correlation-ID game. Scaffolds `game-14-river-delta/`.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/14_log_aggregator/`. The ONE concept this game teaches:
**log pipelines + correlation IDs** — many log streams (tributaries, i.e. sources) converge through
processing pipeline stages (transform / filter / enrich) into a sink (the lake), and a correlation
ID injected upstream stamps every log that belongs to one request, so the same id lets you follow
ONE request's path across every tributary and stage. Out of scope: backpressure, retention,
compression, hot/cold storage, alerting rules, OpenTelemetry span trees, the Go/Rust/Node
implementation comparison (the curriculum project's job).

**2. Why 3D**
A log pipeline *is* a river delta: tributaries (sources) converge through filter/enrich rapids
(pipeline stages) into a lake (sink), and a correlation ID is a dye injected upstream that colors
one request's path so you can follow it across every confluence. In 3D the player orbits a real
delta, watches undyed (blue) log-craft drift down every tributary, injects dye at one source, and
follows that single colored streak as it threads through the rapids into the lake —
distinguishable at every confluence from the un-dyed flow. The "many streams → one trace"
structure is spatial: a 2D rule can show convergence OR per-request following, but not both at
once. The delta shows convergence as geometry and the dye trace as a colored streak through it.

**3. Player goal**
Get one dyed request safely down the delta: predict which tributary a log entered from, whether a
stage will pass or drop it, the path a correlation ID takes, and reconstruct the full trace.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Log source (tributary) | A blue tube feeding the delta from a distinct headwater | Player reads "source" as a named inflow, not as a row in a table |
| Pipeline stage (rapid) | A torus-knot "rapid" the stream threads through | Player reads "stage" as an ordered transform/filter point in space |
| Transform stage | A rapid that relabels/rescales the log-craft but passes it | Player predicts the log still flows through |
| Filter stage | A rapid that drops the log-craft if a predicate fails | Player predicts pass vs drop from the predicate |
| Enrich stage | A rapid that adds a field to the log-craft as it passes | Player predicts the enriched shape still flows through |
| Sink (the lake) | A glowing lake plane all survivors pour into | Player reads "sink" as the convergence point |
| Convergence | Tributaries visibly merge into shared downstream channels | Player predicts which tributary a given log entered from |
| Correlation ID (dye) | Inject dye at a source; every log with that id colors | Player predicts the dyed path before it animates |
| Trace (collectTrace) | The sub-sequence of dyed logs across all sources/stages | Player reconstructs the full trace across the delta |

**5. Main loop**
A wave opens with several tributaries flowing log-craft toward the lake through 2–4 rapids
(~20–40s). The player must **predict** an outcome at each prompt before the simulation animates the
truth: L1 predict which tributary a given log entered from (convergence); L2 predict whether a log
passes a filter rapid; L3 inject dye at a source and predict the dyed path; L4 collect the full
trace across all sources/stages. Score = prediction accuracy + trace-completeness. Every wave
emits one evidence record on clear/fail.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the delta (OrbitControls). Click a tributary headwater to predict
source / inject dye · click a rapid to predict pass-vs-drop · click a log-craft to add it to the
trace. Three actions plus camera.

**7. Win / fail states**
*Win a wave:* every prediction correct (source / pass-drop / dyed path / trace) for that level's
prompt set. *Fail:* any prediction wrong (concept not held), or the trace the player collected is
not exactly the correlated sub-sequence. Every failure is a misread of either the pipeline model
(stage order + filter semantics) or the correlation-ID model (dye = same id = same trace).

**8. Progression / difficulty**

- **L1 — Convergence:** 3 tributaries, no stages. Learn "a log enters from exactly one source"
  by predicting which tributary a given log came from.
- **L2 — Pipeline stage:** one filter rapid on the shared channel. Predict whether a given log
  passes (predicate holds) or is dropped.
- **L3 — Inject dye:** inject a correlation ID at one source and predict the dyed path — which
  tributaries and stages the dyed logs flow through.
- **L4 — Trace:** collect the full trace for a correlation ID across all sources and stages
  (exactly the sub-sequence sharing that id).

**9. Visual direction**
One hero object: the delta. Blue tube tributaries arc from headwaters at the rim down to a central
glowing lake plane; torus-knot rapids sit on the shared channels between confluences and the lake.
Un-dyed log-craft are small blue cubes drifting down every tributary; the dyed streak is a single
warm color (amber) so it reads against the blue flow. Dark void, subtle fog, ≤8-color palette. All
geometry procedural (`TubeGeometry`, `TorusKnotGeometry`, `PlaneGeometry`, `InstancedMesh` for
log-craft).

**10. Simulation core (headless)**
Pure-TypeScript module, ZERO `three` imports, unit-testable in node:

- `src/sim/pipeline.ts` — `Pipeline = {stages: Stage[]}` where
  `Stage = {name, fn(log) → log | null}` (transform returns a new log; filter returns `null` to
  drop; enrich returns a log with added fields). `runPipeline(p, log)` walks stages in order,
  short-circuiting on the first `null`. `injectCorrelation(log, id)` stamps `log.correlationId`.
  `collectTrace(logs, correlationId)` returns the sub-sequence of logs sharing that id, in
  insertion order, across all sources and stages. `mergeSources(...)` concatenates per-source log
  streams deterministically.
- `src/sim/rng.ts` — mulberry32 (copied from the pilot) for deterministic, replayable log
  streams. Injected seed ⇒ same logs ⇒ same trace ⇒ same answers.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤6
tributaries, ≤4 rapids, and ≤200 instanced log-craft; one InstancedMesh draw call for log-craft,
no postprocessing, no physics engine — drift and dye are parametric animation along tube curves.

**12. Learning-gate hooks**

- Targets unit **`U14-log-aggregator`** (project `14_log_aggregator`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet seeded** in the
  substrate (only U0 exists), so RIVER DELTA evidence serves **deepening** play now
  (`scheduled_review: false`, `review_reason: "deepening"`) and will serve the real learning gate
  for U14 when the scheduler makes it the active unit. The emitter derives
  `scheduled_review` / `review_reason` from the substrate-generated review slice, so both modes
  work without code changes.
- On wave clear/fail, emit one evidence record:
  `{"source":"voxeldojo","unit_id":"U14-log-aggregator","project":"14_log_aggregator","scenario_id":"river-delta-L<n>","game":"RIVER DELTA","ts":"<iso>","pass":true,"metrics":{"source_predictions":6,"source_prediction_accuracy":1,"filter_prediction_ok":true},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"log pipelines + correlation IDs","mechanic":"converging log tributaries, dye trace"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and owns any
  state transition. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/pipeline.ts` + Vitest suite proving stage order, filter drop, correlation-ID
  propagation, and `collectTrace` returns exactly the correlated sub-sequence across sources;
  determinism (same seed ⇒ same logs ⇒ same trace). (No pixels yet.)
- **M2** scene: tributary tubes converging through torus-knot rapids into a lake plane, with
  instanced log-craft drifting down; OrbitControls.
- **M3** interaction: click headwater to predict source / inject dye; click rapid to predict
  pass-vs-drop; click log-craft to add to trace.
- **M4** levels L1–L4 with deterministic `evaluate*`.
- **M5** evidence emit wired to wave clears/fails; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 (and L2) headed via the `window.__riverDelta` hook,
  asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is "predict the source" enough active recall for convergence, or should L1 also ask the player to
type the tributary name? Does WebGL run reliably in the Playwright smoke environment (see
`docs/GAP_ANALYSIS.md` §G6)? Resolve both during M1–M3 before building L3–L4.
