# 03 — Add or edit lesson content

**Trigger:** adding a module/lesson/exercise, or changing narratives, tips, or XP rewards.

Curriculum **content** lives in `src/lib/curriculum-data.ts`; grading **logic** lives in `src/lib/grader.ts`. This split is deliberate (see [curriculum-data-grader-split](../notes/implemented/architecture/2026-08-18-curriculum-data-grader-split.md)) — content edits should never touch the grader, and vice versa.

## Steps

1. Edit `CURRICULUM` in `src/lib/curriculum-data.ts`. Exercise `items` are `string[]` end to end; only swipe exercises carry `SwipeItem[]` (see [unify-exercise-items-shape](../notes/implemented/architecture/2026-08-18-unify-exercise-items-shape.md)). Never reintroduce `items_order`.
2. Re-seed the dev database (seed wipes and recreates curriculum rows, preserving learners/progress):
   ```bash
   export DATABASE_URL="file:$(pwd)/db/custom.db"
   bun prisma/seed.ts
   ```
3. Run the integrity guard:
   ```bash
   npx vitest run tests/unit/curriculum-integrity.test.ts
   ```
4. Smoke-test in the browser: the new lesson must unlock per the rules in `src/lib/lesson-unlock.ts` (module 0 always open; module *i* needs all of module *i−1*; lesson *j* needs lesson *j−1*).

## Verification

- Seed prints a `✓ Módulo:` line per module with the expected lesson counts.
- `curriculum-integrity` tests pass; full suite stays green ([verify before done](02-verify-before-done.md)).

## Pitfalls

- Exercise JSON is stored serialized in `Lesson.exercises`; parsing/normalization happens in the store (`parseExercises`/`buildActiveLesson`), not per component.
- Do not create a barrel that re-exports grader + curriculum-data together; the split exists to keep two reasons-to-change apart.
- Unlock rules are single-sourced in `lesson-unlock.ts` — never re-derive them in a component.

## Sources

- [curriculum-data-grader-split](../notes/implemented/architecture/2026-08-18-curriculum-data-grader-split.md)
- [unify-exercise-items-shape](../notes/implemented/architecture/2026-08-18-unify-exercise-items-shape.md)
- [single-lesson-unlock-source](../notes/implemented/simplification/2026-08-19-single-lesson-unlock-source.md)
