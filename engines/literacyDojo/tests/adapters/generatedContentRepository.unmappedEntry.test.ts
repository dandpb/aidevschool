import { describe, expect, it, vi } from "vitest";

/**
 * §7.1(2)/(3) no negativo que o corpus live não cobre (32/32 mapeadas):
 * entrada com `mapping: null` é «não mapeada» (null + entry true), enquanto
 * lição sem entrada é fora-do-universo (null + entry false). Mapa mockado
 * na versão suportada.
 */
vi.mock("../../src/data/generated/competency-map", () => ({
  competencyMapVersion: 1,
  competencyMapContentVersion: "2026-09-10.2",
  competencyGlossary: [
    { id: "F1", domain: "fundamentos", audience: "cotidiano", title: "Entender IA", aliases: [] },
  ],
  competencyLessons: [
    {
      lessonId: "l-mapeada",
      moduleId: "m1",
      journey: "ia_pratica",
      order: 1,
      prerequisites: [],
      mapping: { primary: "F1", supporting: ["F4"] },
    },
    {
      lessonId: "l-nao-mapeada",
      moduleId: "m1",
      journey: "ia_pratica",
      order: 1,
      prerequisites: [],
      mapping: null,
    },
  ],
  carriesAttainment: false,
  producerWritesMastered: false,
}));

describe("não-mapeada (mapping null) × ausente do mapa (§7.1(2)/(3))", () => {
  it("entrada com mapping null: getCompetency null E hasCompetencyEntry true", async () => {
    const adapter = await import("../../src/adapters/generatedContentRepository");
    expect(adapter.getCompetency("l-nao-mapeada")).toBeNull();
    expect(adapter.hasCompetencyEntry("l-nao-mapeada")).toBe(true);
  });

  it("sem entrada: getCompetency null E hasCompetencyEntry false (distinção)", async () => {
    const adapter = await import("../../src/adapters/generatedContentRepository");
    expect(adapter.getCompetency("l-planned-ou-removida")).toBeNull();
    expect(adapter.hasCompetencyEntry("l-planned-ou-removida")).toBe(false);
  });

  it("mapeada: objeto exato, sem inferência", async () => {
    const adapter = await import("../../src/adapters/generatedContentRepository");
    expect(adapter.getCompetency("l-mapeada")).toEqual({
      primary: "F1",
      supporting: ["F4"],
    });
  });
});
