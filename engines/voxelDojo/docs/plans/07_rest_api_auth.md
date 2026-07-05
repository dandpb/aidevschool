# PLAN — Game 07: "CHECKPOINT CITY" (REST API Auth / Middleware layers + JWT verify)

> Fill **before** scaffolding. One game = one concept. This slice is the source of truth for what
> `game-07-checkpoint-city/` teaches and how. Sections 1–13 follow the `voxelDojo/PLAN.md` template;
> M1–M6 are tracked against the per-game done-rule in `ROUTING_MANIFEST.md`.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/07_rest_api_auth/`. The ONE concept this game teaches:
**a layered middleware pipeline + cryptographic JWT (HMAC-SHA256) verification**. A request walks a
stack of middleware layers in a fixed order; each layer either passes the request onward or
short-circuits (rejects) it; the auth layer verifies the request's JWT signature against a secret
and rejects forged tokens; the request reaches the handler only if every layer passes.
(Out of scope: OAuth/refresh-token flows, session stores, RBAC policy engines, password hashing,
the Express/Fastify/Go-chi comparison — the curriculum project's job.)

**2. Why 3D**
A middleware stack *is* a set of concentric city walls. In 3D the player escorts a request avatar
inward from the outer logging wall, through the auth and rate-limit walls, to the central citadel
(handler). The request visibly passes a gate, or is thrown back outward with a red flash at the
wall that rejected it. The single most important idea — "the auth layer checks a cryptographic
signature, not just the presence of a token" — is shown as a badge-versus-seal comparison at the
auth wall: a valid badge matches the rotating seal and the gate opens; a tampered badge does not
match and the avatar is hurled back. The "request traverses layers and may be rejected at any one"
flow is intrinsically spatial: order is *distance from center*, and a reject at any radius is
*visibly* a bounce back through the gates already crossed. A 2D list cannot show concentric order or
the recoil of a rejected request the way a 3D walk through walls does.

**3. Player goal**
Get each incoming request safely past every checkpoint wall to the citadel — by predicting which
wall it will pass and which wall (if any) will throw it back.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Ordered middleware layers | Concentric city walls at increasing radius (logging outermost → handler center) | Player reads "order" as "distance inward," not as an arbitrary list |
| Request passes a layer | Request avatar walks through that wall's gate (green flash) | Player predicts the gate the request passes |
| Layer short-circuits (reject) | Avatar hurled back outward with a red flash at the rejecting wall | Player predicts *which* wall rejects (logging never rejects) |
| HMAC JWT verification | At the auth wall a badge (token signature) is compared to the wall's seal (HMAC of header.payload with the secret) | Player distinguishes a signed token from a forged one |
| Forged / tampered token | Badge ≠ seal ⇒ red flash at auth, never reaches handler | Player predicts reject-at-auth for tampered tokens |
| Rate limiting | After N passes the (N+1)th request is turned back at the rate-limit wall | Player predicts the (N+1)th rejection |
| Layer order matters | Player reorders layers (L4) and predicts the new reject point | Player proves a reject earlier in the stack masks later layers |

**5. Main loop**
A wave streams request avatars toward the walls (~20–40s). For each request the player must
**predict** the outcome — "reaches handler" or "rejected at wall X" — then the simulation animates
the avatar walking inward, passing or being thrown back, and reveals the truth. Score = prediction
accuracy across the wave + (L4) correct ordering. The avatar's inward walk through concentric gates
makes "did every layer pass?" a single visual verdict.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the city (OrbitControls), looking down at a slight tilt so all
walls are visible. Click a gate to register a prediction for the pending request. Four actions plus
camera: orbit / zoom / click-gate-to-predict / (L4) click-to-reorder. No WASD mazes — the request
walks itself; the player predicts.

**7. Win / fail states**
*Clear a wave:* prediction accuracy ≥ 80% (L1, L2, L3) OR correct reorder + correct outcome
predictions (L4). *Fail:* accuracy below threshold, or (L4) a wrong ordering claim. Every failure is
a misread of the pipeline model — wrong reject wall, or thinking a forged token reaches the handler,
or thinking a rate-limited request passes. The sim is always honest; only the player's prediction
can be wrong.

**8. Progression / difficulty**

- **L1 — Through the walls:** a clean, well-formed request with a valid token. Predict the gate it
  passes (the answer is "reaches the handler / passes all"). Learn wall order by walking inward.
- **L2 — Forged badge:** some tokens are tampered. Predict which requests are rejected at the auth
  wall (signature mismatch) and which pass. The HMAC check is the lesson.
- **L3 — Rate limit:** a burst of requests; predict the (N+1)th rejection at the rate-limit wall.
  Counting + threshold.
- **L4 — Order matters:** the player reorders the layers (e.g. swaps auth and rate-limit) and must
  predict the new reject point / outcome — proving a reject earlier in the stack masks later layers.

**9. Visual direction**
Single hero composition: **concentric city walls** — flat torus rings at increasing radius (logging
→ auth → rate-limit → handler citadel at center) — in a dark void with subtle fog. Each wall is a
different hue from a ≤8-color palette; gates are gaps in each ring that line up on one radial spoke
so a request walks a straight line inward. Request avatars are small emissive figures (capsule-ish
icosahedra) tinted by their fate (green = will pass, red = will reject — revealed after prediction).
The citadel at center is a brighter, taller beacon. A reject is a red flash + the avatar thrown back
outward along the spoke. All geometry procedural (`TorusGeometry`, `IcosahedronGeometry`,
`InstancedMesh` for request avatars).

**10. Simulation core (headless)**
`src/sim/middleware.ts` — pure TypeScript, zero `three` imports:

- `Layer = { name, check(req) → "pass" | "reject" | "short-circuit" }` (reject and short-circuit
  both stop the pipeline; "pass" continues).
- `runPipeline(layers, req) → { reachedHandler, rejectedAt, reason }` walks layers in order; stops
  at the first non-passing layer; sets `reachedHandler` only if every layer passed.
- `hmacSign(payload, secret)` / `hmacVerify(token, secret)` — a real, self-contained HMAC-SHA256
  implementation (pure JS, no node `crypto` dependency so it runs anywhere) producing base64url
  JWT-shaped tokens `header.payload.signature`; verify recomputes the signature and compares in
  constant time. A valid token verifies; a tampered payload or signature fails.
- A `makeAuthLayer(secret)` that uses `hmacVerify`; a `makeRateLimitLayer(cap)` that rejects the
  (cap+1)th request; a `makeLoggingLayer()` that always passes.

Deterministic with injected secret and an explicit request counter (no wall-clock). Vitest covers:
valid request reaches handler; forged JWT rejected at auth; rate-limit rejects the (cap+1)th; layer
order matters (a reject stops the pipeline); determinism.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤200
animated request avatars and 4 walls; one draw call per avatar set via `InstancedMesh`, no
postprocessing, no physics engine — the inward walk is parametric animation along a radial spoke.
HMAC is computed in the headless sim, not in the render loop.

**12. Learning-gate hooks**

- Targets unit **`U7-rest-api-auth`** (project `07_rest_api_auth`) per `ROUTING_MANIFEST.md`. The
  game emits evidence only; it never writes `mastered`, never appends to `units_log`, never touches
  `../../learner/learning_state.yaml`. The emitter derives `scheduled_review` / `review_reason`
  dynamically from the substrate-generated review slice, so both "scheduled review" and "deepening"
  modes work without code changes.
- On wave clear/fail, emit:
  `{"source":"voxeldojo","unit_id":"U7-rest-api-auth","project":"07_rest_api_auth","scenario_id":"checkpoint-city-L1","game":"CHECKPOINT CITY","ts":"<iso>","pass":true,"metrics":{"predictions":8,"prediction_accuracy":1,"reached_handler":true,"rejected_at":null},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"middleware layers + JWT verification","mechanic":"concentric city walls, badge gates"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (separate context) validates metrics against the gate/review policy and owns any
  state transition. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/middleware.ts` + Vitest suite proving valid→handler, forged→auth-reject,
  rate-limit→(N+1)th-reject, order-matters, determinism. (No pixels yet.)
- **M2** scene: concentric walls + gates + citadel + instanced request avatars rendering sim state.
- **M3** interaction: click a gate to predict; avatar walk-in / thrown-back animation; reveal.
- **M4** levels L1–L4 with the reorder mechanic on L4.
- **M5** evidence emit wired to wave clears/fails; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 (and an L2 forged case) headed, asserts evidence records +
  screenshots to `.logs/`; WebGL canvas present.

**Open questions / risks**
Does "predict the reject wall" provide enough active recall, or should L2 also surface the raw
tampered-vs-valid signature bytes for inspection? (Resolved: the auth-wall badge-vs-seal visual plus
the post-reveal metrics is enough for the pilot; deeper byte-level inspection is curriculum-lab
work.) Does WebGL run reliably in the Playwright smoke environment (see `docs/GAP_ANALYSIS.md` §G6)?
Addressed by a dedicated "WebGL canvas present" assertion in the smoke spec.
