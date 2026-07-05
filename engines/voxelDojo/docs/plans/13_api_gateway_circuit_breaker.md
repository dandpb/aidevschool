# BREAKER GRID — Game 13: Circuit Breaker + Bulkhead (API Gateway)

> One file per game. Sections 1–13 follow the `PLAN.md` template; this is the
> full spec for the voxelDojo game teaching **the circuit-breaker state machine
> and bulkhead isolation** behind an API gateway.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/13_api_gateway_circuit_breaker/`. The ONE concept this
game teaches: **the circuit-breaker state machine** — `closed → open` after N consecutive failures
(fail-fast, no downstream call) → `half_open` probe after a cooldown → `closed` on probe success
or `open` again on probe failure — together with **bulkhead isolation** (a per-dependency cap on
concurrent in-flight calls so one slow/failing district cannot starve the others). Out of scope:
rate limiting (game 01), load-balancing policy (game 11), retries/backoff, the Go/Node
implementation comparison — the curriculum project's job.

**2. Why 3D**
A circuit breaker is *already* a power-grid metaphor. In 3D the player sees a grid of district
substations, each carrying a visible breaker switch rendered as a hinged bar: closed = the bar is
down, touching its contact, a glowing connected line; open = the bar has swung up and away,
leaving a disconnected gap; half-open = the bar flickers as a single probe re-tests. Requests
flow as energy pulses along the lines. When a district fails, its breaker visibly **trips open**
and subsequent pulses **fail-fast at the breaker** — they never reach the downstream pillar, they
burst red at the switch. The difference between "cascade" (piles of timeouts dragging the whole
grid down) and "cascade prevented" (the failing district is isolated, the others keep glowing
green) is a visible *flow* difference that a 2D diagram cannot convey dynamically. Bulkhead walls
render as translucent boxes whose opacity grows with in-flight load — you *see* a district fill up
and start rejecting. The state transitions (closed/open/half-open) are spatial.

**3. Player goal**
Keep a power grid of districts serving requests — by reading which breakers have tripped, why
they tripped, and predicting whether a probe will close them again.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Breaker states (closed/open/half_open) | A hinged switch bar per district; rotation encodes state; base ring color = state | Player reads the switch geometry as the state, not as decoration |
| Failure threshold → OPEN | Inject failures into a district; at N consecutive the bar swings OPEN | Player predicts which breaker trips and when |
| Fail-fast (no downstream call) | Pulses reaching an OPEN breaker burst red at the switch, never reaching the downstream contact | Player sees the call is short-circuited, not just slow |
| Cooldown → HALF_OPEN probe | Advance the clock past the cooldown; the bar flickers to half-open and admits one probe | Player predicts the cooldown outcome |
| Probe success → CLOSED / failure → OPEN | One probe pulse either connects the bar back down or re-trips it | Player predicts whether the dependency recovered |
| Bulkhead concurrency cap | A translucent box around each district; in-flight calls stack as pips inside it; at `cap` overflow is rejected | Player predicts how many a saturated district rejects |
| Cascade prevention | One district fails hard and is isolated; the other districts keep serving green | Player predicts the set of districts that stay healthy |

**5. Main loop**
A wave streams energy pulses toward the grid districts. The player injects scripted traffic
(failures/successes) into a chosen district, watches the breaker respond, then **predicts** the
outcome of the concept facet for that level (which breaker trips / the probe result / the
bulkhead rejection count / which districts survive). The simulation animates the truth; the
prediction is scored. Each level is one ~20–60s play-predict-resolve cycle.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the grid (OrbitControls). Click a district pillar or legend row
to select it; HUD buttons inject failure/success, advance the clock (L2), and commit predictions.
Four actions plus camera — no WASD.

**7. Win / fail states**
*Win a wave:* the prediction matches the deterministic simulated truth (state machine + bulkhead
are pure functions, so there is one correct answer). *Fail:* the prediction is wrong — always a
misread of the state machine (e.g. predicting CLOSED when the probe actually failed) or of the
bulkhead (predicting fewer rejections than the cap produces). Every failure is a concept
misconception, surfaced as the exact metrics in the HUD.

**8. Progression / difficulty**

- **L1 — Trip the breaker:** inject failures into one district, predict its final state + which
  district tripped OPEN. Learns the failure threshold.
- **L2 — Cooldown + probe:** trip a breaker, advance the clock past the cooldown, predict the
  half-open probe outcome (success → CLOSED, failure → OPEN). Learns the recovery path.
- **L3 — Bulkhead:** fire a burst of slow calls at a district, predict how many the bulkhead
  rejects (`max(0, count − cap)`). Learns isolation vs starvation.
- **L4 — Cascade prevention:** one district fails hard; predict the set of districts that keep
  serving. Learns that the breaker isolates the failure and the grid survives.

**9. Visual direction**
Single hero object: the grid of district substations. Each is a low-poly pillar on a plinth with
a hinged breaker bar at the top, a glowing downstream contact, a translucent bulkhead box, and a
base ring colored by state (green/pink/amber). Energy pulses are instanced spheres colored by
outcome (green served / red failed-or-short-circuited / amber bulkhead-rejected). Dark void,
subtle fog, ≤8-color flat palette, all procedural geometry (`CylinderGeometry`, `BoxGeometry`,
`TorusGeometry`, `InstancedMesh`). Half-open flickers; closed bars glow steady; open bars lift.

**10. Simulation core (headless)**
`src/sim/breaker.ts` — pure functions with an injected clock (`now: number`), zero `three`
imports:
- `CircuitState = "closed" | "open" | "half_open"`; `Breaker`, `District`, `RequestEvent`.
- `stepBreaker(b, event)` — pure transition (failure threshold → open; cooldown elapsed via
  `tick` → half_open; probe success → closed; probe failure → open).
- `routeRequest(b, now)` — cooldown-aware routing; OPEN short-circuits (fail-fast,
  `{passed:false, shortCircuited:true}`); HALF_OPEN admits one probe.
- `bulkheadAcquire(inFlight, cap)` / `bulkheadRelease` / `sweepCompletions` — the concurrency cap;
  slow calls (`durationMs`) pile up and drain as the clock advances.
- `serveRequest` composes bulkhead → breaker; `simulateWave` replays a scripted event stream and
  returns aggregate `WaveStats` (served/failed/shortCircuited/bulkheadRejected per district).
- Deterministic seeded RNG (`mulberry32`) for cascade traffic shaping. Vitest covers all four
  facets (threshold trip, cooldown+probe close/reopen, bulkhead cap+overflow, cascade isolation)
  plus determinism with injected clock + seed. No Three.js imports here — verified by the build.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤8
district pillars, ≤8 in-flight pips per district (instanced), and ≤60 instanced energy pulses.
One draw call per pulse batch and per pip stack (`InstancedMesh`); no postprocessing, no physics
engine — switch animation is parametric rotation toward a target angle.

**12. Learning-gate hooks**

- Targets unit **`U13-circuit-breaker`** (project `13_api_gateway_circuit_breaker`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet mastered** (only U0
  is honestly gated), so BREAKER GRID evidence serves the **real learning gate** for U13 when the
  scheduler makes it the active unit — and serves as scheduled review / deepening afterwards. The
  emitter derives `scheduled_review` / `review_reason` dynamically from the substrate-generated
  review slice, so both modes work without code changes.
- On wave clear/fail, emit one evidence record via `window.__voxelDojoEvidence` and an
  `EVIDENCE <json>` console line:
  `{"source":"voxeldojo","unit_id":"U13-circuit-breaker","project":"13_api_gateway_circuit_breaker","scenario_id":"breaker-grid-L1","game":"BREAKER GRID","ts":"<iso>","pass":true,"metrics":{"failures_injected":3,"predicted_state":"open","actual_state":"open","tripped_district_ok":true,"threshold":3},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"circuit breaker + bulkhead","mechanic":"3D power grid of tripping breakers"}}`.
- A **separate verifier** (Prometor context) validates metrics against the gate/review policy and
  owns any state transition. **The game never writes learner state** (evidence-only).

**13. Milestones**

- **M0** this plan.
- **M1** `src/sim/breaker.ts` + Vitest suite proving threshold trip, cooldown+probe
  close/reopen, bulkhead cap+overflow, cascade isolation, determinism. (No pixels yet.)
- **M2** scene: grid of district pillars + hinged breaker switches + bulkhead boxes rendering a
  static sim snapshot.
- **M3** interaction: select district, inject failure/success, advance clock; switch swing +
  pulse animation.
- **M4** levels L1–L4 with the per-level prediction + `evaluate*` functions.
- **M5** evidence emit wired to wave clear/fail; `EVIDENCE` console records.
- **M6** verify: Playwright plays L1 + L2 headed, asserts evidence records + screenshots to
  `.logs/`; WebGL canvas present.

**Open questions / risks**
Does "predict the probe outcome" give enough active recall, or should L2 also ask the player to
*choose* the probe (success/failure) and watch the truth? (Resolved for the pilot: the player
predicts the final state for a scripted probe — clear and deterministic.) Bulkhead dynamics need
slow calls (`durationMs`) to be observable; the wave builder bakes this in. WebGL reliability in
the Playwright smoke headless environment is confirmed green (3/3 tests).
