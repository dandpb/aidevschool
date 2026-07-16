# PLAN slice — `11_load_balancer` (Shape B: Traffic Forge)

> PLAN slice for `/threejs-dojo 11_load_balancer`. The slug's catalog concept row is
> "Reverse proxy, health checks, round-robin, least-connections, consistent hashing, TLS termination,
> sticky sessions, circuit breaker per backend". This slice narrows that row to its **primary** concept
> (per `curriculum/11_load_balancer/docs/spec.md` "Learning Objectives"):
> **reverse-proxy load balancing with health-aware request routing**. The other facets (TLS
> termination, connection-pool tuning, weighted distribution, per-backend circuit-breaker state
> machines) are out of scope — one game = one concept: **pick the right routing algorithm + route only
> to healthy backends + fail over when one dies**.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world at
> `engines/voxelDojo/game-11-air-traffic/`, NOT a pixel-quest encounter. None of pixel-quest's
> four encounter kinds (token_bucket / sequence_flow / route_health / policy_gate) can represent
> *a pool of backends with per-node health, three selectable routing algorithms, and in-flight
> load* — they are all variants of "incoming sprite → admit/reject at a single gate". Routing across
> a pool of N health-tagged nodes, with sticky-session affinity and failover retry, needs its own 3D
> world. The 3D scene embodies the concept: a central **dispatcher turret** orbiting a ring of
> **backend pillars**, where the player picks the algorithm and the ring's live health decides which
> pillar each request orb actually lands on.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/11_load_balancer/` (Level 4 — Scalability and Distribution).
- **ONE concept this game teaches:** reverse-proxy load balancing where every request is routed to a
  healthy backend selected by **one of three algorithms** (round-robin / least-connections /
  consistent-hash on a session key), and where the balancer **fails over to another eligible backend**
  when the chosen one goes unhealthy. Out of scope (the curriculum's job, not the game's): TLS
  termination, weighted distribution tuning, the per-backend circuit-breaker state machine
  (closed/open/half-open — that is project 13's primary concept), connection-pool sizing, the
  Go/Rust/Node comparison. One game = one concept: **algorithm choice + health-aware routing + retry**.
- **Catalog concepts reference:** "Reverse proxy, health checks, round-robin, least-connections,
  consistent hashing". Catalog key question (context only, not the win condition): "How does
  connection pooling and health-check frequency affect failover speed?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective):** the player
  demonstrates health-aware request routing — every request reaches a healthy backend via the right
  algorithm for its type, sticky sessions stay on the same backend, and a mid-flight backend failure
  is recovered by retry on another eligible backend.
- **Slug:** `11_load_balancer`
- **Unit id (learning gate):** `11_load_balancer` (the substrate does not yet have this unit
  registered, so the run emits `scheduled_review: false`, `review_reason: "deepening"` until it is
  added — same convention as siblings `02_key_value_store`, `03_url_shortener`).
- **Encounter / scene id:** `traffic-forge-01`

## 2. Player goal

You run a **dispatcher turret** at the center of a ring of server pillars. Request orbs arrive in
waves; each orb is one of three shapes (plain, sticky, heavy). **Pick the right routing algorithm**
for each shape and fire — round-robin for plain, least-connections for heavy, consistent-hash for
sticky — and **never send an orb to a dead pillar**. When a pillar dies mid-flight, **retry on
another eligible backend** before the orb is lost.

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Reverse proxy = single entry, pool of backends** (RF-001, RF-002) | The player's **dispatcher turret** sits at the center; **N backend pillars** (start `N = 6`) stand in a ring around it. Every request orb spawns at the turret; the player's job is to assign each one to a pillar. | Player internalizes "I am the proxy; the pool is the ring." |
| **Round-robin routing** (RF-006) | Algorithm **1**: a rotating **RR pointer** advances by one pillar per shot, skipping dead ones. Plain (white) orbs accept this algorithm. | Player sees RR as "spread evenly across the healthy pool, in order." |
| **Least-connections routing** (RF-007) | Algorithm **2**: the turret highlights the pillar with the **lowest in-flight orb count**; ties broken by RR position. Each pillar shows a live in-flight counter ring above it. Heavy (red, larger) orbs **must** use LC — firing a heavy orb at a high-in-flight pillar overflows it and drops the orb. | Player links "heavy request → least-loaded backend" — exactly the spec's intent. |
| **Consistent hashing on a stable key** (RF-008) | Algorithm **3**: sticky (gold) orbs carry a visible session glyph (e.g. `S:a3f`); the turret shows `hash(session) → ring slot → pillar`. Same glyph always maps to the same pillar while it lives. Using anything other than CH for a sticky orb **breaks the session** (sticky_break). | Player internalizes "session affinity = deterministic mapping by key, not by load." |
| **Eligible = healthy AND not overflowed** (RF-005) | Each pillar has a **health ring** at the top: green = healthy, red = unhealthy, dark = dead. Routing an orb to anything other than green = `dead_route` fail. The turret's algorithm highlights only green pillars as eligible targets. | Player treats health as the gating predicate, not the algorithm. |
| **Active health check** (RF-003) | Every ~5s an automatic **probe beam** sweeps the ring and pulses each pillar; a pillar can flip green→red→dead on the next probe. Visible, not player-triggered — passive observation. | Player links "the balancer probes; backends can flip state at any moment." |
| **Passive health update from proxied outcome** (RF-004) | When an orb **fails mid-flight** (pillar went dark between fire and land), the turret logs a passive failure against that pillar — it accelerates the pillar's transition to red/dead. | Player sees that request failures feed back into health, not just the active probe. |
| **Retry on backend failure / failover** (RF-013) | If a chosen pillar dies while an orb is in flight, the orb **stalls and flashes red**. The player presses **R** to **retry on the next eligible pillar** (the algorithm re-selects among the now-healthy set). Not retrying before the orb's countdown empties = `orb_lost`. | Player executes the explicit failover loop the spec mandates (RF-013). |
| **Sticky session preserved across failover** (RF-010 + RF-013) | A sticky orb retried after its original pillar dies is re-hashed to the next pillar on the consistent-hash ring; the session's *new* home is stable until that pillar also dies. A banner shows the session remap so the player sees the move. | Player learns stickiness is "stable while eligible", not "permanent forever". |
| **Algorithm choice matters under load** | Waves force the trade-off: a wave with many heavy orbs punishes RR (overflow); a wave with sticky orbs punishes non-CH (sticky breaks); a wave of plain orbs works under any algorithm (so the player can show mastery of the cheapest, RR). | The catalog's key question — routing correctness under load — gets played, not just read. |

## 4. Main loop (the ~25–40s cycle the player repeats)

1. **Spawn.** A wave card flashes the operation mix for the round, e.g. `WAVE 2: 5 plain · 3 sticky · 2 heavy`. Ring of pillars hums up; one pillar is pre-marked red (unhealthy) so the player must respect eligibility from the first shot.
2. **Orb queue.** Orbs spawn at the dispatcher turret in a randomized but **seeded** order. The lead orb's shape (plain / sticky / heavy) and — for sticky — its session glyph are visible. The turret's HUD shows the live algorithm choice and the pillar it would target.
3. **Algorithm pick.** Player presses **1 / 2 / 3** (RR / LC / CH). The eligible pillars (green) brighten; ineligible (red/dark) dim. The turret's predicted target pillar glows.
4. **Fire.** Player presses **SPACE**. The orb flies along a 3D arc to the chosen pillar. The pillar's in-flight counter ring ticks up.
5. **In-flight events** (the load-bearing pedagogy):
   - **Healthy landing** → counter ticks up, the orb is "processed" (~1.2s), counter ticks down. Score +1.
   - **Mid-flight death** → pillar goes dark while the orb is airborne; the orb **stalls and flashes red**, a `RETRY` prompt blazes above the turret. Player presses **R** to fail over; the orb reroutes to the next eligible pillar per the active algorithm. `failover_recovered += 1`.
   - **No retry in time** → the orb's countdown empties; it drops into the void. `orbs_lost += 1`.
6. **Probe tick.** Roughly every 5s, the active-probe sweep animates around the ring; 0–2 pillars can flip state per sweep (seeded per wave so the verifier knows what to expect).
7. **Wave clear.** When the queue empties, the ring dims and the HUD posts the wave score:
   `{orbs_total, orbs_landed, dead_routes, sticky_breaks, heavy_overflows, failover_recovered, orbs_lost}`.
8. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page `window.__voxelDojoEvidence` channel and `EVIDENCE` console. The gate at the ring's edge goes green
   and the next wave's difficulty unlocks (more orbs, more mid-flight failures to force failover,
   more sticky-session collisions to force CH).

## 5. Inputs & controls (≤ 4 primary actions, NES-pad feel)

- **Mouse / `← →`** — orbit the dispatcher turret's aim around the ring (cosmetic — the algorithm
  picks the actual target; the aim is for the player to **see** which pillar is locked).
- **1 / 2 / 3** — switch routing algorithm (RR / LC / CH). Current algorithm and target pillar shown on HUD.
- **SPACE** — fire (route the front orb to the algorithm's chosen eligible pillar).
- **R** — retry on backend failure (fail over to the next eligible pillar). Only active while an orb is stalled.
- **H** — HUD toggle: show the live `hash(session) % N` preview for sticky orbs (allowed in wave 1,
  disabled in later waves to test mastery without the crutch).

Three primary actions (**1/2/3** algorithm pick, **SPACE** fire, **R** retry) define the loop; aim
and **H** are context-locked so they don't overload the player.

## 6. Win / fail states (both direct readouts of using the concept correctly)

- **Win the wave (PASS)** when **all** of:
  - `orbs_landed === orbs_total` — every orb reached a healthy pillar (no dead-routes, no losses),
  - `dead_routes === 0` — the player never fired at a non-healthy pillar,
  - `sticky_breaks === 0` — every sticky orb used CH and same-session orbs shared a pillar,
  - `heavy_overflows === 0` — every heavy orb used LC and never piled onto an overloaded pillar,
  - `failover_recovered >= 1` — the player demonstrated the RF-013 retry loop at least once (proves
    failover was actually exercised, not dodged by a lucky no-failure seed),
  - `orbs_lost === 0` — no orb dropped into the void from an unrecovered retry.
- **Fail the wave (FAIL)** when **any** of:
  - A fire lands on a red/dark pillar (`dead_routes > 0`) — the pillar shorts out, the wave score
    flashes red, evidence `pass: false`.
  - A sticky orb is fired under RR or LC and a same-session orb already lives on a different pillar
    (`sticky_breaks > 0`) — the session glyph splits visibly, evidence `pass: false`.
  - A heavy orb is fired under RR/LC and lands on a pillar whose in-flight cap is hit
    (`heavy_overflows > 0`) — the orb bounces off the overflowed pillar, evidence `pass: false`.
  - An orb's retry countdown empties (`orbs_lost > 0`) — the orb falls into the void, evidence
    `pass: false` with `overflow: true`.
- Both outcomes are **direct readouts of health-aware routing discipline**: pick the right algorithm,
  respect the health gate, retry on failure. Neither win nor fail is gated on raw speed — correctness first.

## 11. Learning-gate hooks

- **Active unit:** `11_load_balancer` (project `11_load_balancer`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still emits
  evidence with `scheduled_review: false` and `review_reason: "deepening"` (per sibling convention);
  the verifier will not promote until the substrate registers the unit. **The game never writes
  learner state.**
- **Encounter / scene id:** `traffic-forge-01`.
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus `EVIDENCE`
  console records from `engines/voxelDojo/game-11-air-traffic/`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Evidence record fields** (this game's metrics variant — `kind: "threejs-traffic-forge"`):

  ```json
  {
    "source": "threejs-dojo",
    "unit_id": "11_load_balancer",
    "project": "11_load_balancer",
    "encounter_id": "traffic-forge-01",
    "game": "Traffic Forge",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-traffic-forge",
      "orbs_total": 10,
      "orbs_landed": 10,
      "dead_routes": 0,
      "sticky_breaks": 0,
      "heavy_overflows": 0,
      "failover_recovered": 1,
      "orbs_lost": 0,
      "algorithms_used": ["round_robin", "least_connections", "consistent_hash"],
      "rr_skew_max": 1,
      "wave_cleared": true,
      "wave_target": 10
    },
    "curriculum_context": {
      "concept": "reverse-proxy load balancing with health-aware request routing",
      "mechanic": "Traffic Forge (3D dispatcher turret + ring of health-tagged backend pillars)",
      "accepted_signal": "every request routed to a healthy backend via the right algorithm; failover recovered on mid-flight failure",
      "rejected_trap": "routing to a dead pillar, breaking sticky-session affinity, or losing an orb to an unrecovered retry"
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

- **Pass rule (gate):** `evidence.pass === true` AND `metrics.kind === "threejs-traffic-forge"` AND
  `metrics.orbs_landed === metrics.orbs_total` AND `metrics.dead_routes === 0` AND
  `metrics.sticky_breaks === 0` AND `metrics.heavy_overflows === 0` AND `metrics.orbs_lost === 0`
  AND `metrics.failover_recovered >= 1`.
  - The `failover_recovered >= 1` clause is load-bearing: a wave that never experiences a mid-flight
    failure (lucky seed) does NOT pass — the player must demonstrate the RF-013 retry loop at least
    once. Wave 2's seed guarantees at least one mid-flight pillar death.
- **Anti-replay:** `ts` must be strictly newer than the last gated evidence for the unit (the
  verifier enforces this — each gate review records the `evidence_ts` it consumed).
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  plan slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the Traffic Forge 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `11_load_balancer`, unit `11_load_balancer`,
  where every request orb reached a healthy backend via the right algorithm (RR for plain, LC for
  heavy, CH for sticky), no dead-routes / sticky-breaks / heavy-overflows, and at least one
  mid-flight backend failure was recovered by retry on another eligible backend — end-to-end under
  Playwright."**

## Open questions / risks (for the implementer)

- **Wave 2 seed must force a failover.** The passive-failure RNG seed for wave 2 should be pinned
  (mulberry32 with a fixed constant) so the smoke run is deterministic and the
  `failover_recovered >= 1` clause is always reachable. Document the seed in the HUD briefing.
- **N (pillar count).** Start `N = 6` so the ring fits the camera, the RR pointer is legible, and
  the consistent-hash ring has enough slots to demonstrate session affinity without crowding.
- **Heavy-orb in-flight cap.** Set the cap so a heavy orb fired at a pillar already serving one
  heavy orb overflows — visible and immediate. Cap = 1 in-flight heavy per pillar in wave 1; can
  raise in later waves.
- **"H" hash-preview crutch.** Decide by playtest whether to keep it on for wave 1 only, or
  always; the verifier must know which wave the smoke run clears.
- **Circuit-breaker scope.** Per-backend breaker state machine (closed/open/half-open) is
  deliberately **out of scope** — that is project 13's primary concept. Pillar health here is a
  binary healthy/unhealthy gate, not a tri-state breaker. Do not conflate.
