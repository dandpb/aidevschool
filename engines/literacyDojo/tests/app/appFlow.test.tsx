import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import type { ActivityDefinition } from "../../src/data/generated/lessons";
import { lessons, modules } from "../../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../../src/domain/evidence";
import { MAP_INITIAL_LESSON_ID, createInitialProgress } from "../../src/domain/progress";
import { readyLessonEntries } from "../../src/domain/track";
import { InMemoryProgressRepository, createTestServices } from "../fakes";
import { FIXED_NOW, makeServices } from "../helpers";

// O percurso público do app standalone é só ia_pratica; as lições dev
// (mod-05) existem no read model para missões hospedadas do OS.
const publicModules = modules.filter((module) => module.journey === "ia_pratica");
const ready = readyLessonEntries(publicModules);
const firstLesson = lessons.find((lesson) => lesson.id === MAP_INITIAL_LESSON_ID);
if (!firstLesson) throw new Error("Mapa Inicial ausente do read model");
const firstSkillId = firstLesson.skillIds[0];
if (!firstSkillId) throw new Error("Mapa Inicial sem habilidade");

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
  progress.onboarding = { completed: true, taskCategory: "scheduling" };
  progress.lessonStatus.l01 = "locked";
  progress.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
  progress.currentLessonId = MAP_INITIAL_LESSON_ID;
  overrides?.(progress);
  return progress;
}

describe("fluxo do app (integração)", () => {
  it("onboarding acolhe, coleta contexto estruturado e abre o Mapa Inicial", async () => {
    const user = userEvent.setup();
    const { services } = makeServices();
    render(<App services={services} />);

    const onboarding = await screen.findByTestId("onboarding-screen");
    expect(onboarding).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Chegue à Vila Lume" })).toBeInTheDocument();
    expect(screen.getByTestId("vila-lume-scene")).toBeInTheDocument();
    expect(screen.getByTestId("assistant-welcome")).toBeInTheDocument();
    const devCta = screen.getByTestId("dev-track-teaser");
    expect(devCta).toHaveAttribute(
      "href",
      "https://aidevschool-codexdojo-os.netlify.app/?track=dev",
    );
    expect(devCta).toHaveTextContent("Trilha Dev");
    expect(devCta).toHaveTextContent("Abrir no OS");
    expect(devCta).toHaveTextContent("Para programadores");
    expect(devCta).not.toHaveTextContent("Em breve");
    expect(screen.getByText(/Piloto gratuito para maiores de 18 anos/)).toBeInTheDocument();
    expect(screen.getByRole("contentinfo", { name: "Informações do piloto" })).toHaveTextContent(
      "Piloto público gratuito · para maiores de 18 anos",
    );
    for (const linkName of [/Termos do piloto/, /termos do piloto/]) {
      expect(screen.getAllByRole("link", { name: linkName })[0]).toHaveAttribute(
        "href",
        "./termos.html",
      );
    }
    for (const linkName of [/^Privacidade$/, /aviso de privacidade/]) {
      expect(screen.getAllByRole("link", { name: linkName })[0]).toHaveAttribute(
        "href",
        "./privacidade.html",
      );
    }
    expect(screen.getByRole("link", { name: /Pedir suporte/ })).toHaveAttribute(
      "href",
      "https://github.com/dandpb/aidevschool/issues/new",
    );
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-save_time"));
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-work"));
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-medium"));
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-scheduling"));
    await user.click(screen.getByTestId("onboarding-next"));

    expect(await screen.findByTestId("map-screen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa da Vila Lume" })).toHaveFocus();
    expect(screen.getByTestId(`map-lesson-${firstLesson.id}`)).toHaveTextContent(firstLesson.title);
    expect(screen.getByTestId("map-guide")).toHaveTextContent("pedido marcado como Disponível");

    await user.click(screen.getByTestId(`map-start-${firstLesson.id}`));
    expect(await screen.findByTestId("lesson-intro")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: firstLesson.title })).toBeInTheDocument();
    expect(screen.getByTestId("village-request")).toHaveTextContent(firstLesson.objective);
    expect(screen.getByTestId("task-context")).toHaveTextContent("organizar um agendamento");
    expect(screen.queryByTestId("confidence-support")).not.toBeInTheDocument();
    expect((await services.progressRepo.load())?.onboarding).toEqual({
      completed: true,
      goal: "save_time",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
      audience: "ia_pratica",
    });
  });

  it("usa categoria para contextualizar o Mapa Inicial e confiança baixa para oferecer apoio", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({
      progress: seededProgress((draft) => {
        draft.onboarding.confidence = "low";
        draft.onboarding.taskCategory = "news_research";
      }),
    });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));

    expect(await screen.findByTestId("task-context")).toHaveTextContent("pesquisar uma notícia");
    expect(screen.getByTestId("confidence-support")).toHaveTextContent("Dica de partida");
  });

  it("mapa público limita IA na Prática ao catálogo ia_pratica (17 com l20) e mantém Dev fora do percurso", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    expect(screen.getByTestId("track-progress")).toHaveTextContent("0 de 17 lições concluídas");
    await user.click(screen.getByTestId("open-map"));

    expect(await screen.findByTestId("map-screen")).toHaveTextContent("0/17 missões");
    expect(screen.queryByTestId("map-lesson-l15")).not.toBeInTheDocument();
    expect(screen.getByTestId("map-lesson-l18")).toBeInTheDocument();
    expect(screen.getByTestId("map-lesson-l19")).toBeInTheDocument();
    expect(screen.getByTestId("map-lesson-l20")).toBeInTheDocument();
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
    expect(screen.getByTestId("route-explanation")).toHaveTextContent(
      "fez uma checagem extra ou pediu apoio",
    );
    expect(await screen.findByTestId("result-task-context")).toHaveTextContent(
      "organizar um agendamento",
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

  it("explica a rota guiada sem atribuir erro a quem pediu dica antes de responder", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));
    await user.click(screen.getByTestId("start-lesson"));
    await user.click(screen.getByTestId("hint-button"));
    await answerActivity(user, firstLesson.activities[0], "right");
    await user.click(screen.getByTestId("submit-attempt"));
    await user.click(screen.getByTestId("finish-lesson"));

    expect(await screen.findByTestId("route-explanation")).toHaveTextContent(
      "fez uma checagem extra ou pediu apoio",
    );
    expect(screen.getByTestId("route-explanation")).not.toHaveTextContent(
      "primeira resposta precisou",
    );
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

  it("só exibe a lição depois de persistir o estado necessário para retomada", async () => {
    const user = userEvent.setup();
    const progressRepo = new InMemoryProgressRepository();
    progressRepo.seed(seededProgress());
    let releaseSave = () => {};
    let signalSaveStarted = () => {};
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const saveStarted = new Promise<void>((resolve) => {
      signalSaveStarted = resolve;
    });
    const save = progressRepo.save.bind(progressRepo);
    vi.spyOn(progressRepo, "save").mockImplementation(async (next) => {
      if (next.lessonStatus[firstLesson.id] === "in_progress") {
        signalSaveStarted();
        await saveGate;
      }
      await save(next);
    });
    render(<App services={createTestServices({ progressRepo })} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));
    await saveStarted;
    const visibleWhileSaving = screen.queryByTestId("lesson-intro") !== null;
    releaseSave();

    expect(visibleWhileSaving).toBe(false);
    expect(await screen.findByTestId("lesson-intro")).toBeInTheDocument();
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

  it("revisão no Progresso usa somente uma lição concluída e valida a abertura", async () => {
    const user = userEvent.setup();
    const progress = seededProgress((draft) => {
      draft.lessonStatus[firstLesson.id] = "completed";
      draft.skills[firstSkillId] = {
        skillId: firstSkillId,
        attempts: 1,
        passes: 1,
        lastScore: 1,
        lastPracticedAt: new Date(FIXED_NOW.getTime() - 86_400_000).toISOString(),
        nextReviewAt: new Date(FIXED_NOW.getTime() - 1).toISOString(),
      };
    });
    const { services } = makeServices({ progress });
    const startReview = vi.spyOn(services.useCases, "startReview");
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("open-progress"));
    const review = await screen.findByTestId(`progress-review-${firstLesson.id}`);
    expect(screen.queryByTestId("progress-review-l03")).not.toBeInTheDocument();
    expect(screen.queryByTestId("progress-review-l14")).not.toBeInTheDocument();

    await user.click(review);

    expect(startReview).toHaveBeenCalledWith(firstLesson.id);
    expect(await screen.findByTestId("lesson-intro")).toBeInTheDocument();
  });
});
