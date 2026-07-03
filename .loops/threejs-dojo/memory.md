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
