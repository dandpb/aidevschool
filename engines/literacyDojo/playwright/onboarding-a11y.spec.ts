import { type Page, expect, test } from "@playwright/test";

/**
 * AID-1150/AID-1134 T1 — anúncio de mudança de etapa no onboarding
 * (Etapas 2–5), evidência executável no browser: em cada transição o foco
 * cai no h1 da nova etapa (id onboarding-title, tabIndex=-1) e o contador
 * "Etapa N de 5" vive num role="status" (aria-live polite) — o conteúdo que
 * o leitor de tela anuncia na transição (verificação manual
 * NVDA/VoiceOver: countersign QA, relay AID-1157).
 *
 * Mutation-guard: remover o refocus no passo ou o role="status" quebra os
 * asserts de activeElement/status abaixo.
 */

const STEPS = [
  { answer: null, heading: "O que você quer melhorar com IA?", status: "Etapa 2 de 5" },
  {
    answer: "onboarding-option-save_time",
    heading: "Onde você mais pretende usar IA?",
    status: "Etapa 3 de 5",
  },
  {
    answer: "onboarding-option-work",
    heading: "Como você avalia sua confiança hoje?",
    status: "Etapa 4 de 5",
  },
  {
    answer: "onboarding-option-medium",
    heading: "Qual situação você quer explorar primeiro?",
    status: "Etapa 5 de 5",
  },
];

async function expectAnnounced(page: Page, heading: string, status: string) {
  const h1 = page.locator("#onboarding-title");
  await expect(h1).toHaveText(heading);
  // activeElement prova o refocus; o outline de foco do h1 é visível
  // (.app-stage h1:focus, AID-1089/W2) para usuários de teclado.
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("onboarding-title");
  expect(
    await h1.evaluate((el) => {
      if (!(el instanceof HTMLElement)) return "";
      return getComputedStyle(el).outlineStyle;
    }),
  ).toBe("solid");
  // contador de etapa em live region (role=status tem aria-live polite implícito)
  await expect(page.getByRole("status")).toHaveText(status);
}

test.describe("AID-1150: onboarding anuncia mudança de etapa (foco no h1 + status Etapa N de 5)", () => {
  test("Etapas 2–5: foco no h1 e contador em role=status após cada transição", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("onboarding-screen")).toBeVisible();

    const h1 = page.locator("#onboarding-title");
    expect(await h1.getAttribute("tabindex")).toBe("-1");
    await expect(page.getByRole("status")).toHaveText("Etapa 1 de 5");

    for (const step of STEPS) {
      if (step.answer) await page.getByTestId(step.answer).check();
      await page.getByTestId("onboarding-next").click();
      await expectAnnounced(page, step.heading, step.status);
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
    await expectAnnounced(page, "Onde você mais pretende usar IA?", "Etapa 3 de 5");
  });
});
