# PLAN slice — `15_metrics_collector` (Shape B: Metrics Observatory)

> PLAN slice for `/threejs-dojo 15_metrics_collector`. The slug's catalog concept row is
> "Time-series data, counters/gauges/histograms, aggregation (sum/avg/p95), downsampling, retention,
> Prometheus-compatible format, alerting". This slice narrows that row to its **primary** concept
> (per `curriculum/15_metrics_collector/docs/spec.md` "Learning Objectives" and the
> `ROUTING_MANIFEST.md` row for this slug): **histogram bucketing → percentile estimation from
> cumulative bucket counts → threshold alert lifecycle**. Counters/gauges, Prometheus exposition,
> downsampling and retention are out of scope — one game = one concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent
> *bucketed distribution data with cumulative percentile reads and a stateful alert plane* — they
> are all variants of "incoming sprite → admit/reject", which has no spatial bucket column, no
> cumulative-count ribbon, and no threshold plane that can be crossed. The concept needs 3D terrain,
> so it gets its own world.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/15_metrics_collector/`
- **ONE concept this game teaches:** a histogram metrics pipeline where each observation is routed
  to the bucket whose upper bound is the smallest bound `≥ value` (Prometheus `_bucket{le="..."}`,
  FR-003), the stream stores `count`, `sum`, and per-bucket counts (FR-003), percentiles are
  estimated from the **cumulative** bucket counts (FR-008 / FR-009 / NFR-005), and an alert rule
  evaluates an aggregated percentile against a threshold over a window with the lifecycle
  `pending → firing → resolved` (FR-014 / FR-015). Out of scope: counter/gauge ingestion paths,
  Prometheus text exposition, downsampling, retention sweeps, the Go/Rust/Node comparison (those
  are the curriculum project's job, not the game's).
- **Slug:** `15_metrics_collector`
- **Catalog key question (context only, not the win condition):** "How do histogram bucket
  strategies affect p99 accuracy across runtimes?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective + manifest concept
  row):** the player demonstrates that an observation lands in the correct `[le]` bucket,
  percentiles (p50/p95/p99) are read from the cumulative-count ribbon, and an alert crosses
  `pending → firing → resolved` as the aggregated percentile breaches and clears the threshold —
  all driven through deterministic invariants (RF-003, RF-008, RF-009, RF-014, RF-015).
- **Unit id (evidence target):** `U15-metrics-collector` (per
  `.loops/threejs-dojo/ROUTING_MANIFEST.md`; the substrate does not yet have this unit registered,
  so the run emits `scheduled_review: false`, `review_reason: "deepening"` until it is added).
- **Encounter / scene id:** `metrics-observatory-01`
- **Engine / dir / port:** `voxelDojo` · `game-15-observatory` · `5215`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Bucket configuration `[le]` (FR-003, NFR-004)** | A row of `N` translucent columns arrayed left-to-right across the observatory floor, each labeled with a Prometheus upper bound (`le=5`, `le=10`, `le=25`, `le=50`, `le=100`, `le=250`, `le=500`, `le=+Inf`). The last column is the overflow sink. The HUD lists the full bucket plan at wave start. | Player internalizes that buckets are configured upper bounds, not arbitrary bins — and that `+Inf` always exists. |
| **Observation → bucket assignment (RF-003)** | Latency orbs rain from the sky, each labeled with a value (e.g. `42ms`, `380ms`). The player-slide-claw moves along the row; pressing **Z** above column `i` drops the orb into that bucket. The scene only accepts the orb in the column whose `le` is the smallest `≥ value` — a wrong drop bounces off with a red flash and is recorded as `misbucketed`. | Player proves they can route by upper-bound, the single deterministic rule of histogram ingestion. |
| **Per-bucket counts (`_count`, `+Inf`) (FR-003)** | Each accepted orb grows a solid bar inside its column. Bar height ∝ running count. A small numeric tick above each column ticks up. The rightmost `+Inf` column is always eligible — overflow observations land there, never disappear. | Player sees the histogram fill as cumulative distribution, not a list of points. |
| **Cumulative-count ribbon (FR-008, FR-009)** | Above the row runs a horizontal ribbon whose segments are the **cumulative** count up to and including each `le`. The ribbon doubles as a p-ruler: when a percentile beacon fires, the ribbon highlights the single segment whose cumulative range contains the requested percentile of total count. | Player links "percentile" to "cumulative count divided by total count" — the invariant the spec calls out as approximation (NFR-005). |
| **Percentile query p50/p95/p99 (FR-008, FR-009)** | A beacon flies in requesting e.g. `p95`. The player presses **X** to read the ribbon: the HUD shows the running `total_count`, `0.95 × total_count`, and the bucket index whose cumulative range contains that rank. The player must press **←/→** to aim a cursor at exactly that bucket and press **X** again to commit the answer. Wrong commit = `percentile_miss`. | Player demonstrates that percentile = rank-lookup on cumulative buckets, not an average. |
| **`sum` accumulator (FR-003)** | A side gauge displays the running `sum` of all observation values. The player doesn't directly edit it — but each misbucketed orb fails to add its value to `sum`, which would corrupt later avg computations; the smoke checks `sum` against the deterministic seed. | Player observes that `sum` is only correct when every observation lands in a bucket — the contract a real recorder owes callers. |
| **Alert rule threshold (FR-014)** | A horizontal **alert plane** — a translucent red disk that the player raises/lowers with **↑/↓** above the bucket row. The plane represents "fire if the p95 bar pierces me". The player must position the plane at the threshold value announced in the wave card (e.g. "alert if p95 ≥ `le=100`"). | Player treats an alert rule as "threshold on an aggregate", the spec's FR-014. |
| **Alert lifecycle `pending → firing → resolved` (FR-015)** | Once the plane is set, the wave runs the observation stream. When the p95 bar first pierces the plane, the plane edges flash amber = `pending`. If the p95 bar stays pierced for the configured hold window (visible timer ring around the plane), the plane goes solid red = `firing`. When subsequent observations drop p95 back below the plane, the plane dims back to green = `resolved`. The player must NOT press **V** (acknowledge) out-of-order: pressing **V** while in `pending` is a no-op; pressing **V** after `firing` is the runbook ack; pressing **V** only ends the alert once state has returned to `resolved`. | Player proves they can read the three-state lifecycle as the spec encodes it (FR-015) — not a binary "alert on / alert off". |
| **Windowing (FR-008 time range, RF-007)** | A floor dial lets the player rotate the time window (`30s` / `5m` / `1h`). Older observations visibly dim; bars recompute over the visible window only. The p95 ribbon and alert plane react to the live window. | Player sees that percentiles and alerts are evaluated over a window, not over all history — the unit the spec calls a "range query". |
| **Cardinality / overflow safety (NFR-004, NFR-010)** | If a wave spawns more orbs than fit on the conveyor (player too slow), the queue rejects the excess with a visible `429 DROP` flash rather than letting the terrain grow unbounded. | Player experiences backpressure as an explicit reject, mirroring FR-018 / NFR-004. |

## 4. Main loop (the ~30–45 s cycle the player repeats)

1. **Wave card.** The HUD posts the wave contract, e.g. `WAVE 2: 12 obs, buckets [5,10,25,50,100,250,500,+Inf], alert: p95 ≥ le=100, hold=4s, window=30s`. Alert plane spawns at height 0; the player has a few seconds to read.
2. **Position the alert plane.** The player presses **↑/↓** to lift the plane to the `le=100`
   column height (the threshold). The plane snaps to a column edge to disambiguate.
3. **Observation stream.** Orbs rain in, in a seeded but shuffled order. For each orb the player:
   - Reads the value on the orb (e.g. `42ms`).
   - Slides the claw (**A/D** or **←/→**) to the column whose `le` is the smallest `≥ 42` (here `le=50`).
   - Presses **Z** to drop. Bar grows; ribbon widens; `sum` increments.
4. **Percentile beacon.** Mid-wave a beacon arrives (`p95?`). The player presses **X** to read the
   ribbon, then aims the cursor with **←/→** at the highlighted cumulative segment and presses
   **X** again to commit the bucket answer.
5. **Alert evaluates live.** As more orbs land, the p95 bar grows. When it pierces the plane:
   amber `pending` ring begins. If held through the timer: red `firing`. The wave then injects a
   cool-down burst of small-value orbs to drop p95 back below the plane; plane dims to green
   `resolved`. Player presses **V** to ack the resolved alert.
6. **Wave clear.** When the queue empties AND the alert has reached `resolved` AND any outstanding
   percentile beacon is answered, the observatory dims and the HUD posts the wave score:
   `{obs_bucketed_correct, obs_misbucketed, percentile_queries_correct, percentile_queries_wrong,
   alert_threshold_correct, alert_lifecycle_correct, overflow_drops}`.
7. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page channel and to `engines/voxelDojo/games/15_metrics_collector/.logs/evidence.ndjson`.
   The next wave (more obs, tighter buckets, higher percentile p99, longer hold) unlocks.

## 5. Inputs & controls (≤ 4 primary actions, NES-pad feel)

- **A/D** or **←/→** — slide the claw along the bucket row (also aims the percentile-answer cursor
  when a beacon is active).
- **Z** — DROP: commit the carried orb to the column under the claw. Primary write action.
- **X** — READ/ANSWER: first press reads the cumulative ribbon into the HUD; second press (after
  aiming) commits the percentile-answer bucket. Primary read action.
- **↑/↓** — raise / lower the alert plane to the threshold column edge. Primary alert-set action.
- **V** — ACK: acknowledge a `resolved` alert (no-op in other states — that itself is the lesson).
  Secondary lifecycle action.
- **Q** — rotate the window dial (`30s → 5m → 1h → 30s`). Secondary query action.
- **H** — HUD toggle: show the live `le` preview while carrying an orb (allowed in wave 1,
  disabled in later waves to test mastery without the crutch).
- Four primary actions (**Z**, **X**, **↑/↓**, **V**) define the loop; **Q** and **H** are
  context-locked so they don't overload the player.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `obs_bucketed_correct === obs_total` (every observation routed to its smallest-`le`-≥-value
    column; `+Inf` counts as eligible for any value but is wrong when a smaller bound exists),
  - `obs_misbucketed === 0`,
  - `percentile_queries_correct === percentile_queries_total` (every p50/p95/p99 answered with the
    bucket whose cumulative range contains the requested rank),
  - `alert_threshold_correct === true` (the plane was set to the wave-card threshold before the
    stream finished),
  - `alert_lifecycle_correct === true` (the alert transitioned `pending → firing → resolved` in
    order and the player acked only after `resolved`),
  - `overflow_drops === 0` (no observation was rejected by the queue).
- **Fail the wave (FAIL)** when **any** of:
  - An orb is dropped into the wrong bucket (`obs_misbucketed > 0`) → the orb bounces, the bucket
    flashes red, evidence `pass: false`.
  - A percentile query is answered with the wrong bucket (`percentile_queries_wrong > 0`) → the
    ribbon highlights the correct segment in green and the player's choice in red, evidence
    `pass: false`.
  - The plane is left at the wrong threshold (`alert_threshold_correct === false`) → the alert
    never fires or fires for the wrong window, evidence `pass: false`.
  - The lifecycle is broken — e.g. player acks during `pending`, or the alert never reaches
    `resolved` because the cool-down burst was mis-bucketed (`alert_lifecycle_correct === false`).
  - The conveyor overflows (`overflow_drops > 0`) → observatory alarm, evidence `pass: false` with
    `overflow: true`.
- Both outcomes are **direct readouts of histogram + percentile + alert discipline**. Neither win
  nor fail is gated on raw speed — correctness first; the only clock is the alert hold timer,
  which is itself the concept being taught.

## 11. Learning-gate hooks

- **Active unit:** `U15-metrics-collector` (project `15_metrics_collector`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still emits
  evidence with `scheduled_review: false` and `review_reason: "deepening"` (per
  `ROUTING_MANIFEST.md`); the verifier will not promote until the substrate registers the unit.
  The game never writes learner state.
- **Encounter / scene id:** `metrics-observatory-01`.
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus
  `console.log("EVIDENCE " + json)` plus NDJSON at
  `engines/voxelDojo/games/15_metrics_collector/.logs/evidence.ndjson`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Test hook:** `window.__metricsObservatory` exposing the deterministic public API
  (`routeObservation(value)`, `setAlertThreshold(leIndex)`, `queryPercentile(p)`,
  `tickAlert()`, `getWindow()`) so the Playwright smoke drives the loop without DOM timing races —
  copy the `__hashRing` pattern from `game-10-hash-ring`.
- **Evidence record fields** (this game's metrics variant — `kind: "voxeldojo-metrics-observatory"`):
  ```json
  {
    "source": "voxeldojo",
    "unit_id": "U15-metrics-collector",
    "project": "15_metrics_collector",
    "scenario_id": "metrics-collector-L2",
    "game": "Metrics Observatory",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldojo-metrics-observatory",
      "bucket_plan": [5, 10, 25, 50, 100, 250, 500, Infinity],
      "obs_total": 12,
      "obs_bucketed_correct": 12,
      "obs_misbucketed": 0,
      "percentile_queries_total": 3,
      "percentile_queries_correct": 3,
      "percentile_queries_wrong": 0,
      "sum_observed": 12480,
      "sum_recorded": 12480,
      "alert_threshold_requested_le": 100,
      "alert_threshold_set_le": 100,
      "alert_threshold_correct": true,
      "alert_lifecycle_observed": ["pending", "firing", "resolved"],
      "alert_lifecycle_correct": true,
      "window_seconds": 30,
      "overflow_drops": 0
    },
    "curriculum_context": {
      "concept": "histogram bucketing, percentile estimation from cumulative counts, alert lifecycle",
      "mechanic": "Metrics Observatory",
      "accepted_signal": "observation routed to smallest le>=value bucket; percentile read from cumulative ribbon; alert pending->firing->resolved",
      "rejected_trap": "wrong-bucket drop, wrong percentile bucket, or alert acked outside resolved state"
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
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.obs_misbucketed === 0` AND
  `metrics.percentile_queries_wrong === 0` AND `metrics.alert_threshold_correct === true` AND
  `metrics.alert_lifecycle_correct === true` AND `metrics.overflow_drops === 0` AND
  `metrics.sum_observed === metrics.sum_recorded` AND
  `metrics.obs_bucketed_correct === metrics.obs_total` AND
  `metrics.percentile_queries_correct === metrics.percentile_queries_total` AND
  `metrics.alert_lifecycle_observed` is exactly `["pending","firing","resolved"]`.
  (i.e. every observation hit its bucket, every percentile was answered from cumulative counts,
  the threshold was set correctly, the alert transitioned in order, the sum is consistent, and
  nothing was dropped.)
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  plan slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the Metrics Observatory 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `15_metrics_collector`, unit
  `U15-metrics-collector`, where every observation was routed to the smallest `le >= value`
  bucket, every percentile query (p50/p95/p99) was answered from the cumulative-count ribbon,
  `sum` was preserved across all observations, and the alert transitioned
  `pending → firing → resolved` with the player acking only after `resolved` — end-to-end under
  Playwright."**

## Open questions / risks (for the implementer)

- **Bucket plan choice.** Start with the Prometheus-default-ish `[(5,10,25,50,100,250,500,+Inf)]`
  (8 buckets). Keep `+Inf` always present and always rendered as the rightmost sink — never let an
  observation escape. Wave 3 can introduce a tighter plan to teach p99 sensitivity (the spec's
  key question).
- **Percentile approximation.** The cumulative ribbon gives a bucket index, not an interpolated
  value. The HUD must say "p95 ∈ `le=100`" (bucket-bounded), not a fake-decimal "p95 = 87.3".
  Document this in the briefing as the same approximation caveat the spec encodes (NFR-005).
- **Hold timer scale.** Real alert hold windows are 30s+; in-game use ~4s so the player can see
  `pending → firing` within one wave. Expose the scale factor in the HUD.
- **Cool-down burst.** Wave 2+ must inject a deterministic small-value burst near the end of the
  stream so p95 drops back below the plane and `resolved` is reachable inside the wave's
  time budget — otherwise the lifecycle can never close and the wave is unfair.
- **`+Inf` overflow and rejection.** Make the wrong-vs-right call unambiguous: dropping an orb
  into a bucket whose `le < value` is always wrong; dropping into `+Inf` when a smaller bound
  would fit is also wrong (teaches the "smallest le ≥ value" rule). The HUD preview (**H**) is
  the crutch that makes this learnable in wave 1.
