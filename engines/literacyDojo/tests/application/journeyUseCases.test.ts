import { describe, expect, it } from "vitest";
import { lessons } from "../../src/data/generated/lessons";
import { activeJourneyOf } from "../../src/domain/journeyProgress";
import {
  type LearnerProgress,
  createInitialProgress,
  earnedAchievementIds,
} from "../../src/domain/progress";
import { parseImportedProgress, serializeProgressForExport } from "../../src/domain/progressBackup";
import { makeServices } from "../helpers";

const devLessonIds = ["l15", "l16", "l17", "l21", "l22", "l23", "l27", "l28", "l29"];

function bestScoresFor(lessonId: string): Record<string, number> {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`lição ausente: ${lessonId}`);
  return Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1]));
}

async function makeDevLearner() {
  const { services, progressRepo } = makeServices();
  const switched = await services.useCases.switchJourney("dev");
  return { services, progressRepo, progress: switched };
}

describe("switchJourney (opt-in AID-3584)", () => {
  it("escolher Dev inicializa somente statuses ausentes e persiste", async () => {
    const { services, progressRepo } = makeServices();
    const before = await progressRepo.load();
    const next = await services.useCases.switchJourney("dev");

    expect(next.journeys?.active).toBe("dev");
    expect(next.lessonStatus.l15).toBe("available");
    for (const id of devLessonIds.slice(1)) {
      expect(next.lessonStatus[id]).toBe("locked");
    }
    // Statuses IA e cursor legado intactos; nada desbloqueado além de l15.
    expect(next.lessonStatus.l01).toBe(before?.lessonStatus.l01);
    expect(next.journeys?.current?.ia_pratica).toBe(before?.currentLessonId);
    expect(await progressRepo.load()).toEqual(next);
  });

  it("é idempotente e nunca sobrescreve status Dev existente", async () => {
    const { services } = makeServices();
    await services.useCases.switchJourney("dev");
    await services.useCases.startLesson("l15");
    const again = await services.useCases.switchJourney("dev");
    expect(again.lessonStatus.l15).toBe("in_progress");
    expect(again.currentLessonId).toBe("l15");
  });

  it("alternar IA/Dev preserva os dois cursores", async () => {
    const { services } = makeServices();
    await services.useCases.switchJourney("dev");
    await services.useCases.startLesson("l15");
    const backToIa = await services.useCases.switchJourney("ia_pratica");
    expect(activeJourneyOf(backToIa)).toBe("ia_pratica");
    expect(backToIa.currentLessonId).not.toBe("l15");
    expect(backToIa.journeys?.current?.dev).toBe("l15");
    const backToDev = await services.useCases.switchJourney("dev");
    expect(backToDev.currentLessonId).toBe("l15");
  });

  it("startLesson em lição Dev locked é negativo (pré-requisito respeitado)", async () => {
    const { services } = makeServices();
    await services.useCases.switchJourney("dev");
    await expect(services.useCases.startLesson("l16")).rejects.toThrow(/bloqueada/i);
  });

  it("campo journeys inválido no estado salvo não quebra o boot nem o switch", async () => {
    const { services, progressRepo } = makeServices();
    const loaded = await progressRepo.load();
    if (!loaded) throw new Error("progresso não semeado");
    const corrupted = {
      ...loaded,
      journeys: { active: "banana", current: { dev: 42 } },
    } as unknown as LearnerProgress;
    await progressRepo.save(corrupted);
    const next = await services.useCases.switchJourney("dev");
    expect(next.journeys?.active).toBe("dev");
    expect(next.currentLessonId).toBe("l15");
  });
});

describe("completeLesson na jornada Dev (navegação × conquistas)", () => {
  it("concluir l15 desbloqueia l16 (cadeia Dev) sem tocar a cadeia IA", async () => {
    const { services } = await makeDevLearner();
    await services.useCases.startLesson("l15");
    const result = await services.useCases.completeLesson({
      lessonId: "l15",
      bestScores: bestScoresFor("l15"),
    });
    expect(result.outcome.completed).toBe(true);
    expect(result.nextLessonId).toBe("l16");
    expect(result.progress.lessonStatus.l16).toBe("available");
    expect(result.progress.lessonStatus.l02).toBe("locked"); // cadeia IA intocada
    expect(result.progress.currentLessonId).toBe("l16");
    expect(activeJourneyOf(result.progress)).toBe("dev");
  });

  it("concluir as 9 lições Dev NÃO redefine track_complete (escopo de conquistas = IA)", async () => {
    const { services, progressRepo } = makeServices();
    let progress = await services.useCases.switchJourney("dev");
    const iaModules = services.content.listModules();
    for (const lessonId of devLessonIds) {
      const lesson = lessons.find((item) => item.id === lessonId);
      if (!lesson) throw new Error(`lição ausente: ${lessonId}`);
      progress = {
        ...progress,
        lessonStatus: { ...progress.lessonStatus, [lessonId]: "in_progress" },
      };
      await progressRepo.save(progress);
      const result = await services.useCases.completeLesson({
        lessonId,
        bestScores: bestScoresFor(lessonId),
      });
      progress = result.progress;
    }
    const statuses = devLessonIds.map((id) => progress.lessonStatus[id]);
    expect(statuses.every((status) => status === "completed")).toBe(true);
    // Nenhuma conquista de trilha completa: as 23 lições IA continuam pendentes.
    expect(earnedAchievementIds(progress, iaModules)).not.toContain("track_complete");
    expect(progress.achievements.map((achievement) => achievement.id)).not.toContain(
      "track_complete",
    );
  });

  it("concluir lição IA com Dev ativa mantém o cursor Dev e arquiva o cursor IA", async () => {
    const { services, progressRepo } = makeServices();
    let progress = await services.useCases.switchJourney("dev");
    // Simula avanço IA prévio até l18 em andamento.
    progress = {
      ...progress,
      lessonStatus: {
        ...progress.lessonStatus,
        l01: "completed",
        l18: "in_progress",
      },
    };
    await progressRepo.save(progress);
    const result = await services.useCases.completeLesson({
      lessonId: "l18",
      bestScores: bestScoresFor("l18"),
    });
    expect(result.progress.currentLessonId).toBe("l15");
    expect(result.progress.journeys?.current?.ia_pratica).toBe("l19");
    expect(activeJourneyOf(result.progress)).toBe("dev");
  });

  it("progresso legado (sem journeys) conclui lição exatamente como o baseline", async () => {
    const { services, progressRepo } = makeServices();
    const seeded = await progressRepo.load();
    if (!seeded) throw new Error("progresso não semeado");
    await services.useCases.startLesson("l01");
    const result = await services.useCases.completeLesson({
      lessonId: "l01",
      bestScores: bestScoresFor("l01"),
    });
    // Sem onboarding não há rota guiada: a cadeia linear segue l01 → l02.
    expect(result.progress.currentLessonId).toBe("l02");
    expect(result.progress.journeys).toBeUndefined();
    expect(activeJourneyOf(result.progress)).toBe("ia_pratica");
  });
});

describe("backups: roundtrip preserva journeys e chaves desconhecidas", () => {
  it("export/import v4 mantém journeys e campos desconhecidos; status cap intacto", async () => {
    const { services } = makeServices();
    const withDev = await services.useCases.switchJourney("dev");
    const unknown = { ...withDev, futureField: { keep: true } } as LearnerProgress & {
      futureField: unknown;
    };
    const exported = serializeProgressForExport(unknown);
    const imported = parseImportedProgress(exported, services.content.getContentVersion());
    expect(imported.journeys).toEqual(withDev.journeys);
    expect((imported as typeof unknown).futureField).toEqual({ keep: true });
    expect(imported.schemaVersion).toBe(withDev.schemaVersion);
    expect(imported.lessonStatus.l15).toBe("available");
  });

  it("v1–v4 migram com journeys inválido sem acionar load-error", () => {
    const { services } = makeServices();
    const base = createInitialProgress(
      services.content.listModules(),
      services.content.getContentVersion(),
    );
    const versions = [1, 2, 3, 4];
    for (const schemaVersion of versions) {
      const raw = {
        ...structuredClone(base),
        schemaVersion,
        journeys: "não é um objeto",
      };
      const imported = parseImportedProgress(raw, services.content.getContentVersion());
      expect(imported.schemaVersion).toBe(4);
      expect(activeJourneyOf(imported)).toBe("ia_pratica");
    }
  });
});
