# PLAN — Game 06: "PIPELINE PLANT" (File Upload / Streaming vs Buffering + Bounded Memory)

> One file per game; this is the PIPELINE PLANT plan. Sections 1–13 follow the `PLAN.md` template.
> The pilot is `game-10-hash-ring/`; this game mirrors its structure verbatim and swaps the concept.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/06_file_upload_pipeline/`. The ONE concept this game teaches:
**streaming vs buffering + bounded memory** — a buffered upload slurps the whole file into memory
before delivering any of it (so peak memory scales with file size and overflows a fixed capacity);
a streaming upload pumps fixed-size chunks one at a time (so peak memory stays bounded at the chunk
size regardless of total size, and nothing overflows as long as each chunk ≤ capacity). Throughput
(delivered / elapsed) lets you compare the two on a fair clock. Out of scope: the multipart wire
format / Content-Range framing, TLS, disk I/O and fs backpressure, parallel multi-connection uploads,
resumability and crash recovery, the Node streams API comparison — all the curriculum project's job,
not the teaching sim's.

**2. Why 3D**
Memory pressure is fluid. In 3D the player watches fluid flow through a pipe into a transparent
**buffer tank** with a visible **fluid level plane** and a hard **capacity rim**. In buffer mode the
whole file floods in at once: the level races to the top and, if `size > capacity`, **overflow
particles** spill past the rim onto the floor (data lost / OOM). In stream mode the same total volume
arrives as a train of **chunked slugs** — the level never rises past one chunk, so peak memory is
flat and independent of how much fluid is still queued. The lesson — *buffered peakMem grows with
size; streamed peakMem grows with chunkSize* — is a visible fluid level, and the bounded-vs-unbounded
contrast is a level that either crests the rim or never does. A 2D progress bar flattens this into
one number; the tank makes the *shape* of memory usage the thing you read.

**3. Player goal**
Predict whether an upload overflows the tank (buffer mode) or stays bounded (stream mode), and prove
that streaming keeps the peak level flat no matter how big the file is.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Buffer tank | A transparent box tank with a capacity rim | Player reads the fluid level vs the rim |
| Memory capacity | The rim height; `size > capacity` overflows | Player predicts overflow before it spills |
| Buffered upload | Whole file floods in at once; level = size | Player reads peakMem = size (scales with file) |
| Overflow / OOM | Particles spill past the rim when size > capacity | Player predicts exactly which uploads lose data |
| Streaming upload | Fluid arrives as chunked slugs, one at a time | Player reads peakMem = chunkSize (flat) |
| Chunk size | The size of each slug; sets the bounded peak | Player tunes the chunk to fit the capacity |
| Backpressure | A slow drain can stall or overflow the buffer | Player predicts stall vs overflow under load |
| Throughput | delivered / elapsed — delivered volume per clock | Player compares buffer vs stream on a fair clock |

**5. Main loop**
A wave presents an upload job: a file `size`, a memory `capacity`, and (for stream mode) a
`chunkSize`. The player **predicts** the outcome — will it overflow? what's the peak memory? — by
clicking the tank or choosing a chunk size. The simulation then runs the fluid and animates the
truth: the level rises, overflow spills (or doesn't), and the peak/throughput metrics settle. On a
correct prediction the wave clears and evidence is emitted. Between waves the parameters deepen one
facet of the concept (bigger files, tighter capacity, tuned chunks, backpressure).

**6. Camera & controls**
Mouse-orbit + scroll zoom around the tank (OrbitControls), tilted ~30°. Click the tank to predict
overflow/no-overflow (L1/L2/L4); drag the chunk-size slider and lock in to predict peak (L3); flip
the buffer/stream **lever** to compare modes. Four actions plus camera — mirrors HASH RING's surface
area.

**7. Win / fail states**
*Win a wave:* the prediction matches the deterministic sim — correct overflow call (L1/L4), correct
bounded-memory call (L2), peak within tolerance of `chunkSize` (L3). *Fail:* wrong overflow/stall
prediction, or a peak that overshoots because the chunk was set above capacity. Every failure is a
misread of "buffered peakMem scales with size; streamed peakMem scales with chunkSize."

**8. Progression / difficulty**

- **L1 — Buffer:** a buffered upload with `size` near/over `capacity`. Predict whether it overflows.
  Active recall on the most basic invariant: buffered peakMem = size, so it overflows iff
  size > capacity.
- **L2 — Stream:** the same total volume arrives streamed in chunks. Predict that peak memory stays
  bounded (never overflows) regardless of size. The flat level is the lesson.
- **L3 — Tune chunk size:** the player sets the chunk size with a slider and predicts the peak
  memory (= chunkSize). The chunk must fit the capacity; too big overflows. Bounded memory is tuned,
  not free.
- **L4 — Backpressure:** the drain is slow. Predict whether the buffered upload stalls/overflows vs
  the streamed one staying bounded under the same load. The buffered-vs-streamed contrast under
  backpressure is the capstone.

**9. Visual direction**
Single hero object: the **buffer tank** — a transparent `BoxGeometry` shell with a glowing capacity
rim, a **fluid level plane** inside that rises with live memory, and **overflow particles**
(`Points`) spilling over the rim when capacity is exceeded. Fluid flows in through a horizontal
**cylinder pipe** from the left; in stream mode the fluid arrives as distinct **chunked slugs**
(short cylinder segments) traveling the pipe one at a time, so the level stair-steps and settles.
A **buffer/stream lever** (a pivoting bar) sits beside the tank and flips the mode. ≤8-color palette;
fluid is blue, overflow particles amber/red, the rim is white. The fluid level vs rim is the
load-bearing signal — readable from a single screenshot. All geometry procedural
(`BoxGeometry` tank, `CylinderGeometry` pipe + slugs, `PlaneGeometry` level, `Points` overflow).
Background `#0b0e14` with fog to match.

**10. Simulation core (headless)**
`src/sim/pipeline.ts` — pure functions, NO `three` import:

- `bufferedUpload(size, capacity)` → `{ delivered, overflowed, peakMem: size }`. Overflows iff
  `size > capacity`; `delivered = capacity` (the rest spilled), `overflowed = size - capacity`.
- `streamingUpload(size, chunkSize, capacity)` → `{ delivered, overflowed: 0, peakMem: chunkSize }`.
  Delivers the whole file in `ceil(size / chunkSize)` chunks; never overflows as long as
  `chunkSize ≤ capacity`; peak memory is exactly `chunkSize` regardless of `size`.
- `throughput(result, timeMs)` → `delivered / timeMs` (bytes per ms). Lets buffer vs stream be
  compared on a fair clock.
- Backpressure variant `bufferedUploadBackpressured(size, capacity, drainRate, timeMs)` — models a
  slow drain so the buffer can stall (delivered < size without overflowing) when the drain can't
  keep up.
- Deterministic: pure functions of their inputs; no `Date.now()`, no RNG inside the math (the seeded
  RNG in `rng.ts` only generates the *scenario parameters*, not the upload result).

Vitest (`src/sim/pipeline.test.ts`, ≥3 concept proofs) covers: buffered overflows iff size >
capacity; streaming never overflows regardless of size (peakMem = chunkSize, independent of total);
both modes deliver the same total when nothing overflows; throughput scales correctly; determinism
(same inputs ⇒ same result).

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with one
tank, one pipe, ≤500 overflow particles (`Points`, one draw call), and ≤64 traveling chunk slugs
(reused cylinder meshes, not instanced — count is small). Fluid level is a single `PlaneGeometry`
whose Y position lerps; overflow is a `Points` cloud. No postprocessing, no physics engine — slug
travel and level rise are parametric animations along known vectors.

**12. Learning-gate hooks**

- Targets unit **`U6-file-upload`** (project `06_file_upload_pipeline`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is not yet in the substrate (only U0
  is honestly gated), so PIPELINE PLANT evidence serves the **real learning gate** for U6 when the
  scheduler makes it the active unit — and serves as scheduled review / deepening afterwards. The
  emitter derives `scheduled_review` / `review_reason` dynamically from the substrate-generated review
  slice, so both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U6-file-upload","project":"06_file_upload_pipeline","scenario_id":"pipeline-plant-L1","game":"PIPELINE PLANT","ts":"<iso>","pass":true,"metrics":{"size":100,"capacity":80,"mode":"buffered","overflow_predicted":true,"overflow_actual":true,"peak_mem":100,"delivered":80,"overflowed":20,"throughput":0.08},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"streaming vs buffering + bounded memory","mechanic":"fluid tank + pipe + chunked slugs"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/pipeline.ts` + `sim/rng.ts` + Vitest suite proving buffered overflows iff size >
  capacity, streaming never overflows regardless of size, both deliver the same total, determinism.
  (No pixels yet.)
- **M2** scene: tank + pipe + fluid level rendering a static buffered upload.
- **M3** interaction: click tank to predict; fluid animation; chunked slugs in stream mode; overflow
  particles; buffer/stream lever.
- **M4** levels L1–L4 with the overflow / bounded-memory / chunk-tuning / backpressure lifecycle.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 headed, asserts evidence record + WebGL canvas + screenshot.

**Open questions / risks**
Does "predict overflow yes/no" carry enough active recall for the bounded-memory concept, or should
L3 require the player to *type* the predicted peak (= chunkSize)? (Resolved: predict-first with a
chunk slider keeps the surface uniform with HASH RING; typing the exact peak is a stretch goal
post-M4.) Does WebGL run reliably in the Playwright smoke environment (see `docs/GAP_ANALYSIS.md`
§G6)? Resolve during M1–M3 before building L4.
