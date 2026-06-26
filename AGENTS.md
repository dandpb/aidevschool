# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-25
**Commit:** 44ec2af
**Branch:** architecture-deepening

## OVERVIEW

`aidevschool/` is the ecosystem umbrella: one learner, one shared curriculum, multiple
agent/app engines. The root is a git repo, but not a single product and has no root package manager
command.

## STRUCTURE

```text
aidevschool/
├── engines/                  # separate engines/apps; each has its own machine surface
│   ├── codexDojo/             # user-facing pnpm dashboard + product-facing ecosystem docs
│   ├── minimaxDojo/           # 14-agent tutoring core and whiteboard model
│   ├── miniMaxEvolutionEngine/ # Claude Code motor: .claude agents/commands/skills
│   └── pixelDojo/             # 8-bit teaching-game engine with Playwright evidence contract (arcadeAcademy merged here 2026-06-21)
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
| Validate the dashboard | `engines/codexDojo/` | Run `pnpm run lint`, `pnpm run test`, `pnpm run build`. |
| Validate the game | `engines/pixelDojo/pixel-quest/` | Run `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run smoke`. |
| Update product-facing contracts | `engines/codexDojo/ecosystem/` | Keep `MANIFEST.md` mapped to concrete files. |
| Work on the tutor core | `engines/minimaxDojo/` | Start with `INDEX.md`, `README.md`, `docs/`, `prompts/`. |
| Run Claude Code orchestration | `engines/miniMaxEvolutionEngine/` | Local `CLAUDE.md` defines agents, commands, and the 5-phase loop. |
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
- Treat `engines/codexDojo/` and `engines/pixelDojo/pixel-quest/` as the runnable apps;
  `engines/minimaxDojo/` is the deeper tutoring core.
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
# User-facing dashboard
cd engines/codexDojo
pnpm run lint
pnpm run test
pnpm run build
```

```bash
# Teaching game
cd engines/pixelDojo/pixel-quest
pnpm run lint
pnpm run test
pnpm run build
pnpm run smoke
```

```bash
# Learner substrate
python3 -m learner.substrate
python3 -m unittest discover -s learner/substrate/tests
```

```bash
# Node implementation for Project 01
cd curriculum/01_rate_limiter/node-impl
npm run lint
npm run test
npm run build
```

```bash
# Go implementation for Project 01
cd curriculum/01_rate_limiter/go-impl
go test -race -cover ./...
```

```bash
# Rust implementation for Project 01
cd curriculum/01_rate_limiter/rust-impl
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## NOTES

- Broad scans should exclude `.opencode/node_modules`, `engines/*/node_modules`,
  `engines/*/dist`, `curriculum/**/node_modules`, `curriculum/**/target`, and coverage output.
- LSP is available for TS/Python/Go/Rust in the current harness. Codegraph tools may not be exposed;
  `.codegraph` and `graphify-out/` are generated references, not source.
- `engines/polyglotEvolutionArena/` was demoted to `docs/design/polyglot-arena/` on 2026-06-21 (proposal-only material); the loop itself lives in `engines/miniMaxEvolutionEngine/`.
- `learn/` currently has placeholder directories but no active files.

## Tooling root convention

- `.mavis/` is the canonical derived runtime view; `learner/substrate/` regenerates it.
- `.codex/`, `.omo/`, `.opencode/`, `.playwright-mcp/`, `.serena/`, `.commandcode/`, and `.compozy/` are
  platform/session state unless a tracked file says otherwise.
- Durable shared state belongs in `.mavis/`, `learner/`, or `curriculum/`. Codex-specific runbooks
  belong in `.codex/napkin.md` or the global `napkin` skill. Document new `.X/` roots here first.
