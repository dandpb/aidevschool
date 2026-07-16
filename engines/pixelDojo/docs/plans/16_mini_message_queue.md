# PLAN slice — `16_mini_message_queue` (LOG PIER: partitioned offset river)

> PLAN slice for `/threejs-dojo 16_mini_message_queue`. **Shape B** — a fresh standalone 3D
> (three.js) world at `engines/voxelDojo/game-16-freight-yard/`. The
> pixel-quest encounter kinds (`pixelquest-token-bucket` / `pixelquest-sequence-flow` /
> `pixelquest-route-health` / `pixelquest-policy-gate`) are all variants of "incoming sprite →
> admit/reject"; a Kafka-like log needs **parallel partition lanes + numbered offset slots +
> independent consumer-group cursors + lag geometry + retention tide** — a multi-axis spatial
> system that the flat encounter shell cannot express. Sections follow pixelDojo `PLAN.md`
> numbering (1, 3, 4, 5, 6, 11). Catalog primary concept: *"log-structured message storage with
> partitioned ordered offsets."*

---

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/16_mini_message_queue/` (Level 6 capstone, "Mini
  Message Queue (like Kafka)").
- **ONE concept this game teaches:** **log-structured message storage with partitioned ordered
  offsets** — a topic is N parallel append-only logs (partitions); each appended message gets the
  next partition-local offset (0, 1, 2, …, gap-free, monotonic); producers route by key→partition;
  consumer groups read independently and commit a per-partition *next-to-deliver* offset; lag is the
  distance between latest offset and committed offset; replay = reposition cursor; retention drops
  old offsets so the log is bounded.
- **Catalog key question echoed in play:** *How do partition assignment and consumer-rebalancing
  strategies affect throughput stability?* — the player feels this as "misroute → bottleneck one
  lane, starve another" and "cursor stall → lag spike."
- **Out of scope (other concepts in this project, taught elsewhere):** multi-node replication,
  exactly-once transactions, log compaction tombstones, the Go/Rust/Node throughput comparison
  (the curriculum's job), ISR/follower semantics, cross-region mirroring.
- **Slug:** `16_mini_message_queue`
- **App path:** `engines/voxelDojo/game-16-freight-yard/` (standalone VoxelDojo app — Shape B).
- **Unit id (evidence):** `16_mini_message_queue` (the task's literal target; matches the active
  unit id the verifier selects on). If the implementing agent finds `curriculumPack.ts > unitId()`
  derives `U-16_mini_message_queue` instead, use that derived value consistently across the
  emitter and the smoke driver — the verifier matches `unit_id === active_unit.id`, so the emit
  side and the active-unit side must agree.
- **Encounter id:** `encounter-16_mini_message_queue` (per `encounterId()` in
  `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts:632-637`).
- **Mechanic family:** `threejs-message-queue` (new discriminated metrics kind — see §11).

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element (spec FR) | 3D mechanic (log pier) | What "playing it right" proves |
| --- | --- | --- |
| **Topic = N partitions** (FR-001) | The pier is N **parallel color-coded lanes** stretching into the distance. Each lane is one partition. | Player sees "one topic = many parallel logs," not one queue. |
| **Producer routing by key → partition** (FR-004) | An inbound message orb spawns at the **Producer Platform** carrying a colored key tag. The player must send it down the lane whose color matches `hash(key) mod N`. | Player maps key → deterministic partition; same key always lands same lane. |
| **Explicit partition override** (FR-004) | Rare "stamp" orbs carry an explicit lane number; routing them by key color is a **misroute fault**. | Player learns explicit > key > round-robin precedence. |
| **Append-only, gap-free offsets** (FR-005, FR-006, NFR-005) | Each lane is a row of numbered slots (0, 1, 2, …). An orb only ever snaps into the next empty slot (`nextOffset`); it never inserts, reorders, or skips. | Player sees monotonic append; two concurrent orbs serialize into the lane one after the other. |
| **Consumer group = independent cursor** (FR-008) | Glowing **cursor rings** ride each lane, one per (consumer-group × partition) pair. Multiple consumer groups on the same lane each have their own cursor at their own offset. | Player sees consumers are independent — group A and group B read the same lane at different speeds. |
| **Committed offset = next to deliver** (FR-009) | A cursor sits **on** the slot it will read next (not the one it just read). Commit (X) advances it one slot forward; the orb brightens → dims as it is "fetched then committed." | Player internalizes next-offset semantics (the spec's off-by-one resolution). |
| **At-least-once: fetch ≠ commit** (FR-009, FR-010) | Pressing **X once** fetches (orb brightens, cursor stays). Pressing **X again** commits (cursor advances, orb dims). Skip the commit and the next fetch redelivers the same orb. | Player feels "delivered ≠ consumed" — the curriculum's at-least-once trap. |
| **Lag** (FR-014) | The lane segment between a cursor and the latest filled slot glows **red**, length = lag. The longer the cursor stalls, the brighter and longer the red strip. | Player sees backlog grow under their eyes; cannot ignore a stalled group. |
| **Replay from offset** (FR-011) | **C** rewinds the focused cursor backward along the lane to an earlier retained offset. The orbs between old and old+N brighten again for re-read. | Player sees replay = cursor reposition, not "send again." |
| **Retention drops old offsets** (FR-012) | A slow **Retention Tide** creeps forward along each lane from the near edge, dissolving slots below the new `beginningOffset`. Dissolved slots go dark and unreadable. | Player feels the log is bounded; old data really does disappear. |
| **`offset_no_longer_retained`** (410) | If a cursor's committed offset falls **behind** the tide when the player tries to fetch, the fetch faults with a visible red flash and the cursor must be reset. | Player paces cursor advancement vs retention window. |
| **Partition imbalance → throughput instability** (catalog key question) | Misrouting too many orbs to one lane makes that lane's lag spike while sibling lanes sit idle — visible throughput collapse on the lag meter. | Player feels *why* partition assignment strategy matters. |

## 4. Main loop (10–30s cycle)

1. **Spawn wave** — At wave start, N partition lanes are visible (empty slots up to `retentionHorizon`). M consumer-group cursors sit at offset 0 on their assigned partitions.
2. **Inbound orb** — A message orb appears at the Producer Platform, carrying a colored key tag (and occasionally an explicit lane-number stamp). A 3s delivery deadline ring ticks on the orb.
3. **Route** — Player cycles focus across lanes with `←` `→` and presses `Z` to **produce** into the focused lane. Correct lane = key color matches; wrong lane = `misroute` fault and the orb bounces back to the platform (counts against deadline).
4. **Append** — The orb travels down the lane (visibly serialized behind any in-flight orb — mirrors NFR-005 concurrent-append safety) and snaps into the next empty slot. `nextOffset` for that lane ticks up by one.
5. **Lag tick** — Every lag interval (~2s), every consumer-group cursor that wasn't advanced accrues lag. Red glow on the lane segment behind the cursor grows.
6. **Fetch + commit** — Player cycles focus to a consumer group, presses `X` to **fetch** the orb at the cursor (orb brightens), then `X` again to **commit** (cursor advances one slot, orb dims, lag shrinks). Skipping commit leaves the orb eligible for redelivery on the next fetch.
7. **Retention tick** — Every ~15s the Retention Tide advances `beginningOffset` one slot forward on each lane; the dissolved slot goes dark. Any cursor whose committed offset is now below `beginningOffset` raises a `retention_fault` on its next fetch attempt.
8. **Replay (situational)** — When prompted (e.g., "re-deliver offset 3 to billing group"), the player presses `C` to rewind the cursor; the next fetch re-reads that offset.
9. **Repeat** until the wave's quota of inbound orbs is produced AND every consumer group has committed past the wave's commit target. Wave length ≈ 20–30s.

## 5. Inputs & controls

- `←` `→` — cycle focus: across **partition lanes** when routing mode (default after a spawn), across **consumer groups** when fetch mode (default after a successful produce).
- `Z` — **produce**: append the platform orb into the focused partition lane.
- `X` — **fetch** (first press on a consumer group) then **commit** (second press). Two-step on purpose — teaches fetch ≠ commit.
- `C` — **replay**: rewind the focused consumer-group cursor to an earlier retained offset (held length = wave's replay-window size).
- `Space` — pause/step the inbound deadline ring (training mode only; disabled in the gated attempt).
- Mouse: optional orbit-camera drag for inspection (no gameplay effect; aids 3D legibility).

Three primary actions (`←` `→`, `Z`, `X`) plus one situational (`C`) — NES-pad friendly. No typing,
no precise aiming.

## 6. Win / fail states

**Win a wave** when **all** of:

- `messages_produced === messages_inbound` (every platform orb was routed and appended).
- `misroutes === 0` (no orb sent down a lane whose color ≠ key color, and no stamped orb routed by key).
- `ordering_violations === 0` (no orb ever snapped into a non-`nextOffset` slot — the append-only,
  gap-free invariant; should be structurally impossible, but the metric catches a serialization bug).
- `commits >= LEVEL_COMMIT_TARGET[level]` (every consumer group has committed past its target offset).
- `lag_peak <= LEVEL_LAG_TOLERANCE[level]` (no cursor stalled long enough to overflow its buffer).
- `retention_faults === 0` (no cursor was caught behind the Retention Tide).
- `replay_faults === 0` (no replay requested on a non-retained offset).
- `deadline_misses === 0` (no platform orb expired before produce).

**Fail the wave** when **any** of the above breaches. Each failure is a **direct readout of log
discipline** — partition routing, offset ordering, cursor commitment, lag hygiene, retention
awareness. The wave cannot be cleared by mashing `Z`.

## 11. Learning-gate hooks

- **Active unit:** `16_mini_message_queue` (project `16_mini_message_queue`, Level 6). Selected by
  the verifier as the latest record whose `unit_id` matches
  `learner/learning_state.yaml > active_unit.id`.
- **Encounter id wired:** `encounter-16_mini_message_queue` (per `encounterId()` in
  `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts:632-637`).
- **Evidence channel:** `window.__voxelDojoEvidence`, mirrored as an `EVIDENCE <json>` console
  record for the Playwright smoke driver.
- **New metrics kind:** `threejs-message-queue` — extends the discriminated union in
  `engines/pixelDojo/pixel-quest/src/game/evidence/types.ts`. Add this variant alongside the
  existing `pixelquest-*` kinds; the validator (`evidence.ts`) dispatches on `metrics.kind`.

### Evidence record shape

```json
{
  "source": "pixelquest",
  "unit_id": "16_mini_message_queue",
  "project": "16_mini_message_queue",
  "encounter_id": "encounter-16_mini_message_queue",
  "game": "PixelDojo Quest",
  "ts": "<iso-8601>",
  "pass": true,
  "metrics": {
    "kind": "threejs-message-queue",
    "level": 2,
    "partitions_managed": 3,
    "consumer_groups": 2,
    "messages_inbound": 12,
    "messages_produced": 12,
    "correct_routes": 12,
    "misroutes": 0,
    "ordering_violations": 0,
    "commits": 8,
    "lag_peak": 2,
    "lag_max_tolerance": 3,
    "replays": 1,
    "replay_faults": 0,
    "retention_faults": 0,
    "deadline_misses": 0
  },
  "curriculum_context": {
    "concept": "Log-structured storage with partitioned ordered offsets, consumer-group cursors, lag, replay, retention",
    "mechanic": "Log Pier (3D partition lanes + offset slots + cursor rings + retention tide)",
    "accepted_signal": "key-colored orb routed to matching lane, appended at nextOffset, cursor fetched-then-committed, lag held under tolerance",
    "rejected_trap": "misroute to wrong lane, skip commit (at-least-once redelivery), cursor left behind the retention tide"
  },
  "review_context": {
    "unit_kind": "concept",
    "scheduled_review": true,
    "review_reason": "due",
    "streak_candidate": true,
    "scheduler_source": "learner-substrate",
    "verifier_required": true
  }
}
```

### Field semantics (for the implementing agent + verifier)

| Field | Type | Meaning |
| --- | --- | --- |
| `metrics.kind` | `"threejs-message-queue"` | Discriminator. New variant. |
| `metrics.level` | `number` | Level cleared (1–5). Gated attempt is L2. |
| `metrics.partitions_managed` | `number` | Distinct lanes active this wave. |
| `metrics.consumer_groups` | `number` | Independent cursor groups active this wave. |
| `metrics.messages_inbound` | `number` | Orbs spawned at the platform (the wave quota). |
| `metrics.messages_produced` | `number` | Orbs the player successfully appended to a lane. |
| `metrics.correct_routes` | `number` | Produces where lane color matched key color (or explicit stamp honored). |
| `metrics.misroutes` | `number` | Produces into the wrong lane. **Must be 0.** |
| `metrics.ordering_violations` | `number` | Any append that didn't land at `nextOffset` (structural invariant). **Must be 0.** |
| `metrics.commits` | `number` | Successful cursor advances (fetch+commit counted as one commit). |
| `metrics.lag_peak` | `number` | Max red-segment length observed on any lane during the wave. |
| `metrics.lag_max_tolerance` | `number` | Level-dependent cap; `lag_peak` must stay `<=` this. L2 tolerance = 3. |
| `metrics.replays` | `number` | Count of C-rewinds executed (situational; not gated to 0). |
| `metrics.replay_faults` | `number` | Replays requested on a non-retained offset. **Must be 0.** |
| `metrics.retention_faults` | `number` | Fetches attempted while cursor sat below `beginningOffset`. **Must be 0.** |
| `metrics.deadline_misses` | `number` | Platform orbs that expired before produce. **Must be 0.** |

### Pass rule (gate)

A wave's `pass: true` requires **all** of:

```
metrics.kind                === "threejs-message-queue"
metrics.messages_produced   === metrics.messages_inbound     // nothing dropped on the platform
metrics.misroutes           === 0                            // partition-routing invariant (FR-004)
metrics.ordering_violations === 0                            // append-only, gap-free (FR-005/FR-006/NFR-005)
metrics.retention_faults    === 0                            // cursor vs retention tide (FR-012)
metrics.replay_faults       === 0                            // replay within retained window (FR-011)
metrics.deadline_misses     === 0                            // producer pacing
metrics.lag_peak            <= metrics.lag_max_tolerance     // consumer pacing (FR-014 lag)
metrics.commits             >= LEVEL_COMMIT_TARGET[level]    // L2 target = consumer_groups × commit_per_group
```

Anything else keeps the gate locked. The game emits evidence only — it **never** writes
`learner/learning_state.yaml`. The gate (`python3 -m learner.gate --evidence PATH`) reads captured
NDJSON, finds the latest record whose `unit_id === active_unit.id`, checks the pass-rule above
against the metrics, and only then appends to `units_log` through `learner/substrate/`. The game's
`pass: true` is **never** mastery by itself.

### Done-rule (one line, for the verifier + implementer subagent)

> A 3D world at `engines/voxelDojo/game-16-freight-yard/` renders N parallel
> partition lanes of numbered offset slots, routes each inbound message orb to the key-matching
> lane where it appends at `nextOffset`, lets the player fetch-then-commit independent per-group
> cursors (with replay via rewind) while a Retention Tide dissolves old slots, and emits a valid
> `threejs-message-queue` EVIDENCE record with `pass: true` for `unit_id=16_mini_message_queue`
> under Playwright on level 2, with `misroutes === 0`, `ordering_violations === 0`,
> `retention_faults === 0`, and `lag_peak <= 3`.
