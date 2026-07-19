import type { CatalogLessonEntry, ModuleDefinition } from "../data/generated/lessons";

/** Helpers de domínio sobre o read model gerado (módulos e lições do catálogo). */

export function orderedLessonEntries(modules: ModuleDefinition[]): CatalogLessonEntry[] {
  return [...modules].sort((a, b) => a.order - b.order).flatMap((module) => module.lessons);
}

export function readyLessonEntries(modules: ModuleDefinition[]): CatalogLessonEntry[] {
  return [...modules]
    .sort((a, b) => a.order - b.order)
    .flatMap((module) => module.lessons)
    .filter((entry) => entry.hasContent);
}

export function findLessonEntry(
  modules: ModuleDefinition[],
  lessonId: string,
): CatalogLessonEntry | undefined {
  return modules.flatMap((module) => module.lessons).find((entry) => entry.id === lessonId);
}

export function findModule(
  modules: ModuleDefinition[],
  moduleId: string,
): ModuleDefinition | undefined {
  return modules.find((module) => module.id === moduleId);
}

/** Próxima lição com conteúdo na ordem do catálogo (independe de pré-requisitos planned). */
export function nextReadyLessonId(
  modules: ModuleDefinition[],
  lessonId: string,
): string | undefined {
  const ready = readyLessonEntries(modules);
  const index = ready.findIndex((entry) => entry.id === lessonId);
  if (index < 0) return undefined;
  return ready[index + 1]?.id;
}
