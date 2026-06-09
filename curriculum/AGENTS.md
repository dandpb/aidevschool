# CURRICULUM

## OVERVIEW

`curriculum/` is the shared challenge and evidence substrate. Projects here are used by all
engines; they are not owned by a single app.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Project catalog | `catalog.md` | Root curriculum index and compatibility target. |
| Active project | `01_rate_limiter/` | Current polyglot challenge. |
| Project spec | `*/docs/spec.md` | Behavior contract before implementation details. |
| Learner diagnostic | `*/docs/diagnostic.md` | Gate-facing learner artifact when present. |
| Reviews/benchmarks | `*/docs/`, `*/benchmarks/` | Evidence and comparison material. |

## CONVENTIONS

- Keep challenge specs language-neutral before implementation-specific notes.
- Each implementation directory owns its own build/test commands.
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
