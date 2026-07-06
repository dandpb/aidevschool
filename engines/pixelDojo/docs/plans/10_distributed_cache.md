# PLAN slice — `10_distributed_cache` (Ring Keeper)

> PLAN slice for `/threejs-dojo 10_distributed_cache`. Shape **B** — a fresh standalone 3D
> (three.js) sibling app at `engines/pixelDojo/games/10_distributed_cache/`, NOT a pixel-quest
> encounter. None of pixel-quest's four encounter kinds (token_bucket / sequence_flow /
> route_health / policy_gate, all "incoming sprite → admit/reject") can represent the core
> mechanic here — distributed-cache sharding is **ring-based key→node assignment with minimal
> remapping on membership change**, a topology pixel-quest's lanes cannot hold. The 3D scene
> embodies the concept: a luminous **consistent-hash ring** floating in space, where key orbs
> fly to the **next node clockwise**, and adding/removing a node only re-homes the keys in that
> node's arc — contrasted against naive `hash % N` that scrambles everything on churn.
>
> Distinct from the sibling `02_key_value_store` ("Warehouse", Shape B): that game owns
> `hash(key) % N` to fixed shelves on a single node + TTL decay. This game owns the
> **distributed** facet — many shard nodes on a membership ring, "next clockwise" assignment,
> and surviving node add/remove with minimal key movement. TTL/eviction is out of scope here
> (02 owns TTL); capacity overflow appears only as the pressure that makes node-add meaningful.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/10_distributed_cache/` (Level 4 — Scalability and Distribution).
- **ONE concept this game teaches:** **consistent hashing** — keys are placed on a hash ring
  and owned by the **next node clockwise**; when a node joins or leaves, only the keys in that
  node's arc move, so membership change causes **minimal key remapping** (vs naive `hash % N`,
  which remaps nearly every key on every add/remove).
- **Out of scope (the curriculum's job, not the game's):** TTL expiration (owned by 02), LRU/LFU
  eviction policy internals, gossip membership protocol, cache-aside vs write-through,
  request coalescing/singleflight, the Go/Rust/Node comparison. One game = one concept:
  **ring placement + minimal remap under node churn**.
- **Catalog concepts reference:** "Cache invalidation, TTL, LRU/LFU eviction, consistent
  hashing, gossip protocol, cache-aside vs write-through, cache stampede prevention, sharding".
  Key question: "How do eviction policies and sharding strategies interact under skewed access
  patterns?" — this game answers the **sharding-strategy** half by making the player feel why
  consistent hashing (not mod-N) is the strategy that survives churn under a hot key.
- **Lesson.md primary concept:** "distributed cache design with consistent hashing and explicit
  freshness/eviction semantics" — the consistent-hashing half is this game's load-bearing facet.
- **Slug:** `10_distributed_cache`
- **Unit id (learning gate):** `10_distributed_cache`
- **Encounter id:** `ring-keeper-01`

## 2. Player goal

You run a **hash ring** in a 3D arena. Key orbs stream in from the dark; each one must reach the
**next node clockwise** from its hash point on the ring. When a node overloads or dies, **add or
remove nodes** and re-home only the orphaned keys — keep the cache stable through the churn
**without remapping the whole world**.

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Hash ring = key space (0..M) wrapped into a circle | A luminous torus ring floats at arena center, marked with M tick flares (M = 64 for visibility). Each key's hash lights one tick before flying to its owner. | Player internalizes "the ring IS the key space" — keys live on the ring, not in a list. |
| Node placed at `hash(nodeId)` on the ring (with vnodes) | Crystal **shard towers** stand ON the ring at their hash positions; vnodes (3 per node) scatter them irregularly, so arcs are unequal — exactly like a real consistent hash ring. | Player sees real ring placement (unequal arcs), not a neat round-robin. |
| Key→node = **next node clockwise** (the core rule) | Each key orb flies from its hash tick **clockwise along the ring** until it hits the next tower, then locks into that tower's buffer. | Player links "owner = next clockwise", the defining rule of consistent hashing. |
| Naive `hash(key) % N` (the trap strategy) | Strategy **1 (MOD-N)**: keys jump to `hash % nodeCount`; on add/remove almost every key's owner changes — visualized as a mass re-home storm. | Player feels the catastrophe mod-N causes under churn — the reason consistent hashing exists. |
| Consistent hashing (the correct strategy) | Strategy **2 (RING)**: keys keep their clockwise owner; on add/remove only the keys in the changed arc re-home. Default and intended. | Player feels minimal remap — the property that makes consistent hashing win. |
| Add a node = split an arc (RF: elastic membership) | Press **A** to drop a new tower at the reticle's ring position. Under RING, only keys whose clockwise owner is now the new tower re-home (a small flare burst). Under MOD-N, the whole ring reshuffles. | Player operates node join and sees the remap delta — small for RING, huge for MOD-N. |
| Remove a node = merge an arc (RF: node failure/rebalance) | Press **X** on a tower (or it dies from overflow) to remove it. Under RING, only its keys re-home to the next clockwise tower. Under MOD-N, mass re-home again. | Player operates node leave/failure and re-homes the orphaned arc only. |
| Hot key / skewed access (catalog key question) | A **hot key** orb (brighter, pulsing) repeats many times and piles onto one tower; that tower's fill meter spikes. The fix is to add a node just clockwise of the hot tick to split the arc. | Player diagnoses skew and uses ring topology (not more capacity) to balance — the catalog's "skewed access patterns". |
| Capacity pressure (cache stampede motivation, not TTL) | Each tower has a fill meter; overflow (stampede) forces the oldest keys to spill (a soft "miss" flare). Too many spills on one node ⇒ the player must add a node there. | Player learns sharding-as-load-balancing: when one shard is hot, you add a shard, you don't grow the box. |
| Minimal data movement (the WHY) | End-of-wave stats tower reports `keys_remapped` — RING churn remaps ~keys_in_arc, MOD-N churn remaps ~everything. The win requires low remap. | Player internalizes the operational win of consistent hashing: cheap membership change. |

## 4. Main loop (the 10–30s cycle the player repeats)

1. A wave of N key orbs spawns at the arena edge and drifts inward toward the ring. Spawn
   cadence ≈ 0.7–1.0s; wave size ramps 6 → 10 → 14. Each orb labels its key string; on reaching
   the ring, its hash tick flares.
2. Player rotates a **targeting reticle** around the ring (← → or mouse yaw) to set the "aim"
   arc, and presses **SPACE** to release the lead orb. The orb auto-flies to its owner by the
   active strategy (RING = next clockwise; MOD-N = `hash % nodeCount`). Player can override a
   wrong owner by holding the reticle on the correct tower while pressing **SPACE** again before
   the orb locks (intercept). 
3. Mid-wave, a **churn event** fires: either a tower overflows and dies (auto-remove) or the HUD
   calls for capacity and the player must add a node. Player presses **A** to drop a tower at
   the reticle position; **X** to remove the targeted tower.
   - Under **RING (2)**: only the changed arc's keys re-home (small flare burst, ~1/N of keys).
   - Under **MOD-N (1)**: nearly every key re-homes (ring-wide storm) — the teachable disaster.
4. A **hot-key orb** appears in ≥1 wave per level, repeating to pile on one tower. The correct
   response is to **add a node just clockwise** of the hot tick to split the arc (the player
   sees the pile redistribute).
5. Wave clears when every spawned orb is locked to a tower (or spilled). The stats tower
   reports `keys_routed / misroutes / keys_remapped / churn_events_survived / hot_key_balanced`.
6. Next wave ramps difficulty (more keys, more hot keys, faster churn).

Total cycle ≈ 25–35s per wave.

## 5. Inputs & controls

- **← →** or **mouse** — rotate the targeting reticle around the ring (yaw). Reticle snaps to
  the nearest tower when over one.
- **SPACE** — release/intercept the lead key orb (route it to its ring owner).
- **A** — add a shard tower at the reticle's ring position (node join).
- **X** — remove the tower under the reticle (node leave/failure).
- **1 / 2** — switch sharding strategy: **1 = MOD-N** (trap), **2 = RING / consistent** (default,
  intended). Strategy is shown on the HUD.

≤ 5 distinct actions. The strategy toggle is the actual pedagogy (the player must contrast the
two), so it earns its slot alongside the arcade verbs.

## 6. Win / fail states (both direct readouts of using the concept correctly)

- **Win a wave** when **all** hold:
  - every spawned key orb routed to its correct owner for the FINAL ring state
    (`misroutes === 0` — the player respected "next clockwise" through every churn event),
  - at least one churn event (node add or remove) was survived with the orphaned keys
    re-homed correctly (`churn_events_survived >= 1` — proves the player operated the ring
    under membership change, not a static ring),
  - `keys_remapped` is consistent with consistent hashing under RING — i.e. small relative to
    the wave size (`keys_remapped <= ceil(wave_target / node_count) * churn_events_survived + hot_key_relief`)
    AND the strategy in use at every churn was RING (`strategies_used` contains `"ring"` and
    NOT `"modn"` at any churn moment), — proves the player chose consistent hashing to keep
    remap minimal (the WHY),
  - any hot key that appeared was balanced by a node add (`hot_key_balanced === true`),
  - no tower exceeded its spill budget (`spills <= spill_budget`).
- **Fail a wave** when **any** of:
  - a key orb locks to the wrong tower (`misroutes > 0`) — the player didn't follow
    next-clockwise through the churn,
  - a churn event orphaned keys that were never re-homed (`churn_events_survived` short),
  - the player switched to MOD-N during churn and triggered a mass remap
    (`keys_remapped` blows the budget) — the trap strategy was used where RING was required,
  - a hot key piled onto one tower past spill budget without a balancing node add,
  - time expires before the wave clears.

Both outcomes are direct readouts of: did the player route to the next-clockwise node, and
survive membership churn with minimal remap under the consistent-hashing strategy?

## 11. Learning-gate hooks

- **Active unit targeted:** `10_distributed_cache` (project `10_distributed_cache`). The game
  emits evidence only; `learner/substrate/` (driven by `engines.pixelDojo.verifier`) owns the
  `units_log` append and any mastery transition. **The game never writes learner state.**
- **Evidence channel:** the sibling app writes one NDJSON line per cleared-wave attempt to
  `engines/pixelDojo/games/10_distributed_cache/.logs/evidence.ndjson`, and surfaces the same
  object on `window.__voxelDojoEvidence` (per the cross-engine evidence schema) for the
  Playwright smoke to capture.
- **Evidence record fields (one JSON object per line):**

  ```json
  {
    "source": "threejs-dojo",
    "unit_id": "10_distributed_cache",
    "project": "10_distributed_cache",
    "encounter_id": "ring-keeper-01",
    "game": "Ring Keeper",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-ring-keeper",
      "keys_routed": 10,
      "misroutes": 0,
      "keys_remapped": 3,
      "remap_budget": 6,
      "churn_events_survived": 1,
      "node_adds": 1,
      "node_removes": 0,
      "hot_key_balanced": true,
      "spills": 0,
      "spill_budget": 2,
      "strategies_used": ["ring"],
      "modn_used_at_churn": false,
      "node_count_final": 4,
      "wave_cleared": true,
      "wave_target": 10
    },
    "curriculum_context": {
      "concept": "consistent hashing: ring-based key→node assignment (next clockwise) with minimal key remapping on node add/remove",
      "mechanic": "Ring Keeper (3D consistent-hash ring catching key orbs; node add/remove with remap contrast vs hash % N)",
      "accepted_signal": "every key routed to its next-clockwise node through ≥1 node add/remove, with remap kept minimal under the consistent (RING) strategy and any hot key balanced by a node split",
      "rejected_trap": "switching to MOD-N during churn and remapping the whole ring, misrouting a key after churn, or treating a static no-churn wave as proof of consistent-hashing mastery"
    }
  }
  ```

- **Pass rule (gate):** the attempt's evidence record is eligible iff
  - `unit_id === "10_distributed_cache"` and `project === "10_distributed_cache"`,
  - `metrics.kind === "threejs-ring-keeper"`,
  - `pass === true` AND `metrics.wave_cleared === true`
    AND `metrics.keys_routed >= metrics.wave_target`
    AND `metrics.misroutes === 0`
    AND `metrics.churn_events_survived >= 1`
    AND `metrics.keys_remapped <= metrics.remap_budget`
    AND `metrics.modn_used_at_churn === false`
    AND `metrics.hot_key_balanced === true`
    AND `metrics.spills <= metrics.spill_budget`.
  - The `churn_events_survived >= 1` and `modn_used_at_churn === false` clauses are
    load-bearing: a static no-churn wave, or a wave where the player escaped churn by
    switching to MOD-N, does NOT pass — the player must demonstrate consistent hashing under
    actual membership change at least once.
- **Anti-replay:** `ts` must be strictly newer than the last gated evidence for the unit
  (the verifier enforces this).
- **Side-effect contract (smoke-asserted):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage.learning_state`,
  `units_log`, or `mastered`, and must NOT call any `learner/` write path. Producer ≠ verifier.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  PLAN slice, the game source under `games/10_distributed_cache/`, the captured EVIDENCE
  record, the screenshot) plus the one-sentence done-rule and judges whether the didactic
  chain (key → next-clockwise node → survive node churn with minimal remap under the
  consistent-hashing strategy) is evidenced end-to-end under Playwright, with the
  producer≠verifier invariant intact.
