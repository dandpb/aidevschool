import { describe, expect, it, vi } from "vitest";

/**
 * §7.1(1): versão de mapa desconhecida falha fechado NO LOAD do adaptador —
 * nunca «melhor esforço», nunca fallback silencioso. O mapa real pinado pelo
 * gerador é sempre a versão suportada, então o negativo exige mapa mockado.
 */
vi.mock("../../src/data/generated/competency-map", () => ({
  competencyMapVersion: 99,
  competencyMapContentVersion: "2099-01-01.0",
  competencyGlossary: [],
  competencyLessons: [],
  carriesAttainment: false,
  producerWritesMastered: false,
}));

describe("guard de competencyMapVersion (fail closed no load)", () => {
  it("importar o adaptador com mapVersion desconhecida lança antes de qualquer leitura", async () => {
    await expect(import("../../src/adapters/generatedContentRepository")).rejects.toThrow(
      /mapVersion 99 não suportada/,
    );
  });
});
