# PLAN slice — `13_api_gateway_circuit_breaker` (Shape B: Breaker Grid)

> PLAN slice for `/threejs-dojo 13_api_gateway_circuit_breaker`. The slug's catalog row is
> "API Gateway with Circuit Breaker" with key question "How do circuit breaker recovery times
> compare across language concurrency models?". Per
> `curriculum/13_api_gateway_circuit_breaker/docs/spec.md` "Learning Objectives", the **primary**
> concept this game teaches is: **circuit breaker state transitions around proxied HTTP traffic
> (closed → open → half-open → closed)**. Everything else in the project (retry/backoff, tenant
> rate limits, bulkheads, coalescing, adaptive concurrency, the Go/Rust/Node comparison) is out
> of scope — one game = one concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent a
> *tri-state physical switch with a cooldown clock, a rolling failure window, and a fail-fast
> fallback path* — they are all variants of "incoming sprite → admit/reject". The breaker's three
> mechanical states (lever closed / lever tripped open / lever hovering half-open) plus the
> probe-through-the-gap behavior need a 3D physical metaphor and a clock, so the concept gets its
> own world. The `ROUTING_MANIFEST.md` row for this slug prescribes voxelDojo / Shape B with
> mechanic "3D power grid, tripping breakers" — this slice conforms.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/13_api_gateway_circuit_breaker/`
- **ONE concept this game teaches:** the circuit-breaker state machine — a per-route switch with
  three explicit states (`closed`, `open`, `half_open`) that decides whether a request may reach
  the upstream. In `closed`, requests flow and the breaker counts successes/failures in a rolling
  window. Crossing the failure-rate threshold trips the breaker to `open`. In `open`, requests
  **fail fast** to a fallback without touching the upstream. After an `open_cooldown`, the breaker
  moves to `half_open` and admits only a bounded number of probe requests; `N` consecutive probe
  successes close the circuit, while any probe failure re-opens it. (Spec FR-004 through FR-009.)
- **Out of scope:** retry/backoff/jitter, bulkheads, tenant rate limits, request coalescing,
  adaptive concurrency, the metrics endpoint, the Go/Rust/Node comparison (those are the
  curriculum project's job, not the game's). Retry is mentioned only as the trap "the breaker
  protects against retry storms" — not taught as a mechanic.
- **Slug:** `13_api_gateway_circuit_breaker`
- **Catalog key question (context only, not the win condition):** "How do circuit breaker recovery
  times compare across language concurrency models?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective):** the player
  demonstrates that the breaker transitions `closed → open` exactly when the rolling failure-rate
  threshold is crossed, `open → half_open` only after the cooldown elapses, `half_open → closed`
  after the configured number of successful probes (and `half_open → open` on any probe failure),
  AND routes every `open`-state request to fail-fast fallback without ever contacting the upstream.
- **Unit id (evidence target):** `U13-circuit-breaker` (per
  `.loops/threejs-dojo/ROUTING_MANIFEST.md` line 34; encounter id `game-13-breaker-grid`,
  dev port `5213`). The substrate does not yet have this unit registered, so the run emits
  `scheduled_review: false`, `review_reason: "deepening"` until it is added. (The task prompt
  referenced the project slug `13_api_gateway_circuit_breaker` as the unit; the canonical
  evidence `unit_id` follows the manifest convention `U<N>-<slug>` used by every sibling plan —
  the verifier keys on `unit_id` + `project`, so `unit_id="U13-circuit-breaker"` +
  `project="13_api_gateway_circuit_breaker"` is the correct pair.)
- **Encounter / scene id:** `breaker-grid-01`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Three explicit states (FR-004)** | A massive physical breaker lever at the center of the substation with three hard-detented positions: **DOWN=CLOSED** (lever horizontal, contact pads touching, current arcs freely), **UP=OPEN** (lever vertical, pads separated by a visible gap, no arc), **MID=HALF-OPEN** (lever diagonal, a single thin spark-bridge across the gap). The lever's pose is the breaker state — readable at a glance from anywhere in the scene. | Player internalizes the tri-state machine as a physical object, not an enum. |
| **Rolling failure window + threshold (FR-005, FR-006)** | The downstream **reactor** (upstream service) on the right has a health ring of recent outcomes (green ticks / red sparks) drawn around its core; a red failure-rate gauge fills as failures accumulate inside the rolling window. When the gauge crosses the threshold line, it flashes — the **TRIP** cue. | Player sees the threshold as a fill line on a real gauge, not a config field. |
| **`closed → open` transition (FR-006)** | The player presses **C (TRIP)** to slap the lever from DOWN to UP. Valid only after the threshold cue flashes; tripping early (before threshold) is a **false-trip** that needlessly cuts good traffic; tripping late (after the threshold cue has been ignored past a beat) lets the reactor **overload** — smoke and damage. | Player links "threshold crossed → must trip now" — the human becomes the state-transition logic. |
| **`open` = fail-fast, never contact upstream (FR-009)** | While the lever is UP, inbound request-pulses arriving from the client terminals on the left must be **bounced to the fallback battery bank** (a glowing rack below the breaker) by pressing **X (REJECT)**. Pressing **Z (ADMIT)** while UP sends a pulse across the broken gap anyway — a visible **leak spark** reaches the reactor and a fault counter ticks. | Player proves "open means do NOT contact the upstream" kinesthetically — leaks are physically visible. |
| **Cooldown before `open → half_open` (FR-007)** | When the lever trips UP, a **cooldown ring** lights up around the breaker base and drains over real time (≈ 6–8 s in-wave, scaled). The player cannot move the lever off UP until the ring empties. Pressing **C (PROBE)** before the ring empties is rejected as a **premature probe**. | Player feels the cooldown as a hard physical gate, not a config value. |
| **`half_open` admits only N probes (FR-007, FR-008)** | When the player presses **C (PROBE)** after cooldown, the lever drops to MID and exactly `N` (config: 3) **probe slots** light up on the spark-bridge. Each **Z (ADMIT)** in HALF-OPEN consumes one slot and sends one test pulse to the reactor. Pulses arriving with no free slot MUST be **X (REJECT)**ed — admitting over-budget is a leak. | Player respects the bounded probe budget that prevents thundering-herd during recovery. |
| **`half_open → closed` on N successes (FR-008)** | Each successful probe lights a green tick on the lever; on the `N`-th consecutive success the breaker auto-slams to DOWN (or the player presses **C (CLOSE)** to seal it) — current flows freely again. | Player sees the "recovery requires N consecutive successes" rule as a physical snap-shut. |
| **`half_open → open` on any failure (FR-008)** | If any probe pulse fails (the reactor was still flaky), the lever **snaps back to UP** with a bang, the cooldown ring re-lights, and the breaker is open again. The player has no control over this transition — it just happens, teaching the asymmetry. | Player experiences the "one failure re-opens" rule as an involuntary mechanical snap. |
| **Fallback response (FR-009, FR-012)** | Rejected pulses in OPEN don't vanish — they slide down a chute to the **fallback battery bank**, which lights up green ("served 503 fallback"). Leaked pulses (admit-while-open) bypass the chute and hit the reactor — visibly wrong. | Player distinguishes "fail-fast with fallback" from "drop on the floor" and from "leak to upstream". |

## 4. Main loop (the ~25–40 s cycle the player repeats)

1. **Wave card.** A wave banner shows the round's reactor health script, e.g.
   `WAVE 2: 6 closed-phase requests, threshold at 50% failures, cooldown 7s, 3 probes to close`.
   Client terminals on the left power up.
2. **CLOSED phase.** Request-pulses (small glowing orbs) launch from client terminals and slide
   along the input bus toward the breaker. The lever is DOWN. The player presses **Z (ADMIT)** to
   pass each one through to the reactor. The reactor returns success (green flash) or failure
   (red spark) per its scripted health curve; the failure-rate gauge fills.
3. **TRIP.** When the gauge crosses the threshold line and flashes, the player presses **C (TRIP)**
   within ~1 beat to slap the lever UP. The cooldown ring lights.
4. **OPEN phase.** Further inbound pulses must now be **X (REJECT)**ed — they slide to the
   fallback bank. Pressing Z here leaks (fault). The player waits while the cooldown ring drains.
5. **HALF-OPEN phase.** When the ring empties, the player presses **C (PROBE)**; the lever drops
   to MID with 3 probe slots. The next 3 inbound pulses are ADMITted one at a time (Z); any
   non-slot pulse must be REJECTed (X). Each probe succeeds (green tick) or fails (snap back UP,
   ring re-lights, back to step 4).
6. **CLOSE.** On the 3rd consecutive probe success, the lever slams DOWN; the wave-end HUD posts
   the round score: `{closed_admits_correct, trips_correct, open_rejects_correct, open_leaks,
   probes_correct, closes_correct, reactor_overloads}`.
7. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page channel and NDJSON `.logs/evidence.ndjson`. The substation lights go green and the
   next wave's difficulty (higher threshold, shorter cooldown, more probes needed, flakier
   reactor) unlocks.

## 5. Inputs & controls (≤ 3 primary actions, NES-pad feel)

- **Z** — **ADMIT** the front-most inbound pulse: send it through to the reactor. Correct in
  CLOSED, and in HALF-OPEN when a probe slot is free. Wrong in OPEN (leak) and over-budget in
  HALF-OPEN (leak past probe cap).
- **X** — **REJECT** the front-most inbound pulse: fail-fast it to the fallback bank. Correct in
  OPEN, and in HALF-OPEN when no probe slot is free. Wrong in CLOSED (needless rejection of good
  traffic).
- **C** — **CHANGE state** (the state-machine advance, context-sensitive): in CLOSED after the
  threshold cue flashes → TRIP (CLOSED→OPEN); in OPEN after cooldown ring empties → PROBE
  (OPEN→HALF-OPEN); in HALF-OPEN after the Nth consecutive success → CLOSE (HALF-OPEN→CLOSED).
  Pressing C at the wrong time is rejected as a fault (false-trip / premature-probe) — no effect.
- **H** — HUD toggle: show the live failure-rate gauge fill, threshold line, cooldown ring
  percentage, and probe slots remaining (allowed in waves 1–2; disabled in later waves to test
  mastery without the crutch).
- Three primary actions (**Z**, **X**, **C**) cover the full loop; **H** is a non-scoring HUD
  crutch only.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `closed_admits_correct === closed_admits_total` (every CLOSED-phase pulse was ADMITted),
  - `trips_correct === 1` AND `trips_late === 0` AND `trips_early === 0` (the breaker was tripped
    exactly once, on the threshold cue — neither false-tripped before nor late-tripped after),
  - `open_rejects_correct === open_rejects_total` (every OPEN-phase pulse was REJECTed to
    fallback),
  - `open_leaks === 0` (no pulse ever reached the reactor while the lever was UP),
  - `probes_premature === 0` (no probe attempted before cooldown drained),
  - `probes_correct === probes_total` AND `halfopen_admit_leaks === 0` (exactly the N probe
    slots were used and no over-budget pulse was admitted),
  - `closes_correct === 1` (the breaker was closed on N consecutive probe successes),
  - `reactor_overloads === 0` (no late-trip let the reactor fry).
- **Fail the wave (FAIL)** when **any** of:
  - A late trip (`trips_late > 0`) → reactor overload, smoke, evidence `pass: false`,
    `reactor_overloads > 0`.
  - An open leak (`open_leaks > 0`) → a pulse visibly crosses the broken gap and hits the
    reactor; substation alarm; evidence `pass: false`.
  - A premature probe (`probes_premature > 0`) → the lever refuses to drop, the action is
    logged as a fault; evidence `pass: false` if any other fault compounds, otherwise the wave
    continues with a fault counter tick.
  - A needless rejection in CLOSED (player pressed X in CLOSED) → the client terminal shortouts;
    counts against `closed_admits_correct`.
  - The input bus overflows (player lets ≥ 3 pulses back up at the lever) → substation alarm,
    evidence `pass: false` with `overflow: true`.
- Both outcomes are **direct readouts of breaker discipline**: trip on threshold, fail-fast in
  open, probe after cooldown, close on consecutive successes. Neither win nor fail is gated on
  speed — correctness first.

## 11. Learning-gate hooks

- **Active unit:** `U13-circuit-breaker` (project `13_api_gateway_circuit_breaker`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still
  emits evidence with `scheduled_review: false` and `review_reason: "deepening"` (per
  `ROUTING_MANIFEST.md`); the verifier will not promote until the substrate registers the unit.
  The game never writes learner state.
- **Encounter / scene id:** `breaker-grid-01` (manifest scene id `game-13-breaker-grid`,
  dev port `5213`).
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus NDJSON at
  `engines/<engine>/games/13_api_gateway_circuit_breaker/.logs/evidence.ndjson`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery). The smoke run
  captures the in-page channel at the end of the Playwright pass — same pattern as pixel-quest.
- **Evidence record fields** (this game's metrics variant — `kind: "voxeldoj-breaker-grid"`):
  ```json
  {
    "source": "voxeldoj",
    "unit_id": "U13-circuit-breaker",
    "project": "13_api_gateway_circuit_breaker",
    "encounter_id": "breaker-grid-01",
    "game": "Breaker Grid",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldoj-breaker-grid",
      "closed_admits_total": 6,
      "closed_admits_correct": 6,
      "trips_total": 1,
      "trips_correct": 1,
      "trips_late": 0,
      "trips_early": 0,
      "open_rejects_total": 5,
      "open_rejects_correct": 5,
      "open_leaks": 0,
      "probes_total": 3,
      "probes_correct": 3,
      "probes_premature": 0,
      "halfopen_admit_leaks": 0,
      "closes_correct": 1,
      "fallbacks_served": 5,
      "reactor_overloads": 0,
      "overflow": false
    },
    "curriculum_context": {
      "concept": "circuit breaker state machine (closed/open/half-open)",
      "mechanic": "Breaker Grid",
      "accepted_signal": "trip on threshold; fail-fast in open; probe after cooldown; close on N consecutive probe successes",
      "rejected_trap": "leaking a request to the upstream while open, or probing before the cooldown elapsed"
    },
    "review_context": {
      "unit_kind": "concept",
      "scheduled_review": false,
      "review_reason": "deepening",
      "streak_candidate": false,
      "scheduler_source": "learner-substrate",
      "verifier_required": true
    }
  }
  ```
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.reactor_overloads === 0` AND
  `metrics.open_leaks === 0` AND `metrics.probes_premature === 0` AND `metrics.trips_late === 0`
  AND `metrics.trips_early === 0` AND `metrics.halfopen_admit_leaks === 0` AND
  `metrics.closed_admits_correct === metrics.closed_admits_total` AND
  `metrics.open_rejects_correct === metrics.open_rejects_total` AND
  `metrics.probes_correct === metrics.probes_total` AND `metrics.overflow === false`.
  (i.e. every CLOSED pulse admitted, breaker tripped exactly on threshold, every OPEN pulse
  fail-fasted to fallback with zero upstream leaks, no probe before cooldown, exactly N
  successful probes then close, no overflow.)
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  plan slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the Breaker Grid 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `13_api_gateway_circuit_breaker`, unit
  `U13-circuit-breaker`, where the breaker transitioned `closed → open` exactly on the failure
  threshold, every `open`-state request was fail-fasted to fallback with zero upstream leaks,
  `open → half_open` happened only after cooldown, `half_open → closed` happened only after the
  configured N consecutive probe successes (and re-opened on any probe failure) — end-to-end
  under Playwright."**

## Open questions / risks (for the implementer)

- **Reactor health script.** The wave needs a deterministic, observable failure pattern so the
  threshold cue is unambiguous. Generate a seeded per-wave schedule (e.g. WAVE 1: 6 closed pulses,
  failures at pulses 3/4/5 → 50% rate crosses threshold at pulse 4 with `minimum_requests = 4`).
  Document the seed in the HUD briefing so late/early trips are unambiguous.
- **Threshold parameters.** Start with `failure_rate_threshold = 0.5`, `minimum_requests = 4`,
  `open_cooldown_ms ≈ 7000` (scaled), `half_open_max_probes = 3`, `half_open_successes_to_close = 3`
  (matches the spec's example config). Expose all five in the HUD so the player can read the rule.
- **Cooldown clock scale.** Real spec cooldowns are seconds-to-minutes; in-wave ≈ 6–8 s so the
  player sees the full closed→open→half-open→closed cycle inside one wave. Expose the scale.
- **Auto-snap on probe failure.** The HALF-OPEN→OPEN transition is involuntary (the lever snaps
  on its own the instant a probe fails). Make the snap loud (audio + screen-shake) so the player
  learns the asymmetry — recovery is hard, failure is instant.
- **Probe budget vs. inbound pressure.** In HALF-OPEN, pulses arrive continuously but only N may
  be admitted; the rest must be REJECTed. Tune arrival rate so the player actually has to make
  the per-pulse Z/X choice during HALF-OPEN, not just hold Z through 3 probes.
- **"H" HUD crutch.** Decide by playtest whether to keep the gauge/threshold/cooldown HUD on for
  waves 1–2 only, or always; the verifier must know which wave the smoke run clears.
