import { describe, expect, it } from "vitest";
import * as generatedContent from "../../src/adapters/generatedContentRepository";
import { lessons, modules } from "../../src/data/generated/lessons";
import {
  activeJourneyOf,
  deriveJourneyCurrentLessonId,
  ensureJourneyLessonStatuses,
  isJourneyId,
  journeyLessonIds,
  reconcileJourneyCursors,
  selectJourney,
} from "../../src/domain/journeyProgress";
import {
  type LearnerProgress,
  completeLesson as completeLessonInDomain,
  createInitialProgress,
} from "../../src/domain/progress";
import { FIXED_NOW } from "../helpers";

const iaModules = generatedContent.listModules("ia_pratica");
const devModules = generatedContent.listModules("dev");
const journeyModules = { ia_pratica: iaModules, dev: devModules } as const;

const devLessonIds = journeyLessonIds(devModules);
const iaLessonIds = journeyLessonIds(iaModules);

function freshProgress(): LearnerProgress {
  return createInitialProgress(iaModules, "test");
}

function bestScoresFor(lessonId: string): Record<string, number> {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`lição ausente: ${lessonId}`);
  return Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1]));
}

describe("read model das jornadas (pin AID-3584)", () => {
  it("IA preserva 23 IDs/ordem e Dev 9 IDs/ordem; l14→l18 e l15 primeiro", () => {
    expect(iaLessonIds).toHaveLength(23);
    expect(iaLessonIds.slice(0, 14)).toEqual([
      "l01",
      "l02",
      "l03",
      "l04",
      "l05",
      "l06",
      "l07",
      "l08",
      "l09",
      "l10",
      "l11",
      "l12",
      "l13",
      "l14",
    ]);
    expect(iaLessonIds[14]).toBe("l18");
    expect(devLessonIds).toEqual(["l15", "l16", "l17", "l21", "l22", "l23", "l27", "l28", "l29"]);
    const l15 = lessons.find((item) => item.id === "l15");
    expect(l15?.prerequisites).toEqual([]);
    // O desbloqueio linear da IA continua l14 → l18 (não salta para lições Dev).
    const l14Index = iaLessonIds.indexOf("l14");
    expect(iaLessonIds[l14Index + 1]).toBe("l18");
  });

  it("listModules sem argumento mantém o percurso público default (ia_pratica)", () => {
    expect(generatedContent.listModules().map((module) => module.id)).not.toContain("mod-05");
    expect(generatedContent.listModules("dev").map((module) => module.id)).toEqual(["mod-05"]);
    expect(modules).toHaveLength(8);
  });
});

describe("activeJourneyOf (normalização defensiva)", () => {
  it("sem journeys ⇒ ia_pratica (legado)", () => {
    expect(activeJourneyOf(freshProgress())).toBe("ia_pratica");
  });

  it("valores inválidos caem no default sem lançar", () => {
    const progress = {
      ...freshProgress(),
      journeys: { active: "banana" },
    } as unknown as LearnerProgress;
    expect(activeJourneyOf(progress)).toBe("ia_pratica");
    const garbage = { ...freshProgress(), journeys: 42 } as unknown as LearnerProgress;
    expect(activeJourneyOf(garbage)).toBe("ia_pratica");
    expect(isJourneyId("dev")).toBe(true);
    expect(isJourneyId("trilha_dev")).toBe(false);
  });
});

describe("ensureJourneyLessonStatuses", () => {
  it("inicializa somente ausentes: primeira lição available, demais locked", () => {
    const status = ensureJourneyLessonStatuses({}, devModules);
    expect(status.l15).toBe("available");
    for (const id of devLessonIds.slice(1)) {
      expect(status[id]).toBe("locked");
    }
  });

  it("nunca sobrescreve status existente (herdado de IA, Dev ou hosted)", () => {
    const existing: Record<string, "locked" | "available" | "in_progress" | "completed"> = {
      l15: "completed",
      l16: "in_progress",
      l21: "available",
    };
    const status = ensureJourneyLessonStatuses(existing, devModules);
    expect(status.l15).toBe("completed");
    expect(status.l16).toBe("in_progress");
    expect(status.l21).toBe("available");
    expect(status.l17).toBe("locked");
  });
});

describe("selectJourney (opt-in explícito)", () => {
  it("escolher Dev arquiva cursor IA, inicializa statuses Dev e espelha cursor Dev", () => {
    const progress = freshProgress();
    progress.currentLessonId = "l03";
    const next = selectJourney(progress, "dev", journeyModules);

    expect(next.journeys?.active).toBe("dev");
    expect(next.journeys?.current?.ia_pratica).toBe("l03");
    expect(next.currentLessonId).toBe("l15");
    expect(next.lessonStatus.l15).toBe("available");
    expect(next.lessonStatus.l16).toBe("locked");
    // Statuses IA intactos.
    expect(next.lessonStatus.l01).toBe(progress.lessonStatus.l01);
  });

  it("é idempotente: repetir a escolha não muda nada visível", () => {
    const first = selectJourney(freshProgress(), "dev", journeyModules);
    const second = selectJourney(first, "dev", journeyModules);
    expect(second).toEqual(first);
  });

  it("voltar para IA restaura o cursor arquivado (dois cursores)", () => {
    let progress = selectJourney(
      { ...freshProgress(), currentLessonId: "l03" },
      "dev",
      journeyModules,
    );
    progress = {
      ...progress,
      currentLessonId: "l15",
      lessonStatus: { ...progress.lessonStatus, l15: "in_progress" },
    };
    progress = selectJourney(progress, "ia_pratica", journeyModules);
    expect(progress.journeys?.active).toBe("ia_pratica");
    expect(progress.journeys?.current?.dev).toBe("l15");
    expect(progress.currentLessonId).toBe("l03");
    const backToDev = selectJourney(progress, "dev", journeyModules);
    expect(backToDev.currentLessonId).toBe("l15");
  });

  it("cursor Dev salvo inválido (lição inexistente) é ignorado sem lançar", () => {
    const progress: LearnerProgress = {
      ...freshProgress(),
      currentLessonId: "l02",
      journeys: { active: "ia_pratica", current: { dev: "l99" } },
    };
    const next = selectJourney(progress, "dev", journeyModules);
    expect(next.currentLessonId).toBe("l15");
  });
});

describe("reconcileJourneyCursors", () => {
  it("progresso legado (sem journeys) sai intocado — caminho hospedado preservado", () => {
    const progress = freshProgress();
    const lesson = lessons.find((item) => item.id === "l01");
    if (!lesson) throw new Error("l01 ausente");
    const completed = completeLessonInDomain(
      progress,
      lesson,
      bestScoresFor("l01"),
      iaModules,
      FIXED_NOW,
    );
    const reconciled = reconcileJourneyCursors(
      completed.progress,
      "ia_pratica",
      "l01",
      completed.nextLessonId,
      journeyModules,
    );
    expect(reconciled).toBe(completed.progress);
    expect(reconciled.journeys).toBeUndefined();
  });

  it("concluir lição IA com Dev ativa arquiva o próximo IA e mantém o cursor Dev", () => {
    let progress = selectJourney(freshProgress(), "dev", journeyModules);
    // Marca l01/l14 concluídos para exercitar l14 → l18.
    progress = {
      ...progress,
      lessonStatus: {
        ...progress.lessonStatus,
        l01: "completed",
        l14: "completed",
        l18: "in_progress",
      },
      currentLessonId: "l18",
    };
    const lesson = lessons.find((item) => item.id === "l18");
    if (!lesson) throw new Error("l18 ausente");
    const completed = completeLessonInDomain(
      progress,
      lesson,
      bestScoresFor("l18"),
      iaModules,
      FIXED_NOW,
    );
    const reconciled = reconcileJourneyCursors(
      completed.progress,
      "ia_pratica",
      "l18",
      completed.nextLessonId,
      journeyModules,
    );
    expect(reconciled.journeys?.active).toBe("dev");
    expect(reconciled.journeys?.current?.ia_pratica).toBe("l19"); // l18 → l19 na cadeia IA
    expect(reconciled.currentLessonId).toBe("l15"); // cursor Dev preservado
  });
});

describe("deriveJourneyCurrentLessonId", () => {
  it("prioriza in_progress, depois available, depois a primeira pronta", () => {
    const progress = freshProgress();
    expect(deriveJourneyCurrentLessonId(progress, iaModules)).toBe("l01");
    const withInProgress = {
      ...progress,
      lessonStatus: { ...progress.lessonStatus, l05: "in_progress" as const },
    };
    expect(deriveJourneyCurrentLessonId(withInProgress, iaModules)).toBe("l05");
  });
});
