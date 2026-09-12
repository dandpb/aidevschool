# Loop Memory — `threejs-dojo`

> Append-only run log for the `/threejs-dojo` orchestration loop. Read this file first on every
> new run; the previous lessons shape the next shape choice, smoke scope, and retry targets.

## Schema

Each entry uses this shape (see SKILL.md §"Output & Memory"):

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

---

## Run 2026-07-03T13:39:30-03:00
- mode: ON
- inputs: (skill bootstrap run; no slug produced)
- skipped: none
- rerun: none
- verification: n/a — bootstrap run, no artifact yet
- output: `.claude/skills/threejs-dojo/SKILL.md` created
- lessons: scope per run = **1 concept**; placement **hybrid** (A = extend pixel-quest, B = sibling
  game app); done rule = **mechanic + learning gate closed** (smoke green + ≥1 valid EVIDENCE +
  separate verifier ≥8/10). PLAN slice lives at `engines/pixelDojo/docs/plans/<NN>_<slug>.md`.
  The verifier subagent never marks `mastered` — only `learner/substrate/` does, based on the
  EVIDENCE record. Next: invoke `/threejs-dojo 01_rate_limiter` first as the smoke-tested
  reference — token-bucket is already wired in pixel-quest, so it will validate Shape A end-to-end
  before any Shape B work.

## Run 2026-07-05T18:48:30-03:00
- mode: ON
- inputs: `01_rate_limiter`; shape **A** (path A — accept existing lab); files touched:
  `engines/pixelDojo/docs/plans/01_rate_limiter.md` (new PLAN slice),
  `.loops/threejs-dojo/output/01_rate_limiter/{decision,plan,evidence.json,screenshot}.md` (new),
  plus collateral fixes in `src/app/PixelQuestApp.ts` (biome import sort),
  `src/game/evidence/evidence.ts` (readNumber non-negative), `playwright/pixel-quest.spec.ts`
  (biome format), `package.json` (`+@types/node` for tsc).
- skipped: step 3 scaffold (no new code; existing pack entry for `01_rate_limiter` is the canonical
  `Agent Quest: Rate Limiter` sequence-flow encounter, registry.ts already wired, evidence contract
  `pixelquest-sequence-flow` declared, screenshot already produced by smoke)
- rerun:
  - step 4 smoke: captured fresh `evidence.json` via ad-hoc Playwright drive after the
    working tree drifted (parallel agent's staged refactor flipped import order, tsc strictness,
    and the smoke spec twice during this run; net effect: 0 — all four commands green at end)
  - step 5 verifier: spawned fresh-context `general` subagent with the artifact paths
    + done-rule only; got 9/10 PASS in one shot (no retry)
- verification: **9/10 — PASS — high confidence** — all 9 criteria green, gate contract airtight,
  producer≠verifier invariant holds (run did not mutate `learning_state.yaml`; the existing
  `mastered: true` predates this run by 30+ min). One-point dock: mechanic→concept mapping is
  "partial" — sequence-flow Agent Quest is the verification object for token-bucket robustness,
  not the algorithm's playable surface. Decision.md and plan.md both declare this honestly.
- output: `.loops/threejs-dojo/output/01_rate_limiter/`
- lessons:
  1. **The "encounter module exists" signal is not the same as "slug is wired in the pack."**
     The `tokenBucket.ts` encounter module was present and registered, but the `01_rate_limiter`
     pack entry dispatches to `sequence_flow` ("Agent Quest: Rate Limiter"). A preflight grep
     for the slug in `curriculumPack.ts` would have saved the discovery round-trip — add this
     to step 1 of the skill.
  2. **Path A is honest but partial.** Accepting the existing lab as the closed gate is
     defensible when the lab is genuinely teaching *something* about the concept (here: the
     proof protocol for token-bucket robustness), but a 9/10 verifier is the right ceiling —
     not 10/10 — because the gameplay surface never touches the algorithm's internals.
     The PLAN slice should be transparent about this; decision.md was, and the verifier
     rewarded the honesty.
  3. **Working-tree drift in a multi-agent session is a real gate risk.** A parallel session
     (likely the user's Maestro) was staging a heavy refactor of pixel-quest during this run;
     tsc errors and lint failures came and went between my commands. Mitigation: re-run the
     full four-command gate immediately before spawning the verifier, not just at step 4. Add
     a "re-gate" pre-check before step 5 to the skill.
  4. **Training Mode pauses at preflight decisions, not at every file write.** Pausing for
     the A/B/C path choice was the right call; pausing to confirm each biome auto-fix would
     have been friction with no learning value. The user picked A decisively, then the run
     executed end-to-end. That's the calibration we want for `/threejs-dojo`.
  5. **The verifier's "partial mechanic→concept" assessment is the right shape of feedback
     for a future path-B run.** If a later run on a sibling slug also gets 9/10 with the
     same critique, that signals the catalog→mechanic mapping needs structural review,
     not per-slug fixes. Worth a separate audit run.
  6. **`@types/node` was the missing transitive dep for the parallel agent's NDJSON
     evidence channel.** The smoke spec line that writes to `.logs/evidence.ndjson` is
     staged but the import was being auto-removed by biome format passes because it had
     no corresponding types. The fix (`+@types/node` + future `types: ["vite/client",
     "node"]` in tsconfig) is general; the parallel agent will need it when they re-add
     the NDJSON code.

## Run 2026-07-05T21:40:00-03:00 (all-18 buildout)
- mode: OFF (autonomous multi-agent buildout per user request "implement in all modules … use multi agents")
- inputs: all 18 curriculum modules; routing per `.loops/threejs-dojo/ROUTING_MANIFEST.md`
  (spatial/structural concepts → voxelDojo Shape B; rules-shaped 01/04 → pixel-quest Shape A);
  depth: full pilot-quality M1–M6
- skipped: none (every module built)
- rerun: **Wave 2 (games 02,03,05,06,07,09) had to be rebuilt from scratch** — the first build
  was verified green in-agent but a parallel session's clean cycle (`rm` of untracked source,
  ~3 min cadence, leaves `dist/`+`node_modules/`) wiped all six dirs' source + `package.json`
  before they could be committed. Confirmed via dist bundles still containing the real game code
  ("CHECKPOINT CITY", "U7-rest-api-auth", HMAC) — agents did the work, the disk lost it.
- verification: **15/15 voxelDojo games lint+test+typecheck green from git; smoke green on a
  per-wave sample (10,12,02,14,18); pixel-quest 112 tests green (107 baseline + 5 task-queue).
  NOT re-graded by a fresh-context verifier subagent** (the skill's step 5) — this run was a
  buildout, not a per-concept gate; each game's evidence record is the artifact a future
  `/threejs-dojo <slug>` verifier run would consume.
- output: 16 voxelDojo games under `engines/voxelDojo/game-<NN>-<slug>/` (214 tracked src files,
  37 test files, 15 PLAN slices in `docs/plans/`) + `taskQueue.ts` encounter in pixel-quest.
  Committed in 3 commits: `90617e3` (02,03,05,06,07,09), `fb87c2a` (14,15,18), `33ca950` (04).
  Wave 1 (08,11,12,13,16,17) was committed by the parallel session during the run.
- lessons:
  1. **Multi-agent drift is now destructive, not just cosmetic.** A parallel session ("Maestro")
     is running its own all-18 buildout and runs a clean cycle that removes untracked source
     every ~3 minutes. Memory.md had warned about working-tree drift; this run learned that
     *uncommitted agent work does not survive between turns* in this environment. Mitigation that
     worked: commit each wave the instant its agents return (within the same turn), and remove
     stale `.git/index.lock` files left by the parallel session's interrupted git ops. Add a
     "commit immediately, never leave agent output uncommitted" rule to the skill for OFF-mode
     multi-agent runs.
  2. **The stale `engines/pixelDojo/games/` Shape B path is actively being built into by the
     parallel session** (02,03,04,05,06,08,09 scaffolded there at low quality — 0-6 src files,
     no tests, no smoke). This duplicates the canonical `engines/voxelDojo/game-<NN>-<slug>/`
     work and will confuse future runs. The SKILL.md was already corrected (parallel session,
     this run confirmed) to point Shape B at voxelDojo; the pixelDojo/games scaffold should be
     retired/deleted in a cleanup pass once the parallel session stops writing to it. **Do not
     trust anything in `engines/pixelDojo/games/` as canonical.**
  3. **The 2-of-18 rules-shaped split (01, 04 → pixel-quest) was the right call and GAP §G8
     agreed.** Forcing 01/04 into 3D would have produced worse teaching than the existing
     token-bucket/sequence-flow encounters (01) and the new task-queue encounter (04). The
     "why 3D" test in §2 of each PLAN slice is load-bearing — seeds that can't answer it
     should be retired, not built.
  4. **Per-game `scheduled_review: false` + `review_reason: "deepening"` is the honest default
     when the unit isn't in the substrate yet.** Only U0 (rate limiter) and U9-distributed-cache
     are wired in `learning_state.yaml`; the other 14 unit_ids (U2..U18) are conventional and
     the games emit them for the evidence record only — the substrate must be extended before
     any of these can serve a real first-mastery gate. This matches the G4 framing correction
     from the earlier run.
  5. **The pilot template (game-10-hash-ring) copy-verbatim strategy paid off.** Every agent
     that copied `package.json`/`tsconfig.json`/`biome.jsonc`/`vite.config.ts`/`playwright.config.ts`
     literally and only changed name + port produced green games in one shot; agents that
     improvised config drift were the ones that needed retries. Codify "configs are copied,
     not authored" harder in the skill.
  6. **Stale `.git/index.lock` is a recurring blocker in multi-session repos.** The parallel
     session's git ops leave a zero-byte lock when interrupted; `rm -f .git/index.lock` is
     safe when `ps` shows no running git process. Worth a preflight check before any commit.

