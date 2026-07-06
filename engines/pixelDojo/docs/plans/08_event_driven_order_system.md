# PLAN slice — `08_event_driven_order_system` (Timeline Tower)

> PLAN slice for `/threejs-dojo 08_event_driven_order_system`. Shape **B** (sibling 3D app).
> Per the routing manifest this lands as a fresh voxelDojo app at
> `engines/voxelDojo/game-08-timeline-tower/` (port 5208, unit_id `U8-event-driven`).
> The catalog concept is "Pub/sub, event sourcing, eventual consistency, projections, sagas,
> outbox pattern"; the **ONE** thing this game teaches is the trinity
> **append-only event log → async projection → event replay**, with the order lifecycle as the
> visible narrative that carries it.

## 1. Subject & concept

- **Curriculum project:** `curriculum/08_event_driven_order_system/`
- **One concept this game teaches:** **event-sourced order lifecycle with asynchronous
  projections** — every state change is an immutable event appended to a per-order log; the
  authoritative order state is the **fold** of those events; read models (projections) are
  derived asynchronously and lag behind the log; replay rebuilds projections from the log
  without touching source events.
- **Catalog key question (the done-rule, one sentence):** *"How do event replay and projection
  rebuild times compare across language runtimes?"* — the player must physically drive a replay
  and feel projection lag to clear the level. That is the learning objective.
- **Out of scope (other people's job):** Go/Rust/Node perf comparison, durable SQLite plumbing,
  HTTP wire format, broker clustering, schema-version migration. This game teaches the
  *shape* of event sourcing + projections + replay, not the benchmarks.
- **Slug:** `08_event_driven_order_system`
- **Region id / dir:** `engines/voxelDojo/game-08-timeline-tower/`
- **Unit id (evidence field):** `U8-event-driven` (from
  `.loops/threejs-dojo/ROUTING_MANIFEST.md`; the verifier keys on this exact string, not the
  project slug).
- **Project (evidence field):** `08_event_driven_order_system`
- **Scenario id pattern:** `timeline-tower-L<n>` (n = 1..4)
- **Game name (evidence field):** `"Timeline Tower"`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic (Timeline Tower) | What "playing it right" proves |
| --- | --- | --- |
| **Append-only event log = source of truth** | A vertical tower of stacked glowing floors, bottom-up, one floor per appended event. Lower floors are immutable — the player can never edit, reorder, or remove them. | The learner feels "state = fold of history"; the log is the truth, not a side-effect. |
| **Per-aggregate sequence is strict** (OrderCreated=1 → PaymentAuthorized=2 → … → OrderDelivered=N) | Each floor is numbered; a new floor only slots in at sequence = top+1. Floors are colour-coded per event type. | The learner links "next valid transition" to "next sequence number." |
| **Command validation / invalid transitions** | The player can press **X** to issue a forbidden command (e.g. Ship before OrderConfirmed, or Cancel a Delivered order). The tower **rejects** it: red flash, no floor added, evidence counter `invalid_transitions_rejected += 1`. | The learner sees the aggregate state-machine guarding the log. |
| **Async projections (read model lags)** | A floating **Projection Sphere** hovers beside the tower. Particle beams stream from each new floor to the sphere on a delay. The sphere's lit floor-count is the materialized read. | The learner watches the gap between "written" and "readable" — eventual consistency made visible. |
| **Eventual consistency** | The **V** key *queries* the sphere. Early queries return a stale status; the learner must wait for the beams to arrive before the sphere matches the tower top. | The learner accepts "query the projection, not the log" and budgets for lag. |
| **Saga orchestration** (RF-011) | After the OrderCreated floor, two **side-spires** light up: a Payment Forge and an Inventory Forge. Both must finish before the OrderConfirmed floor can be added. If either fails, an OrderCancelled **compensation** floor is added instead. | The learner drives a multi-step saga with compensation, not a single transaction. |
| **Transactional outbox** (RF-007) | Each new floor spawns a token on a **parallel side-rail** (the outbox). An auto-publisher ferries tokens to the Pub/Sub Beacon before the projection beam can fire. **E** toggles the publisher off; tokens pile up, the projection stalls, health orb turns amber. | The learner sees why append-without-publish loses events on crash, and why the outbox exists. |
| **Pub/sub at-least-once + idempotent subscriber** | Tokens may duplicate on the rail; the projection sphere dedupes by floor sequence number (visual: a duplicate token harmlessly fizzles on contact). | The learner internalises "at-least-once delivery → idempotent consumer." |
| **Event replay rebuilds projections** (RF-010, RNF-005 — the done-rule) | A **Replay Crank** orbits the tower. Holding **Q** grabs it; **← / →** then scrubs backward/forward through the log. The sphere rebuilds in fast-forward by re-folding from floor 1. The tower itself never changes. | The learner physically performs the benchmark action — replay — and watches projection rebuild from immutable history. |
| **Optimistic concurrency** (RF-005, level-4 hazard) | A level-4 "concurrent editor" hazard appends a floor mid-press; if the player's command assumed the old top, the tower rejects it with a `409 concurrency_conflict` flash. | The learner discovers why commands carry `expected_version`. |

## 4. Main loop (the 20–40s cycle the player repeats)

1. **Spawn an order.** Player at floor level presses **SPACE** when idle → an `OrderCreated`
   floor (sequence 1) is appended at the tower top with a chime; a token spawns on the outbox
   rail; the projection beam begins travelling to the sphere.
2. **Drive the saga.** Side-spires light. Player aims the drone at the Payment Forge and presses
   **SPACE** to authorise → `PaymentAuthorized` floor (seq 2). Same at the Inventory Forge →
   `InventoryReserved` floor (seq 3). When both are up, the saga auto-appends `OrderConfirmed`
   (seq 4) with a bright flash.
3. **Continue the lifecycle.** Player presses **SPACE** at the tower → `OrderShipped` (seq 5),
   then **SPACE** again → `OrderDelivered` (seq 6). One order is now complete; the sphere catches
   up and shows status `delivered`.
4. **Negative test.** Mid-lifecycle the player presses **X** to attempt an invalid transition
   (e.g. Ship while still `pending`). Tower rejects with a red flash; no floor added. This
   **must** happen at least once per level — the rejection is the proof the state machine is
   wired.
5. **Replay (the done-rule).** On levels 3 and 4 the player must press **Q**, grab the crank,
   and scrub from floor 1 to top. The sphere visibly rebuilds from the log. If the rebuilt
   sphere matches the live sphere, replay is consistent → `replay_performed: true,
   projection_desync_after_replay: false`.
6. **Query and confirm.** Player presses **V** to read the projection; if it matches the tower
   top and lag is 0, the level clears and one EVIDENCE record is emitted.

Total cycle per order ≈ 25–40s; a level is N=3 orders in L1, scaling up to N=5 with saga
failures in L4.

## 5. Inputs & controls (≤3 main + 3 ops, NES-pad friendly)

| Key | Action | Concept taught |
| --- | --- | --- |
| **← / →** (or A/D) | Orbit the operator drone around the tower; aim at floor / forge / crank | navigation |
| **SPACE** | Append the next valid lifecycle event at the aimed target (tower top, payment forge, inventory forge) | append-only log + saga |
| **X** | Issue a forbidden transition (negative test — must be rejected) | command validation |
| **Q** | Grab / release the Replay Crank; while grabbed, ← / → scrubs log time | event replay (the done-rule) |
| **E** | Toggle the outbox publisher on/off | transactional outbox |
| **V** | Query the projection sphere (read model) | eventual consistency |

Drone auto-orients to the nearest interactive target (tower top, payment forge, inventory
forge, replay crank) — no precise aiming needed; the cycle stays rhythmic.

## 6. Win / fail states (both are direct readouts of using the concept correctly)

**Win level N** when **all** of:

- `orders_completed >= target_N` (N=3 in L1; N=4 in L2; N=4 in L3; N=5 in L4 with one saga
  compensation required).
- `invalid_transitions_accepted == 0` — every forbidden command was rejected by the tower.
- `invalid_transitions_rejected >= 1` — the player performed at least one negative test that
  the tower blocked (proves the state machine is wired, not skipped).
- `outbox_backlog_peak < threshold_N` — the publisher was never left off long enough to
  overflow (L3+).
- `projection_lag_peak_events` is finite and, by end of level, the sphere matches the tower.
- On levels that require replay (L3, L4): `replay_performed === true` AND
  `projection_desync_after_replay === false` (the rebuilt sphere matches the live one).

**Fail level** when **any** of:

- An invalid transition was *accepted* (a forbidden floor was appended) — the state machine is
  broken; immediate red-screen fail.
- Outbox overflowed (publisher off past `threshold_N` tokens stacked) — health orb red,
  projection frozen, level fails with the message "outbox overflow — events would be lost on
  crash."
- Replay was required but the rebuilt sphere desyncs from the live sphere
  (`projection_desync_after_replay === true`) — the log and the projection diverged; replay
  failed.
- Optimistic-concurrency hazard was triggered and the player did not retry with the correct
  `expected_version` before the level timer ended.

Both win and fail are **direct readouts of event-sourcing discipline**: the log's immutability,
the projection's lag, and replay's correctness are the three things being measured.

## 11. Learning-gate hooks

- **Active unit (evidence target):** `U8-event-driven` (project `08_event_driven_order_system`).
  The substrate does not yet have this unit wired (only `U0-sonda-rate-limiter-robustness`
  exists in `learner/learning_state.yaml`); per `ROUTING_MANIFEST.md`, emit
  `scheduled_review: false`, `review_reason: "deepening"`, `verifier_required: true`. The game
  **never** writes learner state — it emits evidence only.
- **Evidence record shape** (voxelDojo canonical — see `ROUTING_MANIFEST.md` "Stack
  invariants"):
  ```json
  {
    "source": "voxeldojo",
    "unit_id": "U8-event-driven",
    "project": "08_event_driven_order_system",
    "scenario_id": "timeline-tower-L1",
    "game": "Timeline Tower",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldojo-timeline-tower",
      "level": 1,
      "orders_completed": 3,
      "events_appended": 18,
      "invalid_transitions_rejected": 2,
      "invalid_transitions_accepted": 0,
      "outbox_backlog_peak": 1,
      "projection_lag_peak_events": 2,
      "saga_compensations": 0,
      "replay_performed": false,
      "projection_desync_after_replay": false
    },
    "review_context": {
      "scheduled_review": false,
      "review_reason": "deepening",
      "verifier_required": true
    },
    "curriculum_context": {
      "concept": "event-sourced order lifecycle with async projections",
      "mechanic": "Timeline Tower (3D event-log tower + projection sphere + replay crank)",
      "accepted_signal": "lifecycle floors appended in order; projection catches up; replay rebuilds matching sphere",
      "rejected_trap": "skipping the projection/replay step; outbox left to overflow; invalid transition accepted"
    }
  }
  ```
  The emitter pushes this object to **both** `window.__voxelDojoEvidence` (append-only array)
  **and** `console.log("EVIDENCE " + JSON.stringify(record))`. The Playwright smoke captures
  the `EVIDENCE` console line and writes `.logs/evidence.ndjson`. Validation
  (`validateEvidenceRecord`) rejects malformed records before emission.
- **Pass rule (gate, evaluated by the verifier — not the game):**
  `evidence.pass === true`
  AND `metrics.kind === "voxeldojo-timeline-tower"`
  AND `metrics.invalid_transitions_accepted === 0`
  AND `metrics.invalid_transitions_rejected >= 1`
  AND `metrics.orders_completed >= target_for_level`
  AND, when `metrics.replay_performed === true`,
       `metrics.projection_desync_after_replay === false`.
  Anything else keeps the gate locked. The verifier maps the eligible record to
  `fail` / `pass_retried` / `pass_first_try` and appends the review to
  `learner/learning_state.yaml > units_log` via the substrate — never the game.
- **Done-rule (one sentence, hand to the fresh-context verifier):** *The Timeline Tower app at
  `engines/voxelDojo/game-08-timeline-tower/` runs green on `pnpm run lint|test|typecheck|build|smoke`,
  the smoke captures ≥1 valid `EVIDENCE` line with `source: "voxeldojo"`, `unit_id:
  "U8-event-driven"`, `project: "08_event_driven_order_system"`, `pass: true`, and the
  metrics prove the player drove an order end-to-end through the event-sourced lifecycle,
  performed at least one rejected invalid-transition test, kept the outbox bounded, and — on
  levels that require it — replayed the log to rebuild a matching projection.*
- **Side-effect contract** (mirrors pixelDojo's invariant): the smoke must assert that the app
  never publishes `window.__pixelQuestLearningState`, never writes `localStorage` keys
  `learning_state` / `units_log` / `mastered`, and the verifier subagent — not the game —
  owns the mastery transition.
