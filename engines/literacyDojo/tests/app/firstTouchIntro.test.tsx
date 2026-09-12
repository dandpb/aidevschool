import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App, AppShell } from "../../src/app/App";
import { createServices } from "../../src/app/services";
import type { ContentRepository } from "../../src/application/ports";
import type { ActivityDefinition, LessonDefinition } from "../../src/data/generated/lessons";
import { ANALYTICS_ACTIVITY_TYPES, type AnalyticsActivityType } from "../../src/domain/analytics";
import {
  FIRST_TOUCH_LEAD_IN,
  FIRST_TOUCH_PHRASES,
  firstTouchPhrase,
} from "../../src/domain/firstTouch";
import {
  type LearnerProgress,
  MAP_INITIAL_LESSON_ID,
  createInitialProgress,
} from "../../src/domain/progress";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";
import { FIXED_NOW, makeServices } from "../helpers";

/**
 * F1 `2026-09-10-activation-first-activity` (spec R1/R2, plan P1–P5):
 * - intro da lição declara o 1º toque (lead-in fixo "Primeiro passo:" + frase
 *   do `activities[0].type` via mapa fechado — spec Anexo A verbatim);
 * - modo revisão herda a mesma frase (sem bifurcação de copy);
 * - missão hospedada herda pela mesma tela (adapter OS intocado);
 * - player: framing de primeiro toque SOMENTE no índice 0; "Pedir dica"
 *   permanece; zero mudança em submit/feedback/retry/hint-policy.
 *
 * Guard de drift P1: o mapa `Record<AnalyticsActivityType, string>` é
 * exaustivo por construção — key nova sem frase quebra a compilação.
 */

const FRAMING_COPY = "Primeira atividade — tente com o que você sabe; se travar, peça uma dica";

function seededProgress(): LearnerProgress {
  const progress = createInitialProgress(
    makeServices().services.content.listModules(),
    makeServices().services.content.getContentVersion(),
  );
  progress.onboarding = { completed: true, taskCategory: "scheduling" };
  progress.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
  progress.currentLessonId = MAP_INITIAL_LESSON_ID;
  return progress;
}

/** Fixture mínima por tipo — 1ª atividade de l02 substituída pelo tipo dado. */
function firstActivityOfType(type: AnalyticsActivityType): ActivityDefinition {
  const base = {
    id: "l02-a1-fixture",
    skillId: "avaliar" as const,
    instruction: "Instrução de fixture.",
    feedback: { onFailure: "Tente de novo." },
    storage: { policy: "structured_only" as const },
  };
  switch (type) {
    case "choice":
      return {
        ...base,
        type,
        data: {
          options: [
            { id: "opt-a", text: "Opção A" },
            { id: "opt-b", text: "Opção B" },
          ],
        },
        evaluation: { strategy: "deterministic", correctOptionIds: ["opt-a"] },
      };
    case "sort":
      return {
        ...base,
        type,
        data: {
          items: [
            { id: "s-1", text: "Parte 1" },
            { id: "s-2", text: "Parte 2" },
          ],
        },
        evaluation: { strategy: "deterministic", expectedOrder: ["s-1", "s-2"] },
      };
    case "missing_context":
      return {
        ...base,
        type,
        data: {
          prompt: "Pedido que saiu torto.",
          contextOptions: [{ id: "ctx-a", text: "Contexto A" }],
        },
        evaluation: { strategy: "deterministic", requiredContextIds: ["ctx-a"] },
      };
    case "safety_classification":
      return {
        ...base,
        type,
        data: {
          labels: { safe: "Seguro", sensitive: "Sensível" },
          items: [{ id: "it-1", text: "Item 1" }],
        },
        evaluation: { strategy: "deterministic", classification: { "it-1": "safe" } },
      };
    case "prompt_builder":
      return {
        ...base,
        type,
        data: {
          scenario: "Cenário de fixture.",
          genericPrompt: "Pedido genérico",
          fields: [{ id: "f-1", label: "Campo", hint: "Preencha curto" }],
        },
        evaluation: { strategy: "deterministic", fields: { "f-1": { minLength: 2 } } },
      };
    case "output_comparison":
      return {
        ...base,
        type,
        data: {
          scenario: "Cenário de fixture.",
          outputs: [
            { id: "out-a", text: "Saída A" },
            { id: "out-b", text: "Saída B" },
          ],
          criteria: [{ id: "c-1", text: "Critério" }],
        },
        evaluation: {
          strategy: "deterministic",
          betterOutputId: "out-b",
          requiredCriterionIds: ["c-1"],
        },
      };
    case "rubric_review":
      return {
        ...base,
        type,
        data: {
          responseText: "Resposta de fixture.",
          criteria: [{ id: "r-1", text: "Critério" }],
        },
        evaluation: { strategy: "deterministic", expectedVerdicts: { "r-1": "met" } },
      };
  }
}

function canonicalLesson(): LessonDefinition {
  const lesson = makeServices().services.content.getLesson(MAP_INITIAL_LESSON_ID);
  if (lesson === undefined) throw new Error("lição canônica não encontrada");
  return lesson;
}

function lessonWithFirstActivityOfType(type: AnalyticsActivityType): LessonDefinition {
  const base = canonicalLesson();
  return { ...base, activities: [firstActivityOfType(type), ...base.activities.slice(1)] };
}

/** Repositório de conteúdo pinado (padrão tests/app/retrofitNotice.test.tsx). */
function pinnedContent(lesson: LessonDefinition, scaffold: ContentRepository): ContentRepository {
  return {
    ...scaffold,
    getLesson: (lessonId: string) =>
      lessonId === lesson.id ? lesson : scaffold.getLesson(lessonId),
  };
}

function makeServicesWithLesson(
  lesson: LessonDefinition,
  progress: LearnerProgress = seededProgress(),
) {
  const progressRepo = new InMemoryProgressRepository();
  progressRepo.seed(progress);
  const scaffold = makeServices().services;
  const services = createServices({
    progressRepo,
    evidence: new InMemoryEvidenceSink(),
    clock: fixedClock(FIXED_NOW),
    content: pinnedContent(lesson, scaffold.content),
  });
  return { services, progressRepo };
}

async function openIntro(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByTestId("home-screen");
  await user.click(screen.getByTestId("continue-button"));
  return screen.findByTestId("lesson-intro");
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("F1 R1/P1+P2: intro declara o 1º toque (mapa fechado, Anexo A verbatim)", () => {
  it.each([...ANALYTICS_ACTIVITY_TYPES])(
    "intro de l02 com 1ª atividade %s exibe lead-in + frase do tipo, antes do CTA",
    async (type) => {
      const user = userEvent.setup();
      render(
        <App services={makeServicesWithLesson(lessonWithFirstActivityOfType(type)).services} />,
      );

      const intro = await openIntro(user);
      const block = within(intro).getByTestId("first-touch");
      expect(block).toHaveTextContent(FIRST_TOUCH_LEAD_IN);
      expect(block).toHaveTextContent(FIRST_TOUCH_PHRASES[type]);
      // Colocação do Anexo A: o bloco vem antes do CTA "Começar missão".
      const cta = within(intro).getByTestId("start-lesson");
      expect(block.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    },
  );

  it("guard de drift: mapa first-touch cobre exatamente o enum fechado de 7", () => {
    expect(Object.keys(FIRST_TOUCH_PHRASES).sort()).toEqual([...ANALYTICS_ACTIVITY_TYPES].sort());
    for (const type of ANALYTICS_ACTIVITY_TYPES) {
      expect(firstTouchPhrase(type)).toBe(FIRST_TOUCH_PHRASES[type]);
      expect(firstTouchPhrase(type).length).toBeGreaterThan(0);
    }
    // Guard do fixture output_comparison (spec R1): sempre DUAS saídas.
    const fixture = firstActivityOfType("output_comparison");
    if (fixture.type !== "output_comparison") throw new Error("fixture errada");
    expect(fixture.data.outputs).toHaveLength(2);
    // Guard choice (número-neutro): fixture não fixa single/multi-select.
    const choice = firstActivityOfType("choice");
    if (choice.type !== "choice") throw new Error("fixture errada");
    expect(choice.data.multiSelect).toBeUndefined();
  });

  it("modo revisão herda a mesma frase do tipo da 1ª atividade (sem bifurcação)", async () => {
    const user = userEvent.setup();
    const progress = seededProgress();
    progress.lessonStatus[MAP_INITIAL_LESSON_ID] = "completed";
    progress.skills.avaliar = {
      skillId: "avaliar",
      attempts: 1,
      passes: 1,
      lastScore: 1,
      lastPracticedAt: new Date(FIXED_NOW.getTime() - 86_400_000).toISOString(),
      nextReviewAt: new Date(FIXED_NOW.getTime() - 1_000).toISOString(),
    };
    render(<App services={makeServicesWithLesson(canonicalLesson(), progress).services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("review-button"));
    const intro = await screen.findByTestId("lesson-intro");
    const block = within(intro).getByTestId("first-touch");
    expect(block).toHaveTextContent(FIRST_TOUCH_LEAD_IN);
    expect(block).toHaveTextContent(FIRST_TOUCH_PHRASES.output_comparison);
  });

  it("missão hospedada (adapter OS) herda o bloco pela mesma tela", async () => {
    window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
    vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    const { services } = makeServicesWithLesson(canonicalLesson());
    render(<AppShell services={services} hostAdapter={new LiteracyMissionAdapter()} />);

    const envelope = (type: string, payload: Record<string, unknown>) => ({
      protocol: "aidevschool.host-engine",
      version: "1.0",
      type,
      messageId: `${type}-1`,
      hostSessionId: "host-1",
      missionRunId: "run-1",
      engineId: "literacyDojo",
      sentAt: "2026-09-11T12:00:00.000Z",
      payload,
    });
    // O boot hospedado é assíncrono: espera o adaptador escutar antes de
    // despachar as mensagens do host (padrão tests/app/retrofitNotice).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("host.hello", {
            missionId: MAP_INITIAL_LESSON_ID,
            protocolVersion: "1.0",
          }),
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("mission.launch", {
            missionId: MAP_INITIAL_LESSON_ID,
            missionVersion: canonicalLesson().version,
            mode: "initial",
            locale: "pt-BR",
          }),
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const intro = await screen.findByTestId("lesson-intro");
    const block = within(intro).getByTestId("first-touch");
    expect(block).toHaveTextContent(FIRST_TOUCH_LEAD_IN);
    expect(block).toHaveTextContent(FIRST_TOUCH_PHRASES.output_comparison);
  });
});

describe("F1 R2/P3: framing de primeiro toque somente no índice 0", () => {
  async function enterPlayer(user: ReturnType<typeof userEvent.setup>) {
    await openIntro(user);
    await user.click(screen.getByTestId("start-lesson"));
    return screen.findByTestId("lesson-player");
  }

  it("índice 0 exibe o framing no eyebrow e mantém o botão Pedir dica", async () => {
    const user = userEvent.setup();
    render(<App services={makeServicesWithLesson(canonicalLesson()).services} />);

    const player = await enterPlayer(user);
    const framing = within(player).getByTestId("first-activity-framing");
    expect(framing).toHaveTextContent(FRAMING_COPY);
    expect(screen.getByTestId("hint-button")).toBeInTheDocument();
  });

  it("índice >0 não exibe o framing (eyebrow inalterado)", async () => {
    const user = userEvent.setup();
    render(<App services={makeServicesWithLesson(canonicalLesson()).services} />);

    await enterPlayer(user);
    // Resposta correta de l02-a1 (output_comparison): out-b + critérios exigidos.
    await user.click(screen.getByTestId("output-out-b"));
    await user.click(screen.getByTestId("criterion-c-fontes"));
    await user.click(screen.getByTestId("criterion-c-limites"));
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("feedback-panel");
    await user.click(screen.getByTestId("next-activity"));

    const player = await screen.findByTestId("lesson-player");
    expect(within(player).queryByTestId("first-activity-framing")).not.toBeInTheDocument();
    expect(screen.queryByText(FRAMING_COPY)).not.toBeInTheDocument();
  });
});
