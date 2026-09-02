import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RETROFIT_ACKS_KEY } from "../../src/adapters/storageKeys";
import { App } from "../../src/app/App";
import { createInitialProgress } from "../../src/domain/progress";
import { RETROFIT_NOTICE_S1, RETROFIT_NOTICE_S2 } from "../../src/domain/retrofitNotice";
import { FIXED_NOW, makeServices } from "../helpers";

/**
 * Aviso de retrofit O3-C1 (spec AID-644 rev 2 §3 + A5): S1 no card de revisão
 * do Home, S2 na intro da lição (1× por learner/lição/bump), item D pluraliza
 * a copy de review. Percorre o App real com progresso semeado.
 */

/** Learner que concluiu l01 na onda anterior, com revisão de entender vencida. */
function retrofittedLearnerServices() {
  const scaffold = makeServices();
  const progress = createInitialProgress(
    scaffold.services.content.listModules(),
    scaffold.services.content.getContentVersion(),
  );
  progress.onboarding = { completed: true, taskCategory: "scheduling" };
  progress.lessonStatus.l01 = "completed";
  progress.currentLessonId = "l02";
  progress.skills.entender = {
    skillId: "entender",
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: new Date(FIXED_NOW.getTime() - 86_400_000).toISOString(),
    nextReviewAt: new Date(FIXED_NOW.getTime() - 1_000).toISOString(),
  };
  return makeServices({ progress }).services;
}

afterEach(() => {
  window.localStorage.clear();
});

describe("aviso de retrofit no app (S1/S2/item D, O3-C1)", () => {
  it("S1 aparece no card de revisão do Home quando a revisão devida é de lição retrofitada", async () => {
    const services = retrofittedLearnerServices();
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    expect(await screen.findByTestId("retrofit-notice-s1")).toHaveTextContent(RETROFIT_NOTICE_S1);
    expect(screen.getByTestId("review-button")).toBeInTheDocument();
  });

  it("S2 aparece 1× na intro da revisão e não reaparece na reentrada; item D plural aplicado", async () => {
    const user = userEvent.setup();
    const services = retrofittedLearnerServices();
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("review-button"));

    const intro = await screen.findByTestId("lesson-intro");
    expect(screen.getByTestId("retrofit-notice-s2")).toHaveTextContent(RETROFIT_NOTICE_S2);
    // Item D: copy de review no plural (lições retrofitadas rodam 3 atividades).
    expect(intro).toHaveTextContent("refaça as atividades desta lição");
    // O ack viajou para o armazenamento local estruturado.
    expect(window.localStorage.getItem(RETROFIT_ACKS_KEY)).toBe(
      JSON.stringify({ l01: services.content.getContentVersion() }),
    );

    // Sai da revisão e volta ao Home; a revisão continua pendente, S1 continua,
    // mas S2 é idempotente por bump — não reaparece na segunda execução.
    await user.click(screen.getByRole("button", { name: "Sair da revisão" }));
    await screen.findByTestId("map-screen");
    await user.click(screen.getByTestId("map-back"));
    await screen.findByTestId("home-screen");
    expect(screen.getByTestId("retrofit-notice-s1")).toBeInTheDocument();
    await user.click(screen.getByTestId("review-button"));
    await screen.findByTestId("lesson-intro");
    expect(screen.queryByTestId("retrofit-notice-s2")).not.toBeInTheDocument();
  });

  it("learner sem lição concluída não vê aviso de retrofit", async () => {
    const scaffold = makeServices();
    const progress = createInitialProgress(
      scaffold.services.content.listModules(),
      scaffold.services.content.getContentVersion(),
    );
    progress.onboarding = { completed: true, taskCategory: "scheduling" };
    render(<App services={makeServices({ progress }).services} />);

    await screen.findByTestId("home-screen");
    expect(screen.queryByTestId("retrofit-notice-s1")).not.toBeInTheDocument();
  });
});
