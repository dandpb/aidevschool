# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-06  
**Commit:** n/a - workspace root is not a git repo  
**Branch:** n/a

## OVERVIEW

`aidevschool/` is the ecosystem umbrella: one learner, one shared curriculum, multiple
agent/app engines. The root is not a single product and does not have a root package manager command.

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
└── .mavis/ .opencode/ .Codex/ .playwright-mcp/ # platform tooling
```

Compatibility symlinks at root: `projects -> curriculum`, `.agora -> learner`,
`project_proposal.md -> curriculum/catalog.md`, and `learning_journal.md -> learner/journal.md`.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Validate the app | `engines/codexDojo/` | Run `pnpm run lint`, `pnpm run test`, `pnpm run build`. |
| Update product-facing contracts | `engines/codexDojo/ecosystem/` | Keep `MANIFEST.md` mapped to concrete files. |
| Work on the tutor core | `engines/minimaxDojo/` | Start with `INDEX.md`, `README.md`, `docs/`, `prompts/`. |
| Run Claude Code orchestration | `engines/miniMaxEvolutionEngine/` | Local `CLAUDE.md` defines agents, commands, and the 5-phase loop. |
| Change learner state | `learner/` | Shared source of truth for gates, profile, pitfalls, journal, pipeline. |
| Change project evidence | `curriculum/` | Shared challenge specs, implementations, reviews, benchmarks. |
| Update idea/prompt source | `docs/PROMPTS/-01_GOAL.md`, `docs/PROMPTS/00_IDEIAS.md` | Goal and seed ideas. |
| Read the polyglot-arena design | `docs/design/polyglot-arena/` | Demoted from `engines/polyglotEvolutionArena/`; proposal-stage. |

## CONVENTIONS

- **One learner, one curriculum, many engines.** Do not duplicate `curriculum/` or `learner/`
  inside an engine; engines use symlinks or root-relative paths to the shared substrate.
- Learning progress is file-based and auditable: Markdown, YAML, and NDJSON.
- A learner attempt plus executable evaluation must happen before AI work is marked `mastered`.
- A producer does not verify its own work. Keep producer and verifier contexts separate.
- When changing prompts, roadmap, gates, memory contracts, or deliverable coverage, update
  `engines/codexDojo/ecosystem/MANIFEST.md` in the same change.
- Treat `engines/codexDojo/` as the runnable app and `engines/minimaxDojo/` as the deeper tutoring core.

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
- LSP may not be available in this workspace; fall back to config files, source maps, and tests.
- `engines/polyglotEvolutionArena/` was demoted to `docs/design/polyglot-arena/` on 2026-06-21 (proposal-only material); the loop itself lives in `engines/miniMaxEvolutionEngine/`.
- `learn/` currently has placeholder directories but no active files.

## Tooling root convention (added 2026-06-21)

The repo root carries several `.X/` folders that come from agent/editor platforms. Only **one**
is a canonical derived view; the rest are platform-specific session state:

| Folder | Origin | Status | Convention |
| --- | --- | --- | --- |
| `.mavis/` | Mavis (MiniMax Agent Team runtime) | **Canonical derived view** | `learning_state.yaml` is regenerated by `learner/substrate/`. Plans live here. Source of truth for runtime. |
| `.codex/` | Codex CLI | Platform state | `napkin.md` is a Codex-specific runbook, not portable. Kept for history; new content goes to `.mavis/` or to the global `napkin` skill. |
| `.omo/` | OpenCode/omo agent | Platform state | `evidence/` carries curated QA artifacts (kept); `boulder.json` + `run-continuation/` are runtime session JSON, gitignored from 2026-06-21. |
| `.opencode/` | OpenCode CLI | Tool cache | `node_modules/`, `package-lock.json`, `tmp/` are gitignored. Not source. |
| `.playwright-mcp/` | Playwright MCP output | Tool output | Snapshot of rendered pages; useful for audit but not source. Most files are gitignored from 2026-06-21; a few historical `.yml` files remain tracked. |

**Rule for new agents:** when you need to write state that survives across sessions and engines,
write to `.mavis/` (regenerated by substrate) or to `learner/`/`curriculum/` (canonical). When
you need a *platform-specific* runbook, write to `.codex/napkin.md` (if you're Codex) or use
the `napkin` skill (which writes to `.claude/napkin.md`). Don't add new `.X/` folders without
documenting them here first.
