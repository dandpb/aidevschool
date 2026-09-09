import { expect, test } from "@playwright/test";

/**
 * AID-1150/AID-1134 T1 — anúncio de mudança de etapa no onboarding
 * (Etapas 2–5), evidência executável no browser: em cada transição o foco
 * cai no h1 da nova etapa (id onboarding-title, tabIndex=-1) e o nome
 * acessível computado é "Etapa N de 5 — {pergunta}" — o conteúdo que o
 * leitor de tela anuncia (verificação manual NVDA/VoiceOver: countersign QA).
 *
 * Mutation-guard: remover o refocus no passo ou o prefixo sr-only do h1
 * quebra os asserts de activeElement/accessibleName abaixo.
 */

const STEPS = [
  { answer: null, heading: "Etapa 2 de 5 — O que você quer melhorar com IA?" },
  {
    answer: "onboarding-option-save_time",
    heading: "Etapa 3 de 5 — Onde você mais pretende usar IA?",
  },
  {
    answer: "onboarding-option-work",
    heading: "Etapa 4 de 5 — Como você avalia sua confiança hoje?",
  },
  {
    answer: "onboarding-option-medium",
    heading: "Etapa 5 de 5 — Qual situação você quer explorar primeiro?",
  },
];

test.describe("AID-1150: onboarding anuncia mudança de etapa (foco no h1 + nome acessível)", () => {
  test("Etapas 2–5: foco no h1 e nome acessível 'Etapa N de 5 — pergunta' após cada transição", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("onboarding-screen")).toBeVisible();

    const h1 = page.locator("#onboarding-title");
    expect(await h1.getAttribute("tabindex")).toBe("-1");

    for (const step of STEPS) {
      if (step.answer) await page.getByTestId(step.answer).check();
      await page.getByTestId("onboarding-next").click();
      await expect(h1).toHaveText(step.heading);
      // activeElement prova o refocus; o outline de foco do h1 é visível
      // (.app-stage h1:focus, AID-1089/W2) para usuários de teclado.
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("onboarding-title");
      expect(
        await h1.evaluate((el) => {
          if (!(el instanceof HTMLElement)) return "";
          return getComputedStyle(el).outlineStyle;
        }),
      ).toBe("solid");
    }

    // o onboarding segue entregando o mapa (fluxo existente intacto)
    await page.getByTestId("onboarding-option-scheduling").check();
    await page.getByTestId("onboarding-next").click();
    await expect(page.getByTestId("map-screen")).toBeVisible();
  });

  test("Voltar também reposiciona o foco no h1 da etapa anterior", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("onboarding-screen")).toBeVisible();

    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-option-save_time").check();
    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-option-work").check();
    await page.getByTestId("onboarding-next").click();

    await page.getByRole("button", { name: /Voltar/ }).click();
    const h1 = page.locator("#onboarding-title");
    await expect(h1).toHaveText("Etapa 3 de 5 — Onde você mais pretende usar IA?");
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("onboarding-title");
  });
});
