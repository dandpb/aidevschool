# PLAN slice — `17_distributed_config_service` (Shape B: Quorum Citadel)

> PLAN slice for `/threejs-dojo 17_distributed_config_service`. The slug's catalog concept row is
> "Consensus (Raft/Paxos simplified), watch/notify, versioning, linearizability, ACL per key, audit,
> rollback, multi-region replication, feature flags". This slice narrows that row to its **primary**
> concept (per `curriculum/17_distributed_config_service/docs/spec.md` "Learning Objectives"):
> **consensus-backed distributed configuration writes with observable watch/notify semantics** — i.e.
> a write is acknowledged only after a quorum of nodes commits it through a Raft-style log, watchers
> receive the committed change as a notification, and reads stay local/instant. The other facets
> (multi-region replication topology, feature-flag targeting rules, audit-log format, the Go/Rust/Node
> perf comparison) are out of scope — one game = one concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent *a write
> traveling to a ring of sentinel nodes for quorum, then fanning out as notification particles to
> orbiting watcher drones, with version history stacked behind the monolith and the leader halo
> migrating on node loss* — they are all variants of "incoming sprite → admit/reject". Quorum
> Citadel needs 3D space (a radial sentinel ring around a central monolith, vertical history stack,
> orbiting watcher drones) so the concept gets its own world.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/17_distributed_config_service/`
- **ONE concept this game teaches:** a distributed configuration service where every write MUST pass
  through a Raft-style quorum before it is acknowledged as committed (RF-004, RNF-006), where
  authorized watchers receive the committed change as a notification within a bounded latency budget
  (RF-008, RF-009, RNF-002), where reads are served locally and never block on quorum (RNF-004), and
  where the cluster tolerates the loss of one node in a three-node cluster by retaining quorum
  (RNF-005) while rejecting writes during a partition that leaves no quorum (RNF-006). Out of scope:
  multi-region replication topology, feature-flag targeting/rollout rules, audit-log line format,
  SSE wire format, the Go/Rust/Node comparison (those are the curriculum project's job, not the
  game's).
- **Slug:** `17_distributed_config_service`
- **Catalog key question (context only, not the win condition):** *"How do watch-notification latency
  and consensus overhead compare?"*
- **Done-rule (one sentence, lifted from the spec's primary learning objective and the catalog's
  central comparison question):** the player demonstrates that every config write commits only after
  a quorum of sentinel nodes acknowledges it (consensus overhead), every authorized watcher drone
  receives each committed change within the notification budget (watch latency), no write commits
  during a partition or without quorum, no unauthorized write is accepted, and no stale read is served
  when freshness is required — while the HUD visibly reports both `consensus_p95_ms` and
  `watch_notify_p95_ms` so the two latencies are directly compared.
- **Unit id (evidence target):** `17_distributed_config_service` (per the task's `unit_id`
  directive; the substrate does not yet have this unit registered as `active_unit`, so the run emits
  `scheduled_review: false`, `review_reason: "deepening"` until it is added).
- **Encounter / scene id:** `quorum-citadel-01`
- **Game name (evidence field):** `"Quorum Citadel"`
- **Region dir:** `engines/voxelDojo/game-17-lighthouse-network/` (canonical Shape B app,
  mirroring the producer pattern in `EVIDENCE_CONTRACT.md`; the verifier consumes a separately
  captured record, exactly as it does for `pixel-quest/`).

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic (Quorum Citadel) | What "playing it right" proves |
| --- | --- | --- |
| **Consensus-backed write (RF-004)** — every write MUST pass through quorum before ack | A **CONFIG MONOLITH** (tall glowing crystal at the center) holds the current value glyph + version badge. Incoming **WRITE ORBS** (colored spheres carrying a candidate value) spawn at the leader sentinel. The player presses **Z** to PROPOSE: the orb grows a tether and the player must fly it to each follower sentinel and press **Z** again to collect an ACK (visible charging ring, ~1.2 s = simulated consensus overhead). Once **≥ floor(N/2)+1** sentinels ACK (2 of 3), the orb flashes COMMITTED and flies into the monolith, which updates its glyph and ticks the version. | Player physically walks the write through quorum — internalizes that "committed" means "a majority voted", not "the leader said so". |
| **Quorum size / split-brain rejection (RNF-005, RNF-006)** — tolerate 1 node loss in a 3-node cluster; reject writes when quorum is unavailable | Three **SENTINEL NODES** float in a ring around the monolith. One carries the golden LEADER HALO. In level 2+, one sentinel goes DARK (node loss) — quorum drops to 2-of-2; writes still commit. In level 3, a glass PARTITION WALL slides between the leader and one follower; if the player tries to commit with only the leader's own vote, the orb flashes SPLIT-BRAIN RED and is rejected (counts `writes_committed_no_quorum` if forced). Player must press **X** to REJECT the orb and wait. | Player learns "no quorum ⇒ no commit" — the cluster stops writes rather than diverging. |
| **Watch/notify on committed changes (RF-008, RF-009, RNF-002)** — notify authorized watchers within 100 ms p95 | **WATCHER DRONES** orbit the monolith at the periphery (one per authorized subscriber). The moment a write orb COMMITs into the monolith, **NOTIFY PARTICLES** launch from the monolith toward each drone along glowing tethers at a fixed travel speed. Each drone lights up green when its particle lands. A HUD ring around the monolith counts down the notification budget; a particle that lands after the budget turns amber (`watchers_notified_late`) and one that never lands red (`watchers_missed`). | Player sees watch-notify as a *consequence* of commit — notifications never fire for an uncommitted write, and they have a measurable latency the player must keep inside the budget. |
| **The central comparison: consensus overhead vs watch-notify latency** (catalog key question) | Two stacked **LATENCY BARS** dominate the HUD: the top bar fills as the write orb collects quorum (`consensus_ms`, ~1.2 s sim), the bottom bar fills as notify particles travel to drones (`watch_notify_ms`, ~0.3 s sim). Both are emitted as `consensus_p95_ms` and `watch_notify_p95_ms`. The wave only passes if both bars are observed and recorded. | The player literally reads the comparison off the HUD — the done-rule question made visible. |
| **Local reads do NOT block on quorum (RNF-004)** — p95 < 1 ms after the node applied the log | At any time the player can press **R** near any sentinel to do a LOCAL READ — an instant ping returns that sentinel's current committed value (no orb, no travel). If the player presses **R** while carrying a write orb that has NOT yet committed, the read returns the OLD value — and if the player was holding a `minVersion` contract (a yellow HUD chip requiring ≥ the in-flight version), that read counts `stale_reads_served` (FAIL). | Player internalizes "reads are local and instant; they reflect what's committed, not what's in flight." |
| **ACL per key (RF-011, RF-012)** — enforce read / write / watch / rollback before the action | Some write orbs arrive with a red UNAUTHORIZED chip (no `write` ACL for this key). The player must press **X** to DENY at the leader before proposing; allowing it counts `acl_leaked` (FAIL). Likewise, some watcher drones carry a red NO-WATCH chip and must NOT receive notify particles — the player presses **X** on them to revoke the tether before the burst. | Player links "ACL checked before action" — capability is enforced at the gate, not after. |
| **Version history + rollback (RF-006, RF-007)** — rollback records a NEW version, doesn't delete | Behind the monolith, a vertical **HISTORY STACK** of dimmer value-glyphs towers upward (one per past version, newest at top). Player can press **B** to grab a previous glyph and RE-COMMIT it through quorum as a new version — the stack grows by one (the old version stays). | Player sees rollback = a new consensus write, not a delete. |
| **Leader failover (RNF-005)** — cluster retains write availability through quorum after leader loss | In level 4, the LEADER sentinel goes dark mid-wave. After a brief election flash, the LEADER HALO migrates to a surviving follower. In-flight write orbs stall until the new leader is elected; the player must re-propose from the new leader. | Player experiences leader failover as a brief stall, not a cluster death. |

## 4. Main loop (the ~30–45 s cycle the player repeats)

1. **Wave card.** A wave banner posts the round's contract, e.g.
   `WAVE 2: 5 writes, 1 unauthorized (ACL), 1 partition event, 3 watchers, budget 350 ms`.
   The citadel hums up; the HUD bars reset.
2. **Write orb spawns.** A colored WRITE ORB materializes at the LEADER sentinel carrying a candidate
   value glyph (e.g. `payments.retry_limit = 4`) and a version badge. The player targets it (Tab
   cycles between the active orb and the watcher drones), then:
   - **Z** at the leader — PROPOSE the write. Orb grows a tether.
   - **Z** at each follower sentinel — COLLECT ACK (charging ring fills, ~1.2 s sim = consensus
     overhead; the top HUD bar fills in parallel).
   - When quorum (2-of-3) is reached, the orb auto-flies into the monolith; the monolith glyph
     updates, the version ticks up, and the HISTORY STACK grows by one.
3. **Notification burst.** Immediately on commit, NOTIFY PARTICLES launch from the monolith toward
   each authorized WATCHER DRONE along the tether (the bottom HUD bar fills). Drones flash green on
   arrival. Late/missed particles color amber/red.
4. **Reads interleave the whole time.** Yellow `minVersion` HUD chips periodically appear on the
   player's cursor demanding a fresh read. **R** near a sentinel returns the local committed value
   instantly; if the player serves a read older than the chip's `minVersion`, it counts
   `stale_reads_served` (FAIL).
5. **Hazards interleave.**
   - An UNAUTHORIZED orb (red chip) arrives — press **X** to deny at the leader.
   - A PARTITION WALL slides in — reject any orb that can't reach quorum (**X**), wait for it to lift.
   - A watcher with a NO-WATCH chip appears — press **X** to revoke its tether before the next burst.
   - (L4) The leader goes dark — wait for the halo to migrate, then re-propose from the new leader.
6. **Wave clear.** When the write queue is drained and every watcher has either been notified or
   correctly revoked, the citadel dims and the HUD posts the wave score:
   `{writes_proposed, writes_committed_quorum, writes_committed_no_quorum,
    writes_rejected_partition, writes_rejected_acl, acl_leaked, watchers_subscribed,
    watchers_notified_in_budget, watchers_notified_late, watchers_missed, fresh_reads_served,
    stale_reads_served, rollbacks_committed, leader_failovers_handled, consensus_p95_ms,
    watch_notify_p95_ms, monolith_damage}`.
7. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page `window.__voxelDojoEvidence` channel and `EVIDENCE` console. The citadel's gate-door goes green; the
   next wave's difficulty (taller write queue, tighter notify budget, partition + leader-loss
   combined) unlocks.

## 5. Inputs & controls (≤ 3 primary actions, NES-pad feel)

- **WASD / ←↑↓→** — fly the CURSOR DRONE around the citadel (free roam between the sentinel ring and
  the watcher orbit).
- **Tab / Q-E** — cycle target lock: active write orb → each sentinel → each watcher drone.
- **Z** — PRIMARY POSITIVE: at the leader, PROPOSE the targeted write; at a follower, COLLECT ACK;
  grab-and-recommit a history glyph for rollback. One button, context-resolved.
- **X** — PRIMARY DEFENSIVE: REJECT the targeted write orb (no quorum / partition / unauthorized),
  or REVOKE a watcher's tether (NO-WATCH ACL).
- **R** — LOCAL READ: instant ping of the nearest sentinel's committed value. Carries whatever
  `minVersion` chip is currently on the cursor (none = best-effort read).
- **B** — toggle the HISTORY STACK rail into reach (so a previous version glyph can be grabbed with
  **Z** for rollback). Secondary setup action.
- **H** — HUD toggle: show the live quorum math for the current wave (allowed in wave 1, disabled in
  later waves to test mastery without the crutch).
- Three primary actions (**Z**, **X**, **R**) define the loop; **Tab**, **B**, and **H** are
  navigation/inspection aids so they don't overload the player.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `writes_committed_no_quorum === 0` (no write committed without a majority — no split-brain),
  - `acl_leaked === 0` (no unauthorized write was proposed; no NO-WATCH drone received a particle),
  - `writes_rejected_partition === partition_events_total` (every partition-time write was rejected,
    not forced),
  - `watchers_notified_late === 0` (every notify particle landed inside the budget),
  - `watchers_missed === 0` (every authorized watcher received every committed change),
  - `stale_reads_served === 0` (no `minVersion` read returned a stale value),
  - `monolith_damage === 0` (no split-brain / missed-watcher vented into the monolith),
  - `writes_committed_quorum >= writes_proposed_target` (the player actually drove the round's
    workload through consensus),
  - AND `consensus_p95_ms > 0 && watch_notify_p95_ms > 0` (both latencies were observed and recorded
    — the comparison question was actually answered, not skipped).
- **Fail the wave (FAIL)** when **any** of:
  - A write is committed with only the leader's vote (partition / node-loss left 1-of-3) → monolith
    flashes red, `monolith_damage` rises, evidence `pass: false` with `writes_committed_no_quorum > 0`.
  - An unauthorized write orb is proposed (player pressed **Z** instead of **X**) → orb tethers red,
    `acl_leaked` rises, evidence `pass: false`.
  - A notify particle lands outside the budget or never lands → drone turns amber/red,
    `watchers_notified_late` or `watchers_missed` rises, evidence `pass: false`.
  - A `minVersion` read returns the pre-commit value → `stale_reads_served` rises, evidence
    `pass: false`.
  - A partition-time write is forced three times in a row → citadel alarm, evidence `pass: false`
    with `writes_rejected_partition < partition_events_total`.
- Both outcomes are **direct readouts of distributed-config discipline**: quorum-gated writes,
  partitioned rejection, ACL-at-the-gate, bounded notify latency, local-only fresh reads. Neither
  win nor fail is gated on raw speed — correctness first; the speed signal lives in the two p95 bars.

## 11. Learning-gate hooks

- **Active unit:** `17_distributed_config_service` (project `17_distributed_config_service`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still emits
  evidence with `scheduled_review: false` and `review_reason: "deepening"`; the verifier will not
  promote until the substrate registers the unit. The game never writes learner state.
- **Encounter / scene id:** `quorum-citadel-01`.
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus `EVIDENCE`
  console records from `engines/voxelDojo/game-17-lighthouse-network/`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Evidence record fields** (this game's metrics variant — `kind: "threejs-quorum-consensus"`):
  ```json
  {
    "source": "quorumdoj",
    "unit_id": "17_distributed_config_service",
    "project": "17_distributed_config_service",
    "encounter_id": "quorum-citadel-01",
    "game": "Quorum Citadel",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-quorum-consensus",
      "writes_proposed": 5,
      "writes_committed_quorum": 5,
      "writes_committed_no_quorum": 0,
      "writes_rejected_partition": 1,
      "partition_events_total": 1,
      "writes_rejected_acl": 1,
      "acl_leaked": 0,
      "watchers_subscribed": 3,
      "watchers_notified_in_budget": 15,
      "watchers_notified_late": 0,
      "watchers_missed": 0,
      "fresh_reads_served": 4,
      "stale_reads_served": 0,
      "rollbacks_committed": 1,
      "leader_failovers_handled": 1,
      "consensus_p95_ms": 1210,
      "watch_notify_p95_ms": 295,
      "monolith_damage": 0
    },
    "curriculum_context": {
      "concept": "consensus-backed distributed config writes with observable watch/notify",
      "mechanic": "Quorum Citadel",
      "accepted_signal": "write commits after quorum ack, watchers notified in budget, partition/ACL/stale-read correctly rejected",
      "rejected_trap": "commit without quorum (split-brain), notify late/missed, unauthorized write allowed, stale read served"
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
- **Pass rule (gate):** `evidence.pass === true` AND
  `metrics.writes_committed_no_quorum === 0` AND `metrics.acl_leaked === 0` AND
  `metrics.writes_rejected_partition === metrics.partition_events_total` AND
  `metrics.watchers_notified_late === 0` AND `metrics.watchers_missed === 0` AND
  `metrics.stale_reads_served === 0` AND `metrics.monolith_damage === 0` AND
  `metrics.consensus_p95_ms > 0` AND `metrics.watch_notify_p95_ms > 0`.
  (i.e. no split-brain commit, no ACL leak, every partition-time write rejected, every authorized
  watcher notified inside the budget with zero misses, no stale `minVersion` read, no monolith
  damage, AND both latency bars observed so the catalog's comparison question is answered.)
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this plan
  slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the Quorum Citadel 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `17_distributed_config_service`, unit
  `17_distributed_config_service`, where every config write committed only after a quorum of
  sentinel nodes acknowledged it, every authorized watcher drone received each committed change
  within the notification budget, every partition-time and unauthorized write was rejected, no stale
  read was served when freshness was required, and both `consensus_p95_ms` and `watch_notify_p95_ms`
  were recorded — end-to-end under Playwright."**

## Open questions / risks (for the implementer)

- **Consensus vs notify timing calibration.** The two latency bars must read visibly different
  (consensus ~1.2 s sim, watch-notify ~0.3 s sim) so the catalog's comparison question has a clear
  answer in the HUD. Pin both to the deterministic wave seed, not wall-clock jitter.
- **Partition-wall visual.** Use a translucent glass slab that slides in between the leader and one
  follower; make it obvious from the default camera angle which two sentinels are still in quorum.
  Telegraph partition events on the wave card so rejection vs force is screenshot-evident.
- **Leader-halo migration.** On leader loss, briefly dim all sentinels (~0.8 s election), then
  transfer the golden halo to the lowest-id surviving follower. Re-proposal from a stale leader must
  bounce with a NOT-LEADER flash.
- **History-stack rollback.** Grabbing a previous glyph with **B** + **Z** must re-commit it through
  the full quorum path; do NOT let it bypass quorum. The history stack must visibly grow, not swap.
- **`minVersion` chip.** Spawn yellow chips deterministically (e.g. one per wave in L2+) so a stale
  read is forced into evidence; the verifier needs `stale_reads_served === 0` to be meaningful, which
  means the player must demonstrably wait for commit before pressing **R**.
- **NDJSON source literal.** Use `"quorumdoj"` (mirrors the `"plugindoj"` / per-game-source pattern);
  add it to the verifier's allowlist if the verifier currently hard-accepts only `"pixelquest"`.
