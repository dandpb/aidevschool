# ENGINES

## OVERVIEW

`engines/` contains separate machines for the same school; app code, game code, prompts, and
orchestration live here, while learner state and curriculum evidence stay at the root.

## STRUCTURE

```text
engines/
├── school-entry/          # independent TypeSafe entry + operator release control
├── codexDojo/              # pnpm dashboard + product-facing ecosystem contract
├── codexdojo-os-prototype/ # React/Vite educational OS bounded context
├── literacyDojo/           # npm AI microlearning app; generated content, local progress only
├── dojoToday/              # read-only "lesson for today" for programmers (FSRS/streak/active unit)
├── aiDevschoolMvp/         # SKILL.md chat-tutor MVP; bundled scripts own gates/scoring
├── minimaxDojo/            # 14-agent tutor core, docs, prompts, whiteboard
├── miniMaxEvolutionEngine/ # Claude Code motor with .claude agents/commands/skills
├── miniTown/               # cozy town-sim: level-0 entry surface for the non-technical audience (AD-004)
├── openclaw/               # file-based runner/scheduler tracer bullet
├── pixelDojo/              # 2D teaching-game engine; pixel-quest/ is the runnable app
├── sdlc-quest/             # local-complete SDLC Quest v1.3 teaching-game package (pt-BR, Node ≥22, native modules only; landed 2026-09-17, commit 9f2f487e)
├── shared/                 # cross-engine teaching-evidence primitives
├── voxelDojo/              # catalog of 3D teaching-simulation packages
└── zai-duolingo-like/      # cozy-cyberpunk AI-literacy game "Duolingo de IA" (Next.js + Prisma/SQLite + Zustand; re-added with real content 2026-09-17, commit 9f2f487e)
```

The polyglot evolution arena design material is archived at `docs/design/polyglot-arena/`
(proposal-stage; was `engines/polyglotEvolutionArena/` until 2026-06-21).

`zai-duolingo-like/` history: was a dangling submodule gitlink (no `.gitmodules` entry, no
content), removed by c604d2ec on 2026-09-07, stale references here cleaned 2026-09-16 (AID-2117);
**re-added 2026-09-17 with real engine content** (209 files, commit 9f2f487e, PR #471 merge
3c5629c0) — the "real content" condition of the old note is satisfied per the fresh-context QA
countersign (AID-2281, verdict CONFORME COM RESSALVA 2026-09-17T14:00Z; retrofit-accept ratified
by CEO AID-2282). `sdlc-quest/` (220 files, same commit) is a new engine from the same diff.
Neither engine has by-name CI coverage yet (hardens AID-2286/AID-2287, children of AID-2282).

## WHERE TO LOOK

| Need | Location | Notes |
| --- | --- | --- |
| Dashboard UI or ecosystem manifest | `codexDojo/` | Vite/TypeScript dashboard. |
| Educational OS experience | `codexdojo-os-prototype/` | React/Vite desktop; reads a generated learner snapshot and keeps interactions local. |
| Nontechnical AI microlearning | `literacyDojo/` | Start with local `AGENTS.md` and `README.md`; content is canonical under `curriculum/ai-literacy/`. |
| Teaching game app | `pixelDojo/pixel-quest/` | Vite/TypeScript/Three.js app with Playwright smoke evidence. |
| 3D teaching simulations | `voxelDojo/` | Catalog-wide workspace; `game-10-hash-ring/` is the reference package. |
| Cozy town-sim (level-0 entry) | `miniTown/` | Observational Three.js city sim; start with `README.md`. Never writes canonical learner state. |
| Programmer's daily lesson | `dojoToday/` | Read-only landing: FSRS due reviews, streak, active unit. Read model `src/data/today.ts` is generated (prebuild runs the substrate); never schedules, grades, or marks mastery. |
| AI-literacy chat-tutor MVP | `aiDevschoolMvp/` | SKILL.md-based tutor; bundled scripts own gates/scoring/scheduling; installer tests in `tests/installer` run via repo-root `make test`. |
| Shared teaching evidence | `shared/teaching-evidence/` | Dual-channel producer helpers; no mastery writes. |
| Long-running tutor protocol | `minimaxDojo/` | Start with local `AGENTS.md`, then `INDEX.md`; verify from repo root with `make test-core`. |
| Claude Code orchestration | `miniMaxEvolutionEngine/` | Local `CLAUDE.md` is the engine contract. |
| Continuous runner tracer bullet | `openclaw/` | Python filesystem checklist scheduler; no Hermes bus or semantic verification. |
| Teaching-game engine rules | `pixelDojo/` | Parent rules; app-local rules are in `pixel-quest/AGENTS.md`. |
| SDLC teaching quest (local package) | `sdlc-quest/` | Self-contained pt-BR package: `npm start` serves 127.0.0.1:8080 (no install); `npm test` = `node tools/test.cjs`; gate via `npm run gate`. Start with `README.md`. Manifest `SHA256SUMS.txt` 219/219 OK. |
| AI-literacy cozy game | `zai-duolingo-like/` | Next.js + Prisma (SQLite) + Zustand single-page game; contract in `QWEN.md` (Vertical Protocol); full gate `npm run verify`, E2E `npm run test:e2e` after `npm run build`. |
| 3D engine rules | `voxelDojo/` | Parent rules cover the uniform `game-*` packages. |
| Polyglot arena design (read-only) | `docs/design/polyglot-arena/` | Archived proposal material. |

## CONVENTIONS

- Do not put shared learner or curriculum state under an engine.
- LiteracyDojo may record local `completed`, but never writes canonical learner
  state or declares `mastered`.
- Regenerate the OS learner view through `python3 -m learner.substrate`; do not edit its generated
  `src/data/learner.ts` or write canonical learner state from React.
- Engine-local docs may reference root `learner/`, `curriculum/`, and `docs/`.
- If an engine changes the learning gate, memory contract, roadmap, or prompts, update the
  codexDojo manifest mapping at `codexDojo/ecosystem/MANIFEST.md`.
- Engine-local commands run from the owning engine directory; there is no `engines/` root command.

## ANTI-PATTERNS

- Do not copy `learner/` or `curriculum/` into a new engine.
- Do not assume a command works from `engines/`; commands are engine-local.
- Do not resurrect `polyglotEvolutionArena/` as an engine root — its design material lives at `docs/design/polyglot-arena/` and the loop lives in `miniMaxEvolutionEngine/`.
