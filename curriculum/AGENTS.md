# CURRICULUM

## OVERVIEW

`curriculum/` is the shared challenge and evidence substrate. The numbered projects are used by
all engines; they are not owned by a single app.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Project catalog | `catalog.md` | Canonical list for the 18-project progression. |
| Numbered projects | `01_rate_limiter/` through `18_search_engine/` | Each owns its docs and language implementations. |
| Active/gate reference | `01_rate_limiter/` | Most complete project-local contract and benchmark evidence. |
| Project spec | `*/docs/spec.md` | Behavior contract before implementation details. |
| Learner diagnostic | `*/docs/diagnostic.md` | Gate-facing learner artifact when present. |
| Node implementations | `*/node-impl/package.json` | **Default track** for the learning gate. Scripts differ; read the local package before running. |
| Go / Rust pilot | `01_rate_limiter/{go,rust}-impl/` | Only project that keeps full polyglot + Dockerfiles. Others are node-only until regenerated on demand. |
| Reviews/benchmarks | `*/docs/`, `*/docs/benchmark_results.md` | Narrative evidence; raw `benchmarks/results*` dumps are gitignored. |

## CONVENTIONS

- Keep challenge specs language-neutral before implementation-specific notes.
- Each implementation directory owns its own build/test commands.
- Most Node tracks use Vitest; `10_distributed_cache` runs built JS with `node --test`, and
  `16_mini_message_queue` / `17_distributed_config_service` use Jest.
- Generated outputs are evidence only when intentionally recorded; otherwise treat them as scan noise.
- If the learning gate is blocked, do not fill in learner-facing implementation work until the
  learner attempt has been evaluated.
- When adding a new project, add it to `catalog.md` and map product-facing deliverables through
  `../engines/codexDojo/ecosystem/MANIFEST.md` if the ecosystem contract changes.

## ANTI-PATTERNS

- Do not make a project depend on engine-local learner state.
- Do not compare languages by preference; use tests, review findings, benchmarks, and caveats.
- Do not scan `node_modules`, `dist`, `coverage`, `target`, or generated benchmark result folders
  as if they were source.
- Do not assume Project 01 command strings apply to every later project; inspect the local
  `package.json`, `go.mod`, or `Cargo.toml` first.

## Polyglot policy (ponytail 2026-07-19)

- **Node-first gate:** only `node-impl/` is required for scaffold/backlog checks.
- **Pilot:** `01_rate_limiter` keeps go-impl + rust-impl + Dockerfiles as the polyglot reference.
- Regenerate go/rust on demand via `/devschool-implement --polyglot` or on project `01`; do not re-seed 02–18 empty tracks.

## Install / lockfile policy

- Curriculum `node-impl/` **does not** commit `package-lock.json` (gitignored).
- Install with `npm install` (or `pnpm install`) from the local `package.json` before running tests.
- CI and local scripts must not assume a lockfile under `curriculum/**/node-impl/`.
- Shared logger: `curriculum/_shared/log.ts`, linked as `node-impl/src/logger.ts` per project that logs.
