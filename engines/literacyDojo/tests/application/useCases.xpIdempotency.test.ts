import { beforeEach, describe, expect, it } from "vitest";
import { createServices } from "../../src/app/services";
import { lessons, modules } from "../../src/data/generated/lessons";
import type { OutputComparisonActivity } from "../../src/data/generated/lessons";
import type { ActivityAnswer } from "../../src/domain/evaluation";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_ACTIVITY_PASS,
  XP_PER_LESSON_COMPLETE,
  createInitialProgress,
} from "../../src/domain/progress";
import { activityLedgerKey, localDateKey } from "../../src/domain/xpLedger";
import { InMemoryLearnerStateStore, fixedClock } from "../fakes";
import { InMemoryEvidenceSink } from "../fakes";
import { FIXED_NOW, makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
if (!lesson) throw new Error("Mapa Inicial ausente");
const activities = lesson.activities;
const activity = lesson.activities[0] as OutputComparisonActivity;

const RIGHT_ANSWER = {
  outputId: activity.evaluation.betterOutputId,
  criterionIds: [...activity.evaluation.requiredCriterionIds],
};
const WRONG_ANSWER = {
  outputId: activity.data.outputs.find((output) => output.id !== activity.evaluation.betterOutputId)
    ?.id,
  criterionIds: [],
};

const ALL_BEST_SCORES = Object.fromEntries(
  lesson.completion.requiredActivityIds.map((id) => [id, 1]),
);

/** Resposta correta por tipo de atividade (dirigido pelo conteúdo gerado). */
function rightAnswerFor(act: (typeof activities)[number]): ActivityAnswer {
  if (act.type === "output_comparison") {
    return {
      outputId: act.evaluation.betterOutputId,
      criterionIds: [...act.evaluation.requiredCriterionIds],
    };
  }
  if (act.type === "choice") {
    return { optionIds: [...act.evaluation.correctOptionIds] };
  }
  if (act.type === "sort") {
    return { orderedIds: [...act.evaluation.expectedOrder] };
  }
  throw new Error(`tipo de atividade sem resposta de teste: ${(act as { type: string }).type}`);
}

/**
 * AID-3888 — P8 (nível aplicação): idempotência de XP por (alvo, dia local)
 * no fluxo real de use cases, incluindo o cenário QA L20 (reload no meio,
 * re-respostas no mesmo dia) e o corte de completed legado.
 */

describe("AID-3888 — XP idempotente nos use cases (P8)", () => {
  let stateStore: InMemoryLearnerStateStore;

  beforeEach(() => {
    stateStore = new InMemoryLearnerStateStore();
    stateStore.seedState({
      stateVersion: 1,
      origin: "fresh-seed",
      progress: createInitialProgress(modules, "test"),
      xpLedger: { ledgerVersion: 1, lastAwardedDate: {}, firstCompletionAwarded: {} },
    });
  });

  function servicesAt(date: Date) {
    return createServices({
      stateStore,
      evidence: new InMemoryEvidenceSink(),
      clock: fixedClock(date),
    });
  }

  it("mesma atividade aprovada 2× no MESMO dia local paga 1× (reload não reconcede)", async () => {
    const services = servicesAt(FIXED_NOW);
    const first = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: RIGHT_ANSWER,
    });
    expect(first.progress.xp).toBe(XP_PER_ACTIVITY_PASS);
    const second = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: RIGHT_ANSWER,
    });
    expect(second.progress.xp).toBe(XP_PER_ACTIVITY_PASS);
    expect(
      stateStore.storedStateValue()?.xpLedger.lastAwardedDate[
        activityLedgerKey(lesson.id, activity.id)
      ],
    ).toBe(localDateKey(FIXED_NOW));
  });

  it("tentativa FALHA e depois passa no mesmo dia: falha não consumiu elegibilidade — passa paga", async () => {
    const services = servicesAt(FIXED_NOW);
    const wrong = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: WRONG_ANSWER,
    });
    expect(wrong.progress.xp).toBe(0);
    const right = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: RIGHT_ANSWER,
    });
    expect(right.progress.xp).toBe(XP_PER_ACTIVITY_PASS);
  });

  it("dia local estritamente posterior reconcede 1× (prática diária continua valendo)", async () => {
    await servicesAt(FIXED_NOW).useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: RIGHT_ANSWER,
    });
    const nextDay = new Date(FIXED_NOW.getTime() + 86_400_000);
    const again = await servicesAt(nextDay).useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: RIGHT_ANSWER,
    });
    expect(again.progress.xp).toBe(2 * XP_PER_ACTIVITY_PASS);
  });

  it("conclusão paga 25 XP 1× PARA SEMPRE: replay/review não re-paga (cenário QA L20 = 55)", async () => {
    const services = servicesAt(FIXED_NOW);
    for (const act of lesson.activities) {
      await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: act.id,
        answer: rightAnswerFor(act),
      });
    }
    const completed = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: ALL_BEST_SCORES,
    });
    const expected = 3 * XP_PER_ACTIVITY_PASS + XP_PER_LESSON_COMPLETE;
    expect(completed.progress.xp).toBe(expected); // 55 — o cenário da L20 agora fecha

    // Replay no mesmo dia: nada reconcede (nem atividade, nem conclusão).
    for (const act of lesson.activities) {
      await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: act.id,
        answer: rightAnswerFor(act),
      });
    }
    const replay = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: ALL_BEST_SCORES,
    });
    expect(replay.progress.xp).toBe(expected);
  });

  it("corte de completed legado: re-conclusão pós-corte NÃO paga novo 25 XP (decisão PO item 1)", async () => {
    const progress = createInitialProgress(modules, "test");
    progress.lessonStatus[lesson.id] = "completed";
    stateStore.seedState({
      stateVersion: 1,
      origin: "cutover",
      progress,
      xpLedger: {
        ledgerVersion: 1,
        lastAwardedDate: {},
        firstCompletionAwarded: { [`lesson:${lesson.id}`]: "2026-10-07" },
      },
    });
    const services = servicesAt(FIXED_NOW);
    const result = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: ALL_BEST_SCORES,
    });
    expect(result.progress.xp).toBe(0); // sem novo bônus, mesmo com ledger diário vazio
  });
});

describe("AID-3888 — P5: falha de gravação não deixa award parcial; retry é idempotente", () => {
  it("saveState falha → use case rejeita, estado persistido permanece o anterior; retry no mesmo dia paga 1×", async () => {
    const { services, stateStore } = makeServices();
    const before = await stateStore.loadProgress();

    stateStore.failSaves();
    await expect(
      services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer: RIGHT_ANSWER,
      }),
    ).rejects.toThrow(/Falha injetada/);

    // Nada parcial: o estado persistido é exatamente o anterior.
    expect(await stateStore.loadProgress()).toEqual(before);

    // Retry com a gravação saudável paga UMA vez (idempotente pelo ledger).
    stateStore.restoreSaves();
    const { services: freshServices } = makeServices({ stateStore });
    const retried = await freshServices.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: RIGHT_ANSWER,
    });
    expect(retried.progress.xp).toBe(
      before ? before.xp + XP_PER_ACTIVITY_PASS : XP_PER_ACTIVITY_PASS,
    );
    const stored = await stateStore.loadProgress();
    expect(stored?.xp).toBe(retried.progress.xp);
  });
});
