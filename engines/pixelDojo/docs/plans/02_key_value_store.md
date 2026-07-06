# PLAN slice — `02_key_value_store` (Shape B: KV Warehouse)

> PLAN slice for `/threejs-dojo 02_key_value_store`. The slug's catalog concept row is
> "Hash maps, CRUD API, TCP/HTTP, serialization, TTL expiration, snapshot/persistence basics".
> This slice narrows that row to its **primary** concept (per `curriculum/02_key_value_store/docs/spec.md`
> "Learning Objectives"): **hash-map-backed CRUD storage with TTL expiration**. The other facets
> (HTTP envelope, serialization, snapshot basics) are out of scope — one game = one concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent
> *persistent hash-addressed storage with a decay dimension* — they are all variants of
> "incoming sprite → admit/reject". TTL decay + collision chains + concurrent in-flight keys need
> 3D space and a clock, so the concept gets its own world.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/02_key_value_store/`
- **ONE concept this game teaches:** a hash-map-backed key-value store where every key is routed
  to a fixed bucket by `hash(key) % N`, CRUD operations are deterministic, and **TTL-expired keys
  are invisible** (read as missing) — the same invariant the spec encodes via RF-002 / RF-005 /
  RF-011. Out of scope: HTTP envelope, JSON serialization, MGET/MSET atomicity, persistence to
  disk, the Go/Rust/Node comparison (those are the curriculum project's job, not the game's).
- **Slug:** `02_key_value_store`
- **Catalog key question (context only, not the win condition):** "How does each language's
  map/dictionary implementation compare under concurrent read/write pressure?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective):** the player
  demonstrates that SET stores, GET returns an unexpired value (or MISS for expired/missing), DEL
  removes, and EXPIRE/PERSIST manage the TTL clock — all routed through `hash(key) % N` with
  deterministic, concurrency-safe behavior.
- **Unit id (evidence target):** `U2-key-value-store` (per
  `.loops/threejs-dojo/ROUTING_MANIFEST.md`; the substrate does not yet have this unit registered,
  so the run emits `scheduled_review: false`, `review_reason: "deepening"` until it is added).
- **Encounter / scene id:** `kv-warehouse-01`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Hash bucket = `hash(key) % N`** | A circular ring of `N` numbered shelves (e.g. `N = 8`) around the warehouse floor. Each incoming key-crate displays its key string; the player-forklift must dispatch it to shelf `hash(key) % N`. The HUD shows the live hash computation once the crate is grabbed. | Player routes every key to its deterministic bucket — internalizes that the hash decides the location, not the player's preference. |
| **SET stores (RF-001)** | Drive the forklift under the conveyor, grab the crate, drive to the correct shelf, press **Z** to PUT. Crate snaps onto the shelf. | Player links "admit a write" to "place at hashed shelf". |
| **GET returns unexpired value (RF-002, RF-011)** | A request beacon fires from a client pod at the edge: `GET user:42`. Player drives to shelf `hash("user:42") % N` and presses **X**. If the crate is present and its TTL ring is lit → return value. If the crate is absent or its TTL ring is dark (expired) → the only correct action is to press **X** on the empty/dark slot, which emits MISS. | Player distinguishes live data from expired/missing and answers accordingly — the lazily-swept TTL invariant. |
| **DEL removes (RF-003)** | A `DEL key` beacon prompts the player to drive to the shelf and press **C** to evict the crate (it crumbles into the floor). | Player treats DEL as location-routed, not global. |
| **TTL expiration (RF-005, RF-011)** | Crates with a TTL carry a vertical glow ring that drains over real time. When the ring empties, the crate goes dark and **becomes invisible to GET** (still occupies shelf memory until swept). A background sweeper drone periodically flies the ring and physically removes dark crates ("lazy + proactive sweep" both visualized). | Player feels TTL as a physical clock, not a metadata field; learns that "expired = missing" externally. |
| **EXPIRE / PERSIST (RF-004, RF-006)** | Special beacons hand the player a TTL-upgrade token (lit fuse) or a PERSIST token (pin). Driving to a crate and pressing **V** consumes the token: fuse starts the ring draining; pin freezes it. | Player manipulates the TTL clock on an existing key. |
| **Collision chain (hash → same bucket)** | When a second crate PUT lands on an already-occupied shelf, the crates stack into a short linked-list chain. A small chain-depth meter above the shelf ticks up. Long chains slow GET (player must pick the right crate from the stack). | Player sees collisions as a real cost, motivating the hash function's distribution quality. |
| **Concurrency safety (RNF-003)** | The conveyor can release 2–3 crates in overlapping bursts; the player must finish each PUT before grabbing the next (the forklift carries one crate at a time). Trying to PUT while carrying another crate aborts the second one — partial-state writes are impossible. | Player experiences the "no torn writes" invariant kinesthetically. |

## 4. Main loop (the ~25–40 s cycle the player repeats)

1. **Spawn.** A wave card flashes the operation mix for the round, e.g. `WAVE 2: 4×SET, 3×GET, 1×EXPIRE, 1×DEL`. Conveyor hums up.
2. **Ops queue.** Beacons/crates trickle onto the conveyor in a randomized but seeded order. Player
   grabs the front crate (or accepts the front beacon) and resolves it before the next advances:
   - SET crate → drive to `hash(key) % N`, **Z** to PUT.
   - GET beacon → drive to `hash(key) % N`, **X** to return (or **X** on empty/dark = MISS).
   - EXPIRE token → drive to existing crate, **V** to ignite fuse.
   - DEL beacon → drive to crate, **C** to evict.
3. **TTL ticks the whole time.** Lit rings drain; expired crates go dark. The sweeper drone makes
   one floor pass per wave (audible hum) and removes dark crates — the proactive sweep.
4. **Wave clear.** When the queue empties, the warehouse dimms and the HUD posts the wave score:
   `{puts_correct, gets_correct, misses_correct, stale_reads, wrong_bucket_routes, collisions_chained}`.
5. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page channel and the NDJSON `.logs/evidence.ndjson`. Gate-locked beacons at the warehouse
   door go green; the next wave's difficulty (more keys, more TTL pressure, more collisions) unlocks.

## 5. Inputs & controls (≤ 3 primary actions, NES-pad feel)

- **WASD / ←↑↓→** — drive the forklift bot across the warehouse floor.
- **Z** — PUT (store the carried crate at the targeted shelf). Primary write action.
- **X** — GET / MISS (return the value if the crate is live, or signal MISS on empty/expired
  slots). Primary read action.
- **C** — DEL (evict the targeted crate). Secondary write.
- **V** — apply EXPIRE / PERSIST token to the targeted crate. Secondary write.
- **Space** — grab/release a crate from the conveyor (toggles carry state).
- **H** — HUD toggle: show the live `hash(key) % N` preview while carrying a crate (allowed in
  wave 1, disabled in later waves to test mastery without the crutch).
- Three primary actions (**Z**, **X**, **C**) define the loop; **V** and **Space** are
  context-locked to specific beacon types so they don't overload the player.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `puts_correct === puts_total` (every SET routed to its true `hash(key) % N` shelf),
  - `gets_correct === gets_total` (every GET returned the live crate OR correctly reported MISS on
    a missing/expired slot — no stale reads),
  - `wrong_bucket_routes === 0` (no crate ever landed on a mismatched shelf),
  - `stale_reads === 0` (no GET returned a dark/expired crate as if it were live),
  - `dels_correct === dels_total` and `expire_correct === expire_total`.
- **Fail the wave (FAIL)** when **any** of:
  - A PUT lands on the wrong shelf (`wrong_bucket_routes > 0`) → the crate clips through the
    floor, the wave score flashes red, evidence `pass: false`.
  - A GET returns a dark/expired crate as a live value (`stale_reads > 0`) → the client pod shorts
    out, evidence `pass: false`.
  - The conveyor overflows (player lets ≥ 3 crates back up) → warehouse alarm, evidence
    `pass: false` with `overflow: true`.
- Both outcomes are **direct readouts of K/V discipline**: hash determinism, TTL invisibility, and
  no-torn-writes. Neither win nor fail is gated on speed — correctness first.

## 11. Learning-gate hooks

- **Active unit:** `U2-key-value-store` (project `02_key_value_store`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still
  emits evidence with `scheduled_review: false` and `review_reason: "deepening"` (per
  `ROUTING_MANIFEST.md`); the verifier will not promote until the substrate registers the unit.
  The game never writes learner state.
- **Encounter / scene id:** `kv-warehouse-01`.
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus NDJSON at
  `engines/<engine>/games/02_key_value_store/.logs/evidence.ndjson`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Evidence record fields** (this game's metrics variant — `kind: "voxeldoj-kv-warehouse"`):
  ```json
  {
    "source": "voxeldoj",
    "unit_id": "U2-key-value-store",
    "project": "02_key_value_store",
    "encounter_id": "kv-warehouse-01",
    "game": "KV Warehouse",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldoj-kv-warehouse",
      "puts_total": 4,
      "puts_correct": 4,
      "gets_total": 3,
      "gets_correct": 3,
      "misses_total": 1,
      "misses_correct": 1,
      "dels_total": 1,
      "dels_correct": 1,
      "expire_total": 1,
      "expire_correct": 1,
      "stale_reads": 0,
      "wrong_bucket_routes": 0,
      "collisions_chained": 1,
      "overflow": false
    },
    "curriculum_context": {
      "concept": "hash-map-backed CRUD with TTL expiration",
      "mechanic": "KV Warehouse",
      "accepted_signal": "key routed to hash(key)%N shelf; GET returns live value or MISS",
      "rejected_trap": "wrong-shelf PUT or stale read of an expired (dark) crate"
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
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.wrong_bucket_routes === 0` AND
  `metrics.stale_reads === 0` AND `metrics.overflow === false` AND
  `metrics.puts_correct === metrics.puts_total` AND
  `metrics.gets_correct + metrics.misses_correct === metrics.gets_total + metrics.misses_total`.
  (i.e. every write hit its hash bucket, every read was live-or-correct-MISS, no overflow.)
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  plan slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the KV Warehouse 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `02_key_value_store`, unit
  `U2-key-value-store`, where every SET routed to `hash(key) % N`, every GET returned a live
  value or a correct MISS, no stale read of an expired crate, and no torn writes — end-to-end
  under Playwright."**

## Open questions / risks (for the implementer)

- **Hash function choice.** Use a deterministic, player-legible hash (e.g. sum-of-char-codes mod
  N, or djb2 mod N). Avoid crypto hashes — the player must be able to predict the bucket. Document
  the chosen function in the HUD briefing so wrong-shelf PUTs are unambiguous.
- **N (bucket count).** Start `N = 8` so the ring fits the camera and collisions are reachable
  within a 4-PUT wave. Wave 3 can raise to `N = 16`.
- **TTL clock scale.** Real spec TTLs are seconds-to-days. In-game, drain the ring over ~6–10 s
  so the player can see expiration happen within one wave; expose the scale factor in the HUD.
- **"H" hash-preview crutch.** Decide by playtest whether to keep it on for waves 1–2 only, or
  always; the verifier must know which wave the smoke run clears.
