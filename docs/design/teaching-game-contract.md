# Teaching-game contract (cross-engine)

> Canonical, engine-agnostic rules for every aidevschool teaching game.
> Consumers: `engines/pixelDojo/` (8-bit arcade) and `engines/voxelDojo/` (3D simulation).
> Both engines' `AGENTS.md` cite this file; if this contract and an engine doc disagree, this file wins.

## The contract

1. **One game = one concept.** Each game targets exactly one concept from one project in
   `curriculum/catalog.md`, and one unit in `learner/learning_state.yaml`. Unit ids and project
   slugs are read from those files, never invented.

2. **The game is an attempt surface, nothing more.** It renders a playable attempt of the concept
   and emits raw evidence. It never writes `mastered`, never appends to `units_log`, never edits
   anything under `learner/`. A separate verifier (Prometor role; runnable as
   `python3 -m engines.pixelDojo.verifier`, which is source-agnostic and shared by both engines)
   owns every learner-state transition. Producer ≠ verifier. Required evidence fields for
   verifier eligibility: `unit_id`, `project`, `game`, `ts`, `pass`.

3. **Evidence is raw, structured, and emitted twice.** One JSON record per cleared/failed
   wave/encounter, pushed to a browser global (`window.__pixelQuestEvidence` /
   `window.__voxelDojoEvidence`) and logged as an `EVIDENCE <json>` console record. Required fields:

   | Field | Rule |
   | --- | --- |
   | `source` | Engine tag: `"pixelquest"` or `"voxeldojo"` |
   | `unit_id`, `project` | Must exist in `learning_state.yaml` / `catalog.md` |
   | `scenario_id` / `encounter_id` | Stable id of the level/encounter |
   | `ts`, `pass` | ISO timestamp; the game's own judgment (verifier re-judges) |
   | `metrics` | The quantities the pass/fail judgment actually used |
   | `review_context` | `scheduled_review`, `review_reason`, `scheduler_source: "learner-substrate"`, `verifier_required: true` |
   | `curriculum_context` | Concept + mechanic names for auditability |

   Records are append-only and immutable. `localStorage` is never learning evidence.

4. **Scheduling truth flows one way: substrate → game.** The Python substrate
   (`learner/substrate/`) generates a read-only review slice per engine
   (`sync_pixel_review_slice`, `sync_voxel_review_slice`; regenerate with
   `python3 -m learner.substrate`). Games read which unit is due and the streak from that slice
   and render it; they never compute or persist scheduling themselves.

5. **Content is data, mechanics are code.** Packs/scenarios are typed, validated data — no
   arbitrary JavaScript. A new mechanic requires a typed definition, validator coverage, and an
   approved factory/registry entry in engine code.

6. **No claim without a playthrough.** A mechanic "teaches" a concept only after (a) unit tests
   prove the concept math in the headless core, and (b) a browser playthrough (Playwright) emitted
   evidence records. Screenshots and evidence artifacts land in the game's `.logs/`.

7. **Shared substrate stays at the root.** `curriculum/` and `learner/` are referenced via
   root-relative paths; never copied or duplicated into an engine.

8. **Single-player, no backend.** The teaching loop is a single-player browser experience:
   no databases, no netcode, no server unless a concept demonstrably requires shared state —
   and then only after the plan argues for it.

## Engine registry

| Engine | Genre | Evidence `source` | Review slice destination |
| --- | --- | --- | --- |
| pixelDojo (`pixel-quest/`) | 8-bit arcade RPG | `pixelquest` | `engines/pixelDojo/pixel-quest/src/content/reviewSlice.ts` |
| voxelDojo | 3D system simulation (Three.js) | `voxeldojo` | `engines/voxelDojo/game-10-hash-ring/src/content/reviewSlice.ts` |

Adding an engine: add the row here, a `sync_<engine>_review_slice` target in
`learner/substrate/dashboard_snapshot.py` (+ tests), and cite this contract from the engine's
`AGENTS.md`. Update `engines/codexDojo/ecosystem/MANIFEST.md` in the same change.
