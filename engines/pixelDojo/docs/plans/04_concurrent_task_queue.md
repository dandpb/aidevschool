# PLAN slice — `04_concurrent_task_queue` (TASK FORGE: worker-pool dispatch)

> PLAN slice for `/threejs-dojo 04_concurrent_task_queue`. **Shape B** — a fresh standalone 3D
> (three.js) world, sibling to `game-10-hash-ring` etc., overriding the ROUTING_MANIFEST's earlier
> Shape-A routing (pixel-quest `taskQueue.ts`). The pixel-quest encounter kinds
> (`token_bucket` / `sequence_flow` / `route_health` / `policy_gate`) are all variants of
> "incoming entity → admit/reject"; a bounded worker-pool with **priority dispatch + retry/backoff
> + DLQ + backpressure + idempotency** is a multi-stage spatial system (queue + workers + retry
> rack + scrap bin) that needs its own 3D world. Sections below follow the pixelDojo `PLAN.md`
> numbering (1, 2, 3, 4, 5, 6, 11); because this is Shape B, the implementation lives at
> `engines/voxelDojo/game-04-task-queue/` and mirrors the voxelDojo PLAN.md extras (§2 why-3D,
> §10 headless sim, §13 milestones). Port `5204`, unit_id `U4-task-queue`.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/04_concurrent_task_queue/`
- **ONE concept this game teaches:** **bounded worker-pool dispatch** — N workers pull the next
  eligible task from a bounded priority queue (priority desc, FIFO tie-break); transient failures
  retry with exponential backoff; poison / exhausted tasks go to a dead-letter queue; the queue
  rejects new tasks when full (backpressure); duplicate `idempotency_key` submissions are deduped.
- **Out of scope:** multi-process / distributed brokers, exactly-once across nodes, the
  Go/Rust/Node throughput comparison (the curriculum project's job — RF-005 concurrency is the
  sim core's invariant, not a benchmark here), graceful shutdown scheduling nuance, retention
  policy expiry.
- **Slug:** `04_concurrent_task_queue`
- **Game id / dir:** `task-forge` / `engines/voxelDojo/game-04-task-queue/`
- **Scenario ids:** `task-forge-L1` … `task-forge-L4`
- **Unit id (evidence):** `U4-task-queue`
- **Metrics kind:** `voxeldojo-task-queue`

## 2. Player goal

Run the forge: send each hot ingot (task) to the next idle forge arm (worker), give cracked ones
another go after they cool on the annealing rack (retry/backoff), and chuck the broken ones on
the scrap pile (DLQ) — without ever letting the hopper overflow (backpressure) or letting a
duplicate-stamped ingot through (idempotency).

## 3. Concept → mechanic mapping (pedagogical core)

| Concept element (spec) | 3D mechanic (forge) | What "playing it right" proves |
| --- | --- | --- |
| Bounded priority queue (RF-007, RNF-003) | Inbound **hopper** of fixed slot count; ingots stacked by **glow brightness = priority**; FIFO within a brightness band | Player reads "next eligible" = brightest + oldest |
| `worker_count` cap, no over-dispatch (RF-005) | N robotic **forge arms** around the hopper; only N ingots can be "in flame" at once | Player predicts the ingot the next idle arm grabs |
| Priority + FIFO dispatch (RF-007) | Idle arm always grabs the brightest-eligible ingot; ties go to the oldest arrival; **scheduled_for** gates shown as a countdown ring that must drain before the ingot is grabbable (RF-008) | Player predicts the picked ingot **before** the arm moves |
| Backpressure / queue capacity full (RNF-003, RF-013 `backpressure:"full"`) | Hopper has fixed slots; an overfull hopper pulses red; the forklift carrying the next ingot must be **rejected (429)** by the player or it bounces and counts as a violation | Player times `R` (reject) to keep the hopper bounded |
| Retry with exponential backoff + jitter (RF-009) | A **cracked ingot** (transient failure) goes to the **annealing rack** for `backoff = base * 2^retries + jitter` seconds, glowing hotter as it nears re-eligibility, then re-enters the hopper | Player predicts whether/when a retry becomes eligible and re-dispatches correctly |
| Poison message → DLQ (RF-010, edge case "Poison … MUST bypass further retries") | A **defective ingot** (red crack pattern, distinct from transient "cracked") bypasses the annealing rack and goes straight to the **scrap chute (DLQ)** | Player classifies poison correctly (no retry) |
| `max_retries` exhausted → DLQ (RF-009, RF-010) | A cracked ingot whose retry count exceeds its limit must also be scrapped, not re-annealed | Player scraps instead of re-queuing at the threshold |
| Idempotency key dedup (RF-003, edge case "Duplicate `idempotency_key` … return original") | Each ingot is **stamped with a sigil**; a forklift carrying an active duplicate sigil must be **rejected** at the hopper or the duplicate is enqueued (violation) | Player catches the duplicate before it lands |
| Worker pause (`worker_count = 0`, RF-006) | `P` parks all arms; hopper fills; player observes backlog growth with no dispatch | Player articulates that paused ≠ broken (status 200, queue still accepts) |
| Concurrency invariant (RF-005 acceptance) | The sim core asserts `running_count ≤ worker_count` on every tick; a HUD gauge shows `busy/worker_count` | Player reads utilization, never sees it exceed N |

## 4. Main loop (~30s wave)

1. **Inbound stream.** A forklift drops ingots at the hopper every ~1.5s. Mix is scripted per
   level: clear-success ingots (green glow), transient-crack ingots (yellow, will fail once and
   retry), poison ingots (red crack pattern, must DLQ), scheduled ingots (countdown ring), and
   occasional duplicate-sigil forklifts.
2. **Predict dispatch.** When an arm goes idle, the player **clicks the ingot** they predict the
   arm will grab. The arm then animates the truth; correct/incorrect is recorded. (Active recall
   of priority + FIFO + scheduled_for.)
3. **Classify outcome.** When an arm finishes an ingot, the player routes the result: success
   (auto-flies out as a cooled bar), **retry** (click the annealing rack — only valid for
   transient cracks under `max_retries`), or **DLQ** (click the scrap chute — required for poison
   and for cracks at `max_retries`). Wrong classification = violation.
4. **Hold the boundary.** When the hopper is full, the next forklift must be sent back with `R`
   (429). When a duplicate sigil arrives, `R` rejects the dup. Skipping `R` = overflow / dup
   enqueued = violation.
5. **Wave end → evidence.** When all ingots in the wave are resolved (success / DLQ), the wave
   clears; the emitter publishes one NDJSON record via `window.__voxelDojoEvidence` and an
   `EVIDENCE <json>` console line.

## 5. Inputs & controls (≤4 actions + camera)

- **Mouse-orbit + scroll** (OrbitControls) around the forge, tilted ~30°.
- **Click an ingot in the hopper** → register the next-dispatch prediction for the next idle arm.
- **Click the annealing rack / scrap chute** → classify the currently-held finished ingot as
  retry / DLQ (success auto-routes; no click needed).
- **R** — reject the inbound forklift (backpressure when hopper is full, idempotency on duplicate
  sigil). Hold-to-spam for backpressure storms.
- **P** — pause/resume workers (toggle `worker_count` between 0 and N). Pedagogical toggle for
  L1 RF-006 teaching, optional thereafter.

Four primary actions + camera, NES-pad-decodable on a keyboard.

## 6. Win / fail states (direct readouts of the queue contract)

**Win a wave** when **all** of:
- `dispatch_correct / dispatch_predictions ≥ 0.80` (concept held — player can predict priority + FIFO + scheduled_for),
- `retry_correct == retry_classifications` AND `dlq_correct == dlq_classifications` (right routing on every finished ingot),
- `poison_requeued == 0` (no infinite retry loop on a poison message),
- `backpressure_violations == 0` AND `queue_overflowed == false` (player held the bounded boundary),
- `idempotency_duplicates_enqueued == 0` (player caught every duplicate sigil),
- `max_concurrent_running ≤ worker_count` for every tick (the RF-005 invariant).

**Fail a wave** when any one of:
- prediction accuracy < 0.80 (concept not held — wrong next-dispatch twice or more),
- a poison ingot is sent to the annealing rack (would loop forever — the canonical queue pathology),
- the hopper overflows because `R` was skipped on a full queue (backpressure ignored),
- a duplicate-sigil forklift is allowed to enqueue (idempotency broken),
- `running_count > worker_count` ever observed (sim invariant violated — should be impossible, but
  a regression-test failure mode).

Every failure is a **misread of the queue contract**, not a twitch failure.

## 11. Learning-gate hooks

- **Active unit:** `U4-task-queue` (project `04_concurrent_task_queue`) — see
  `learner/learning_state.yaml` and `engines/voxelDojo/ROUTING_MANIFEST.md`. As of 2026-07-05 the
  unit is **not yet substrate-gated** (only U0 is honestly gated), so TASK FORGE evidence will
  serve the **real learning gate** for U4 when the scheduler makes it the active unit, and serve
  as scheduled review / deepening afterwards. The emitter derives `scheduled_review` and
  `review_reason` dynamically from the substrate's review slice, so both modes work without code
  changes.
- **Evidence location:** `engines/voxelDojo/game-04-task-queue/.logs/evidence.ndjson` (one line
  per wave), surfaced to Playwright via `window.__voxelDojoEvidence` and an `EVIDENCE <json>`
  console record. Regenerated each smoke run; not committed.
- **Evidence record (emitted on wave clear):**
  ```json
  {
    "source": "voxeldojo",
    "unit_id": "U4-task-queue",
    "project": "04_concurrent_task_queue",
    "scenario_id": "task-forge-L1",
    "game": "TASK FORGE",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldojo-task-queue",
      "dispatch_predictions": 12,
      "dispatch_correct": 11,
      "retry_classifications": 4,
      "retry_correct": 4,
      "dlq_classifications": 2,
      "dlq_correct": 2,
      "poison_requeued": 0,
      "backpressure_violations": 0,
      "idempotency_duplicates_enqueued": 0,
      "queue_overflowed": false,
      "max_concurrent_running": 4,
      "worker_count": 4
    },
    "review_context": {
      "unit_kind": "concept",
      "scheduled_review": false,
      "review_reason": "deepening",
      "scheduler_source": "learner-substrate",
      "verifier_required": true
    },
    "curriculum_context": {
      "concept": "bounded worker-pool dispatch with priority, retry/backoff, DLQ, backpressure, idempotency",
      "mechanic": "task forge: hopper + N arms + annealing rack + scrap chute",
      "accepted_signal": "correct next-dispatch prediction AND correct retry/DLQ classification AND held backpressure + idempotency",
      "rejected_trap": "requeuing poison / overflowing hopper / enqueuing a duplicate sigil"
    }
  }
  ```
- **Pass rule (gate):** `pass == true` AND
  - `dispatch_correct / dispatch_predictions ≥ 0.80`, AND
  - `retry_correct == retry_classifications`, AND
  - `dlq_correct == dlq_classifications`, AND
  - `poison_requeued == 0`, AND
  - `backpressure_violations == 0`, AND
  - `idempotency_duplicates_enqueued == 0`, AND
  - `queue_overflowed == false`, AND
  - `max_concurrent_running ≤ worker_count`.

  Anything else keeps the gate locked; the next wave replay can re-attempt. No mastery is
  written by the game.
- **Side-effect contract:** the game does **not** publish `window.__pixelQuestLearningState` and
  does **not** touch `localStorage` keys `learning_state`, `units_log`, or `mastered`. The
  gate (`python3 -m learner.gate`) owns the evidence decision and persists the `units_log`
  append through `learner/substrate/`.
- **Verifier handoff:** the fresh-context verifier subagent receives (this plan, the smoke spec,
  the `EVIDENCE` console record, the `.logs/` screenshot) and judges against the done-rule:
  **"TASK FORGE emits a valid `voxeldojo-task-queue` evidence record with `pass: true` for
  project `04_concurrent_task_queue`, unit `U4-task-queue`, and the wave shows the player
  predicting next-dispatch (≥80%), classifying retry vs DLQ correctly, and holding backpressure
  + idempotency — under Playwright, end-to-end."**

## (Shape-B extras, mirror voxelDojo PLAN.md)

- **§2 Why 3D.** Worker-pool dispatch is a multi-stage topology (queue → N workers →
  retry-rack / scrap), not a single admit/reject gate. 3D encodes it as a *spatial pipeline*:
  hopper stack height = queue depth, arm activity = worker utilization, annealing rack =
  backoff in real space, scrap chute = DLQ. The contrast between priority/FIFO vs naive FIFO
  is a *visible stacking pattern* the player reads off the hopper; the contrast between retry
  vs DLQ is *which bay* the finished ingot flies to. None of that is readable off a 2D
  token-meter; pixel-quest's encounter shell would collapse it to admit/reject.
- **§10 Sim core (headless).** `src/sim/queue.ts` — pure functions with injected RNG +
  injectable clock, NO `three` import: `pickNext(queue, now)` enforces priority desc +
  FIFO tie-break + scheduled_for + cancellation; `dispatch(workerPool, task, now)` enforces
  `running ≤ worker_count`; `fail(task, kind, rng, now)` computes `next_attempt_at = base *
  2^retries + jitter(rng)` for `kind: "transient"` and forces DLQ for `kind: "poison"` or
  `retries > max_retries`; `dedup(keyIndex, task)` rejects active duplicate `idempotency_key`;
  `backpressure(queue, capacity)` returns `"open"|"limited"|"full"`. Deterministic seeded RNG
  (`mulberry32`). Vitest covers: priority + FIFO ordering; `running ≤ worker_count` invariant
  on every tick; transient retries with monotonic `next_attempt_at`; poison bypasses retry;
  exhausted retries hit DLQ; idempotency dedup on active keys; backpressure `full` rejects at
  capacity.
- **§13 Milestones.** M0 plan · M1 `sim/queue.ts` + Vitest (no pixels) · M2 scene: hopper +
  arms + annealing rack + scrap chute rendering static sim state · M3 interaction: predict
  dispatch, classify retry/DLQ, `R` reject, `P` pause · M4 levels L1–L4 · M5 evidence emit
  wired to wave clears · M6 Playwright plays L1 headed, asserts evidence + WebGL canvas +
  screenshot.

## Open questions / risks

- Is "predict the next ingot" sufficient active recall, or should L3 also ask the player to
  state the expected `next_attempt_at` backoff slot (typed number) before the annealing rack
  places it? Resolve during M1–M3 playtests.
- Does WebGL run reliably in the Playwright smoke environment (see voxelDojo
  `docs/GAP_ANALYSIS.md` §G6)? Same risk as the other voxelDojo games; the sim core is
  fully headless so M1 is unaffected.
- Poison vs transient must be **visually unambiguous** in the scene (distinct crack patterns /
  colors); if playtests show players guessing, add a brief "inspect" hover that names the
  failure kind before classification (still requires the right call — it just removes the
  perception tax).
