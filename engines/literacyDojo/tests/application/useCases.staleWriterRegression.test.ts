import { describe, expect, it } from "vitest";
import { createServices } from "../../src/app/services";
import type { AnalyticsSink, ProgressRepository } from "../../src/application/ports";
import { lessons, modules } from "../../src/data/generated/lessons";
import type { OutputComparisonActivity } from "../../src/data/generated/lessons";
import type { ProductAnalyticsEvent } from "../../src/domain/analytics";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_ACTIVITY_PASS,
  XP_PER_LESSON_COMPLETE,
  createInitialProgress,
} from "../../src/domain/progress";
import type { LearnerProgress } from "../../src/domain/progress";
import { InMemoryEvidenceSink, fixedClock } from "../fakes";

// AID-3718 S5V2 §2a (receipt eb3a1321; residual AID-3740): regressão dos
// writers mistos em arquivo NOVO (política protect-tests — nenhum teste
// existente editado). Espelha o contrato do adapter IndexedDB: `update` =
// RMW atômico contra o estado commitado; `load`/`save` = snapshot/put do
// registro inteiro (o caminho stale que revertia conclusões).

const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

/** Espelho do contrato do IndexedDbProgressRepository (get/put vs update RMW). */
class ContractMirrorProgressRepository implements ProgressRepository {
  loads = 0;
  saves = 0;
  updates = 0;
  private current: LearnerProgress | null = null;

  seed(progress: LearnerProgress): void {
    this.current = progress;
  }

  /** Leitura de asserção — não conta como caminho de escrita stale. */
  peek(): LearnerProgress | null {
    return this.current;
  }

  async load(): Promise<LearnerProgress | null> {
    this.loads += 1;
    const snapshot = this.current;
    await Promise.resolve();
    return snapshot;
  }

  async save(progress: LearnerProgress): Promise<void> {
    this.saves += 1;
    this.current = progress;
  }

  async reset(): Promise<void> {
    this.current = null;
  }

  async update(
    mutate: (current: LearnerProgress | null) => LearnerProgress,
  ): Promise<LearnerProgress> {
    this.updates += 1;
    const next = mutate(this.current);
    this.current = next;
    return next;
  }
}

function makeSeededServices() {
  const repo = new ContractMirrorProgressRepository();
  const analytics = new InMemoryAnalyticsSink();
  const services = createServices({
    progressRepo: repo,
    evidence: new InMemoryEvidenceSink(),
    clock: fixedClock(FIXED_NOW),
    analytics,
  });
  repo.seed(createInitialProgress(modules, services.content.getContentVersion()));
  return { repo, analytics, services };
}

describe("writers mistos — stale start/submit não revertem conclusão (AID-3718 S5V2 §2a)", () => {
  const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
  if (!lesson) throw new Error("Mapa Inicial ausente do read model");
  const allBestScores = Object.fromEntries(
    lesson.completion.requiredActivityIds.map((id) => [id, 1]),
  );
  const activity = lesson.activities[0] as OutputComparisonActivity;
  const rightAnswer = {
    outputId: activity.evaluation.betterOutputId,
    criterionIds: [...activity.evaluation.requiredCriterionIds],
  };
  const lessonCompletedCount = (events: readonly ProductAnalyticsEvent[]) =>
    events.filter((event) => event.event === "lesson_completed").length;

  it("stale-submit: submit concorrente ao finish não reverte completed nem re-conta a 1ª conclusão", async () => {
    const { repo, analytics, services } = makeSeededServices();

    // Aba B submete a 1ª atividade enquanto a aba A conclui a lição
    // (back-to-back, mesmo learner/origem). Pré-fix, o load stale do submit
    // era persistido DEPOIS do commit da conclusão, revertendo o status e
    // reabrindo a janela de "nova 1ª conclusão" (2º lesson_completed).
    const [, completion] = await Promise.all([
      services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer: rightAnswer,
      }),
      services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores }),
    ]);

    expect(completion.outcome.completed).toBe(true);
    const persisted = repo.peek();
    expect(persisted?.lessonStatus[lesson.id]).toBe("completed");
    // Ambos os efeitos sobrevivem serializados: +25 da conclusão e +10 da
    // atividade acertada.
    expect(persisted?.xp).toBe(XP_PER_LESSON_COMPLETE + XP_PER_ACTIVITY_PASS);
    expect(lessonCompletedCount(analytics.events)).toBe(1);

    // O finish POSTERIOR da aba B é replay — não há 2ª primeira conclusão.
    const replay = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
    });
    expect(replay.firstCompletion).toBe(false);
    expect(lessonCompletedCount(analytics.events)).toBe(1);

    // Writers totalmente serializados: nenhum caminho stale load→save restou
    // para submit/complete com repositório atômico.
    expect(repo.loads).toBe(0);
    expect(repo.saves).toBe(0);
  });

  it("stale-start: start concorrente ao finish preserva completed e o replay permanece replay", async () => {
    const { repo, analytics, services } = makeSeededServices();

    // startLesson exige onboarding concluído (contrato de destravamento) —
    // bootstrap antes da corrida, como o fluxo real do app.
    await services.useCases.completeOnboarding({
      goal: "save_time",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
      audience: "ia_pratica",
    });

    const [, completion] = await Promise.all([
      services.useCases.startLesson(lesson.id),
      services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores }),
    ]);

    expect(completion.outcome.completed).toBe(true);
    const persisted = repo.peek();
    expect(persisted?.lessonStatus[lesson.id]).toBe("completed");
    expect(persisted?.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(lessonCompletedCount(analytics.events)).toBe(1);

    const replay = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
    });
    expect(replay.firstCompletion).toBe(false);
    expect(lessonCompletedCount(analytics.events)).toBe(1);
    expect(repo.loads).toBe(0);
    expect(repo.saves).toBe(0);
  });

  it("controle: submit pós-conclusão é prática — +10 preservado, sem novo lesson_completed", async () => {
    const { repo, analytics, services } = makeSeededServices();

    await services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores });
    const attempt = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: rightAnswer,
    });

    expect(attempt.evaluation.pass).toBe(true);
    const persisted = repo.peek();
    expect(persisted?.lessonStatus[lesson.id]).toBe("completed");
    expect(persisted?.xp).toBe(XP_PER_LESSON_COMPLETE + XP_PER_ACTIVITY_PASS);
    expect(lessonCompletedCount(analytics.events)).toBe(1);
  });
});
