# Tech Debt Audit — 2026-07-08

Full-ecosystem audit (all engines + shared substrate + repo infra). Follow-up to
`TECH_DEBT_AUDIT_2026-06-28.md`; items already fixed there are not repeated.

**Scoring:** Priority = (Impact + Risk) × (6 − Effort), each 1–5.
**Verification note:** every item below was grounded in file-path evidence; one candidate
item ("minimaxDojo config seam has no backing learner.yaml") was **disproven** during
verification — `engines/minimaxDojo/config/learner.yaml` exists and is tracked.

## Prioritized items

| # | Item | Category | Impact | Risk | Effort | Priority | Status |
|---|------|----------|--------|------|--------|----------|--------|
| 1 | Non-atomic write of `learner/learning_state.yaml` in pixelDojo verifier (`verifier/__init__.py:320` uses plain `.write_text()`; `engines/openclaw/fsio.atomic_write_text` exists but is siloed) | code | 4 | 4 | 2 | 32 | open |
| 2 | Generated artifacts tracked in git: 36 smoke PNGs (voxelDojo `.logs/`, pixelDojo `games/*/shots/`), 22 `test-results/.last-run.json`, 7 `graphify-out/` files — the deferred `git rm --cached` documented in `.gitignore` was never run | infrastructure | 3 | 2 | 1 | 25 | **fixed in this pass** |
| 3 | 4 compiled Go binaries (~35 MB) tracked under `curriculum/*/go-impl/` — largest blobs in history | infrastructure | 4 | 2 | 2 | 24 | **untracked in this pass** (history rewrite still open) |
| 4 | voxelDojo `reviewSlice.ts`: 15/16 games are hand-copied stubs falsely headed "AUTO-GENERATED — run learner.substrate"; substrate only syncs game-10. `review_reason` can never be `"due"` in 15 games — contract item 4 silently broken | architecture | 4 | 4 | 3 | 24 | open |
| 5 | Derived views disagree on AIDI/profile: whiteboard adapter hardcodes `ai_dependency_index: 0.50`, dashboard defaults `0.34`; neither is canonical (`learning_state.yaml` has no `learner.aidi`) | architecture | 3 | 3 | 2 | 24 | open |
| 6 | `.git` is 222 MB: 18,928 loose objects, zero packfiles, ~73 MB garbage. Needs `git gc --prune=now` (must run on macOS — sandbox cannot unlink) | infrastructure | 3 | 1 | 1 | 20 | user action |
| 7 | Dependency drift: `pyproject.toml` vs `learner/substrate/requirements.txt` (no upper bounds); `@types/node` ^24 (codexDojo) vs ^22 (pixel-quest); `@types/three` caret vs tilde | dependency | 2 | 2 | 1 | 20 | open |
| 8 | CI blind spots: no jobs for voxelDojo (16 games), pixelDojo `games/*`, or openclaw. "No claims without evidence" isn't machine-enforced for the most-churned engine | infrastructure | 4 | 2 | 3 | 18 | open |
| 9 | `learner/substrate.validate()` is partial: no checks on `empirical_gate`, `next_action`, `agent_ownership`, no cross-check `active_unit`↔`units_log`, no existence check for `attempt_file`/`evidence_file` | code | 3 | 3 | 3 | 18 | open |
| 10 | HermesBus `_classify()` globs+parses every event file (outbox+inbox+log) on each `publish()`; `log/` is append-only so cost grows without bound and one corrupt file blocks all publishes (`hermes/bus.py:147-153`) | code | 3 | 3 | 3 | 18 | open |
| 11 | `openclaw/runner/scheduler.py:92-123` regex-parses state out of `pipeline_status.md` prose; blockers split naively on `,` | code | 3 | 3 | 3 | 18 | open |
| 12 | Stale branches: local `master` (dead default, 2026-06-09) + ~8 remote agent branches never pruned | infrastructure | 2 | 2 | 2 | 16 | user action |
| 13 | Dated planning-doc sprawl at root (`REFACTOR_PLAN.md`, `REMEDIATION_ROADMAP_2026-06-28.md`, `TECH_DEBT_AUDIT_2026-06-28.md`) — partly executed, reads as current | documentation | 2 | 2 | 2 | 16 | open |
| 14 | Docs drift: broken `docs/PROMPTS/00_IDEIAS.md` link in CLAUDE.md+AGENTS.md; `.Codex` case error; `CONTEXT-MAP.md` lists per-context files that don't exist; voxelDojo AGENTS/README describe only the game-10 pilot; spaced filenames (`00_IDEIAS _gemini.md`) | documentation | 2 | 1 | 1 | 15 | **partly fixed in this pass** |
| 15 | CI runs full matrix on every push to every branch (`on: push:` unfiltered) | infrastructure | 2 | 1 | 1 | 15 | **fixed in this pass** |
| 16 | No shared workspace: 17 pixelDojo games + 16 voxelDojo games + pixel-quest + codexDojo = ~35 standalone projects, each with own `package.json`/lockfile/`node_modules`; `biome.jsonc` byte-identical ×33, tsconfig already split into variants | architecture | 4 | 3 | 4 | 14 | open |
| 17 | Evidence emitter copy-pasted ~31× (pixelDojo `src/game/evidence.ts` ×15 layouts drifting, voxelDojo `src/evidence/emit.ts` ×16, game-11 already diverged) — the contract-critical producer path forks silently | architecture | 4 | 3 | 4 | 14 | open |
| 18 | Three.js scene boilerplate (renderer/camera/controls/lights/resize/raycaster) duplicated across all 16 voxelDojo scenes; wave/controller/hud scaffolding forked across 8+ pixelDojo games | architecture | 3 | 3 | 4 | 12 | open |
| 19 | `main.ts` monoliths (300–679 lines) with zero unit tests in every pixelDojo game; only pure-logic modules are tested | test | 3 | 3 | 4 | 12 | open |
| 20 | Misc small: stray `pnpm-workspace.yaml` in games 04/15; dead `MEMORY_UPDATED` branches in openclaw; duplicated `_now_iso()`; `learning_state.yaml` `evidence_file` points at legacy path while verifier prefers NDJSON; `scheduler.py` template lists nonexistent `diagnostic` phase; magic `350 // matches L3 crateTtlMs` cross-module coupling in game-02 | code | 1 | 2 | 1 | 15 | open |

## Found during verification (2026-07-08 test run)

Two additional test-debt items surfaced while verifying this audit's changes:

| # | Item | Category | Impact | Risk | Effort | Priority | Status |
|---|------|----------|--------|------|--------|----------|--------|
| 21 | 3 substrate drift tests fail **at HEAD** (`TestBacklogStatusDrift` ×2 + `test_build_snapshot_picks_up_backlog_counts`): `BACKLOG_STATUS.md` marks 17 projects scaffolded, dashboard snapshot counts 16, and one scaffolded row is missing expected artifacts. Committed data drift — the drift detectors are doing their job and being ignored | test | 3 | 3 | 2 | 24 | open |
| 22 | Test-isolation debt: `pytest engines/pixelDojo/verifier engines/minimaxDojo learner` from repo root fails 10 verifier tests that all pass when the suite runs alone (suite ordering/shared-state leakage) | test | 2 | 2 | 2 | 16 | open |

Fix for item 21: regenerate views (`python3 -m learner.substrate`) or correct
`BACKLOG_STATUS.md` — decide which side is the truth first (per golden rule 4, filesystem
state must be auditable; don't silence the test).

## Healthy findings (no action)

Producer ≠ verifier rule: no violations found across openclaw, pixelDojo verifier, and
minimaxDojo state machine. voxelDojo game code quality is high (strict TS, zero
`any`/`TODO`/`@ts-ignore`, real headless tests + Playwright evidence smoke per game).
`learner/substrate/scheduling.py` is thoroughly covered (70 tests). minimaxDojo threshold
seam (`config/learner.yaml`) exists and works as documented.

## Quick wins applied in this pass (2026-07-08)

1. `.gitignore` extended: voxelDojo `.logs/*.png`, pixelDojo `games/*/shots/*.png`, Go
   build binaries. Evidence files (`evidence.json`/`.ndjson`/`live-evidence*`) stay
   tracked — they are the audit trail.
2. Untracked (kept on disk): 36 smoke PNGs, 22 `.last-run.json`, 7 `graphify-out/` files,
   4 Go binaries (~35 MB out of the index).
3. Created `docs/PROMPTS/00_IDEIAS.md` as an index; renamed the three spaced
   `00_IDEIAS _*.md` files; fixed `.Codex` → `.codex` in CLAUDE.md.
4. `ci.yml`: push trigger filtered to `main` (PRs still run everywhere).

## Phased remediation plan (alongside feature work)

**Phase 1 — correctness of the learning substrate (≈1 day).** Item 1: route the verifier's
state write through a shared atomic-write helper (extract `fsio` to a top-level `shared/`
or import from openclaw). Item 4: make `sync_voxel_review_slice` fan out to all 16 games,
regenerate, and add a CI check that fails on the stub timestamp. Item 5: pick one canonical
AIDI source (add `learner.aidi` to `learning_state.yaml`), make both adapters read it.

**Phase 2 — enforcement (≈1–2 days).** Item 8: add CI jobs — voxelDojo matrix
(test/typecheck/build), pixelDojo games matrix, explicit openclaw pytest. Item 9: extend
`validate()` (empirical_gate, next_action, active_unit↔units_log cross-check, referenced
files exist). Item 7: single dependency source of truth (drop requirements.txt or generate
it from pyproject).

**Phase 3 — dedup the game engines (≈1 week, incremental).** Item 16: convert pixelDojo
games and voxelDojo to pnpm workspaces with shared base tsconfig/biome/vitest configs.
Item 17: extract one `emitEvidence(config)` package per engine (or cross-engine — the
contract is shared). Item 18: shared `SceneHarness` for voxelDojo. Do this game-by-game
behind the existing smoke tests; never big-bang.

**Phase 4 — hygiene (opportunistic).** Items 10, 11, 13, 20: Hermes log compaction,
structured pipeline status (YAML frontmatter), archive executed planning docs to
`docs/archive/`, sweep the misc small fixes.

## User actions required (sandbox cannot delete files)

Run on macOS from the repo root: `rm -f .git/index.lock && git gc --prune=now` (item 6,
~150 MB reclaim); `git branch -d master` and prune merged remote agent branches (item 12);
`rm _probe_commit_test.txt coverage.out codexdojo-dashboard.png` (root leftovers); delete
the stray `engines/pixelDojo/games/{04_concurrent_task_queue,15_metrics_collector}/pnpm-workspace.yaml`.
Full history rewrite to purge the 35 MB Go blobs (item 3) is optional; only worth it before
the repo is shared more widely.
