import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

function setup() {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l01 = "locked";
  initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
  initial.currentLessonId = MAP_INITIAL_LESSON_ID;
  stateStore.seedProgress(initial);
  return services;
}

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-lesson"));
}

describe("dica antes de responder", () => {
  it("mostra falha sem expor erro e permite pedir novamente", async () => {
    const user = userEvent.setup();
    const services = setup();
    vi.spyOn(services.useCases, "requestHint").mockRejectedValueOnce(new Error("private error"));
    render(<App services={services} />);
    await enter(user);
    await user.click(screen.getByTestId("hint-button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar a dica");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private error");
    await user.click(screen.getByTestId("hint-button"));
    expect(await screen.findByTestId("hints-list")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("impede duplicação de pedido e conflito com resposta enquanto a dica carrega", async () => {
    const user = userEvent.setup();
    const services = setup();
    const original = services.useCases.requestHint.bind(services.useCases);
    let release!: () => void;
    const request = vi.spyOn(services.useCases, "requestHint").mockImplementation(
      (input) =>
        new Promise((resolve) => {
          release = () => resolve(original(input));
        }),
    );
    render(<App services={services} />);
    await enter(user);
    await user.click(screen.getByTestId("output-out-a"));
    const button = screen.getByTestId("hint-button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(request).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("hint-busy")).toHaveTextContent("Buscando dica");
    expect(screen.getByTestId("submit-attempt")).toBeDisabled();
    expect(screen.getByTestId("output-out-a")).toBeDisabled();
    await act(async () => {
      release();
    });
    expect(await screen.findByTestId("hints-list")).toBeVisible();
    expect(screen.getByTestId("submit-attempt")).toBeEnabled();
  });

  it("não solicita dica nem permite editar resposta enquanto verifica a tentativa", async () => {
    const user = userEvent.setup();
    const services = setup();
    const original = services.useCases.submitActivityAttempt.bind(services.useCases);
    let release!: () => void;
    vi.spyOn(services.useCases, "submitActivityAttempt").mockImplementation(
      (input) =>
        new Promise((resolve) => {
          release = () => resolve(original(input));
        }),
    );
    const request = vi.spyOn(services.useCases, "requestHint");
    render(<App services={services} />);
    await enter(user);
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    expect(screen.getByTestId("output-out-a")).toBeDisabled();
    expect(screen.getByTestId("hint-button")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByTestId("hint-button"));
    expect(request).not.toHaveBeenCalled();
    await act(async () => {
      release();
    });
    expect(await screen.findByTestId("feedback-panel")).toBeVisible();
  });

  it("não inicia outra ação nem duplica o retry enquanto ele está pendente", async () => {
    const user = userEvent.setup();
    const services = setup();
    render(<App services={services} />);
    await enter(user);
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("feedback-panel");
    const original = services.useCases.retryActivity.bind(services.useCases);
    let release!: () => void;
    const retry = vi.spyOn(services.useCases, "retryActivity").mockImplementation(
      (input) =>
        new Promise((resolve) => {
          release = () => resolve(original(input));
        }),
    );
    const hint = vi.spyOn(services.useCases, "requestHint");
    const submit = vi.spyOn(services.useCases, "submitActivityAttempt");
    const retryButton = screen.getByTestId("retry-activity");
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(screen.getByTestId("hint-button"));
    fireEvent.click(screen.getByTestId("submit-attempt"));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(hint).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(retryButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("retry-busy")).toHaveTextContent("Reiniciando tentativa");
    await act(async () => {
      release();
    });
    expect(screen.queryByTestId("feedback-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("output-out-a")).not.toBeChecked();
  });

  it("mantém foco ao falhar o retry e volta à atividade quando ele é repetido", async () => {
    const user = userEvent.setup();
    const services = setup();
    render(<App services={services} />);
    await enter(user);
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("feedback-panel");
    vi.spyOn(services.useCases, "retryActivity").mockRejectedValueOnce(new Error("private error"));
    const retryButton = screen.getByTestId("retry-activity");
    retryButton.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível reiniciar");
    expect(retryButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("feedback-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
});
