# F2 Code Quality Review

Verdict: REJECT

## Scope Reviewed

TypeScript/source files:

- `engines/codexDojo/src/manifest.test.ts`
- `engines/codexDojo/src/orchestration-links.test.ts`
- `engines/codexDojo/src/domain.ts`
- `engines/codexDojo/src/data/cycle.ts`
- `engines/codexDojo/src/render/overview.ts`
- `engines/codexDojo/src/render.test.ts`

Documentation files:

- `engines/codexDojo/ecosystem/MEMORY_CURATION.md`
- `engines/codexDojo/ecosystem/MEMORY_MODEL.md`
- `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`
- `curriculum/BACKLOG_STATUS.md`
- `engines/polyglotEvolutionArena/STATUS.md`
- `curriculum/10_distributed_cache/docs/status.md`
- `curriculum/10_distributed_cache/docs/multinode_verification.md`

## Findings

### F2-1 — Status vocabulary drift in Project 10 status document

- Severity: blocking
- File: `curriculum/10_distributed_cache/docs/status.md`
- Lines: 6, 19-27
- Issue: the reviewed docs are supposed to use the manifest status vocabulary (`implemented`, `scaffolded`, `planned`, `proposal`, `blocked`). This file introduces separate status words in status-like fields: `cycle-complete`, `Complete`, `Partial`, and `Missing`.
- Why it matters: this weakens the repo convention being added in `BACKLOG_STATUS.md` and `MEMORY_CURATION.md`, and can make Project 10 look more complete than the catalog-backed `planned` state permits.
- Suggested fix: rewrite the phase/acceptance rows using the canonical vocabulary, or rename the column to something non-status like `Coverage` and explicitly keep the project status as `planned` until canonical verification passes.

## Non-blocking Observations

- TypeScript changes are maintainable and convention-aligned: no `as any`, no `@ts-ignore`, no dead helper observed, and type-only imports are used where appropriate.
- Metric rendering is honest: `Metric.measurement` is optional and the overview renders `não medido ainda` rather than invented numbers.
- `MEMORY_CURATION.md` and `OPENCLAW_HERMES_RUNBOOK.md` are careful about automation boundaries and do not claim a deployed event bus or scheduler.
- `curriculum/10_distributed_cache/docs/multinode_verification.md` clearly says the multi-node harness is planned, not implemented.

## Verification

- LSP diagnostics on all reviewed TypeScript files: clean.
- `cd engines/codexDojo && pnpm run lint`: PASS (`biome check src`, 28 files).
- `cd engines/codexDojo && pnpm run test -- --run`: PASS (8 test files, 54 tests).
- `cd engines/codexDojo && pnpm run build`: PASS (`tsc --noEmit && vite build`).

## Final Verdict

REJECT until the Project 10 status vocabulary drift is corrected or clearly separated from the manifest status vocabulary.
