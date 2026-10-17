import { describe, expect, it } from "vitest";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { UnmigratableProgressError, migrateProgress } from "../../src/domain/migration";
import { createInitialProgress } from "../../src/domain/progress";

/**
 * AID-3888 (P3 + errata `25b51990`): schema futuro e forma do protótipo B
 * são rejeitados com reason TIPODO — o chamador bloqueia preservando o dado
 * bruto. Nenhum caminho descarta/reseta/sobrescreve.
 */
describe("AID-3888 — rejeição tipada de schemas não adotados (P3)", () => {
  it("schemaVersion 5 (forma do protótipo B, xpAwards in-record) → prototype-schema-5", () => {
    const progress = createInitialProgress(modules, contentVersion);
    try {
      migrateProgress({ ...progress, schemaVersion: 5, xpAwards: {} }, contentVersion);
      expect.unreachable("deve rejeitar");
    } catch (error) {
      expect(error).toBeInstanceOf(UnmigratableProgressError);
      expect((error as UnmigratableProgressError).reason).toBe("prototype-schema-5");
    }
  });

  it("schemaVersion 6 (futuro genuíno) → future-schema", () => {
    const progress = createInitialProgress(modules, contentVersion);
    try {
      migrateProgress({ ...progress, schemaVersion: 6 }, contentVersion);
      expect.unreachable("deve rejeitar");
    } catch (error) {
      expect(error).toBeInstanceOf(UnmigratableProgressError);
      expect((error as UnmigratableProgressError).reason).toBe("future-schema");
    }
  });

  it("lixo persistido → corrupt (tipado, sem fallback silencioso)", () => {
    for (const junk of [null, "texto", 42, { schemaVersion: 1 }]) {
      try {
        migrateProgress(junk, contentVersion);
        expect.unreachable("deve rejeitar");
      } catch (error) {
        expect(error).toBeInstanceOf(UnmigratableProgressError);
        expect((error as UnmigratableProgressError).reason).toBe("corrupt");
      }
    }
  });

  it("schemas 1–4 continuam migráveis (cadeia forward-only intacta)", () => {
    const progress = createInitialProgress(modules, contentVersion);
    for (const version of [1, 2, 3, 4]) {
      expect(() =>
        migrateProgress({ ...progress, schemaVersion: version }, contentVersion),
      ).not.toThrow();
    }
  });
});
