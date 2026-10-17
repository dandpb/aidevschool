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

// AID-3740 (S5-RACE, delta de atomicidade em cima do PR #655): asserções de
// conclusão concorrente multi-tab vivem em arquivo NOVO (política
// protect-tests — criação permitida; nenhum teste existente editado).

const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

/** Coleta os eventos de analytics em memória — canal de teste (ADR-0009). */
class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

/**
 * Repositório COM update() atômico — espelha a semântica da transação única
 * de IndexedDbProgressRepository.update: o mutate lê o estado commitado e o
 * resultado é publicado na mesma passada, sem ponto de espera entre leitura
 * e publicação. Escritores concorrentes serializam (a 2ª conclusão vê o
 * estado commitado pela 1ª).
 */
class AtomicProgressRepository implements ProgressRepository {
  private current: LearnerProgress | null = null;

  seed(progress: LearnerProgress): void {
    this.current = progress;
  }

  async load(): Promise<LearnerProgress | null> {
    return this.current;
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

/**
 * Repositório SEM atomicidade (contrato mínimo pré-AID-3740): `load` fotografa
 * o estado no instante da chamada — como o `get` IndexedDB emitido antes do
 * commit da outra aba — e `save` publica depois. Duas conclusões concorrentes
 * fotografam o MESMO estado pré-conclusão: é o TOCTOU registrado no S5-RACE
 * (2× `lesson_completed` em 2/5 execuções).
 */
class SnapshotRaceProgressRepository implements ProgressRepository {
  private current: LearnerProgress | null = null;

  seed(progress: LearnerProgress): void {
    this.current = progress;
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
}

function makeSeededServices(
  repo: {
    seed(progress: LearnerProgress): void;
  } & ProgressRepository,
) {
  const analytics = new InMemoryAnalyticsSink();
  const services = createServices({
    progressRepo: repo,
    evidence: new InMemoryEvidenceSink(),
    clock: fixedClock(FIXED_NOW),
    analytics,
  });
  repo.seed(createInitialProgress(modules, services.content.getContentVersion()));
  return { analytics, services };
}

describe("completeLesson — atomicidade multi-tab (AID-3740 S5-RACE)", () => {
  const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
  if (!lesson) throw new Error("Mapa Inicial ausente do read model");
  const allBestScores = Object.fromEntries(
    lesson.completion.requiredActivityIds.map((id) => [id, 1]),
  );

  it("duas conclusões concorrentes com update() atômico: exatamente 1× firstCompletion, 1× lesson_completed e um único +25", async () => {
    const repo = new AtomicProgressRepository();
    const { analytics, services } = makeSeededServices(repo);

    // Duas abas disparam finish-lesson back-to-back sobre a mesma lição
    // (interleave determinístico: ambas entram antes de qualquer commit).
    const [tabA, tabB] = await Promise.all([
      services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores }),
      services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores }),
    ]);

    // Ambas concluem (replay/prática permanece permitido).
    expect(tabA.outcome.completed).toBe(true);
    expect(tabB.outcome.completed).toBe(true);

    // Exatamente UMA primeira conclusão — a transição commitada decide.
    expect([tabA, tabB].filter((result) => result.firstCompletion)).toHaveLength(1);

    // Invariante de contagem do funil (AID-3731 estendido ao multi-tab):
    // 1× lesson_completed por lição, mesmo sob conclusões concorrentes.
    expect(analytics.events.filter((event) => event.event === "lesson_completed")).toHaveLength(1);

    // Invariante de premiação: um único +25 no estado persistido.
    const persisted = await repo.load();
    expect(persisted?.lessonStatus[lesson.id]).toBe("completed");
    expect(persisted?.xp).toBe(XP_PER_LESSON_COMPLETE);
  });

  it("repositório sem update() (fallback load→save): TOCTOU determinístico documentado como limite residual (2× lesson_completed)", async () => {
    const repo = new SnapshotRaceProgressRepository();
    const { analytics, services } = makeSeededServices(repo);

    const [tabA, tabB] = await Promise.all([
      services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores }),
      services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores }),
    ]);

    // Sem atomicidade no repositório, ambas as conclusões leem o snapshot
    // pré-conclusão e computam firstCompletion=true — o limite registrado no
    // S5-RACE (2/5 execuções). Este teste PINA o contrato do fallback para
    // que a existência do caminho atômico permaneça justificada.
    expect([tabA, tabB].filter((result) => result.firstCompletion)).toHaveLength(2);
    expect(analytics.events.filter((event) => event.event === "lesson_completed")).toHaveLength(2);
  });

  it("replay sequencial permanece intacto com update() atômico: 2ª conclusão é replay, sem 2º evento nem 2º +25", async () => {
    const repo = new AtomicProgressRepository();
    const { analytics, services } = makeSeededServices(repo);

    const first = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
    });
    const replay = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
    });

    expect(first.firstCompletion).toBe(true);
    expect(replay.firstCompletion).toBe(false);
    expect(analytics.events.filter((event) => event.event === "lesson_completed")).toHaveLength(1);
    const persisted = await repo.load();
    expect(persisted?.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(persisted?.lessonStatus[lesson.id]).toBe("completed");
  });
});
