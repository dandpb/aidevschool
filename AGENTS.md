# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-05
**Commit:** d7e0992
**Branch:** main

## OVERVIEW

`aidevschool/` is the ecosystem umbrella: one learner, one shared curriculum, multiple
agent/app engines. The root is a git repo, not a single product: app workflows stay engine-local,
while repo-root `make` targets cover the shared Python suites.

## STRUCTURE

```text
aidevschool/
├── engines/                  # separate engines/apps; each has its own machine surface
│   ├── codexDojo/             # user-facing pnpm dashboard + product-facing ecosystem docs
│   ├── minimaxDojo/           # 14-agent tutoring core and whiteboard model
│   ├── miniMaxEvolutionEngine/ # Claude Code motor: .claude agents/commands/skills
│   ├── openclaw/              # file-based continuous runner + Hermes event bus tracer bullet
│   ├── pixelDojo/             # 8-bit teaching-game engine with Playwright evidence contract (arcadeAcademy merged here 2026-06-21)
│   └── voxelDojo/             # 3D teaching-simulation engine (Three.js); pilot game-10-hash-ring (consistent hashing)
├── docs/design/polyglot-arena/ # demoted design archive (proposal-stage; was engines/polyglotEvolutionArena/)
├── curriculum/                # shared coding challenges and executable evidence
├── learner/                   # shared learner state, profile, pitfalls, journal, pipeline
├── docs/                      # ecosystem prompts, ideas, and design reference material
├── learn/                     # placeholder learning-workspace shell; no active files yet
└── .mavis/ .codex/ .omo/ .opencode/ .playwright-mcp/ .serena/ .compozy/ # platform/tool state
```

Compatibility symlinks at root: `projects -> curriculum`, `.agora -> learner`,
`project_proposal.md -> curriculum/catalog.md`, and `learning_journal.md -> learner/journal.md`.
`.codegraph` points at OMO's generated codegraph cache; `graphify-out/` is derived output.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Get repo-wide orientation | `docs/handbook/README.md` | Read this first for architecture, onboarding, per-engine refs, substrate, and glossary. |
| Share a mixed-audience overview | `docs/AI_DevSchool_Overview.docx` | Standalone ecosystem overview for handoffs or non-implementers. |
| Run shared Python verification | `Makefile`, `pyproject.toml` | Use repo-root `make install`, `make test`, `make test-core`, and `make test-substrate`. |
| Validate the dashboard | `engines/codexDojo/` | Run `pnpm run lint`, `pnpm run test`, `pnpm run build`. |
| Validate the game | `engines/pixelDojo/pixel-quest/` | Run `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run smoke`. |
| Validate the 3D game | `engines/voxelDojo/game-10-hash-ring/` | Run `pnpm run test`, `pnpm run typecheck`, `pnpm run build`, `pnpm run smoke`. Engine rules: `engines/voxelDojo/AGENTS.md`; cross-engine contract: `docs/design/teaching-game-contract.md`. |
| Update product-facing contracts | `engines/codexDojo/ecosystem/` | Keep `MANIFEST.md` mapped to concrete files. |
| Work on the tutor core | `engines/minimaxDojo/` | Start with `INDEX.md`, `README.md`, `docs/`, `prompts/`, then `core/` and `tests/` for the Python reference implementation and contract tests. |
| Run Claude Code orchestration | `engines/miniMaxEvolutionEngine/` | Start with `README.md` and `CLAUDE.md`; SessionStart injects pipeline + gate state via `.claude/hooks/briefing.sh`. |
| Run the continuous runner tracer bullet | `engines/openclaw/` | Start with `AGENTS.md`, then `__main__.py`, `runner/scheduler.py`, and `tests/`. |
| Change learner state | `learner/` | Shared source of truth for gates, profile, pitfalls, journal, pipeline. |
| Change learner-state adapters | `learner/substrate/` | Edit canonical YAML first, then run `python3 -m learner.substrate`. |
| Change project evidence | `curriculum/` | Shared challenge specs, implementations, reviews, benchmarks. |
| Update idea/prompt source | `docs/PROMPTS/-01_GOAL.md`, `docs/PROMPTS/00_IDEIAS.md` | Goal and seed ideas. |
| Read the polyglot-arena design | `docs/design/polyglot-arena/` | Demoted from `engines/polyglotEvolutionArena/`; proposal-stage. |

## CODE MAP

| Symbol / Surface | Type | Location | Refs | Role |
| --- | --- | --- | --- | --- |
| `mountCodexDojo` | Function | `engines/codexDojo/src/app.ts:13` | 8 | Dashboard mount, event dispatch, app-shell render loop. |
| `buildInitialState`, `reduceState` | Functions | `engines/codexDojo/src/state.ts:31`, `:47` | LSP outline | Pure dashboard state seam. |
| `PixelQuestApp` | Class | `engines/pixelDojo/pixel-quest/src/app/PixelQuestApp.ts:37` | 3 | Browser game coordinator for input, world state, encounters, evidence. |
| `RingScene` | Class | `engines/voxelDojo/game-10-hash-ring/src/scene/ringScene.ts:22` | 1 | Three.js projection for the HASH RING pilot. |
| `learner.substrate.validate` | Function | `learner/substrate/__init__.py:53` | LSP outline | Canonical learner-state invariant gate. |
| `learner.substrate.sync` | Function | `learner/substrate/__init__.py:194` | CLI | Regenerates `.mavis/`, minimax whiteboard, dashboard snapshot, and pixel review slice. |
| `engines/minimaxDojo/config/learner.yaml` | Config seam | `engines/minimaxDojo/config/learner.yaml` | n/a | Single source for tutor-core numeric thresholds. |

## CONVENTIONS

- **One learner, one curriculum, many engines.** Do not duplicate `curriculum/` or `learner/`
  inside an engine; engines use symlinks or root-relative paths to the shared substrate.
- Learning progress is file-based and auditable: Markdown, YAML, and NDJSON.
- A learner attempt plus executable evaluation must happen before AI work is marked `mastered`.
- A producer does not verify its own work. Keep producer and verifier contexts separate.
- When changing prompts, roadmap, gates, memory contracts, or deliverable coverage, update
  `engines/codexDojo/ecosystem/MANIFEST.md` in the same change.
- Repo-root `make` targets are only for the shared Python surfaces (`minimaxDojo`, `openclaw`,
  and `learner/substrate`); do not treat them as a catch-all repo build.
- Treat `engines/codexDojo/` and `engines/pixelDojo/pixel-quest/` as the runnable apps;
  `engines/minimaxDojo/` is the deeper tutoring core, and `engines/openclaw/` is the file-based
  continuous runner.
- Numeric tutor thresholds live in `engines/minimaxDojo/config/learner.yaml`; prompts/docs use the
  `⟨config: path⟩` marker instead of hardcoding values.
- In Codex shell sessions, prefix commands with `rtk`; for library/framework/SDK docs lookup, use
  the `ctx7` CLI before answering.

## ANTI-PATTERNS

- Do not treat the root as a single Node/Rust/Go project.
- Do not claim mastery, parity, benchmark superiority, or robustness without executable evidence.
- Do not bypass the learning gate because implementation files already exist.
- Do not merge `codexDojo` and `minimaxDojo`; they are separate layers of the same ecosystem.
- Do not scan or edit generated dependency/build output as source.

## COMMANDS

```bash
# Dashboard
cd engines/codexDojo && pnpm install && pnpm run lint && pnpm run test && pnpm run build

# 2D teaching game
cd engines/pixelDojo/pixel-quest && pnpm install && pnpm run lint && pnpm run test && pnpm run build && pnpm run smoke

# 3D teaching game
cd engines/voxelDojo/game-10-hash-ring && pnpm install && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke

# Shared Python suites
make install && make test && make test-core && make test-substrate

# OpenClaw and learner substrate
python3 -m engines.openclaw --project 01_rate_limiter --mode simulate
python3 -m pytest engines/openclaw/tests/
python3 -m learner.substrate
python3 -m unittest discover -s learner/substrate/tests

# Project 01 polyglot reference
cd curriculum/01_rate_limiter/node-impl && npm run lint && npm run test && npm run build
cd curriculum/01_rate_limiter/go-impl && go test -race -cover ./...
cd curriculum/01_rate_limiter/rust-impl && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

```text
# Claude Code motor
Open Claude Code rooted at engines/miniMaxEvolutionEngine/
/devschool-status
/devschool-diagnose
/devschool-cycle
/devschool-evolve
/devschool-trail
```

## NOTES

- Broad scans should exclude `node_modules/`, `.opencode/node_modules`, `dist/`, `target/`,
  coverage output, `.codegraph/`, and `graphify-out/`.
- Use LSP/codegraph when exposed; `.codegraph` and `graphify-out/` are generated references, not source.
- `engines/polyglotEvolutionArena/` was demoted to `docs/design/polyglot-arena/` on 2026-06-21 (proposal-only material); the loop itself lives in `engines/miniMaxEvolutionEngine/`.
- `learn/` currently has placeholder directories but no active files.

## Tooling root convention

- `.mavis/` is the canonical derived runtime view; `learner/substrate/` regenerates it.
- `.loops/` stores append-only loop memory; read a loop's `memory.md` before rerunning it.
- `.codex/`, `.omo/`, `.opencode/`, `.playwright-mcp/`, `.serena/`, `.commandcode/`, and `.compozy/` are
  platform/session state unless a tracked file says otherwise.
- Durable shared state belongs in `.mavis/`, `learner/`, or `curriculum/`. Codex-specific runbooks
  belong in `.codex/napkin.md` or the global `napkin` skill. Document new `.X/` roots here first.
