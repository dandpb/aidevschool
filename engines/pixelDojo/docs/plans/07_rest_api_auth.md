# PLAN slice — `07_rest_api_auth` (Shape B: "Aegis Corridor" 3D middleware chain)

> PLAN slice for `/threejs-dojo 07_rest_api_auth`. The slug's catalog concepts are
> "JWT (sign/verify), RBAC, middleware chains, layered architecture, dependency injection, input
> validation, versioning"; the spec's **primary** concept is *"Compose authentication and
> authorization middleware around a layered REST API"* and the catalog's key question is *"How does
> auth middleware composition differ across frameworks in each language?"*.
>
> **Path B (accepted here)**: pixel-quest's existing encounter kinds (sequence_flow / policy_gate /
> route_health / token_bucket) are all variants of "incoming sprite → admit/reject" — they cannot
> represent an **ordered chain of separable middleware gates** where AuthN must precede AuthZ,
> Validation must precede the handler, and a misplaced gate leaks a forged token through. This slice
> defines a FRESH 3D three.js sibling app at `engines/pixelDojo/games/07_rest_api_auth/` that
> embodies the chain as a physical neon corridor the player composes and then watches execute.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/07_rest_api_auth/`
- **One concept this game teaches:** the **middleware chain** for a protected REST route — Version →
  Validation → AuthN (JWT verify) → AuthZ (RBAC) → Handler — where **ordering is the security
  invariant** (AuthN before AuthZ; a forged token with an `admin` claim must never reach the RBAC
  gate; a malformed body must never reach the handler even with a valid token).
- **Out of scope (curriculum's job, not the game's):** Go/Rust/Node framework comparison, password
  hashing cost tuning, refresh-token rotation storage, audit-log schema details, dependency-injection
  containers. The game uses the canonical middleware *ordering* and *separation* as the playable
  surface; everything else is text in the briefing.
- **Slug:** `07_rest_api_auth`
- **Region id:** `game-07_rest_api_auth`
- **Unit id:** `U0-rest-api-auth-middleware-chain`
- **Encounter id:** `encounter-aegis-corridor-01`
- **Mechanic kind:** `threejs-middleware-chain` (NEW evidence metrics variant — see §11).

## 2. Player goal

You are the **Architect of the Aegis Corridor** — a neon tunnel floating in space that incoming
request orbs must traverse to reach a handler pedestal at the far end. Slot the four gate-rings
(Version · Validation · AuthN · AuthZ) into the corridor **in the right order**, then release a wave
of orbs and watch: forged tokens, expired tokens, malformed bodies, and forbidden roles must bounce
at the correct gate, while legit admin/user orbs ride the chain all the way to their target pedestal.

## 3. Concept → mechanic mapping

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Middleware is an ordered chain of separable layers** (RF-010, RF-020) | Four translucent torus gate-rings the player physically slots along a 3D corridor; each gate is independently placeable and reorderable. | Player demonstrates that "chain" means *order matters*, not just "exists". |
| **AuthN precedes AuthZ** (RF-008, RF-010) | If the AuthZ ring is placed before the AuthN ring, a forged token carrying a fake `roles:["admin"]` claim sails through RBAC and detonates the admin handler (server-spike). | Player learns the canonical invariant by suffering its violation. |
| **JWT verification** checks signature, issuer, audience, expiry, jti (RF-008, RF-009) | The AuthN ring has 4 sub-scanners (rotating glyphs around the torus) — sig, iss/aud, exp, jti. Orbs carry a visible "token chip" with one of: `valid`, `forged`, `expired`, `wrong_audience`, `missing`. The ring flashes the failing scanner and emits a `401 UNAUTHENTICATED` ripple on reject. | Player maps each JWT failure mode to a single named cause. |
| **RBAC = role-vs-policy** (RF-011..RF-014) | The AuthZ ring inspects the orb's role crystal (user=blue, admin=gold, none=red) against the policy plate engraved on the target handler pedestal (`admin` / `self-or-admin` / `any-authenticated`). Mismatch → `403 FORBIDDEN` ripple. | Player sees AuthZ cannot fire without AuthN's authenticated principal first. |
| **Input validation precedes the handler** (RF-003, RF-019) | The Validation ring scans the orb's body lattice (green=well-formed, red=unknown-field/malformed). A red body that reaches any handler crashes it. | Player internalises "validate at the boundary, not inside the handler." |
| **API versioning is the outermost gate** (RF-001) | The Version ring admits only `/v1` orbs; `/v2` orbs bounce with `404 VERSION_UNSUPPORTED`. Placing it last wastes a cycle on dead requests. | Player learns versioning as the first composition concern. |
| **Each layer is independently replaceable** (RF-020, RNF-002) | Between waves, the player can swap a gate's *implementation* (e.g. HS256 ↔ RS256 visual; 15min ↔ 60min expiry clock) via a side panel — the chain shape stays identical. | Player sees DI/config surface area without leaving the corridor metaphor. |

## 4. Main loop

Each wave is a ~25–40 s two-phase cycle:

1. **Compose phase (~5–10 s).** The four gate-rings sit in a dock at the bottom of the 3D scene.
   Player uses ← / → to select a ring and ↑ to push it into the next corridor slot, or ↓ to recall
   the last placed ring. A live "order strip" at the top shows the current sequence (e.g.
   `[VERSION]→[AUTHN]→[AUTHZ]→[VALIDATION]`). The wave will not start until all four are placed.
2. **Run phase (~15–25 s).** Player presses **Space** to open the entry portal. Orbs spawn at the
   left and fly right through the chain in the player's chosen order. Each gate, on contact, runs
   its check and either pulses green (pass) and lets the orb continue, or pulses red and **bounces**
   the orb back to the entry with the matching HTTP-style code (`404`, `400`, `401`, `403`) floating
   above it. Orbs that survive all four gates reach the handler row at the far end:
   - `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/refresh` → public pedestals (any orb that
     passed Validation may land).
   - `/v1/users` (GET) → admin-only pedestal; landing a non-admin here is a **forbidden-reach**
     (server-spike) unless AuthZ already bounced it.
   - `/v1/users/:id` (PUT) → self-or-admin pedestal.
3. **Resolution.** When the last orb resolves (lands or bounces), the wave ends: the HUD shows
   `WAVE CLEAR` (heat stayed under threshold AND ≥90% of orbs resolved to the correct fate) or
   `BREACH` (a forged/expired/wrong-audience token reached a handler, or a forbidden role reached
   the wrong pedestal — server overheated). The next wave begins from the Compose phase again, with
   a fresh randomized starting order so the player must recompose.

Wave cadence mirrors the catalog's "25–40 min sessions" at the micro level: each wave is a ~30 s
attempt, and a level is 3 waves of escalating orb variety.

## 5. Inputs & controls

≤ 4 actions, NES-pad friendly (the compose phase is the only place all four are used; the run phase
is observation + one emergency action):

- **← / →** — in Compose: cycle which dock ring is selected. In Run: rotate camera around the
  corridor (cosmetic).
- **↑** — push the selected dock ring into the next corridor slot.
- **↓** — recall the last placed corridor ring back to the dock (undo a misplacement).
- **Space** — confirm order and open the entry portal (start the wave). Held during Run = speed-up
  time slightly (≤2×) once the player trusts their order.
- **X** — manual bounce ("emergency inspector"): during Run, if the player spots a forged orb about
  to clear a misplaced gate, holding X + clicking the orb force-rejects it. Costs heat if used on a
  legit orb (penalty for hand-inspecting good traffic). *Optional — L1 disables it to keep the
  mechanic about composition, not reflex.*

## 6. Win / fail states

**Win a wave** when ALL of:
- `forged_admitted === 0` AND `expired_admitted === 0` AND `wrong_audience_admitted === 0`
  (no AuthN bypass — the security invariant).
- `forbidden_reached_handler === 0` (no AuthZ bypass).
- `malformed_admitted === 0` (no Validation bypass).
- `wrong_version_admitted === 0` (no Version bypass).
- `legit_rejected <= 1` (no gratuitous false denies — the chain must still let good traffic through).
- `heat_peak < MAX_HEAT`.

**Fail a wave** (BREACH) when ANY of:
- A forged / expired / wrong-audience / missing-token orb reaches any handler (server-spike →
  overheat → BREACH). *This is the canonical teaching failure: a misplaced AuthZ gate before AuthN
  lets a forged `admin`-claim orb through.*
- A forbidden-role orb lands on a pedestal its policy doesn't allow (AuthZ ordering or RBAC logic
  broken).
- A malformed-body orb lands on any handler (Validation placed too late or skipped).
- Heat maxes out (too many breaches in one wave).

Both win and fail are **direct readouts of middleware-chain discipline**: the player cannot clear a
wave by reacting fast — they clear it only by composing the canonical order. Replaying a failed wave
with the corrected order succeeds, which is the lesson.

## 11. Learning-gate hooks

- **Active unit:** `U0-rest-api-auth-middleware-chain` (project `07_rest_api_auth`). The game emits
  evidence only; the verifier (separate context) decides mastery and appends to
  `learner/learning_state.yaml > units_log` via `learner/substrate/`.
- **Evidence file:** `engines/pixelDojo/games/07_rest_api_auth/.logs/evidence.ndjson` (one JSON line
  per resolved wave; regenerated each smoke run; not committed). The Playwright smoke captures the
  in-page channel `window.__aegisEvidence` and appends it.
- **Evidence record shape** (new `metrics.kind = "threejs-middleware-chain"` — extends the
  discriminated union in `pixel-quest/src/game/evidence/types.ts`; this game owns its own copy at
  `games/07_rest_api_auth/src/evidence/types.ts` so the sibling is fully self-contained):
  ```json
  {
    "source": "aegis-corridor",
    "unit_id": "U0-rest-api-auth-middleware-chain",
    "project": "07_rest_api_auth",
    "encounter_id": "encounter-aegis-corridor-01",
    "game": "Aegis Corridor",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-middleware-chain",
      "wave": 3,
      "gate_order": ["version", "validation", "authn", "authz"],
      "correct_order": true,
      "forged_admitted": 0,
      "expired_admitted": 0,
      "wrong_audience_admitted": 0,
      "missing_token_admitted": 0,
      "forbidden_reached_handler": 0,
      "malformed_admitted": 0,
      "wrong_version_admitted": 0,
      "legit_admitted": 8,
      "legit_rejected": 0,
      "heat_peak": 32,
      "overheated": false
    },
    "curriculum_context": {
      "concept": "Compose authentication and authorization middleware around a layered REST API",
      "mechanic": "Aegis Corridor — ordered gate-ring composition",
      "accepted_signal": "canonical order Version→Validation→AuthN→AuthZ with zero breaches",
      "rejected_trap": "AuthZ before AuthN lets forged role claims through"
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
- **Pass rule (gate):** wave clears with `metrics.correct_order === true` AND
  `forged_admitted === 0` AND `expired_admitted === 0` AND `wrong_audience_admitted === 0` AND
  `missing_token_admitted === 0` AND `forbidden_reached_handler === 0` AND
  `malformed_admitted === 0` AND `wrong_version_admitted === 0` AND `legit_rejected <= 1` AND
  `overheated === false`. Anything else keeps the gate locked.
- **Side-effect contract** (asserted by the Playwright smoke):
  - `window.__pixelQuestLearningState` is **not** published (this is a sibling game, not pixel-quest).
  - `localStorage` does **not** contain `learning_state`, `units_log`, or `mastered`.
  - The game never writes learner state — `learner/substrate/` owns the gate transition.
- **Verifier handoff:** the fresh-context verifier subagent judges against the done-rule:
  *"the Aegis Corridor 3D world emits a valid evidence record with `pass: true` for project
  `07_rest_api_auth`, unit `U0-rest-api-auth-middleware-chain`, where the player composed the
  canonical middleware order (Version → Validation → AuthN → AuthZ) and cleared a wave with zero
  AuthN/AuthZ/Validation/Version breaches — the chain ordering invariant is evidence-backed
  end-to-end under Playwright."*
