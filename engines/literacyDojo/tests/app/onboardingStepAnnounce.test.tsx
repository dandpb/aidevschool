import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

/**
 * AID-1150/AID-1134 T1 — contrato de anúncio de mudança de etapa no
 * onboarding (Etapas 2–5): cada transição move o foco para o h1 da nova
 * etapa (tabIndex=-1, padrão do LessonScreen/CheckpointScreen) — o leitor de
 * tela lê a nova pergunta e sai da referência da etapa anterior — e o
 * contador "Etapa N de 5" vive num role="status" (aria-live polite) que
 * atualiza a cada transição. Semânticas separadas: o foco anuncia a pergunta,
 * o status anuncia o passo. Mutations que quebram isso (sem refocus, sem
 * role="status") falham aqui.
 */

function expectFocusedHeading(question: string) {
  // nome acessível do h1 é a pergunta (sem prefixo — o contador é do status)
  const h1 = screen.getByRole("heading", { name: question });
  expect(h1).toHaveAttribute("id", "onboarding-title");
  expect(h1).toHaveFocus();
}

function expectStepStatus(label: string) {
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent(label);
}

describe("AID-1150: anúncio de mudança de etapa no onboarding", () => {
  it("h1 da etapa tem tabIndex=-1 e contador de etapa em role=status (live)", async () => {
    const { services } = makeServices();
    render(<App services={services} />);
    await screen.findByTestId("onboarding-screen");

    expect(screen.getByRole("heading", { name: "Chegue à Vila Lume" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expectStepStatus("Etapa 1 de 5");
  });

  it("cada transição para a Etapa 2–5 move o foco para o h1 e atualiza o status", async () => {
    const user = userEvent.setup();
    const { services } = makeServices();
    render(<App services={services} />);
    await screen.findByTestId("onboarding-screen");

    // Etapa 1 (welcome, sem opção) → Etapa 2
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("O que você quer melhorar com IA?");
    expectStepStatus("Etapa 2 de 5");

    // Etapa 2 (goal) → Etapa 3
    await user.click(screen.getByTestId("onboarding-option-save_time"));
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Onde você mais pretende usar IA?");
    expectStepStatus("Etapa 3 de 5");

    // Etapa 3 (context) → Etapa 4
    await user.click(screen.getByTestId("onboarding-option-work"));
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Como você avalia sua confiança hoje?");
    expectStepStatus("Etapa 4 de 5");

    // Etapa 4 (confidence) → Etapa 5
    await user.click(screen.getByTestId("onboarding-option-medium"));
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Qual situação você quer explorar primeiro?");
    expectStepStatus("Etapa 5 de 5");
  });

  it("voltar também reposiciona o foco no h1 da etapa anterior", async () => {
    const user = userEvent.setup();
    const { services } = makeServices();
    render(<App services={services} />);
    await screen.findByTestId("onboarding-screen");

    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-save_time"));
    await user.click(screen.getByTestId("onboarding-next"));
    await user.click(screen.getByTestId("onboarding-option-work"));
    await user.click(screen.getByTestId("onboarding-next"));

    await user.click(screen.getByRole("button", { name: /Voltar/ }));
    expectFocusedHeading("Onde você mais pretende usar IA?");
    expectStepStatus("Etapa 3 de 5");
  });
});
