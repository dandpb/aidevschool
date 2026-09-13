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
   anything under `learner/`. The separate, engine-neutral Prometor boundary is runnable as
   `python3 -m learner.gate`; it owns every learner-state transition through
   `learner.substrate.gate`. Producer ≠ verifier. Required evidence fields for
   verifier eligibility: `unit_id`, `project`, `game`, `ts`, `pass`. A verifier
   verdict travels in a separate JSON receipt under `learner/verifier_receipts/`.
   The receipt carries `verdict`, `context_isolated`, `mutation_score`,
   `coverage_core`, `source`, and an `evidence_digest` that matches the canonical
   producer record. The canonical digest excludes `ts` and any producer-embedded
   `verifier` block. An embedded block never authorizes mastery.

3. **Evidence is raw, structured, and emitted twice.** Both engines consume the
   `@aidevschool/evidence` package from `engines/shared/teaching-evidence/`.
   One JSON record per cleared/failed
   wave/encounter, pushed to a browser global (`window.__pixelQuestEvidence` /
   `window.__voxelDojoEvidence`) and logged as an `EVIDENCE <json>` console record. Required fields:

   | Field | Rule |
   | --- | --- |
   | `source` | Engine tag: `"pixelquest"` or `"voxeldojo"` |
   | `unit_id`, `project` | Must exist in `learning_state.yaml` / `catalog.md` |
   | `scenario_id` / `encounter_id` | Stable id of the level/encounter |
   | `attempt_id` | Optional stable per-attempt id (e.g. `kv-warehouse-L1-attempt-2`); snake_case like the rest of the envelope, and verifier receipts bind their `attempt_id` to it for identity matching |
   | `ts`, `pass` | ISO timestamp; the game's own judgment (verifier re-judges) |
   | `metrics` | The quantities the pass/fail judgment actually used |
   | `review_context` | `scheduled_review`, `review_reason`, `scheduler_source: "learner-substrate"`, `verifier_required: true` |
   | `curriculum_context` | Concept + mechanic names for auditability |

   Records are append-only and immutable. `localStorage` is never learning evidence.

4. **Scheduling truth flows one way: substrate → game.** The Python substrate
   (`learner/substrate/`) generates read-only review slices. Games read which
   unit is due and the streak from those slices and render them; they never
   compute or persist scheduling themselves. Regenerate with
   `python3 -m learner.substrate` (or check drift with `--check`).

   | Engine | Slice destination |
   | --- | --- |
   | pixelDojo (`pixel-quest/`) | `engines/pixelDojo/pixel-quest/src/content/reviewSlice.ts` (one file, all units) |
   | voxelDojo | `engines/voxelDojo/game-*/src/reviewSlice.ts` (one file per game package, filtered to that game's unit) + the legacy `engines/voxelDojo/shared/content.ts` for backward compatibility |

   The voxelDojo per-game fan-out closes the audit gap (TECH_DEBT_AUDIT_2026-07-08
   #4) where 15/16 hand-copied stubs were falsely headed "AUTO-GENERATED" while
   only game-10 was actually synced. Each per-game file's `reason` field is
   FSRS-computed for that game's unit, never a hardcoded literal; the CI
   detector in `learner/substrate/tests/test_voxel_slice.py::TestVoxelPerGameStubDetection`
   fails the build if any file reverts to a stub.

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

## Frozen contract identifiers

Some identifier strings are load-bearing across game emitter, verifier, bridge, and already
recorded evidence. Those below are **frozen historical names**: they are not typos to fix
one side at a time. Consistency on every side is what keeps historical evidence verifiable.

### `metrics.kind = "voxeldoj-kv-warehouse"` — FROZEN (voxelDojo game-02 warehouse)

The string is a historical artifact (engine is `voxelDojo`; the kind says `voxeldoj`), but
production and verifiers are consistent and pin it (freeze registered 2026-09-13, board doc
`hardening-top10` R9 / AID-1586; landed via AID-1663). Pinned at freeze time on `main`
(`6fef278`) by:

- Emitter: `engines/voxelDojo/game-02-warehouse/src/game/controller.ts` (1 occurrence)
- Netlify verification bridge: `learner/gate/netlify-functions/dojo-verification-bridge.mjs` (4)
- Deterministic evaluator: `learner/gate/warehouse_evaluator.py` (4)
- codexdojo-os-prototype bridge record: `engines/codexdojo-os-prototype/bridge/routerVerificationRecords.ts` (1)
- Contract suites that pin the string: `learner/gate/tests/dojo_verification_bridge_netlify.test.mjs`,
  `learner/gate/tests/teaching_game_bridge_records.py`, `learner/gate/tests/test_relay_evaluator.py`
- Historical evidence already recorded under this kind: `engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson`
  and `work-products/AID-*/qa-result*.json`

**Rename rule:** this kind must NOT be renamed as a one-sided "typo fix". Renaming only the
game (or only the evaluator/bridge) makes the verifier reject previously recorded evidence and
breaks the learning gate silently. Any rename is a coordinated migration with its own issue and
plan, touching all of: (1) game emitters, (2) evaluator + Netlify bridge matchers,
(3) the codexdojo-os-prototype bridge record, (4) the contract suites, and (5) migration or
dual-acceptance of historical evidence records.

## Engine registry

| Engine | Genre | Evidence `source` | Review slice destination |
| --- | --- | --- | --- |
| pixelDojo (`pixel-quest/`) | 8-bit arcade RPG | `pixelquest` | `engines/pixelDojo/pixel-quest/src/content/reviewSlice.ts` |
| voxelDojo | 3D system simulation (Three.js) | `voxeldojo` | `engines/voxelDojo/game-*/src/reviewSlice.ts` (per-game, see contract item 4) |

Adding an engine: add the row here, a `sync_<engine>_review_slice` target in
`learner/substrate/dashboard_snapshot.py` (+ tests), and cite this contract from the engine's
`AGENTS.md`. Update `engines/codexDojo/ecosystem/MANIFEST.md` in the same change.
