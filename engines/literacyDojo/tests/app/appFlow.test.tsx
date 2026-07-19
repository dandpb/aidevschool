import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import type { ActivityDefinition } from "../../src/data/generated/lessons";
import { lessons, modules } from "../../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../../src/domain/evidence";
import { createInitialProgress } from "../../src/domain/progress";
import { readyLessonEntries } from "../../src/domain/track";
import { makeServices } from "../helpers";

const ready = readyLessonEntries(modules);
const firstLesson = lessons.find((lesson) => lesson.id === ready[0].id);
if (!firstLesson) throw new Error("primeira lição ausente do read model");

type User = ReturnType<typeof userEvent.setup>;

/** Responde a atividade pelo DOM, 100% dirigido pelo conteúdo gerado. */
async function answerActivity(
  user: User,
  activity: ActivityDefinition,
  mode: "right" | "wrong" | "partial",
) {
  if (activity.type === "output_comparison") {
    const better = activity.evaluation.betterOutputId;
    const wrong = activity.data.outputs.find((output) => output.id !== better);
    if (!wrong) throw new Error("conteúdo sem segunda saída");
    await user.click(screen.getByTestId(`output-${mode === "wrong" ? wrong.id : better}`));
    const required = activity.evaluation.requiredCriterionIds;
    const picked = mode === "right" ? required : mode === "partial" ? required.slice(0, 1) : [];
    for (const id of picked) {
      await user.click(screen.getByTestId(`criterion-${id}`));
    }
    return;
  }
  if (activity.type === "prompt_builder") {
    for (const field of activity.data.fields) {
      const rules = activity.evaluation.fields[field.id] ?? {};
      const token = rules.mustIncludeAny?.[0] ?? "texto";
      const text = mode === "wrong" ? "nada" : `${token} ${"x".repeat(rules.minLength ?? 1)}`;
      await user.type(screen.getByTestId(`field-${field.id}`), text);
    }
    return;
  }
  if (activity.type === "safety_classification") {
    const expected = activity.evaluation.classification;
    for (const item of activity.data.items) {
      let value = expected[item.id];
      if (mode === "wrong") value = value === "safe" ? "sensitive" : "safe";
      await user.click(screen.getByTestId(`item-${item.id}-${value}`));
    }
    return;
  }
  throw new Error(`tipo sem helper de teste: ${activity.type}`);
}

function seededProgress(overrides?: (progress: ReturnType<typeof createInitialProgress>) => void) {
  const progress = createInitialProgress(modules, "test-content-version");
  progress.onboarding = { completed: true };
  overrides?.(progress);
  return progress;
}

describe("fluxo do app (integração)", () => {
  it("onboarding em 3 passos cai direto na primeira lição", async () => {
    const user = userEvent.setup();
    const { services } = makeServices();
    render(<App services={services} />);

    const onboarding = await screen.findByTestId("onboarding-screen");
    expect(onboarding).toBeInTheDocument();

    await user.click(screen.getByTestId("onboarding-option-save_time"));
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-work"));
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-medium"));
    await user.click(screen.getByTestId("onboarding-next"));

    expect(await screen.findByTestId("lesson-intro")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: firstLesson.title })).toBeInTheDocument();
    expect(services.analytics.events.map((event) => event.event)).toContain("onboarding_completed");
  });

  it("lição completa: erro → dica → tentar novamente → acerto → resultado, com evidência por tentativa", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));
    await screen.findByTestId("lesson-intro");
    await user.click(screen.getByTestId("start-lesson"));

    const activity = firstLesson.activities[0];

    // 1) Tentativa errada → feedback "ainda falta X" do conteúdo.
    await answerActivity(user, activity, "wrong");
    await user.click(screen.getByTestId("submit-attempt"));
    const feedback = await screen.findByTestId("feedback-panel");
    expect(feedback).toHaveTextContent(activity.feedback.onFailure);

    // 2) Dica pré-escrita do conteúdo.
    await user.click(screen.getByTestId("hint-button"));
    expect(await screen.findByTestId("hints-list")).toHaveTextContent(activity.hints?.[0] ?? "");

    // 3) Tentar novamente limpa a resposta; 4) acerto → concluir.
    await user.click(screen.getByTestId("retry-activity"));
    await answerActivity(user, activity, "right");
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByText(activity.feedback.onSuccess ?? "Muito bem!");
    await user.click(screen.getByTestId("finish-lesson"));

    // 5) Resultado com a distinção lição concluída ≠ competência verificada.
    const result = await screen.findByTestId("result-screen");
    expect(result).toHaveTextContent("Lição concluída");
    expect(screen.getByTestId("completion-distinction")).toHaveTextContent(
      "competência verificada",
    );

    // 6) Evidência: uma por tentativa avaliada, envelope válido.
    expect(services.evidence.records).toHaveLength(2);
    expect(services.evidence.records.every(isValidEvidenceRecord)).toBe(true);
    expect(services.evidence.records[0].pass).toBe(false);
    expect(services.evidence.records[1].pass).toBe(true);
  });

  it("resposta parcial mostra o check que faltou e não libera a conclusão", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));
    await screen.findByTestId("lesson-intro");
    await user.click(screen.getByTestId("start-lesson"));

    const activity = firstLesson.activities[0];
    if (activity.type !== "output_comparison") throw new Error("piloto mudou de tipo");
    await answerActivity(user, activity, "partial");
    await user.click(screen.getByTestId("submit-attempt"));

    const missingId = activity.evaluation.requiredCriterionIds[1];
    expect(await screen.findByTestId(`feedback-check-${missingId}`)).toHaveTextContent(
      activity.feedback.perCheck?.[missingId] ?? "",
    );
    expect(screen.queryByTestId("finish-lesson")).not.toBeInTheDocument();
  });

  it("retomada: reload com lição em andamento volta direto ao player", async () => {
    const progress = seededProgress((draft) => {
      draft.lessonStatus[firstLesson.id] = "in_progress";
      draft.currentLessonId = firstLesson.id;
    });
    const { services } = makeServices({ progress });
    render(<App services={services} />);

    expect(await screen.findByTestId("lesson-intro")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: firstLesson.title })).toBeInTheDocument();
  });

  it("retomada: trilha concluída volta para home com progresso preservado", async () => {
    const progress = seededProgress((draft) => {
      draft.lessonStatus[firstLesson.id] = "completed";
      draft.xp = 35;
    });
    const { services } = makeServices({ progress });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    expect(screen.getByTestId("xp-value")).toHaveTextContent("35 XP");
    expect(screen.getByTestId("track-progress")).toHaveTextContent(
      `1 de ${ready.length} lições concluídas`,
    );
  });
});
