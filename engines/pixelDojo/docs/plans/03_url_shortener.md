# PLAN slice — `03_url_shortener` (Slug Launcher)

> PLAN slice for `/threejs-dojo 03_url_shortener`. Shape **B** — a fresh standalone 3D
> (three.js) sibling app at `engines/voxelDojo/game-03-wormhole/`, NOT a pixel-quest
> encounter. The pixel-quest shell (token-meter admit/reject lanes) cannot represent the
> core mechanic here — code generation is **encode + collision-retry**, not lane gating.
> The 3D scene embodies the concept: a hash cannon that maps long-URL crates to base62
> docks, with collisions surfacing as physical bounce events the player must retry.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/03_url_shortener/` (Level 1 — Fundamentals).
- **ONE concept this game teaches:** unique short-code generation with **base62 / hash-based
  encodings and explicit collision handling** (the project's stated Primary concept in
  `curriculum/03_url_shortener/docs/lesson.md` and `spec.md` Learning Objectives).
- **Out of scope (the curriculum's job, not the game's):** relational DB schema, JWT/auth,
  batch API (RF-010), analytics pipeline internals, the Go/Rust/Node comparison. One game =
  one concept: **encode → detect collision → retry**.
- **Catalog concepts reference:** "Hashing (base62, SHA-256 trunc), unique ID generation,
  HTTP redirects (301/302)". Key question: "How do ID generation strategies (snowflake, ULID,
  auto-increment) compare for collision resistance and throughput?"
- **Slug:** `03_url_shortener`
- **Unit id (learning gate):** `03_url_shortener`
- **Encounter id:** `slug-launcher-01`

## 2. Player goal

You run a **hash cannon** in a 3D arena. Long-URL crates float in from the edge; assign each
one a short base62 code by picking an ID strategy and firing. Send every crate to a unique
dock — when two crates want the same code, **see the collision and re-hash it** before the
crate is lost.

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Long URL → short code (the encode primitive) | A long-URL crate spawns at the arena edge; the player fires the hash cannon; the crate flies to the dock whose label IS the computed base62 code | Player internalizes "short code = function(long URL)" |
| base62 alphabet (62 symbols: 0-9 A-Z a-z) | The cannon muzzle is a rotating 62-cell ring; each code character stops one cell — the player sees codes as base62 sequences, not magic strings | Player recognizes base62 as the encoding alphabet |
| Auto-increment ID strategy | Strategy **1**: counter assigns the next sequential code; collisions impossible; fires instantly | Player learns collision-freedom AND its cost (predictable, leaks count, sequential) |
| SHA-256 truncation strategy | Strategy **2**: cannon hashes the URL → truncates to 6 base62 chars; **deterministic** (same URL → same code) | Player learns determinism — and that its cost is collisions |
| Snowflake/ULID strategy | Strategy **3**: code = timestamp-shard + random body; near-zero collision, k-orderable | Player learns why distributed systems shard by time |
| Collision detection (spec RF-011) | When the computed dock is occupied, the dock flares red and the incoming crate **bounces back** — a physical event, not a log line | Player sees a collision happen, immediately and unambiguously |
| Collision retry, ≥5 attempts (spec RF-011 + edge case) | Player presses **R** to re-hash with a salt counter; the dock slot rotates to the next code; after 5 failed retries the crate is **lost** (overflow) | Player executes the explicit retry loop the spec mandates, with the same ≥5-attempt budget |
| HTTP 301 redirect = code → target lookup | After docking, a "visitor" beam shoots from the code dock to the destination icon — the short code resolves to the long URL | Player links short code → redirect semantics (RF-003) |
| Strategy choice matters under load | Waves force the trade-off: identical URLs under HASH keep colliding (retry budget exhausts); SNOWFLAKE handles them; AUTO is collision-free but capped to one-per-tick (throughput ceiling) | Player picks the right strategy for the load — the catalog's key question, played |

## 4. Main loop (the 10–30s cycle the player repeats)

1. A wave of N long-URL crates spawns at the arena edge and drifts inward toward the player's
   platform. Spawn cadence ≈ 0.8–1.2s; wave size ramps 4 → 8 → 12.
2. Player picks an ID strategy (keys **1** / **2** / **3** — AUTO / HASH / SNOWFLAKE),
   aims at the lead crate (mouse or arrow keys), and presses **SPACE** to encode.
3. The cannon computes the code per the strategy; the crate flies to the dock labeled with
   that code.
   - **Dock empty** → crate locks in, score +1, a redirect beam fires to the destination icon.
   - **Dock occupied** → COLLISION: dock flares red, crate bounces back toward the player.
4. On collision, player presses **R** to retry (HASH: re-hash with salt counter, up to 5;
   SNOWFLAKE: advance the time shard; AUTO: cannot collide, so this is the teachable
   contrast). If retries exhaust (>5 on HASH), the crate is lost (overflow).
5. Wave clears when every crate is docked or lost. Stats tower reports
   `codes_assigned / collisions / retries / retries_exhausted`.
6. Next wave ramps difficulty (more crates, more repeated URLs to stress HASH).

Total cycle ≈ 25–40s per wave.

## 5. Inputs & controls

- **Mouse** or **← → ↑ ↓** — aim the hash cannon at the incoming crate (yaw/pitch).
- **1 / 2 / 3** — switch ID strategy (AUTO / HASH / SNOWFLAKE). Strategy is shown on the HUD.
- **SPACE** — fire (encode + dispatch the crate to its computed dock).
- **R** — retry on collision (re-hash with salt; consumes one retry from the 5-attempt budget).

≤ 4 distinct actions. Mouse + 3 hotkeys keeps the arcade feel while leaving room for the
strategy switch (the actual pedagogy).

## 6. Win / fail states (both direct readouts of using the concept correctly)

- **Win a wave** when **all** hold:
  - every spawned crate docked to a unique code (`dock_overflows === 0`),
  - any collision that occurred was retried to success within the 5-attempt budget
    (`retries_exhausted === 0`),
  - at least one collision was detected and recovered (proves the player ran the RF-011
    loop, not that they got a collision-free seed by luck),
  - wave cleared within the time limit.
- **Fail a wave** when **any** of:
  - a crate is lost to retry-exhaustion (`retries_exhausted > 0`) — the player kept firing
    HASH into repeated URLs without switching strategy,
  - a crate reaches the center undocked (`dock_overflows > 0` from queue backlog),
  - time expires before the wave clears.

Both outcomes are direct readouts of: did the player encode correctly, detect collisions,
and retry (or switch strategy) within the spec's retry budget?

## 11. Learning-gate hooks

- **Active unit targeted:** `03_url_shortener` (project `03_url_shortener`). The game emits
  evidence only; `learner/gate/` decides the outcome and persists it through
  `learner/substrate/`. **The game never writes learner state.**
- **Evidence channel:** the VoxelDojo app surfaces each cleared-wave attempt on
  `window.__voxelDojoEvidence` and as an `EVIDENCE <json>` console record for the Playwright
  smoke to capture.
- **Evidence record fields (one JSON object per line):**

  ```json
  {
    "source": "threejs-dojo",
    "unit_id": "03_url_shortener",
    "project": "03_url_shortener",
    "encounter_id": "slug-launcher-01",
    "game": "Slug Launcher",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-slug-launcher",
      "codes_assigned": 8,
      "collisions_detected": 2,
      "collisions_retried_ok": 2,
      "retries_exhausted": 0,
      "dock_overflows": 0,
      "strategies_used": ["hash", "snowflake"],
      "wave_cleared": true,
      "wave_target": 8
    },
    "curriculum_context": {
      "concept": "unique short-code generation with base62/hash-based encodings and explicit collision handling",
      "mechanic": "Slug Launcher (3D hash cannon + base62 docks)",
      "accepted_signal": "all crates docked to unique base62 codes; every collision detected and retried within the 5-attempt budget",
      "rejected_trap": "losing a crate to retry-exhaustion instead of switching strategy, or treating a collision-free seed as proof of correctness"
    }
  }
  ```

- **Pass rule (gate):** the attempt's evidence record is eligible iff
  - `unit_id === "03_url_shortener"` and `project === "03_url_shortener"`,
  - `metrics.kind === "threejs-slug-launcher"`,
  - `pass === true` AND `metrics.codes_assigned >= metrics.wave_target`
    AND `metrics.retries_exhausted === 0` AND `metrics.dock_overflows === 0`
    AND `metrics.collisions_detected >= 1` AND `metrics.collisions_retried_ok === metrics.collisions_detected`.
  - The `collisions_detected >= 1` clause is load-bearing: a wave that never collides
    (lucky seed) does NOT pass — the player must demonstrate the retry loop at least once.
- **Anti-replay:** `ts` must be strictly newer than the last gated evidence for the unit
  (the verifier enforces this).
- **Side-effect contract (smoke-asserted):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage.learning_state`,
  `units_log`, or `mastered`, and must NOT call any `learner/` write path. Producer ≠ verifier.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts
  (this PLAN slice, the game source under `engines/voxelDojo/game-03-wormhole/`, the captured
  EVIDENCE record, the screenshot) plus the one-sentence done-rule and judges whether the
  didactic chain (encode → detect collision → retry per RF-011) is evidenced end-to-end
  under Playwright, with the producer≠verifier invariant intact.
