import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

/**
 * AID-1150/AID-1134 T1 — contrato de anúncio de mudança de etapa no
 * onboarding (Etapas 2–5): cada transição move o foco para o h1 da nova
 * etapa (tabIndex=-1, padrão do LessonScreen/CheckpointScreen) e o nome
 * acessível do h1 carrega "Etapa N de 5 — {pergunta}", que é o que o leitor
 * de tela anuncia na transição. Mutations que quebram isso (sem refocus,
 * sem prefixo sr-only) falham aqui.
 */

function expectFocusedHeading(name: string) {
  // getByRole com name usa o nome acessível computado — o prefixo sr-only
  // entra no cálculo, então o match prova o texto do anúncio.
  const h1 = screen.getByRole("heading", { name });
  expect(h1).toHaveAttribute("id", "onboarding-title");
  expect(h1).toHaveFocus();
}

describe("AID-1150: anúncio de mudança de etapa no onboarding", () => {
  it("h1 da etapa tem tabIndex=-1 e nome acessível 'Etapa 1 de 5 — Chegue à Vila Lume'", async () => {
    const { services } = makeServices();
    render(<App services={services} />);
    await screen.findByTestId("onboarding-screen");

    const h1 = screen.getByRole("heading", { name: "Etapa 1 de 5 — Chegue à Vila Lume" });
    expect(h1).toHaveAttribute("tabindex", "-1");
  });

  it("cada transição para a Etapa 2–5 move o foco para o h1 da nova etapa", async () => {
    const user = userEvent.setup();
    const { services } = makeServices();
    render(<App services={services} />);
    await screen.findByTestId("onboarding-screen");

    // Etapa 1 (welcome, sem opção) → Etapa 2
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Etapa 2 de 5 — O que você quer melhorar com IA?");

    // Etapa 2 (goal) → Etapa 3
    await user.click(screen.getByTestId("onboarding-option-save_time"));
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Etapa 3 de 5 — Onde você mais pretende usar IA?");

    // Etapa 3 (context) → Etapa 4
    await user.click(screen.getByTestId("onboarding-option-work"));
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Etapa 4 de 5 — Como você avalia sua confiança hoje?");

    // Etapa 4 (confidence) → Etapa 5
    await user.click(screen.getByTestId("onboarding-option-medium"));
    await user.click(screen.getByTestId("onboarding-next"));
    expectFocusedHeading("Etapa 5 de 5 — Qual situação você quer explorar primeiro?");
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
    expectFocusedHeading("Etapa 3 de 5 — Onde você mais pretende usar IA?");
  });
});
