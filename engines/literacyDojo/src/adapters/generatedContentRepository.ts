import {
  type LessonDefinition,
  type ModuleDefinition,
  type Track,
  contentVersion,
  lessons,
  modules,
  skills,
  track,
} from "../data/generated/lessons";

/**
 * Read model de conteúdo do MVP: lê somente o read model gerado
 * (src/data/generated/lessons.ts — DO NOT EDIT BY HAND). Funções puras,
 * sem classe nem interface — a porta ContentRepository em ports.ts é
 * o tipo estrutural que os consumidores usam.
 *
 * O read model compila as duas jornadas (ia_pratica e dev) porque as
 * missões hospedadas do OS servem lições dev; o percurso público do app
 * standalone continua sendo só ia_pratica, então listModules filtra aqui.
 */

/** Jornada do percurso público do app standalone (public promise da vila). */
export const PUBLIC_JOURNEY = "ia_pratica" as const;

export function getTrack(): Track {
  return track;
}

export function listModules(): ModuleDefinition[] {
  return [...modules]
    .filter((module) => module.journey === PUBLIC_JOURNEY)
    .sort((a, b) => a.order - b.order);
}

export function getLesson(lessonId: string): LessonDefinition | undefined {
  return lessons.find((lesson) => lesson.id === lessonId);
}

export function getSkillTitle(skillId: string): string {
  return skills.find((skill) => skill.id === skillId)?.title ?? skillId;
}

export function getContentVersion(): string {
  return contentVersion;
}
