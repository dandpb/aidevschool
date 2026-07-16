# PLAN slice — `12_distributed_job_scheduler` (Shape B: Raft Ring)

> PLAN slice for `/threejs-dojo 12_distributed_job_scheduler`. The slug's catalog concept row is
> "Leader election (Raft simplified), distributed locks, cron-like scheduling, fault tolerance, DAG
> dependencies, exponential backoff retry". This slice narrows that row to its **primary** concept
> (per `curriculum/12_distributed_job_scheduler/docs/spec.md` "Learning Objectives"):
> **coordinating scheduled work safely across multiple nodes when only one scheduler leader may make
> dispatch decisions** — i.e. simplified-Raft leader election (terms + votes + heartbeats + quorum)
> with **fencing-token dispatch** so workers reject stale leaders during split-brain. The other
> facets (DAG dependency resolution, cron parsing, retry backoff, cancellation semantics,
> per-language Go/Rust/Node comparison) are out of scope — one game = one concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent
> *a cluster of nodes electing one leader by majority quorum while a monotonic fencing token
> protects dispatch during a network partition* — they are all variants of "incoming sprite →
> admit/reject" with no concept of *distributed authority* or *split-brain fencing*. A 3D raft ring
> with node-pedestals, term beacons, vote beams, partition curtains, and worker shields that compare
> fencing tokens needs its own world: depth for the ring geometry, radial vote beams, and curtains
> that visibly sever node-to-node visibility.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/12_distributed_job_scheduler/`
- **ONE concept this game teaches:** a cluster of N scheduler nodes that elects exactly one leader
  per term using simplified-Raft mechanics — a candidate bumps its term, requests votes, and wins
  only with majority quorum (RF-004); only the current leader dispatches jobs (FR-005); each
  leadership term carries a strictly-monotonic **fencing token** that workers compare against their
  last-seen value (RF-006, RF-007) so that when a split-brain old leader tries to dispatch, workers
  reject it (`409 stale_fencing_token`); when the leader is partitioned away from quorum, followers
  bump term and elect a new leader that resumes dispatch (FR-016). Out of scope: full Raft log
  replication, DAG dependency resolution, cron parsing, retry backoff math, the Go/Rust/Node
  comparison (those are the curriculum project's job, not the game's).
- **Slug:** `12_distributed_job_scheduler`
- **Catalog key question (context only, not the win condition):** "How do leader election
  implementations compare in split-brain scenarios?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective):** the player
  demonstrates that exactly one leader (the node with majority quorum AND the latest term) dispatches
  each job, that workers reject every stale fencing token during a partition, and that no job is
  ever double-dispatched by two competing leaders — all on a deterministic seed.
- **Unit id (evidence target):** `12_distributed_job_scheduler` (per the task's `unit_id`
  directive; the substrate does not yet have this unit registered as `active_unit`, so the run emits
  `scheduled_review: false`, `review_reason: "deepening"` until it is added).
- **Encounter / scene id:** `raft-ring-01`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Leader election with terms (RF-004, FR-004)** | Five node-pedestals around a circular ring. Each node has a vertical **term beacon** column whose height = its current term. Pressing **V** on a target node bumps its term +1 and emits a "VOTE REQUEST" pulse ring. | Player internalizes that calling an election always advances the term — there is no leadership without a newer term. |
| **Majority quorum (RF-004, N=5 → need 3)** | A candidate wins only when ≥3 vote-beams (itself + ≥2 peers) converge on it. Beams light green from each voting node to the candidate; the candidate's crown halo ignites gold when quorum is reached. Below quorum, the candidate stays amber and times out after the election timeout. | Player links "leader" to "majority of visible peers" — a lone node cannot self-promote. |
| **Only the leader dispatches (FR-005)** | Only the gold-crowned leader accepts **SPACE** to dispatch a job orb from the central queue. Pressing SPACE on a follower/candidate is a no-op with a red "NOT LEADER" flash and counts `non_leader_dispatch_attempts`. | Player treats dispatch authority as a quorum-derived property, not a button. |
| **Priority queue dispatch (FR-009)** | The central WORK BAY renders job orbs sorted by priority (size+glow: critical=huge white, high=large yellow, normal=medium cyan, low=small dim), ties broken by due-then-creation time. SPACE always launches the front orb. | Player sees dispatch as deterministic priority order, not first-come. |
| **Fencing token, monotonic per term (RF-006)** | A giant scoreboard above the ring shows the leader's current fencing token (e.g. `7`). Each new leadership term bumps the token to `max(seen)+1`. The dispatch beam stamps the orb with the leader's token. | Player links "new term → new token" — fencing is monotonic, never reused. |
| **Worker fencing-token check (FR-007)** | Three worker-cubes on the outer ring, each with a shield HUD showing its `last_seen_token`. On dispatch, the worker compares the orb's token to its HUD: strictly greater = accept (green pulse, HUD updates); ≤ = reject (red shield flash, orb bounces back to queue, `stale_token_rejections++`). | Player sees the worker, not the leader, as the final enforcer of fencing. |
| **Split-brain / network partition (Edge Cases)** | Translucent **PARTITION CURTAINS** rise between node groups (player-activated with **P** at the cursor, or auto-injected by the wave). Nodes separated by a curtain cannot exchange heartbeats or votes. A partitioned minority (2-of-5) cannot reach quorum; its self-promoted "leader" has a stale token. | Player reproduces the catalog's key question — split-brain — and learns that quorum is what prevents two valid leaders. |
| **Stale leader dispatch gets fenced (Edge Cases)** | If the player dispatches from a stale (old-term) leader past a curtain, the beam reaches a worker but the token is ≤ the worker's HUD → REJECTED with a red shield and `stale_token_rejections++`. The scoreboard flashes "STALE FENCING TOKEN REJECTED". | Player watches the fencing token do its job — split-brain is contained at the worker, not at the network. |
| **Heartbeat timeout → new election (FR-016)** | When a partition severs the leader from quorum for >`election_timeout_ms`, followers on the quorum side auto-bump term and call an election (no player input needed). The old leader's crown dims and its dispatches stop accepting. | Player links "lost quorum → term bump → new leader" without manual reset. |
| **Quorum failure / no leader (Edge Cases)** | If the player partitioned such that **no** side has quorum (e.g. 2-2-1 split), no leader can be elected; the queue stalls. The scoreboard flashes "NO QUORUM" with a `queue_stall_secs` timer. The fix is to lift a curtain so a 3-side forms. | Player treats quorum loss as a stall signal — they must repair the partition, not call more elections. |

## 4. Main loop (the ~30–45 s cycle the player repeats)

1. **Spawn.** A wave card flashes the round's contract, e.g. `WAVE 2: 8 jobs to dispatch, 5 nodes,
   partitions at t=12s (2|3) and t=28s (different 2|3), expected stale dispatches: 2`. Ring powers
   up; all 5 nodes start as followers at term 0.
2. **Initial election.** Player tabs to a node and presses **V**. The candidate bumps to term 1,
   requests votes from visible peers; ≥3 beams converge → leader crown ignites (token 1).
3. **Dispatch phase.** Player presses **SPACE** repeatedly; each press launches the front priority
   orb from the central queue along a beam to a worker. Worker accepts, HUD token updates to 1,
   `successful_dispatches++`. Repeat until the wave's partition event fires.
4. **Partition event.** A curtain rises (auto-injected by wave script or player-triggered with
   **P**), splitting 2 vs 3. The 3-side auto-calls an election (heartbeat timeout), bumps term to 2,
   elects a new leader, token → 2. The 2-side has the old leader at term 1, token 1.
5. **Split-brain probe.** Player must (a) recognize the new (term-2) leader on the quorum side and
   dispatch from it, and (b) **avoid** dispatching from the stale (term-1) leader on the minority
   side. If they do dispatch from the stale leader, the worker's shield rejects the orb with a red
   flash and increments `stale_token_rejections` (the safe outcome). The failed outcome is if a
   worker ever accepted a stale token (`stale_token_accepted > 0`) — that requires a broken
   fencing implementation and fails the wave.
6. **Re-merge.** Curtain drops; cluster re-heals under the latest term; player continues dispatching
   the remaining jobs from the current leader.
7. **Wave clear.** When all wave jobs are dispatched successfully, the ring dims and the HUD posts
   the wave score:
   `{jobs_queued, successful_dispatches, stale_token_rejections, stale_token_accepted,
    duplicate_dispatches, elections_started, elections_won_with_quorum, quorum_failures,
    terms_bumped, max_term_reached, partitions_injected, queue_stall_secs, leader_flip_flops,
    non_leader_dispatch_attempts}`.
8. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page `window.__voxelDojoEvidence` channel and `EVIDENCE` console. Gate-locked exit door goes green; the
   next wave's difficulty (more partitions, shorter election timeout, larger job queue, lower
   priority signal-to-noise) unlocks.

## 5. Inputs & controls (≤ 3 primary actions, NES-pad feel)

- **WASD / ←↑↓→** — orbit the camera around the ring (free look; nodes are not moved, the camera
  is, so the player can inspect any node's beacon/HUD).
- **Tab / Q-E** — cycle target lock to the next/previous node on the ring.
- **V** — VOTE: target node bumps its term +1 and requests votes from visible (unpartitioned) peers.
  Primary authority action.
- **SPACE** — DISPATCH: the current leader launches the front priority orb to the next free worker.
  Primary positive action. No-op on non-leaders (red "NOT LEADER" flash).
- **P** — PARTITION: raise/lower a translucent curtain at the cursor position between two adjacent
  nodes. Primary split-brain injector.
- **H** — HUD toggle: show the live term/quorum map for each node (allowed in wave 1, disabled in
  later waves to test mastery without the crutch).
- Three primary actions (**V**, **SPACE**, **P**) define the loop; **Tab** and **H** are
  navigation/inspection aids so they don't overload the player.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `successful_dispatches === jobs_queued` (every job orb got dispatched to a worker and accepted),
  - `stale_token_accepted === 0` (no worker ever accepted a token ≤ its last_seen — split-brain
    never leaked a dispatch),
  - `duplicate_dispatches === 0` (no job was accepted by two different leaders — fencing held),
  - `queue_stall_secs <= 5` (the player kept quorum alive; no prolonged leaderless gap),
  - `non_leader_dispatch_attempts === 0` (player never tried to dispatch from a non-leader).
- **Fail the wave (FAIL)** when **any** of:
  - A worker accepts an orb whose token is ≤ its `last_seen_token` → scoreboard flashes
    "FENCING BREACH", host HP drops, evidence `pass: false` with `stale_token_accepted > 0`.
  - Two different leaders' dispatches of the same job are both accepted → "DUPLICATE DISPATCH",
    evidence `pass: false` with `duplicate_dispatches > 0`.
  - The queue stalls > 5s with no leader elected → "NO QUORUM" timeout, evidence `pass: false` with
    `queue_stall_secs > 5`.
  - The player presses SPACE on a non-leader ≥3 times → "DISCIPLINE" alarm, evidence `pass: false`
    with `non_leader_dispatch_attempts >= 3`.
- Both outcomes are **direct readouts of leader-election + fencing-token discipline**: one leader
  per term, quorum-enforced authority, monotonic tokens, worker-side enforcement. Neither win nor
  fail is gated on speed — correctness first.

## 11. Learning-gate hooks

- **Active unit:** `12_distributed_job_scheduler` (project `12_distributed_job_scheduler`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still emits
  evidence with `scheduled_review: false` and `review_reason: "deepening"`; the verifier will not
  promote until the substrate registers the unit. The game never writes learner state.
- **Encounter / scene id:** `raft-ring-01`.
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus `EVIDENCE`
  console records from `engines/voxelDojo/game-12-mission-control/`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Evidence record fields** (this game's metrics variant — `kind: "threejs-raft-fencing"`):
  ```json
  {
    "source": "raftdojo",
    "unit_id": "12_distributed_job_scheduler",
    "project": "12_distributed_job_scheduler",
    "encounter_id": "raft-ring-01",
    "game": "Raft Ring",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-raft-fencing",
      "jobs_queued": 8,
      "successful_dispatches": 8,
      "stale_token_rejections": 2,
      "stale_token_accepted": 0,
      "duplicate_dispatches": 0,
      "elections_started": 3,
      "elections_won_with_quorum": 2,
      "quorum_failures": 1,
      "terms_bumped": 2,
      "max_term_reached": 2,
      "partitions_injected": 2,
      "queue_stall_secs": 0,
      "leader_flip_flops": 1,
      "non_leader_dispatch_attempts": 0
    },
    "curriculum_context": {
      "concept": "simplified-Raft leader election with quorum + fencing-token dispatch under split-brain",
      "mechanic": "Raft Ring",
      "accepted_signal": "leader with majority quorum + latest term dispatches; workers reject stale tokens",
      "rejected_trap": "minority-side self-promoted leader dispatches past a partition; worker accepts stale token"
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
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.successful_dispatches === metrics.jobs_queued`
  AND `metrics.stale_token_accepted === 0` AND `metrics.duplicate_dispatches === 0` AND
  `metrics.queue_stall_secs <= 5` AND `metrics.non_leader_dispatch_attempts === 0`.
  (i.e. every queued job was dispatched by the quorum-backed leader, no stale token ever accepted,
  no job double-dispatched, no prolonged leaderless stall, no attempt to dispatch from a
  non-leader.)
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this plan
  slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the Raft Ring 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `12_distributed_job_scheduler`, unit
  `12_distributed_job_scheduler`, where every queued job was dispatched by the quorum-backed
  leader with the latest term, every stale-leader dispatch past a partition was fenced by the
  worker (token ≤ last_seen → rejected), no job was ever double-dispatched, and no non-leader
  dispatch was attempted — end-to-end under Playwright."**

## Open questions / risks (for the implementer)

- **Election timeout tuning.** Set `election_timeout_ms` short enough (~3-5s game-time) that a
  partitioned quorum side re-elects visibly within the wave, but long enough that the player can
  read the scoreboard before the term bumps. Telegraph the timeout as a draining ring on each
  follower pedestal.
- **Partition curtain visibility.** Use a vertical translucent plane with a subtle scanline shader
  so it's obvious which nodes are severed without obscuring the beacons behind it. Make sure the
  default camera angle shows two nodes on one side and three on the other for the canonical 2|3
  split.
- **Worker HUD readability.** The `last_seen_token` number on each worker cube must be legible from
  the default camera distance so a stale-token rejection (red flash + token mismatch) is
  screenshot-evident. Use billboarded sprites for the digits.
- **"H" quorum-map crutch.** Decide by playtest whether to keep it on for wave 1 only, or always;
  the verifier must know which wave the smoke run clears.
- **Auto-injected vs player-injected partitions.** The wave script should auto-inject the canonical
  2|3 partition at a fixed tick so the smoke run is deterministic; **P** lets the player experiment
  in free-play but is not required for the pass path.
- **Token stamp on the orb.** Render the orb's stamped token as a small billboarded digit above the
  orb in flight so the moment of rejection (worker's HUD > orb's token) is visible in a still
  screenshot.
