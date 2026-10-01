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
import type { JourneyId } from "../domain/journeyProgress";

/**
 * Read model de conteúdo do MVP: lê somente o read model gerado
 * (src/data/generated/lessons.ts — DO NOT EDIT BY HAND). Funções puras,
 * sem classe nem interface — a porta ContentRepository em ports.ts é
 * o tipo estrutural que os consumidores usam.
 *
 * O read model compila as duas jornadas (ia_pratica e dev). O percurso
 * público default continua `ia_pratica` (chamada sem argumento — conquistas,
 * checkpoints e consumidores legados); a jornada Dev entra na navegação do
 * app standalone SOMENTE pela escolha explícita do aprendiz (AID-3584),
 * via `listModules("dev")`. Missões hospedadas do OS continuam podendo
 * servir lições dev por `getLesson` (ver content-contract.md).
 */

/** Jornada do percurso público default do app standalone (public promise da vila). */
export const PUBLIC_JOURNEY = "ia_pratica" as const;

export function getTrack(): Track {
  return track;
}

export function listModules(journey?: JourneyId): ModuleDefinition[] {
  const target = journey ?? PUBLIC_JOURNEY;
  return [...modules]
    .filter((module) => module.journey === target)
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
