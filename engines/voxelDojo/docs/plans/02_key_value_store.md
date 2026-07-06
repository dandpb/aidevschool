# PLAN — Game 02: "WAREHOUSE" (Key-Value Store / hash-addressed storage + TTL expiry)

> One file per game; this is the WAREHOUSE plan. Sections 1–13 follow the `PLAN.md` template.
> The pilot is `game-10-hash-ring/`; this game mirrors its structure verbatim and swaps the concept.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/02_key_value_store/`. The ONE concept this game teaches:
**hash-addressed storage + TTL expiry** — values are placed on the shelf chosen by a stable hash of
the key (`bucketOf(key, n)`); `put`/`get`/`del` mutate that slot; a value may carry a deadline after
which `get` returns null and a `sweepExpired(now)` reclaims the slot. The store is driven by an
injected clock so expiry is deterministic and headless-testable. Out of scope: HTTP API design, JSON
serialization, persistence/snapshots, concurrency/mutex tuning, memory accounting, the Go/Rust/Node
comparison (the curriculum project's job).

**2. Why 3D**
A hash table *is* a physical warehouse. In 3D the player watches a row of numbered shelves (the
buckets); a picker-bot carries each incoming crate to the shelf the key hashes to; crates pile on the
correct shelf and `get`/`del` pluck them off again. TTL is intrinsically temporal *and* visible here:
an expiring crate visibly shrinks/darkens toward its deadline then vanishes on a sweep, while
non-expiring crates stay solid. The spatial payoff is load skew — a weak prefix-only hash is read
instantly as one overflowing shelf next to empty ones, and strengthening the hash visibly redistributes
the crates across shelves. That bucket-as-a-place + crate-as-data + decay-over-time reading cannot be
read off a 2D counter.

**3. Player goal**
Keep the warehouse stocked and tidy — put each crate on the shelf its key hashes to, fetch the right
crate on demand, and let the expiring ones decay away on time.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Hash bucket (`bucketOf(key,n)`) | A numbered shelf the crate must land on | Player reads hash → shelf, not arbitrary placement |
| Stable hash (same key ⇒ same shelf) | Same-key crates always revisit one shelf | Player predicts the shelf before the bot docks |
| `put` / `get` / `del` | Bot stores / retrieves / removes a crate on the hashed shelf | Player runs CRUD against the physical slot |
| TTL deadline | Crate visibly shrinks/darkens as `now` nears its deadline | Player reads remaining lifetime from size |
| Expiry (`get` returns null past deadline) | `get` on a decayed crate yields nothing | Player knows the value is gone, not misplaced |
| `sweepExpired(now)` | A sweeper pass dissolves all past-deadline crates | Player triggers sweeps and only expired crates vanish |
| Hash strength / load skew (`loadPerShelf` / `loadSkew`) | A weak prefix-only hash overfills one shelf; a stronger hash spreads the load | Player sees skew and dials the hash strength up to even it |

**5. Main loop**
A wave of crates streams into the warehouse (~20–40s). For each crate the player **predicts the
shelf** its key hashes to (active recall); the picker-bot then docks there. Between waves the player
runs CRUD (`get`/`del`) against the shelves and fires a sweeper when TTL crates have decayed. Score =
shelf-prediction accuracy + correct CRUD results (a `get` past deadline returns null, a `del` of an
expired key is a no-op) + load skew within bound. Each level deepens one facet of the concept.

**6. Camera & controls**
Mouse-orbit + scroll zoom down the aisle of shelves (OrbitControls). Click a shelf to predict/store ·
click a crate to `get`/`del` it · click "sweep" to run `sweepExpired(now)` · on L4 dial the hash
strength up to fix skew. Four actions plus camera.

**7. Win / fail states**
*Win a wave:* shelf-prediction accuracy ≥ 80%, every CRUD answer correct (a `get` past deadline
returns null, not the stale value; `del` of expired is a no-op), and (on L4) load skew ≤ threshold.
*Fail:* prediction accuracy below target (the hash model is not held), OR any CRUD mismatch (reading
a decayed crate as present, or sweeping a non-expired crate), OR load skew starving a shelf (too weak
a hash). Every failure is a misread of "hash → shelf" or "deadline → invisible."

**8. Progression / difficulty**

- **L1 — Hash → shelf:** `n` shelves, slow crate stream. Predict the shelf each key hashes to. (Active
  recall on the stable hash; same key ⇒ same shelf.)
- **L2 — CRUD:** `put` / `get` / `del` against the hashed slot. Predict whether a `get` hits and
  whether `del` removed the right crate. (The data structure is a physical slot.)
- **L3 — TTL decay:** crates carry deadlines; the clock advances. Predict whether a `get` returns the
  value or null, then fire `sweepExpired(now)` and predict how many vanish. (Expired ⇒ invisible.)
- **L4 — Skew:** a weak prefix-only hash collides similar keys on one shelf and the keyspace skews.
  Dial the hash strength up (fold more of the key) until `loadSkew` drops within bound. (A stronger
  hash, not more buckets, is what evens the load.)

**9. Visual direction**
Single hero object: the aisle of shelves (colored box rows) on a dark void floor, viewed at a ~30°
tilt. Crates are an InstancedMesh of boxes that scale down with remaining TTL (a full crate = healthy,
a tiny/dark crate = about to expire), non-expiring crates stay full-size; the picker-bot is a small
low-poly body that docks at the hashed shelf. Load is shelf fill height / emissive intensity. ≤8-color
flat palette; the shelf color = bucket id, the decay scale = remaining TTL. All geometry procedural
(`BoxGeometry` shelves/crates, InstancedMesh for crates, a simple bot mesh).

**10. Simulation core (headless)**
`src/sim/store.ts` — pure TypeScript with an injected clock, NO `three` import:
`bucketOf(key, n, strength)` stable hash to a shelf id; `put`/`get`/`del`; TTL via a `deadline` field
(`get` returns null past `now`, `del` of an expired key is a no-op); `sweepExpired(now)` returns the
reclaimed keys and removes only expired ones; `loadPerShelf(store)` and `loadSkew(store)` across the
`n` shelves. The hash carries a `strength` ("full" = good avalanching hash ⇒ even spread; a small
number = a poor prefix-only hash ⇒ skew) so L4's "stronger hash evens the load" is honest.
Deterministic injected clock (`now()` returns ms) and seeded RNG (`mulberry32`) for the key stream.
Vitest covers: same-key ⇒ same-shelf (stability); TTL expiry returns null after the deadline and sweep
removes only expired; determinism (same seed + same clock ⇒ same store); a weak hash skews and a
stronger hash evens it. No Three.js imports here.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ~300
instanced crates and ≤16 shelves; one draw call for crates (InstancedMesh), no postprocessing, no
physics engine — docking is parametric animation along the aisle.

**12. Learning-gate hooks**

- Targets unit **`U2-key-value-store`** (project `02_key_value_store`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is not yet in the substrate (only U0
  is honestly gated), so WAREHOUSE evidence serves the **real learning gate** for U2 when the scheduler
  makes it the active unit — and serves as scheduled review / deepening afterwards. The emitter derives
  `scheduled_review` / `review_reason` dynamically from the substrate-generated review slice, so both
  modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U2-key-value-store","project":"02_key_value_store","scenario_id":"warehouse-L1","game":"WAREHOUSE","ts":"<iso>","pass":true,"metrics":{"shelf_predictions":12,"shelf_prediction_accuracy":1,"crud_accuracy":1,"expired_swept":0,"load_skew":1.0},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"hash-addressed storage + TTL expiry","mechanic":"warehouse shelves + decaying crates"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/store.ts` + `sim/rng.ts` (+ `sim/hash.ts`) + Vitest suite proving same-key ⇒ same-shelf,
  TTL expiry returns null after deadline, sweep removes only expired, determinism. (No pixels yet.)
- **M2** scene: aisle of shelves + instanced crates (scaling with TTL) + picker-bot, rendering a
  static store snapshot.
- **M3** interaction: click shelf to predict/store, click crate to get/del, sweep button, vnode-style
  shelf-count dial on L4.
- **M4** levels L1–L4 with the CRUD + TTL + skew facets.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 headed, asserts evidence record + WebGL canvas + screenshot.

**Open questions / risks**
Is "predict the shelf" enough active recall for L2 CRUD, or should L2 also ask the player to predict
whether a `get` hits before revealing it? Does WebGL run reliably in the Playwright smoke environment
(see `docs/GAP_ANALYSIS.md` §G6)? Resolve both during M1–M3 before building L3–L4.
