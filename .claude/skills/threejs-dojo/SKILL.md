---
name: threejs-dojo
description: >-
  Build ONE pixelDojo-style three.js didactic game per run (encounter extension in pixel-quest, or a
  sibling 3D app under engines/pixelDojo/games/), teach one curriculum concept, emit valid EVIDENCE,
  close the learning gate via a separate verifier subagent. Use when the user says "jogo didático
  three.js", "three.js game for concept X", "next pixelDojo game for curriculum project Y", supplies
  a concept slug from `curriculum/catalog.md`, or asks to teach/sketch a curriculum skill as a 3D game.
---

# Loop: threejs-dojo

A loop that closes the learning gate for **one** curriculum concept at a time. Each
`/threejs-dojo <concept-slug>` invocation produces a single pixelDojo-style three.js game (Shape A —
extend `pixel-quest` with a new typed encounter; or Shape B — sibling Vite + TS + Three.js app under
`engines/pixelDojo/games/<NN>_<slug>/`), proves the didactic mechanic via Playwright + a valid
`EVIDENCE <json>` console record, and gates the result with a separate-subagent verifier (fresh
context, score ≥ 8/10). Training Mode is ON by default.

## Loop Controls

> Flip these to change behavior. Start in Training Mode to learn whether the done-rule and shape
> decision are right; graduate to OFF after clean runs.

- Loop Training Mode: ON
- Retry cap: 3
- Verification threshold: 8/10
- Output dir: `.loops/threejs-dojo/output/<concept-slug>/`
- Memory file: `.loops/threejs-dojo/memory.md`

**Training Mode ON:** pause before each step and wait for approval; skip any step already passing its
done-rule; re-run only failing steps; keep the retry cap.

**Training Mode OFF:** run autonomously, no pauses; keep every done-rule check and the retry cap;
stop and report if blocked by missing data/credentials, destructive risk, or repeated failed
verification.

## Goal

In one run, a single curriculum concept is taught by a runnable three.js mini-game that emits at
least one valid `EVIDENCE <json>` console record, drives the didactic mechanic end-to-end under
Playwright, and is judged ≥ 8/10 by a separate-subagent verifier.

## Inputs & Evidence

The loop may read:

- `<concept-slug>` — argument to the run (e.g. `01_rate_limiter`, `08_event_driven_order_system`,
  `17_distributed_config_service`)
- `curriculum/catalog.md` and `curriculum/<NN_subject>/` — concept catalog + project spec
- `engines/pixelDojo/PLAN.md` — 12-section per-game template (sections 1, 3, 4, 5, 6, 11 are required)
- `engines/pixelDojo/pixel-quest/docs/content-packs.md` — pack shape + evidence contract
- `engines/pixelDojo/pixel-quest/src/content/types.ts` and `src/game/encounters/registry.ts` — typed
  encounter registry (Shape A target)
- `engines/pixelDojo/pixel-quest/playwright/` — smoke spec pattern (Shape A & Shape B)
- `engines/pixelDojo/pixel-quest/` — full engine shell for Shape A reuse; reference for Shape B
- `learner/learning_state.yaml` — active units + gate contract (read-only; the verifier owns `mastered`)
- `.loops/threejs-dojo/memory.md` — read FIRST; learn from past runs

Read the memory file first — it records what the last run learned (shape decisions, smoke
flakes, evidence-schema misses, retried steps).

## Steps

1. **Preflight + decide shape (A or B)** — confirm the slug; decide Shape A or Shape B; record the
   rationale. Ask the user to pick a slug if none was given; otherwise stop the run.
   - Input: catalog entry for the slug + a one-paragraph mechanic-needs assessment
   - Done-rule: `.loops/threejs-dojo/output/<slug>/decision.md` exists with `shape: A|B` and
     rationale (≤ 6 lines)
   - **Shape A** when the concept reuses pixel-quest's existing 3D HUD/window (token meter,
     telemetry trace, routing graph overlay, request-sprite lanes) and adds ONE new mechanic inside
     the world — register a typed encounter and pack entry.
   - **Shape B** when the concept needs a fresh 3D world not representable in pixel-quest's shell
     (e.g. message-queue partition arena, search-index cube, CRDT co-editor arena, consensus ring) —
     create `engines/pixelDojo/games/<NN>_<slug>/` mirroring pixel-quest structure (Vite, TS strict,
     Biome, plain three.js, Vitest, Playwright).
   - Skip-rule: not applicable — always required
   - Retry: inherits the loop cap

2. **Plan the mechanic (PLAN slice)** — fill sections 1, 3, 4, 5, 6, 11 of PLAN.md for this concept.
   - Input: catalog concept + chosen shape
   - Done-rule: plan committed at `engines/pixelDojo/docs/plans/<NN>_<slug>.md` containing: subject
     + concept, player goal, concept→mechanic table, main loop, inputs & controls, win/fail states,
     AND learning-gate hooks (`unit_id`, evidence field list, `pass` rule)
   - Skip-rule: a plan for this slug already exists in `engines/pixelDojo/docs/plans/` and is
     unchanged since the last successful run (memory reference)
   - Retry: 1 (the plan is cheap to rework; if it fails twice, the slug is probably mis-scoped)

3. **Scaffold the game**
   - Input: PLAN slice + chosen shape
   - **Shape A** — write, in this order:
     1. `engines/pixelDojo/pixel-quest/src/game/encounters/<concept>.ts` (typed encounter module)
     2. factory registration in `src/game/encounters/registry.ts`
     3. `EncounterType` variant in `src/content/types.ts` if the schema changes
     4. validator update in `src/content/packValidator.ts` if a new field type is introduced
     5. pack entry in `src/content/curriculumPack.ts`
   - **Shape B** — create `engines/pixelDojo/games/<NN>_<slug>/` mirroring pixel-quest: `package.json`
     (pnpm scripts: `dev`, `lint`, `test`, `build`, `smoke`), `tsconfig.json` (strict), `biome.jsonc`,
     `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.ts`, `src/render/`,
     `src/game/`, `src/game/evidence/`, `playwright/`, `shots/`, `README.md`. Re-use the pixel-quest
     `tsconfig.json` and `biome.jsonc` literally where it makes sense.
   - Done-rule: `pnpm run lint` (or `biome check .`) and `tsc --noEmit` pass against the new/edited
     files
   - Skip-rule: artifacts already exist for this slug, pass typecheck, and memory shows no recent
     smoke regression
   - Retry: inherits the loop cap

4. **Unit + Playwright smoke** — Playwright drives the encounter/app to completion, exercising the
   didactic mechanic; ≥ 1 valid `EVIDENCE <json>` line is emitted; screenshot saved.
   - Input: built game
   - Done-rule, **all must hold**:
     - `pnpm run test` green
     - `pnpm run build` green
     - `pnpm run smoke` green
     - dev-server console contains ≥ 1 line matching `EVIDENCE {`
     - `window.__pixelQuestEvidence` (Shape A) or the app-local equivalent (Shape B) populates ≥ 1
       object matching the evidence schema in `engines/pixelDojo/pixel-quest/src/game/evidence/`
     - screenshot saved at `engines/pixelDojo/pixel-quest/shots/<slug>.png` (Shape A) or
       `engines/pixelDojo/games/<NN>_<slug>/shots/<slug>.png` (Shape B), or app-local equivalent
   - Skip-rule: a previous run already produced green smoke + ≥ 1 valid evidence + screenshot for
     this slug, and the source under `src/` and the PLAN slice haven't been edited since that run
     (memory reference)
   - Retry: inherits the loop cap — narrower retry target on each failure (e.g. "evidence schema
     mismatch → fix packValidator"; "smoke flake → re-run smoke once, then re-run Playwright spec
     with longer timeout")

5. **Spawn fresh-context verifier** — subagent reads the artifact, evidence record, plan slice, and
   the concept's done-rule; returns structured verdict (score, PASS/FAIL, failed_criteria,
   retry_target, confidence).
   - Input: the four artifact paths — PLAN slice, implementation files (or `git diff` range),
     EVIDENCE record, screenshot — plus the slug and the concept's one-sentence done-rule from
     `curriculum/catalog.md`
   - Done-rule: verifier returns `result: PASS` and `score >= 8`, AND `done_rule: PASS`
   - Skip-rule: not applicable — always required for the gate to close
   - Retry: inherits the loop cap; on FAIL, feed `failed_criteria` + `retry_target` into step 3 or
     step 4 of the next iteration (whichever the verifier named)

6. **Append memory entry** — write one structured entry to the memory file.
   - Input: full run result (mode, inputs, skipped, rerun, verifier verdict, output path, lessons)
   - Done-rule: entry appended with ISO-8601 timestamp, score, and ≥ 1 lessons line
   - Skip-rule: never — audit trail is mandatory
   - Retry: 1 (file write only)

## Done Rules

The loop is done when **all** of these hold:

- `pnpm run lint`, `pnpm run test`, `pnpm run build`, and `pnpm run smoke` are all green against
  the chosen shape's directory
- ≥ 1 valid `EVIDENCE <json>` console record was emitted during the Playwright playthrough
- screenshot evidence saved at the expected path
- PLAN slice committed at `engines/pixelDojo/docs/plans/<NN>_<slug>.md`
- the fresh-context verifier scores ≥ 8/10 against the concept's done-rule

## Verification

Run the final check in a **separate subagent (fresh context)** — the agent that produced the work
must not grade it.

- Spawn a verifier via the `Agent` tool. Pass it **only**:
  - the concept slug
  - the concept's one-sentence done-rule from `curriculum/catalog.md`
  - the PLAN slice path
  - the implementation file paths (or the `git diff` range)
  - the EVIDENCE record (or its path)
  - the screenshot path
  - the gate contract reference (`learner/learning_state.yaml`)
- Do **not** pass the producer's reasoning, the producer's self-assessment, or the original
  user-prompt beyond the slug and done-rule.
- Verifier returns:
  - `score` (1–10), `result` (PASS/FAIL vs threshold), `done_rule` (PASS/FAIL),
    `evidence_checked` (files/commands/links inspected), `failed_criteria` (empty if PASS),
    `retry_target` (the single step to re-run, or `none`), `confidence` (high / medium / low)
- Mark the loop done only when the done-rule passes **and** the score ≥ 8/10. Otherwise feed
  `failed_criteria` + `retry_target` back as the next iteration's fix-list (within the retry cap).
- The verifier never marks `mastered` — `learner/substrate/` owns that transition based on the
  evidence record's contents.

When subagents are unavailable, do a fresh-context re-derivation that judges only the artifact
against the Done Rules, ignoring how it was produced.

## Output & Memory

At the end of **every** run, write both:

1. **Output** → `.loops/threejs-dojo/output/<concept-slug>/` containing:
   - `decision.md` — `shape: A|B` with ≤ 6-line rationale
   - `plan.md` — PLAN slice used (or pointer to `engines/pixelDojo/docs/plans/<NN>_<slug>.md`)
   - `evidence.json` — copied EVIDENCE record (so a future agent can replay without re-running)
   - `screenshot.png` — copied screenshot
   - `verifier-report.json` — verifier's structured verdict (`score`, `result`, `failed_criteria`,
     `retry_target`, `confidence`)
2. **Memory** → append one entry to `.loops/threejs-dojo/memory.md`:

   ```markdown
   ## Run <ISO-8601 timestamp>
   - mode: ON | OFF
   - inputs: <concept-slug>; shape <A|B>; files touched
   - skipped: <steps already passing their done-rule>
   - rerun: <steps retried and why>
   - verification: <score>/10 — <PASS|FAIL> — <one-line reason>
   - output: <path to this run's deliverable>
   - lessons: <what worked, what failed, what to remember next run>
   ```

## Failure Handling

- On retry-cap exhaustion: stop and report the best attempt's path, the verifier's last
  `failed_criteria`, the step that kept failing, and one concrete next step. Do not silently
  succeed.
- Never relax the done-rule, lower the verifier threshold, or flip Training Mode OFF to make a
  failing run look done. If a step fails repeatedly, add a narrower retry target (`step 4.Smoke
  only` instead of the whole step 4) or a stronger preflight check (e.g. dry-run the encounter
  factory in `npm run test` before launching Playwright).
- Never mark `mastered` from inside this loop — `learner/substrate/` owns that.
- Never write `learner/learning_state.yaml`, `.mavis/`, or `units_log` from game or loop code.
- Never treat screenshots, `dist`, `test-results`, `node_modules`, or `shots/` originals as source.
