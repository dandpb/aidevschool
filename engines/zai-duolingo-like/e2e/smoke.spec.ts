import { test, expect } from "@playwright/test";
import { wipeLearner, freshOnboardedPage } from "./helpers";

test.describe("boot flow", () => {
  test("fresh learner: cinematic → skip → onboarding → home", async ({ page }) => {
    await wipeLearner();
    await page.goto("/");

    // cinematic shows the title script
    await expect(page.getByText("VERTICAL PROTOCOL")).toBeVisible();

    // skip to onboarding
    await page.getByRole("button", { name: "pular introdução" }).click();
    await expect(page.getByText("Escolha seu caminho")).toBeVisible();

    // pick a name + path, start
    await page.getByPlaceholder("Seu codinome de Compilador...").fill("Teste Fumaça");
    await page.getByText("Neon Syntax").click();
    await page.getByRole("button", { name: "Iniciar jornada" }).click();

    // home: hub chrome + learner name in the top bar
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();
    await expect(page.getByText("Teste Fumaça").first()).toBeVisible();
  });

  test("returning learner skips the cinematic straight to home", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Veterano");
    await expect(page.getByText("Veterano").first()).toBeVisible();
    await expect(page.getByText("Próxima lição:")).toBeVisible();
  });
});
