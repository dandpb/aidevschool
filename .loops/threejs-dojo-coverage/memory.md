# Loop Memory — `threejs-dojo-coverage`

> Append-only run log for the `/threejs-dojo-coverage` batch loop. Read this
> file first on every new batch; the previous lessons shape parallelism
> decisions, shape bias, and preflight tightening.

## Schema

Each entry uses this shape (see SKILL.md §"Output & Memory"):

```markdown
## Batch <ISO-8601 timestamp> — run-id <run-id>
- mode: ON | OFF
- scope: 18 slugs (01_rate_limiter … 18_search_engine); shape distribution <N>B / <M>A / <K>accept
- concurrency: <cap actually used>
- skipped: <slugs that hit the accept-only path>
- rerun: <slugs whose worker crashed or needed a re-dispatch>
- per-slug scores: <comma-separated slug:score pairs>
- coverage: <closed>/18 — <PASS|PARTIAL> — <one-line reason>
- verification: <score>/10 — <PASS|FAIL> — <one-line reason>
- output: <path to this run's deliverable>
- lessons:
  - <parallelism lesson>
  - <shape lesson>
  - <failure cluster lesson>
```

---

## Batch 2026-07-05T19:34:59-03:00 — run-id bootstrap
- mode: ON
- inputs: (skill bootstrap run; no batch executed yet)
- skipped: none
- rerun: none
- verification: n/a — bootstrap run, no batch artifact yet
- output: `.claude/skills/threejs-dojo-coverage/SKILL.md` created
- lessons:
  1. **Scope per batch = 18 slugs** (full catalog sweep). The per-concept
     `/threejs-dojo` loop remains the unit of work; this loop is the
     fan-out + coverage gate around it.
  2. **Shape bias = B.** This is the parallelism enabler: each Shape B app
     lives in its own `engines/pixelDojo/games/<NN>_<slug>/` directory with
     its own `node_modules`, Vite port, Biome/tsc state, Playwright smoke.
     18 Shape B workers in parallel = no working-tree contention.
  3. **Shape A is allowed but serialized.** If a slug's pedagogical fit
     demands Shape A (e.g. 01_rate_limiter's existing Agent Quest lab),
     that one worker runs alone while the other 17 wait. Shape A workers
     share `pixel-quest/src/` and cannot run in parallel safely.
  4. **Best-effort on per-slug fail.** Inner `/threejs-dojo` retry cap is 3
     (inherited). On exhaustion, the orchestrator records FAIL with
     `retry_target` and continues the batch. The batch verifier judges
     `closed == 18`; partial coverage exits with the gap list, not a fake
     PASS.
  5. **First batch will validate the design.** Watch for: per-slug port
     collisions across Shape B apps (Vite's default port assignment can
     collide on rapid spin-up), `pnpm install` contention when many Shape B
     workers hit `node_modules` simultaneously, and the orchestrator's
     `mavis communication send` payload size (18 manifests × per-slug brief
     can balloon). Mitigation candidates per observation will land in the
     next batch's lessons.
  6. **Next:** invoke `/threejs-dojo-coverage` to run the first batch.
     Memory file will be re-read at the top of every subsequent batch.