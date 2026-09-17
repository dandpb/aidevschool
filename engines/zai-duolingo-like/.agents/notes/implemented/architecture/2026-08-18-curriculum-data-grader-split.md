# Agent Note: Curriculum data split from the grader

Status: implemented

> Shipped 2026-08-18. `src/lib/curriculum.ts` (1,657 lines) no longer exists. The exercise types + `gradeExercise` live in `src/lib/grader.ts` (pure logic, 111 lines); `LessonData`/`ModuleData`/`CURRICULUM` live in `src/lib/curriculum-data.ts` (~1,550 lines of content, importing types from the grader). Importers updated to the module matching what they consume: `prisma/seed.ts`, `tests/helpers.ts` → curriculum-data; `src/lib/lesson-completion.ts`, `tests/unit/grading.test.ts` → grader; `tests/unit/curriculum-integrity.test.ts` → both. All 25 tests in the affected suites green.

## Problem

A deep, well-tested grader (exercise + answer → boolean) was trapped inside ~1,500 lines of lesson content: every content edit recompiled the grader's importers, every grader test parsed the full 94KB curriculum, and the integrity test coupled data validation to grading behavior. One file had two reasons to change.

## Consequences

- Content edits can't touch grading logic; grader changes can't touch content.
- Import rule going forward: game logic imports from `@/lib/grader`; seeding/content-serving imports from `@/lib/curriculum-data`. No barrel re-unifying them — a re-export barrel would be a shallow pass-through that recreates the coupling.
