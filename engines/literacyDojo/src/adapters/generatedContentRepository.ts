import {
  type CompetencyMapping,
  competencyLessons,
  competencyMapVersion,
} from "../data/generated/competency-map";
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
 *
 * Competências (AID-3514, Fase 2): leitura opcional do mapa separado
 * (src/data/generated/competency-map.ts), sem alterar progresso e sem
 * sincronia entre engines (contrato §7.1 — docs/curriculum/
 * competency-read-contract.md).
 */

/** Jornada do percurso público default do app standalone (public promise da vila). */
export const PUBLIC_JOURNEY = "ia_pratica" as const;

/**
 * §7.1(1): versão de mapa desconhecida falha fechado NO LOAD — nunca
 * «melhor esforço», nunca fallback silencioso a undefined geral.
 */
const SUPPORTED_MAP_VERSION = 1;
if (competencyMapVersion !== SUPPORTED_MAP_VERSION) {
  throw new Error(
    `competency-map: mapVersion ${competencyMapVersion} não suportada ` +
      `(suportada: ${SUPPORTED_MAP_VERSION}); regenere o read model (gen:content).`,
  );
}

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

/**
 * §7.1(2), colapsada: `null` ≡ «não mapeada» — cobre `mapping: null` do
 * mapa e o `undefined` legado (sem mapa importado / sem entrada). Estado
 * legítimo, nunca erro; nunca infere `primary`; nunca lança.
 */
export function getCompetency(lessonId: string): CompetencyMapping | null {
  const entry = competencyLessons.find((item) => item.lessonId === lessonId);
  return entry ? entry.mapping : null; // sem entrada colapsa em null (§7.1(2))
}

/**
 * §7.1(3): distingue «não mapeada» (entrada com mapping null) de
 * fora-do-universo (planned/ausente do mapa) — para decisão de render na
 * Fase 3 (dono UX). Não é gate de visibilidade (§4.5).
 */
export function hasCompetencyEntry(lessonId: string): boolean {
  return competencyLessons.some((item) => item.lessonId === lessonId);
}
