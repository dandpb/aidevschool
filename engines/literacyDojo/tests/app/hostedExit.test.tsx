import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { ErrorRecoveryScreen } from "../../src/screens/ErrorRecoveryScreen";
import { LessonScreen } from "../../src/screens/LessonScreen";
import { makeServices } from "../helpers";

describe("saída da missão", () => {
  it("mantém a saída da lição autônoma", async () => {
    const { services, initial } = makeServices();
    const onExit = vi.fn();
    render(
      <ServicesProvider value={services}>
        <LessonScreen
          lessonId={MAP_INITIAL_LESSON_ID}
          onboarding={initial.onboarding}
          onProgressChange={() => {}}
          onCompleted={() => {}}
          onExit={onExit}
        />
      </ServicesProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sair da lição" }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("orienta recuperação hospedada sem oferecer volta inoperante", () => {
    render(<ErrorRecoveryScreen message="Falha" hosted />);
    expect(screen.getByText(/use a navegação do aplicativo que abriu esta missão/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/voltar ao mapa/i)).not.toBeInTheDocument();
  });
});
