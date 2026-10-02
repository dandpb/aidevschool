import { describe, expect, it } from "vitest";
import {
  PUBLIC_JOURNEY,
  getCompetency,
  hasCompetencyEntry,
  listModules,
} from "../../src/adapters/generatedContentRepository";
import { competencyGlossary, competencyLessons } from "../../src/data/generated/competency-map";
import { lessons } from "../../src/data/generated/lessons";
import { makeServices } from "../helpers";

/**
 * Contrato AID-3514 §7.1 (Fase 2) sobre o corpus live: fidelidade do mapa,
 * distinção não-mapeada × ausente, jornada (PUBLIC_JOURNEY no consumidor)
 * e leitura sem mutação de progresso/evidência.
 */

const glossaryIds = new Set(competencyGlossary.map((entry) => entry.id));

describe("getCompetency/hasCompetencyEntry — corpus live (§7.1)", () => {
  it("toda lição ready (duas jornadas) tem entrada no mapa", () => {
    expect(competencyLessons).toHaveLength(lessons.length);
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    for (const entry of competencyLessons) {
      expect(lessonIds.has(entry.lessonId)).toBe(true);
      expect(hasCompetencyEntry(entry.lessonId)).toBe(true);
    }
  });

  it("mapeamento tem shape do contrato: primary no glossário, supporting sem duplicatas", () => {
    for (const entry of competencyLessons) {
      const mapping = getCompetency(entry.lessonId);
      expect(mapping).not.toBeNull();
      expect(mapping !== null && glossaryIds.has(mapping.primary)).toBe(true);
      const supporting = mapping?.supporting ?? [];
      expect(new Set(supporting).size).toBe(supporting.length);
      for (const id of supporting) {
        expect(glossaryIds.has(id)).toBe(true);
      }
    }
  });

  it("leitura devolve o objeto exato do mapa, sem mutação em chamadas repetidas", () => {
    for (const entry of competencyLessons) {
      expect(getCompetency(entry.lessonId)).toEqual(entry.mapping);
      expect(getCompetency(entry.lessonId)).toEqual(getCompetency(entry.lessonId));
    }
  });

  it("§7.1(2)/(3): id ausente/planned colapsa em null E hasCompetencyEntry false", () => {
    expect(getCompetency("lição-inexistente")).toBeNull();
    expect(hasCompetencyEntry("lição-inexistente")).toBe(false);
    expect(getCompetency("l99-planned-futuro")).toBeNull();
    expect(hasCompetencyEntry("l99-planned-futuro")).toBe(false);
  });

  it("§7.1(4): mapa compila as duas jornadas; listModules continua só ia_pratica (R6)", () => {
    const journeys = new Set(competencyLessons.map((entry) => entry.journey));
    expect(journeys.has("dev")).toBe(true);
    expect(journeys.has("ia_pratica")).toBe(true);
    for (const module of listModules()) {
      expect(module.journey).toBe(PUBLIC_JOURNEY);
    }
  });

  it("ler competências não muta progresso nem emite evidência (leitura pura)", async () => {
    const { services, progressRepo, initial } = makeServices();
    for (const entry of competencyLessons) {
      services.content.getCompetency(entry.lessonId);
      services.content.hasCompetencyEntry(entry.lessonId);
    }
    expect(await progressRepo.load()).toEqual(initial);
    expect(services.evidence.records).toHaveLength(0);
  });
});
