import { describe, expect, it } from "vitest";
import { createServices } from "../../src/app/services";
import type { AnalyticsSink, ProgressRepository } from "../../src/application/ports";
import { lessons, modules } from "../../src/data/generated/lessons";
import type { ProductAnalyticsEvent } from "../../src/domain/analytics";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_LESSON_COMPLETE,
  createInitialProgress,
} from "../../src/domain/progress";
import type { LearnerProgress } from "../../src/domain/progress";
import { InMemoryEvidenceSink, fixedClock } from "../fakes";

// AID-3718 DELTA3 (receipt ddbd967d; registro S5V2 DELTA3 §2): regressão do
// stale-onboarding em arquivo NOVO (política protect-tests — nenhum teste
// existente editado). O onboarding atrasado de uma segunda aba NÃO pode
// destruir progresso commitado: o mapper inicial é idempotente (primeira
// configuração válida vence).

const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

/** Espelho do contrato do IndexedDbProgressRepository (update = RMW atômico). */
class ContractMirrorProgressRepository implements ProgressRepository {
  private current: LearnerProgress | null = null;

  seed(progress: LearnerProgress): void {
    this.current = progress;
  }

  peek(): LearnerProgress | null {
    return this.current;
  }

  async load(): Promise<LearnerProgress | null> {
    const snapshot = this.current;
    await Promise.resolve();
    return snapshot;
  }

  async save(progress: LearnerProgress): Promise<void> {
    this.current = progress;
  }

  async reset(): Promise<void> {
    this.current = null;
  }

  async update(
    mutate: (current: LearnerProgress | null) => LearnerProgress,
  ): Promise<LearnerProgress> {
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

const ONBOARDING_A = {
  goal: "save_time",
  context: "work",
  confidence: "medium",
  taskCategory: "scheduling",
  audience: "ia_pratica",
} as const;

const ONBOARDING_B = {
  goal: "verify_answers",
  context: "studies",
  confidence: "low",
  taskCategory: "news_research",
  audience: "ia_pratica",
} as const;

describe("stale-onboarding — re-completar preserva a 1ª configuração e o progresso commitado (AID-3718 DELTA3)", () => {
  const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
  if (!lesson) throw new Error("Mapa Inicial ausente do read model");
  const allBestScores = Object.fromEntries(
    lesson.completion.requiredActivityIds.map((id) => [id, 1]),
  );
  const lessonCompletedCount = (events: readonly ProductAnalyticsEvent[]) =>
    events.filter((event) => event.event === "lesson_completed").length;

  it("onboarding atrasado de outra aba não reabre l02 concluída, não re-tranca l01, não rebobina e não re-conta a 1ª conclusão", async () => {
    const { repo, analytics, services } = makeSeededServices();

    // Aba A: onboarding + conclusão do Mapa Inicial (1ª conclusão válida).
    await services.useCases.completeOnboarding({ ...ONBOARDING_A });
    const aFinish = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
    });
    expect(aFinish.firstCompletion).toBe(true);
    // BEFORE (estado pós-A, igual ao probe do registro):
    // l02 completed, l01 available, XP 25, 1 evento, current l01.
    const afterA = repo.peek();
    expect(afterA?.lessonStatus[lesson.id]).toBe("completed");
    expect(afterA?.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(lessonCompletedCount(analytics.events)).toBe(1);

    // Aba B (atrasada na tela de onboarding) conclui o onboarding DEPOIS.
    await services.useCases.completeOnboarding({ ...ONBOARDING_B });

    // AFTER: a primeira configuração válida e TODO o progresso sobrevivem —
    // o mapper inicial não reabre `completed`, não re-tranca progressão, não
    // rebobina a lição corrente e não sobrescreve as respostas do onboarding.
    const afterB = repo.peek();
    expect(afterB?.lessonStatus[lesson.id]).toBe("completed");
    expect(afterB?.lessonStatus.l01).toBe("available");
    expect(afterB?.currentLessonId).toBe("l01");
    expect(afterB?.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(afterB?.onboarding.goal).toBe(ONBOARDING_A.goal);
    expect(afterB?.onboarding.context).toBe(ONBOARDING_A.context);
    expect(lessonCompletedCount(analytics.events)).toBe(1);

    // O re-finish da aba B é REPLAY — sem 2º +25, sem 2º lesson_completed.
    const bRefinish = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
    });
    expect(bRefinish.firstCompletion).toBe(false);
    expect(repo.peek()?.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(lessonCompletedCount(analytics.events)).toBe(1);
    expect(repo.peek()?.lessonStatus[lesson.id]).toBe("completed");
  });

  it("controle: primeiro onboarding continua montando a sessão inicial (l02 available, l01 locked, current l02)", async () => {
    const { repo, analytics, services } = makeSeededServices();

    await services.useCases.completeOnboarding({ ...ONBOARDING_A });

    const persisted = repo.peek();
    expect(persisted?.onboarding.completed).toBe(true);
    expect(persisted?.lessonStatus[lesson.id]).toBe("available");
    expect(persisted?.lessonStatus.l01).toBe("locked");
    expect(persisted?.currentLessonId).toBe(lesson.id);
    expect(lessonCompletedCount(analytics.events)).toBe(0);
  });
});
