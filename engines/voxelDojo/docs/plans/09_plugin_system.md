# PLAN — voxelDojo game 09: "DOCKING BAY" (Plugin System / Sandboxing + Interface Contracts)

> One file per game; each game lives in its own `game-09-docking-bay/` subfolder. Fill all 13
> sections before scaffolding. A simulation with a vague plan teaches nothing measurable.

**1. Subject & concept**
Curriculum project: `../../curriculum/09_plugin_system/`. The ONE concept this game teaches:
**sandboxing + interface contracts** — a third-party plugin *docks* with a host; a **sandbox
force-field** caps the API surface (capabilities) the plugin is permitted to touch; a **docking
clamp** runs a *structural contract check*: does the plugin expose every method the host's contract
demands (and the declared `claimsContract` shape match the host's `hostContract`)? A plugin whose
claimed shape mismatches the expected contract **fails the clamp and is rejected** before it can run.
A well-behaved plugin **docks and runs inside its sandbox envelope** — but any call to a method
outside its declared capabilities is blocked by the force-field. The canonical insight: capability
scoping limits blast radius, and a structural contract check fails fast *before* runtime. Out of
scope: code-loading / dynamic import mechanics, ABI versioning ranges, sandbox isolation via
process/Web Worker boundaries, capability revocation races, plugin marketplace trust/signing, hot
reload — all are the curriculum project's job. The game teaches the *shape* of capability scoping +
contract checking, not the packaging machinery.

**2. Why 3D**
A plugin sandbox is a **docking bay**: pods (plugins) approach a station (host); a translucent
**force-field bubble** (the sandbox) wraps each docked pod, capping what it can reach; the
**docking clamp** (contract check) only locks if the pod's connector shape matches the host's port.
In 3D the player watches pods glide toward docking ports, sees the force-field envelope snap into
place around a docked pod, and sees a mismatched pod **bounce off** a clamp that turns red — while a
matched pod seats cleanly and the clamp locks green. The "capability envelope + connector
shape-match" concepts are spatial: the envelope is a literal bubble boundary you can see is smaller
than the host, and the connector is a literal shape that either mates with the port or doesn't. A 2D
list of method names cannot make the *boundary* and the *shape-fit* legible the way a 3D bubble and a
physical clamp can. The player also sees a disallowed call (outside the bubble) flash red *at the
boundary*, making the sandbox enforcement point physical.

**3. Player goal**
Judge incoming pods: predict which will dock (contract matches), which will be rejected at the
clamp (contract mismatch), which invoked method the force-field will permit, and which is the
smallest capability set that lets a plugin do its job without over-privileging.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Interface contract (host's expected method/shape) | The host station has docking **ports** with a fixed connector shape (the contract) | Player reads the port as the required shape |
| Plugin's declared `claimsContract` | Each pod carries a connector whose shape encodes what it claims to implement | Player predicts whether the pod's connector mates the port |
| Structural contract check | A **docking clamp** probes the connector; green = lock (every contract method present), red = reject (a method missing) | Player predicts dock-success vs clamp-rejection before the clamp fires |
| Sandbox = capability cap | A translucent **force-field bubble** wraps each docked pod, sized to its declared capabilities | Player sees the envelope is smaller than the host |
| Capability scoping (least privilege) | The bubble only contains the capability nodes the plugin was granted | Player predicts whether an invoked method is inside or outside the bubble |
| Enforcement at the boundary | An invoked method outside the bubble flashes red at the force-field and throws | Player predicts allow vs block on a given method call |
| Capability minimization | Player picks the smallest capability set that covers the plugin's calls | Player demonstrates least-privilege: no over-grant, no missing grant |

**5. Main loop**
A 20–60s cycle: the player is handed a wave of incoming pods. L1: predict docking success/failure
for each pod (does its connector match the port?). L2: predict clamp rejection (which contract
method is missing?). L3: for a docked plugin, predict whether a given invoked method is allowed by
its sandbox bubble. L4: pick the minimal capability set that lets a plugin do exactly its job (and
no more). Each correct prediction clears the wave with emitted evidence. Pods visibly glide in; the
clamp visibly locks green or rejects red; the force-field bubble visibly snaps around docked pods;
disallowed calls visibly flash at the boundary.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the host station (OrbitControls), target locked at the docking
ring. The only actions are HUD button choices (predict dock / pick the missing method / pick allow
or block / toggle capabilities) — four action types plus camera, no WASD. Clicking a pod or port is
the predict-and-commit gesture; the 3D view is the feedback.

**7. Win / fail states**
*Win a wave:* the player's predictions match the sim's contract/sandbox truth (L1: ≥80% dock
predictions correct; L2: exact missing-method on each rejected pod; L3: every allow/block correct;
L4: the chosen capability set is both sufficient AND minimal). *Fail:* any prediction disagrees with
the structural/enforcement truth. Every failure is a misread of the model — either trusting a
mismatched connector, under- or over-reading the capability envelope, or over-privileging when a
smaller set would do.

**8. Progression / difficulty**

- **L1 — Dock the pod:** several pods approach; predict which will dock (contract matches) vs bounce
  (contract mismatch). Learn "the clamp does a structural shape check — declare what you implement."
- **L2 — Contract mismatch:** for each rejected pod, predict WHICH contract method is missing. Learn
  "the contract is a required method set; one missing method fails the clamp."
- **L3 — Sandbox cap:** for a docked plugin with a given capability set, predict whether each
  invoked method is allowed (inside the bubble) or blocked (outside). Learn "the sandbox enforces
  capabilities at the call boundary."
- **L4 — Capability scope:** pick the SMALLEST capability set that lets a plugin make exactly its
  required calls — sufficient but not over-privileged. Learn "least privilege: grant the minimum
  envelope that covers the job."

**9. Visual direction**
Single hero object: the **host station** — a central core (IcosahedronGeometry) with a ring of
docking ports around it, in a dark void with subtle fog. Each port's connector shape encodes the
host contract. Pods (plugin shapes — small box/ico clusters with a connector nub) glide in along
guide rails. On successful dock, a translucent **force-field bubble** (sphere geometry, additive
blended) snaps around the pod and the **clamp** (a torus around the port) turns green and locks. On
contract mismatch the clamp turns red and the pod bounces back along the rail. Each docked pod's
bubble is sized to its capability count and tinted by plugin id (≤8-color palette). A disallowed
invoke pulses the bubble boundary red. All geometry procedural (`IcosahedronGeometry`,
`BoxGeometry`, `SphereGeometry` for the field, `TorusGeometry` for the clamp).

**10. Simulation core (headless)**
`src/sim/plugin.ts` — pure functions, ZERO three imports:
- `Capability = string` (a named host API method the plugin may call, e.g. `"readState"`,
  `"writeState"`, `"net"`, `"fs"`).
- `Contract = readonly Capability[]` (a required method set).
- `PluginManifest = { id, claimsContract: Contract, capabilities: Capability[] }` — what the plugin
  *claims* to implement and the capabilities it *requests*.
- `hostContract: Contract` — the host's expected method/shape; a plugin must expose every capability
  in it to dock.
- `checkContract(manifest, hostContract)` → `bool` — **structural**: does the plugin's
  `claimsContract` contain every capability in `hostContract`? (subset check; order-independent.)
- `missingMethods(manifest, hostContract)` → `Capability[]` — the contract gap (for L2 feedback).
- `dock(host, manifest)` → `{ docked: boolean, sandboxCap: Capability[], rejectedReason?: string }`
  — runs the contract check; on pass, the sandbox cap = the **intersection** of requested
  capabilities and the host contract (capabilities are scoped to what the host even offers); on
  fail, records the rejection reason.
- `canInvoke(sandboxCap, method)` → `bool` — is the method inside the sandbox envelope?
- `invoke(host, pluginId, method, args)` — enforces the cap: if `method` is not in the host's
  record of the plugin's sandbox cap, it **throws** `SandboxViolation`; otherwise it dispatches to
  the host's implementation of `method` with `args`. Deterministic.
- Host is a plain `{ id, contract: Contract, impls: Record<Capability, (...args) => unknown>,
  docked: Map<pluginId, Capability[]> }` — the cap is recorded at dock time and consulted at invoke
  time (capabilities cannot escalate after docking).
- Deterministic seeded scenarios via `mulberry32`. Vitest covers: a matching plugin docks; a
  mismatched contract is rejected (and the missing method is correctly reported); a sandboxed plugin
  cannot call a method outside its capabilities (invoke throws); capability scoping intersects
  request with contract; determinism (same seed ⇒ same manifest wave ⇒ same dock outcomes).

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤8
pods in a wave (one Group per pod: body + connector + optional bubble — well under instancing
threshold) plus one host station with a port torus per contract method; no postprocessing, no
physics — pod approach is parametric easing along a guide rail toward the port. The sim core is
WebGL-free so the contract/sandbox math runs identically in Vitest and the browser.

**12. Learning-gate hooks**

- Targets unit **`U9-plugin-system`** (project `09_plugin_system`). As of 2026-07-05 this unit is
  **not yet in the substrate's review slice** (`src/content/reviewSlice.ts` ships an empty
  `nextReviews` static fallback until `python3 -m learner.substrate` is regenerated), so DOCKING BAY
  evidence is recorded as **deepening play** (`scheduled_review:false`,
  `review_reason:"deepening"`) and can serve the real learning gate for U9-plugin-system the moment
  the scheduler makes it the active unit — the emitter derives `scheduled_review`/`review_reason`
  from the slice, so both modes work without code changes. (Note: the hash-ring pilot uses a
  distinct id `U9-distributed-cache`; the verifier keys on `unit_id` + `project`, so there is no
  collision.)
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U9-plugin-system","project":"09_plugin_system","scenario_id":"docking-bay-L1","game":"DOCKING BAY","ts":"<iso>","pass":true,"metrics":{"dock_predictions":6,"dock_prediction_accuracy":1,"contracts_checked":6},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"sandboxing + interface contracts","mechanic":"docking pods, force-field sandbox"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state** (evidence-only).

**13. Milestones**

- **M0** this plan.
- **M1** `sim/plugin.ts` + Vitest suite proving contract-check reject/accept, sandbox enforcement
  (invoke throws outside cap), capability minimization, determinism. (No pixels yet.)
- **M2** scene: host station + docking ports + pods approaching + force-field bubble + clamp
  rendering a static manifest wave.
- **M3** interaction: HUD-driven predict-dock / pick-missing-method / allow-block / capability-set;
  clamp locks green or rejects red; bubble snaps on dock.
- **M4** levels L1–L4 with their evaluate functions.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 (and L3) headed, asserts evidence records + screenshots to
  `.logs/`.

**Open questions / risks**
Is "pick the minimal capability set" (L4) better as a multi-select toggle or a single best-option
multiple choice? Resolved as a toggle set during M4 — the evaluate function checks both sufficiency
(every required call covered) AND minimality (no granted capability unused), which is the
least-privilege lesson made concrete. Does WebGL run reliably in the Playwright smoke environment
(see `docs/GAP_ANALYSIS.md` §G6)? Resolved during M2–M3 by keeping pod count ≤8 and using only
procedural geometry.
