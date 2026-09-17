// Vertical Protocol — lesson unlock rules (pure, server & test friendly)
//
// Single source of truth for "what is playable now". Extracted test-first
// from the two inline copies that drifted in /api/curriculum and
// daily-challenge.ts. Structural typing on purpose: callers pass Prisma
// module/lesson rows (or plain objects in tests) without adaptation.

export interface UnlockLesson {
  readonly id: string;
}

export interface UnlockModule {
  readonly lessons: readonly UnlockLesson[];
}

export function isModuleUnlocked(
  modules: readonly UnlockModule[],
  completedIds: ReadonlySet<string>,
  moduleIdx: number
): boolean {
  if (moduleIdx < 0 || moduleIdx >= modules.length) return false;
  if (moduleIdx === 0) return true;
  return modules[moduleIdx - 1].lessons.every((l) => completedIds.has(l.id));
}

export function isLessonUnlocked(
  modules: readonly UnlockModule[],
  completedIds: ReadonlySet<string>,
  moduleIdx: number,
  lessonIdx: number
): boolean {
  const mod = modules[moduleIdx];
  if (!mod || lessonIdx < 0 || lessonIdx >= mod.lessons.length) return false;
  if (!isModuleUnlocked(modules, completedIds, moduleIdx)) return false;
  if (lessonIdx === 0) return true;
  return completedIds.has(mod.lessons[lessonIdx - 1].id);
}
