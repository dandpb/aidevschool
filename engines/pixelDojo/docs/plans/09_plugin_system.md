# PLAN slice — `09_plugin_system` (Shape B: Plugin Docking Bay)

> PLAN slice for `/threejs-dojo 09_plugin_system`. The slug's catalog concept row is
> "Dynamic loading, interfaces/traits, plugin lifecycle, sandboxing, WASM/FFI/JS sandboxing, API
> versioning". This slice narrows that row to its **primary** concept (per
> `curriculum/09_plugin_system/docs/spec.md` "Learning Objectives"): **designing stable extension
> interfaces with lifecycle-managed plugins** — the `load → init → start → stop → unload`
> state machine plus capability declarations and sandbox isolation. The other facets (FFI vs WASM
> internals, hook payload schemas, per-language memory bounds) are out of scope — one game = one
> concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent
> *a plugin traversing discrete lifecycle states inside a sandbox boundary while declaring
> capabilities and negotiating an API version* — they are all variants of "incoming sprite →
> admit/reject". A plugin docking bay with five lifecycle gates, translucent sandbox bubbles, and
> capability-denial prompts needs 3D space (depth for the inbound manifest conveyor, radial gates
> around a host reactor, bubbles that visibly contain crashes) so the concept gets its own world.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/09_plugin_system/`
- **ONE concept this game teaches:** a host application that drives each third-party plugin through
  the deterministic lifecycle `load → init → start → stop → unload` (RF-003), rejects invalid
  transitions (`start` before `init`, `unload` while `running`), enforces declared capabilities
  (RF-006: undeclared host API / FS / network / env / hook access MUST be denied), negotiates API
  version compatibility (RF-005), and isolates plugin crashes behind a sandbox boundary so the host
  survives (RF-007, RF-010, RNF-001). Out of scope: WASM vs FFI internals, hook payload type
  schemas, per-language memory-budget accounting, the Go/Rust/Node comparison (those are the
  curriculum project's job, not the game's).
- **Slug:** `09_plugin_system`
- **Catalog key question (context only, not the win condition):** "How does each language's
  FFI/WASM/dynamic-loading story compare for safe plugin isolation?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective):** the player
  demonstrates that a plugin can be moved through all five lifecycle states in order with invalid
  transitions rejected, undeclared capabilities denied, API version mismatches blocked at init,
  and plugin crashes contained by the sandbox so the host takes zero damage — all on a
  deterministic seed.
- **Unit id (evidence target):** `09_plugin_system` (per the task's `unit_id` directive; the
  substrate does not yet have this unit registered as `active_unit`, so the run emits
  `scheduled_review: false`, `review_reason: "deepening"` until it is added).
- **Encounter / scene id:** `plugin-docking-bay-01`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Lifecycle `load → init → start → stop → unload` (RF-003)** | Five numbered docking gates arranged radially around a central HOST reactor (a glowing polyhedron). Each plugin cargo-pod arrives on an inbound conveyor (depth axis) and the player-tractor advances it one gate at a time with **Z**. The pod's HUD chip lights its current state; the next legal gate pulses. | Player walks every pod through the same five states in order — internalizes that lifecycle is a state machine, not a free-form spawn. |
| **Invalid transitions rejected (RF-003)** | Trying to skip a gate (e.g. pressing **Z** for `start` while still at `load`, or `unload` from `running`) bounces the pod back with a red "INVALID TRANSITION" flash and counts `invalid_transitions_attempted`. The only legal unload path is `running → stop → unload`. | Player learns which transitions are legal by being forced to route through `stop` first. |
| **Capability declarations enforced (RF-006)** | At `init`, each pod displays a small halo of declared capability tokens (e.g. `network`, `fs:/tmp`, `hook:onRequest`). During run, yellow "CAPABILITY REQUEST" prompts flash undeclared demands (`fs:/etc`, `env:SECRET`, undeclared hook). Player must press **X** to DENY; pressing **Z** (allow) leaks → host damage. | Player links "undeclared = denied" — the capability boundary is opt-in, not default-open. |
| **API version negotiation (RF-005)** | At `init`, the pod's version badge must intersect the host's supported range (e.g. host `v3`, pod supports `v2–v4` = OK; pod requires `v5` = REJECT). A docking-claw visual only clamps when the version rings overlap. Mismatch → press **X** to reject at init, pod returns to conveyor. | Player treats version mismatch as an init-time block, not a runtime surprise. |
| **Sandbox isolation (RF-007, RNF-001)** | Pressing **S** wraps the targeted pod in a translucent SANDBOX BUBBLE before `start`. The bubble is required to start safely; a pod started without a bubble is flagged `unsandboxed` and any later crash vents into the host. | Player physically separates "plugin code" from "host internals" with a visible boundary. |
| **Plugin failure containment (RF-010, RNF-001)** | During run, random pods PANIC (red pulse + shake). If sandboxed, the bubble flashes red, contains the explosion, and the pod auto-transitions to `stopped` — host undamaged. If unsandboxed, the explosion vents to the HOST reactor; host HP drops. | Player sees the sandbox as the load-bearing artifact that keeps the host alive. |
| **Hook dispatch, ordered (RF-008, RF-009)** | Once ≥ 1 pod is `running`, the HOST fires HOOK particles every few seconds. Each particle routes along glowing tethers to subscribers in priority order (lower priority number first, ties broken by plugin ID). A small ordered-rail above each tether shows the dispatch sequence. | Player sees hook dispatch as deterministic routing, not broadcast noise. |
| **Clean unload releases resources (RF-013)** | A pod that reaches `unload` cleanly drops its hook tether, pops its bubble, and frees its dock. A pod force-killed mid-panic leaves a "leak" wisp (counts against `plugins_unloaded_clean`). | Player links "graceful stop → unload" to "no resource leak". |

## 4. Main loop (the ~30–45 s cycle the player repeats)

1. **Spawn.** A wave card flashes the round's plugin mix, e.g. `WAVE 2: 5 pods, 2 expected panics,
   3 undeclared capability prompts, 1 version mismatch`. Conveyor hums up.
2. **Pod queue.** Cargo-pods arrive at the inbound conveyor in a seeded order. Each pod shows its
   manifest (`id`, `api_version_range`, `declared_capabilities`, `priority`, `ttl`). Player
   targets a pod (Tab cycles), then:
   - **Z** — advance the targeted pod through its next legal lifecycle transition
     (`load → init → start → stop → unload`).
   - **S** — toggle the SANDBOX BUBBLE on the targeted pod (only legal between `init` and `start`;
     toggling at other states is a no-op).
   - **X** — DENY the active prompt (capability request or version mismatch). Denial of an
     undeclared capability is correct; denial of a declared capability is a false-deny (counts
     against the player).
3. **Runtime events tick the whole time.** Panics fire on the scheduled pods. Hooks fire on the
   host and particles route to subscribers in priority order. The TTL clock on each pod drains;
   pods that hit TTL while `running` auto-panic unless already `stopped`.
4. **Wave clear.** When every pod has reached `unload` (clean or forced) and the queue is empty,
   the bay dims and the HUD posts the wave score:
   `{pods_loaded, pods_started_sandboxed, pods_started_unsandboxed, undeclared_denied,
    undeclared_leaked, version_mismatches_handled, invalid_transitions_attempted,
    hooks_dispatched_in_order, hooks_out_of_order, panics_contained, panics_vented,
    plugins_unloaded_clean, host_damage}`.
5. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page channel and the NDJSON `.logs/evidence.ndjson`. Gate-locked exit door goes green; the
   next wave's difficulty (more pods, more undeclared demands, higher panic rate, tighter version
   bands) unlocks.

## 5. Inputs & controls (≤ 3 primary actions, NES-pad feel)

- **WASD / ←↑↓→** — move the player-tractor around the docking bay floor (free roam to inspect
  pods at each gate).
- **Tab / Q-E** — cycle target lock to the next/previous pod on the conveyor or at a gate.
- **Z** — ADVANCE: progress the targeted pod through its next legal lifecycle transition. Primary
  positive action.
- **X** — DENY: reject the active prompt (undeclared capability request or version mismatch) on
  the targeted pod. Primary defensive action.
- **S** — toggle SANDBOX BUBBLE on the targeted pod (only effective between `init` and `start`).
  Secondary setup action.
- **H** — HUD toggle: show the live legal-transition map for the targeted pod (allowed in wave 1,
  disabled in later waves to test mastery without the crutch).
- Three primary actions (**Z**, **X**, **S**) define the loop; **Tab** and **H** are
  navigation/inspection aids so they don't overload the player.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `pods_started_unsandboxed === 0` (every `start` happened inside a sandbox bubble),
  - `undeclared_leaked === 0` (no undeclared capability request was allowed through),
  - `version_mismatches_handled === version_mismatches_total` (every mismatched pod was rejected
    at init, not allowed to start),
  - `invalid_transitions_attempted === 0` (no illegal lifecycle jump was forced),
  - `hooks_out_of_order === 0` (every hook dispatched in priority order),
  - `host_damage === 0` (no panic vented to the host — all panics contained by sandbox bubbles),
  - `plugins_unloaded_clean === pods_loaded` (every pod reached `unload` through the legal path).
- **Fail the wave (FAIL)** when **any** of:
  - A pod is started without a sandbox bubble and then panics → host reactor flashes red, host HP
    drops, evidence `pass: false` with `panics_vented > 0`.
  - An undeclared capability request is allowed (player pressed **Z** instead of **X**) → the
    pod's tether turns red, host HP drops, evidence `pass: false` with `undeclared_leaked > 0`.
  - A version-mismatched pod is allowed to start → docking claw sparks, host HP drops, evidence
    `pass: false`.
  - An invalid transition is forced three times in a row → bay alarm, evidence `pass: false` with
    `invalid_transitions_attempted > 0`.
- Both outcomes are **direct readouts of plugin-lifecycle discipline**: ordered transitions,
  declared capabilities only, version-negotiated init, sandboxed runtime, contained failures.
  Neither win nor fail is gated on speed — correctness first.

## 11. Learning-gate hooks

- **Active unit:** `09_plugin_system` (project `09_plugin_system`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still
  emits evidence with `scheduled_review: false` and `review_reason: "deepening"`; the verifier
  will not promote until the substrate registers the unit. The game never writes learner state.
- **Encounter / scene id:** `plugin-docking-bay-01`.
- **Evidence channel (producer side):** append-only `window.__pluginDojoEvidence` plus NDJSON at
  `engines/pixelDojo/games/09_plugin_system/.logs/evidence.ndjson`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Evidence record fields** (this game's metrics variant — `kind: "threejs-plugin-lifecycle"`):
  ```json
  {
    "source": "plugindoj",
    "unit_id": "09_plugin_system",
    "project": "09_plugin_system",
    "encounter_id": "plugin-docking-bay-01",
    "game": "Plugin Docking Bay",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-plugin-lifecycle",
      "pods_loaded": 5,
      "pods_started_sandboxed": 5,
      "pods_started_unsandboxed": 0,
      "undeclared_denied": 3,
      "undeclared_leaked": 0,
      "version_mismatches_total": 1,
      "version_mismatches_handled": 1,
      "invalid_transitions_attempted": 0,
      "hooks_dispatched_in_order": 4,
      "hooks_out_of_order": 0,
      "panics_contained": 2,
      "panics_vented": 0,
      "plugins_unloaded_clean": 5,
      "host_damage": 0
    },
    "curriculum_context": {
      "concept": "lifecycle-managed plugins with capability + sandbox isolation",
      "mechanic": "Plugin Docking Bay",
      "accepted_signal": "pod advances load->init->start->stop->unload in sandbox, undeclared denied, version mismatched rejected",
      "rejected_trap": "unsandboxed start, undeclared capability leak, forced invalid transition, version mismatch allowed"
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
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.pods_started_unsandboxed === 0` AND
  `metrics.undeclared_leaked === 0` AND
  `metrics.version_mismatches_handled === metrics.version_mismatches_total` AND
  `metrics.invalid_transitions_attempted === 0` AND `metrics.hooks_out_of_order === 0` AND
  `metrics.host_damage === 0` AND
  `metrics.plugins_unloaded_clean === metrics.pods_loaded`.
  (i.e. every start was sandboxed, every undeclared demand was denied, every mismatched pod was
  rejected at init, every transition was legal, every hook was dispatched in priority order, no
  panic vented, every pod unloaded cleanly.)
- **Side-effect contract (smoke-enforced):** the game must NOT publish
  `window.__pixelQuestLearningState`, must NOT touch `localStorage` keys `learning_state`,
  `units_log`, or `mastered`, and must NOT invoke `learner/substrate/`. Mastery is owned by the
  verifier + substrate, never by the producer.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  plan slice, the Playwright smoke spec, the captured `EVIDENCE {...}` console record, and the
  screenshot) and judges against the done-rule: **"the Plugin Docking Bay 3D scene emits a valid
  `EVIDENCE {...}` with `pass: true` for project `09_plugin_system`, unit `09_plugin_system`,
  where every pod advanced load→init→start→stop→unload inside a sandbox bubble, every undeclared
  capability was denied, every version-mismatched pod was rejected at init, no invalid transition
  was forced, every hook dispatched in priority order, and no panic vented to the host — end-to-end
  under Playwright."**

## Open questions / risks (for the implementer)

- **Pod panic timing.** Schedule panics deterministically from the wave seed (e.g. pod #2 panics
  at t+8s in wave 2). The HUD must telegraph the panic window so unsandboxed vs sandboxed outcomes
  are unambiguous in a screenshot.
- **Sandbox bubble visual.** Use a translucent icosahedron shell that flashes red on contained
  panic and shatters only on clean `unload`. Make sure the bubble is visible from the default
  camera angle without obscuring the lifecycle HUD chip.
- **API version display.** Show host version as a fixed ring and the pod's supported range as an
  arc; overlap = compatible. Keep the numbers small integers (host v3, pods in v1–v5 range) so a
  mismatch is readable at a glance.
- **"H" transition-map crutch.** Decide by playtest whether to keep it on for wave 1 only, or
  always; the verifier must know which wave the smoke run clears.
- **Hook ordering visibility.** The ordered-rail above each tether must number subscribers
  (priority, plugin_id) so out-of-order dispatch is screenshot-evident.
