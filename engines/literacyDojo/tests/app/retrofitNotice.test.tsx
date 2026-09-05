import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RETROFIT_ACKS_KEY } from "../../src/adapters/storageKeys";
import { App, AppShell } from "../../src/app/App";
import { createInitialProgress } from "../../src/domain/progress";
import { RETROFIT_NOTICE_S1, RETROFIT_NOTICE_S2 } from "../../src/domain/retrofitNotice";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { FIXED_NOW, makeServices } from "../helpers";

/**
 * Aviso de retrofit (O3-C1 spec AID-644 rev 2 §3 + A5; onda C1 spec AID-807
 * §1.1.3): S1 no card de revisão do Home, S2 na intro da lição (1× por
 * learner/lição/bump), item D pluraliza a copy de review.
 *
 * A onda C1 retrofitou apenas l15–l17 (journey dev), que o app avulso não
 * publica na trilha (mod-05 fora de listModules) — o caminho positivo do
 * aviso nesta onda é o lançamento HOSPEDADO da missão dev (contrato do OS),
 * que valida missionVersion = 2 (bump da onda) e exibe S2 na intro.
 */

/** Learner dev que concluiu l15 na onda anterior, com revisão de decidir vencida. */
function retrofittedLearnerServices() {
  const scaffold = makeServices();
  const progress = createInitialProgress(
    scaffold.services.content.listModules(),
    scaffold.services.content.getContentVersion(),
  );
  progress.onboarding = { completed: true, taskCategory: "scheduling" };
  progress.lessonStatus.l15 = "completed";
  progress.currentLessonId = "l15";
  progress.skills.decidir = {
    skillId: "decidir",
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: new Date(FIXED_NOW.getTime() - 86_400_000).toISOString(),
    nextReviewAt: new Date(FIXED_NOW.getTime() - 1_000).toISOString(),
  };
  return makeServices({ progress }).services;
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("aviso de retrofit no app (S1/S2/item D; onda C1 = l15–l17 hospedadas)", () => {
  it("app avulso (trilha ia_pratica): card de revisão renderiza, mas S1 NÃO — a onda C1 é dev-only", async () => {
    // Pin negativo da onda: nenhum módulo público foi retrofitado neste bump,
    // portanto nenhuma lição visível no Home pode exibir o aviso S1.
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
    render(<App services={makeServices({ progress }).services} />);

    await screen.findByTestId("home-screen");
    expect(await screen.findByTestId("review-button")).toBeInTheDocument();
    expect(screen.queryByTestId("retrofit-notice-s1")).not.toBeInTheDocument();
    expect(RETROFIT_NOTICE_S1).toBe(
      "Esta lição ganhou atividades novas — sua conclusão continua valendo.",
    );

    // Item D (copy de review no plural) segue genérica à revisão da trilha.
    const user = userEvent.setup();
    await user.click(screen.getByTestId("review-button"));
    const intro = await screen.findByTestId("lesson-intro");
    expect(intro).toHaveTextContent("refaça as atividades desta lição");
    await user.click(screen.getByRole("button", { name: "Sair da revisão" }));
  });

  it("missão hospedada l15 (missionVersion 2): S2 na intro, ack estruturado, idempotente por bump", async () => {
    window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
    vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
    const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);

    const services = retrofittedLearnerServices();
    const adapter = new LiteracyMissionAdapter();
    const view = render(<AppShell services={services} hostAdapter={adapter} />);

    const envelope = (type: string, payload: Record<string, unknown>) => ({
      protocol: "aidevschool.host-engine",
      version: "1.0",
      type,
      messageId: `${type}-1`,
      hostSessionId: "host-1",
      missionRunId: "run-1",
      engineId: "literacyDojo",
      sentAt: "2026-09-04T12:00:00.000Z",
      payload,
    });
    // O boot hospedado é assíncrono: espera o adaptador estar escutando
    // antes de despachar as mensagens do host.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("host.hello", { missionId: "l15", protocolVersion: "1.0" }),
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("mission.launch", {
            missionId: "l15",
            missionVersion: 2,
            mode: "initial",
            locale: "pt-BR",
          }),
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // O contrato hospedado recusa versão de missão que não a da onda (2).
    // A intro exibe S2 1× e o ack viaja para o armazenamento estruturado.
    await screen.findByTestId("lesson-intro");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Quando usar IA e quando não usar",
    );
    expect(screen.getByTestId("retrofit-notice-s2")).toHaveTextContent(RETROFIT_NOTICE_S2);
    expect(window.localStorage.getItem(RETROFIT_ACKS_KEY)).toBe(
      JSON.stringify({ l15: services.content.getContentVersion() }),
    );
    expect(postMessage).toHaveBeenCalled();

    // Reentrada em NOVA sessão hospedada (o OS remonta o motor por página de
    // missão): o ack persistido suprime o S2 — idempotência A5 por bump.
    view.unmount();
    const adapter2 = new LiteracyMissionAdapter();
    render(<AppShell services={services} hostAdapter={adapter2} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("host.hello", { missionId: "l15", protocolVersion: "1.0" }),
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("mission.launch", {
            missionId: "l15",
            missionVersion: 2,
            mode: "initial",
            locale: "pt-BR",
          }),
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
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
