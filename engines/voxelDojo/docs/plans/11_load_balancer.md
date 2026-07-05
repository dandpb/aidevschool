# PLAN — Game 11: "AIR TRAFFIC" (Load Balancer / routing policies + health checks)

> One file per game; this is the AIR TRAFFIC plan. Sections 1–13 follow the `PLAN.md` template.
> The pilot is `game-10-hash-ring/`; this game mirrors its structure verbatim and swaps the concept.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/11_load_balancer/`. The ONE concept this game teaches:
**load-balancer routing policies + health checks** — incoming requests are routed to backends by a
switchable policy (round-robin, least-connections, random); backends carry health (healthy /
unhealthy) discovered by periodic probes; an unhealthy backend is removed from rotation and re-added
on recovery. Out of scope: TLS termination, sticky sessions, consistent-hash LB (already covered by
game 10), connection-pool tuning, the Go/Rust/Node implementation comparison (the curriculum
project's job).

**2. Why 3D**
Load balancing is a flow + topology problem. In 3D the player watches a queue of incoming ships
(requests) approaching a ring of landing pads (backends); the pads glow green when healthy and red
when a probe has marked them unhealthy; the controller picks which pad each ship lands at. The
contrast between policies is a *visible traffic pattern in space*: round-robin spaces ships evenly
around the ring; least-connections piles every ship onto the single idle pad; random scatters. When a
pad goes red, ships visibly avoid it — and if the player routes one there anyway, it sparks (an error).
That spatial reading of "policy × health → traffic" is the lesson, and it cannot be read off a 2D
counter dashboard.

**3. Player goal**
Land every incoming ship on a healthy pad using the right routing policy — and keep errors at zero
even when pads go dark.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Backend pool | A ring of landing pads (cylinders) | Player reads the ring as the available backends |
| Routing policy (round-robin / least-connections / random) | A switch the player sets; ships fly to the chosen pad | Player predicts which pad each policy picks |
| Round-robin | Ships space evenly around the ring in turn order | Player predicts the next pad by counting turns |
| Least-connections | Ship flies to the pad with the lowest open-connection counter | Player predicts the min-conn pad, not the "next" one |
| Random | Ships scatter across healthy pads | Player knows this is non-deterministic and worse-skewed |
| Health (healthy / unhealthy) | Pad glows green / red; a probe beam sweeps it | Player reads pad health from color |
| Health probe | A periodic beam samples each pad and can flip its health | Player triggers / waits for probes to discover dead pads |
| Eviction of unhealthy backends | Red pads get zero routes; routing to one = error spark | Player avoids dead pads |
| Recovery | A red pad turns green again on a successful probe and re-enters rotation | Player re-adds it to the live set |

**5. Main loop**
A wave of ships streams toward the ring (~20–40s). Before each ship docks, the player either
**predicts the pad** the current policy will choose (active recall) or **switches the policy** /
**fires a probe** to change the outcome. Score = prediction accuracy + zero errors (no route to an
unhealthy pad) + load balance (max/mean pad load). Between waves the policy or pad health changes,
deepening one facet of the concept.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the pad ring (OrbitControls), tilted ~30°. Click a pad to predict
it · click a policy button to switch · click "probe" to fire health probes. Four actions plus camera.

**7. Win / fail states**
*Win a wave:* prediction accuracy ≥ 80%, zero errors (no ship routed to an unhealthy pad), and load
skew ≤ threshold. *Fail:* prediction accuracy below target (concept not held), OR any error (a ship
sent to a dead pad), OR load skew starving a healthy pad (wrong policy for a lopsided load). Every
failure is a misread of "policy × health."

**8. Progression / difficulty**

- **L1 — Round robin:** all pads healthy, fixed round-robin policy. Predict the pad each ship lands on
  by counting turns. (Active recall on the simplest policy.)
- **L2 — Health check:** one pad scripted unhealthy. Player fires probes to discover it, then predicts
  which *healthy* pad round-robin skips to. Avoiding the dead pad is the lesson.
- **L3 — Least connections:** switch policy; pads have differing open-connection counts. Predict the
  min-connections pad — not the round-robin "next." Policy choice visibly changes the traffic pattern.
- **L4 — Recovery:** an unhealthy pad recovers (probe flips it green) and re-enters rotation. Player
  predicts it now receives traffic again. The full health lifecycle in one wave.

**9. Visual direction**
Single hero object: the ring of landing pads (cylinders) on a dark void deck, tilted ~30°. Incoming
ships are instanced cones approaching from above; pad health is green/red emissive glow + a probe beam
that sweeps on probe; load is emissive intensity. ≤8-color palette; the green/red health pair is the
load-bearing signal. All geometry procedural (`CylinderGeometry`, `ConeGeometry`, `InstancedMesh` for
ships).

**10. Simulation core (headless)**
`src/sim/balancer.ts` — pure functions with injected RNG, NO `three` import:
`policyRoute(policy, request, backends, state)` for `policy: "round_robin" | "least_connections" |
"random"`; health-aware (skips `unhealthy` backends); `probe(backend, rng)` flips health
stochastically; a `connections` counter drives least-conn; `errors` (route to unhealthy = error) and
`loadSkew` across backends are tracked. Deterministic seeded RNG (`mulberry32`) for ship streams and
probe flips. Vitest covers: round-robin distributes exactly evenly among healthy; least-connections
picks the min; unhealthy backends get zero routes; deterministic with seed.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ~200
instanced ships and ≤8 pads; one draw call for ships (InstancedMesh), no postprocessing, no physics
engine — docking is parametric animation toward the chosen pad.

**12. Learning-gate hooks**

- Targets unit **`U11-load-balancer`** (project `11_load_balancer`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is not yet in the substrate (only U0
  is honestly gated), so AIR TRAFFIC evidence serves the **real learning gate** for U11 when the
  scheduler makes it the active unit — and serves as scheduled review / deepening afterwards. The
  emitter derives `scheduled_review` / `review_reason` dynamically from the substrate-generated review
  slice, so both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U11-load-balancer","project":"11_load_balancer","scenario_id":"air-traffic-L1","game":"AIR TRAFFIC","ts":"<iso>","pass":true,"metrics":{"prediction_accuracy":0.92,"errors":0,"load_skew":1.1,"policy":"round_robin"},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"load-balancer routing + health checks","mechanic":"air traffic to landing pads"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/balancer.ts` + Vitest suite proving round-robin even split, least-conn picks min,
  unhealthy gets zero routes, deterministic with seed. (No pixels yet.)
- **M2** scene: ring of pads + instanced ships rendering a static routing decision.
- **M3** interaction: click pad to predict; policy switch; probe fire; docking animation.
- **M4** levels L1–L4 with the policy switch + health lifecycle.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 headed, asserts evidence record + WebGL canvas + screenshot.

**Open questions / risks**
Is "predict the pad" enough active recall for the policy contrast, or should L3 also ask the player to
state which policy minimizes skew for a given load? Does WebGL run reliably in the Playwright smoke
environment (see `docs/GAP_ANALYSIS.md` §G6)? Resolve both during M1–M3 before building L4.
