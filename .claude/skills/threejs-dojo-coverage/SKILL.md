---
name: threejs-dojo-coverage
description: >-
  Drive the /threejs-dojo per-concept loop across ALL 18 curriculum projects in
  `curriculum/catalog.md` in a single batch, dispatching one worker subagent per
  slug in parallel, then verify coverage with a fresh-context batch verifier.
  Use when the user says "implement threejs-dojo in all modules", "saturate
  voxelDojo across the catalog", "run threejs-dojo across the curriculum", or
  asks for a one-shot coverage sweep of the 18
  didactic games. Wraps the per-slug /threejs-dojo skill — does NOT replace it.
---

# Loop: threejs-dojo-coverage

A wrapper loop that runs the **per-concept `/threejs-dojo` skill** for every
slug in `curriculum/catalog.md` (18 projects, Level 1 → Level 6) in a single
batch, using one worker subagent per slug, then closes the batch with a
fresh-context **coverage verifier**. The per-slug loop already owns the
mechanic + learning gate; this loop owns **fan-out,
isolation, coverage evidence, and the batch-level done-rule**. Best-effort on
per-slug failure: every slug gets attempted; the final verdict reports
`closed/total` and lists the open ones with retry_targets.

## Loop Controls

> Flip these to change behavior. Start in Training Mode to learn whether the
> done-rule and concurrency cap are right; graduate to OFF after clean runs.

- Loop Training Mode: ON
- Retry cap: 3                         <!-- per-slug retry cap inherits from /threejs-dojo; this loop's batch-level cap is 1 attempt per slug with the inner retry cap doing the work -->
- Verification threshold: 8/10         <!-- per-slug threshold from /threejs-dojo; batch verifier applies it as a coverage gate -->
- Concurrency cap: 18                  <!-- hard cap on simultaneously-running worker sessions -->
- Engine: **voxelDojo**                <!-- one isolated Three.js app per slug for parallelism isolation -->
- Output dir: `.loops/threejs-dojo-coverage/output/<run-id>/`
- Memory file: `.loops/threejs-dojo-coverage/memory.md`
- Per-slug output (delegated): `.loops/threejs-dojo/output/<slug>/`          <!-- produced by each worker; orchestrator copies a manifest pointer, not the artifacts -->

**Training Mode ON:** pause before each major step (preflight, dispatch,
batch-verify) and wait for approval; skip per-slug steps already passing
their done-rule; re-run only failing slugs; keep the retry cap.

**Training Mode OFF:** run autonomously, no pauses; keep every done-rule check
and the retry cap; stop and report if blocked by missing data/credentials,
destructive risk, or repeated failed coverage.

## Goal

In one batch run, all 18 curriculum projects (`01_rate_limiter` …
`18_search_engine`) have a closed voxelDojo / threejs-dojo learning gate,
each one verified ≥ 8/10 by a fresh-context verifier, and a coverage verifier
in a *separate* fresh-context subagent confirms `closed == 18`.

## Inputs & Evidence

The loop may read:

- `curriculum/catalog.md` — canonical 18-project list (the source of truth for slugs)
- `curriculum/<NN_subject>/` — per-project spec / diagnostic
- `engines/voxelDojo/PLAN.md` — 13-section per-game template
- `engines/voxelDojo/docs/ARCHITECTURE.md` — module split, evidence flow, and verifier handoff
- `engines/voxelDojo/game-10-hash-ring/` — canonical pilot shell and reference implementation
- `engines/voxelDojo/game-<NN>-<slug>/` — per-slug app destination (each worker writes its OWN directory)
- `learner/learning_state.yaml` — gate contract (read-only; verifier-owned `mastered`)
- `.claude/skills/threejs-dojo/SKILL.md` — the per-slug loop this loop wraps (workers load this skill)
- `.loops/threejs-dojo/memory.md` — per-slug memory (read by orchestrator to detect already-closed slugs)
- `.loops/threejs-dojo-coverage/memory.md` — read FIRST; learn from past coverage runs

Read the coverage memory file first — it records what the last batch learned
(per-slug failures, parallelism pain, engine decisions that worked).

## Steps

1. **Preflight + routing plan** — read `curriculum/catalog.md`, parse the 18
   slugs, confirm voxelDojo routing per slug, generate a `<run-id>` (ISO-8601
   timestamp + short suffix), and write the coverage manifest skeleton.
   - Input: catalog + `.loops/threejs-dojo/output/<slug>/` (does this slug have a closed gate
     from a prior run? → accept-and-verify only, no fresh work)
   - Done-rule: `.loops/threejs-dojo-coverage/output/<run-id>/manifest.md`
     exists with 18 rows, each row carrying `slug`, `engine (voxelDojo|accept)`,
     `worker_session_id (pending)`, `verifier_score (pending)`,
     `evidence_path (pending)`, and a one-line rationale
   - Routing rule:
     - **voxelDojo** for every fresh threejs-dojo slug. Each worker writes to its
       OWN directory `engines/voxelDojo/game-<NN>-<slug>/` and runs its OWN
       Vite/TS/Biome/Vitest/Playwright stack.
     - **Accept-only** when `.loops/threejs-dojo/output/<slug>/verifier-report.json`
       already shows `result: PASS` and `score >= 8` from a prior run AND
       nothing in that slug's `engines/voxelDojo/game-<NN>-<slug>/` directory has been edited
       since that report's timestamp. The worker just re-emits the verdict.
   - Skip-rule: not applicable — always required
   - Retry: 1 (the preflight is cheap; if it fails twice, the catalog is
     probably mis-parsed or a slug is missing)

2. **Dispatch worker subagents** — spawn one `mavis session new general
   --title "threejs-dojo-coverage <slug>"` per slug, up to the concurrency
   cap, and `mavis communication send` each one the per-slug brief. Workers
   load the `.claude/skills/threejs-dojo/SKILL.md` skill and run it
   end-to-end (steps 1–6 of that skill), then write their verdict to
   `.loops/threejs-dojo/output/<slug>/verifier-report.json` and update
   `.loops/threejs-dojo/memory.md`. All fresh slugs are isolated voxelDojo apps
   and may run in parallel up to the concurrency cap.
   - Input: per-slug row from the manifest, plus the worker brief template:
     ```text
     You are worker "<slug>" in batch <run-id>.
     Load skill: .claude/skills/threejs-dojo/SKILL.md
     Slug: <slug> — Engine: <voxelDojo|accept>
     Catalog line: <catalog concept + done-rule>
     Memory to read first: .loops/threejs-dojo/memory.md
     Per-slug output dir: .loops/threejs-dojo/output/<slug>/
     Plan path: engines/voxelDojo/docs/plans/<NN>_<slug>.md
     Concurrency note: voxelDojo workers run in parallel in isolated app
     directories. Treat all 18 manifests as siblings; do NOT touch another
     slug's engines/voxelDojo/game-<NN>-<other>/ directory.
     Report back: mavis communication send --to <root-session-id> --command prompt
     --content "<slug>: <PASS|FAIL>, score=<n>/10, retry_target=<step-or-none>"
     ```
   - Done-rule: all 18 manifest rows have a non-`pending` `worker_session_id`
     AND a non-`pending` `verifier_score` (i.e., every worker reported back)
   - Skip-rule: per-slug — when the row is `accept` (already-closed) and the
     preflight timestamp matches the existing verifier-report timestamp, the
     orchestrator just copies the prior score into the manifest without
     dispatching a worker
   - Retry: 1 per worker (re-dispatch the same slug once if the worker
     crashes or times out without a verdict; if it crashes again, mark FAIL
     with `retry_target: step-1-preflight`)

3. **Collect per-slug artifacts** — for each row that returned PASS, copy
   pointer rows into `.loops/threejs-dojo-coverage/output/<run-id>/coverage.csv`
   (slug, engine, score, evidence_path, plan_path, screenshot_path, verifier_path,
   worker_session_id). For FAIL rows, record the verifier's `failed_criteria`
   and `retry_target` so the batch report can list them.
   - Input: 18 manifest rows after dispatch
   - Done-rule: `coverage.csv` exists with 18 rows, every row has a real
     path (or an explicit FAIL marker) — no `pending` left
   - Skip-rule: not applicable — coverage bookkeeping is mandatory
   - Retry: 0 (this step is bookkeeping; if it fails, the orchestrator is broken, not the work)

4. **Batch verifier (fresh context)** — spawn ONE separate subagent
   (`mavis session new general --title "threejs-dojo-coverage verifier
   <run-id>"`) and `mavis communication send` it the **coverage manifest +
   coverage.csv + the goal + the done-rule only** — not the per-slug
   reasoning. The verifier judges: (a) all 18 slugs have a closed gate
   (PASS + score ≥ 8), (b) every PASS row has a real evidence.json +
   screenshot.png + plan.md path that exists on disk, (c) at least one
   `EVIDENCE {` line was emitted per slug, (d) the producer≠verifier
   invariant holds per slug (each per-slug verifier ran in its own session,
   not the worker's).
   - Input: `.loops/threejs-dojo-coverage/output/<run-id>/manifest.md`,
     `.loops/threejs-dojo-coverage/output/<run-id>/coverage.csv`, the
     per-slug `verifier-report.json` paths (resolved from the CSV), and
     the Goal + Done Rules below
   - Done-rule: verifier returns `result: PASS` and `score >= 8` AND
     `done_rule: PASS` (closed == 18) AND `confidence: high`
   - Skip-rule: not applicable — the gate requires this fresh-context verdict
   - Retry: 1 (re-spawn once with `failed_criteria` highlighted; on second
     FAIL, batch is reported as best-effort with the gap list)

5. **Append coverage memory** — write one batch entry to
   `.loops/threejs-dojo-coverage/memory.md` with the per-slug score table,
   the batch verifier's verdict, parallelism observations (any working-tree
   collisions, port collisions, biome/tsc interference between voxelDojo apps,
   and whether the voxelDojo isolation held), and one lessons line per
   failure cluster.
   - Input: full batch result (mode, manifest, coverage.csv, batch verifier
     report, output path, lessons)
   - Done-rule: entry appended with ISO-8601 timestamp, batch score, and
     ≥ 1 lessons line per FAIL slug
   - Skip-rule: never — coverage audit trail is mandatory
   - Retry: 1 (file write only)

## Done Rules

The loop is done when **all** of these hold:

- `.loops/threejs-dojo-coverage/output/<run-id>/manifest.md` has 18 rows, every row non-pending
- `.loops/threejs-dojo-coverage/output/<run-id>/coverage.csv` exists with 18 rows
- every slug has a `verifier-report.json` with `result: PASS` and `score >= 8`
- every PASS slug has a real `EVIDENCE <json>` line in the dev-server console log AND a `screenshot.png` on disk
- every slug has a `PLAN slice` at `engines/voxelDojo/docs/plans/<NN>_<slug>.md`
- the batch verifier (fresh-context subagent) scored the coverage ≥ 8/10 AND `closed == 18`
- on partial coverage (best-effort path): the batch report names every open slug with `retry_target`

## Verification

Run the final check in a **separate subagent (fresh context)** — the
orchestrator that dispatched the workers must not grade the coverage itself.

- Spawn a verifier via `mavis session new general --title "threejs-dojo-coverage
  verifier <run-id>"` + `mavis communication send`. Pass it **only**:
  - the Goal
  - the Done Rules
  - `.loops/threejs-dojo-coverage/output/<run-id>/manifest.md`
  - `.loops/threejs-dojo-coverage/output/<run-id>/coverage.csv`
  - the per-slug `verifier-report.json` paths (resolved from the CSV)
  - `learner/learning_state.yaml` (gate contract reference)
- Do **not** pass the per-slug workers' reasoning, the orchestrator's
  self-assessment, or the per-slug screenshots/EVIDENCE bodies — the
  verifier should re-derive from paths.
- Verifier returns:
  - `score` (1–10), `result` (PASS/FAIL vs threshold), `done_rule`
    (PASS/FAIL with `closed/total`), `evidence_checked` (paths it
    inspected), `failed_criteria` (slugs that fell short, empty if
    full coverage), `retry_target` (`none` if full PASS, else the
    next-iteration fix-list), `confidence` (high / medium / low)
- Mark the batch done only when `closed == 18` AND `score >= 8` AND
  `confidence: high`. Otherwise the loop exits best-effort with the
  gap list — never relax the threshold, never flip Training Mode OFF
  to push a partial batch through.
- The batch verifier never marks `mastered` — `learner/substrate/`
  owns that transition based on each per-slug `EVIDENCE` record's
  contents. The batch verifier only judges coverage and per-slug
  verifier legitimacy.

When subagents are unavailable, do a fresh-context re-derivation that
judges only the artifacts against the Done Rules, ignoring how the
batch was dispatched.

## Output & Memory

At the end of **every** batch run, write both:

1. **Output** → `.loops/threejs-dojo-coverage/output/<run-id>/` containing:
   - `manifest.md` — 18-row table (slug, engine, worker_session_id,
     verifier_score, evidence_path, plan_path, screenshot_path,
     verifier_report_path, status)
   - `coverage.csv` — same data, machine-readable
   - `batch-verifier-report.json` — fresh-context verifier's verdict
     (`score`, `result`, `closed`, `total`, `failed_criteria`,
     `retry_target`, `confidence`)
   - `report.md` — human-readable batch summary (per-slug status table,
     parallelism notes, retry_target per open slug, lessons cross-link
     to memory)
2. **Memory** → append one entry to
   `.loops/threejs-dojo-coverage/memory.md`:

   ```markdown
   ## Batch <ISO-8601 timestamp> — run-id <run-id>
   - mode: ON | OFF
   - scope: 18 slugs (01_rate_limiter … 18_search_engine); engine distribution
     <N>voxelDojo / <K>accept
   - concurrency: <cap actually used>
   - skipped: <slugs that hit the accept-only path>
   - rerun: <slugs whose worker crashed or needed a re-dispatch>
   - per-slug scores: <comma-separated slug:score pairs>
   - coverage: <closed>/18 — <PASS|PARTIAL> — <one-line reason>
   - verification: <score>/10 — <PASS|FAIL> — <one-line reason>
   - output: <path to this run's deliverable>
   - lessons:
     - <parallelism lesson: working-tree drift? port collisions? biome/tsc interference?>
     - <engine lesson: did voxelDojo isolation hold?>
     - <failure cluster lesson: what repeated; what preflight would have caught it?>
   ```

## Failure Handling

- On per-slug retry-cap exhaustion (worker's inner cap from
  `/threejs-dojo` is 3): the orchestrator records that slug as FAIL in the
  manifest with `retry_target: <verifier's named step>` and continues the
  batch. Best-effort is the contract.
- On coverage retry-cap exhaustion (batch verifier FAILs twice): stop and
  report the gap list, the batch verifier's last `failed_criteria`, and one
  concrete next step (typically: tighten the per-slug preflight to catch the
  gap before dispatch).
- Never relax the done-rule, lower the verifier threshold, or flip Training
  Mode OFF to make a partial batch look like full coverage. If voxelDojo
  isolation breaks (one app's biome/tsc interferes with another's),
  the fix is a narrower per-slug retry target (re-run that slug alone) or a
  preflight that runs `pnpm install` per-slug into isolated `node_modules`,
  not lowering the bar.
- Never mark `mastered` from inside this loop — `learner/substrate/`
  owns that transition per slug.
- Never write `learner/learning_state.yaml`, `.mavis/`, or `units_log`
  from worker or orchestrator code. The `EVIDENCE` record flows
  downstream; the substrate decides `mastered`.
- Never treat screenshots, `dist`, `test-results`, `node_modules`, or
  `shots/` originals as source.

## voxelDojo isolation contract (the parallelism enabler)

voxelDojo is the default for this loop because it gives each slug a private
Three.js app sandbox:

- Each worker writes **only** to its own
  `engines/voxelDojo/game-<NN>-<slug>/` directory.
- Each app has its own `package.json`, `node_modules`, lockfile,
  Vite dev server (auto-assigned port), Playwright smoke, Biome config, tsconfig.
- Two workers never read or write the same file.
- Port assignments come from `.loops/threejs-dojo/ROUTING_MANIFEST.md`.
