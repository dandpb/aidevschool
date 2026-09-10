import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createServices } from "../../src/app/services";
import { ServicesProvider } from "../../src/app/services";
import type { AnalyticsSink } from "../../src/application/ports";
import type { ActivityDefinition } from "../../src/data/generated/lessons";
import { lessons } from "../../src/data/generated/lessons";
import type { ProductAnalyticsEvent } from "../../src/domain/analytics";
import { createInitialProgress } from "../../src/domain/progress";
import { LessonScreen } from "../../src/screens/LessonScreen";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";

// F2 prova 2 (plan §3): intro renderiza → `lesson_brief_viewed` 1×; navegação
// p/ índice i → `activity_presented` 1× por (sessão, índice absoluto) —
// re-render/retry não reemitem índices já apresentados. Em missão hospedada
// o mesmo guarda aciona os callbacks mission-event (forwarding ao host).

const FIXED_NOW = new Date("2026-09-10T12:00:00.000Z");

class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

const lesson = (() => {
  const found = lessons.find((item) => item.activities.length >= 2);
  if (!found) throw new Error("Fixture exige lição com ≥2 atividades");
  return found;
})();

function makeServices() {
  const analytics = new InMemoryAnalyticsSink();
  const progressRepo = new InMemoryProgressRepository();
  const services = createServices({
    progressRepo,
    evidence: new InMemoryEvidenceSink(),
    clock: fixedClock(FIXED_NOW),
    analytics,
  });
  progressRepo.seed(
    createInitialProgress(services.content.listModules(), services.content.getContentVersion()),
  );
  return { analytics, services };
}

function renderLessonScreen(
  services: ReturnType<typeof makeServices>["services"],
  missionEvents?: {
    onBriefViewed: () => void;
    onActivityPresented: (t: string, i: number) => void;
  },
) {
  const initial = createInitialProgress(
    services.content.listModules(),
    services.content.getContentVersion(),
  );
  return render(
    <ServicesProvider value={services}>
      <LessonScreen
        lessonId={lesson.id}
        mode="initial"
        onboarding={initial.onboarding}
        missionEvents={missionEvents}
        onProgressChange={() => undefined}
        onCompleted={() => undefined}
        onExit={() => undefined}
      />
    </ServicesProvider>,
  );
}

/** Responde a 1ª atividade corretamente pelo DOM (dirigido pelo conteúdo gerado). */
async function answerFirstActivityRight(
  user: ReturnType<typeof userEvent.setup>,
  activity: ActivityDefinition,
) {
  if (activity.type === "output_comparison") {
    await user.click(screen.getByTestId(`output-${activity.evaluation.betterOutputId}`));
    for (const id of activity.evaluation.requiredCriterionIds) {
      await user.click(screen.getByTestId(`criterion-${id}`));
    }
    return;
  }
  if (activity.type === "choice") {
    const correct = new Set(activity.evaluation.correctOptionIds);
    const option = activity.data.options.find((item) => correct.has(item.id));
    if (!option) throw new Error("sem opção correta");
    await user.click(screen.getByTestId(`option-${option.id}`));
    return;
  }
  throw new Error(`fixture não cobre o tipo da 1ª atividade: ${activity.type}`);
}

describe("LessonScreen: emissão de exposição (F2 R2)", () => {
  it("intro renderiza → lesson_brief_viewed exatamente 1× (re-render não reemite)", async () => {
    const { analytics, services } = makeServices();
    renderLessonScreen(services);
    expect(screen.getByTestId("lesson-intro")).toBeTruthy();
    const briefs = () => analytics.events.filter((event) => event.event === "lesson_brief_viewed");
    expect(briefs()).toHaveLength(1);
    expect(briefs()[0]?.props).toEqual({ lessonId: lesson.id, lessonVersion: lesson.version });
    // Nenhuma emissão de activity_presented ainda.
    expect(analytics.events.filter((event) => event.event === "activity_presented")).toHaveLength(
      0,
    );
  });

  it("Começar missão → activity_presented do índice 0 exatamente 1×; índice 1 emite 1× próprio", async () => {
    const { analytics, services } = makeServices();
    const user = userEvent.setup();
    renderLessonScreen(services);
    await user.click(screen.getByTestId("start-lesson"));
    const presented = () =>
      analytics.events.filter((event) => event.event === "activity_presented");
    expect(presented()).toHaveLength(1);
    expect(presented()[0]?.props).toMatchObject({ lessonId: lesson.id, activityIndex: 0 });

    // Atividade 0 correta → próxima atividade → índice 1 emite 1× próprio.
    const first = lesson.activities[0];
    if (!first) throw new Error("atividade 0 ausente");
    await answerFirstActivityRight(user, first);
    await user.click(screen.getByTestId("submit-attempt"));
    const next = await screen.findByTestId("next-activity");
    await user.click(next);
    expect(presented()).toHaveLength(2);
    expect(presented()[1]?.props).toMatchObject({ activityIndex: 1 });
  });

  it("retry no mesmo índice não reemite activity_presented (2ª exposição = 0 emissões)", async () => {
    const { analytics, services } = makeServices();
    const user = userEvent.setup();
    renderLessonScreen(services);
    await user.click(screen.getByTestId("start-lesson"));
    const first = lesson.activities[0];
    if (!first) throw new Error("atividade 0 ausente");
    // Submissão vazia (incompleta não habilita o botão) — responde certo,
    // submete, e o fluxo segue; o cenário de retry usa resposta errada.
    if (first.type === "output_comparison") {
      const wrong = first.data.outputs.find(
        (output) => output.id !== first.evaluation.betterOutputId,
      );
      if (!wrong) throw new Error("sem saída errada");
      await user.click(screen.getByTestId(`output-${wrong.id}`));
      for (const id of first.evaluation.requiredCriterionIds) {
        await user.click(screen.getByTestId(`criterion-${id}`));
      }
    } else if (first.type === "choice") {
      const correct = new Set(first.evaluation.correctOptionIds);
      const wrongOption = first.data.options.find((item) => !correct.has(item.id));
      if (!wrongOption) throw new Error("sem opção errada");
      await user.click(screen.getByTestId(`option-${wrongOption.id}`));
    } else {
      throw new Error(`fixture não cobre retry do tipo: ${first.type}`);
    }
    await user.click(screen.getByTestId("submit-attempt"));
    await user.click(await screen.findByTestId("retry-activity"));
    const presented = analytics.events.filter((event) => event.event === "activity_presented");
    expect(presented).toHaveLength(1); // mesmo índice 0 — nada reemitido
    expect(analytics.events.filter((event) => event.event === "lesson_brief_viewed")).toHaveLength(
      1,
    );
  });

  it("missão hospedada: os mesmos guarda-corpos acionam os callbacks mission-event (forwarding ao host)", async () => {
    const { services } = makeServices();
    const onBriefViewed = vi.fn();
    const onActivityPresented = vi.fn();
    const user = userEvent.setup();
    renderLessonScreen(services, { onBriefViewed, onActivityPresented });
    expect(onBriefViewed).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("start-lesson"));
    expect(onActivityPresented).toHaveBeenCalledTimes(1);
    expect(onActivityPresented).toHaveBeenCalledWith(lesson.activities[0]?.type, 0);
  });
});
