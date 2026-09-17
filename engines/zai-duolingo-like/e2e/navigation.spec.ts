import { test, expect } from "@playwright/test";
import { wipeLearner, freshOnboardedPage, getLearner } from "./helpers";

test.describe("navigation and home", () => {
  test("home shows learner world: greeting, name, next lesson, daily challenge", async ({ page, request }) => {
    const name = await freshOnboardedPage(page, request, "Navegador");

    // greeting is time-of-day dependent; assert one of the known variants
    const greeting = page.getByText(/^(Bom dia, Compilador|Boa tarde|Boa noite|Madrugada úmida)$/);
    await expect(greeting).toBeVisible();

    // learner name in hero
    await expect(page.getByRole("heading", { name })).toBeVisible();

    // next lesson line
    await expect(page.getByText(/Próxima lição:/)).toBeVisible();

    // primary CTA for fresh state
    await expect(page.getByRole("button", { name: "Começar lição 1" })).toBeVisible();

    // daily challenge card present
    await expect(page.getByText("Desafio do dia")).toBeVisible();
  });

  test("bottom nav navigates between hub views", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Viajante");

    // Trilha → skill path visible
    await page.getByRole("navigation").getByRole("button", { name: "Trilha", exact: true }).click();
    await expect(page.getByText("Trilhe o caminho do Recruta ao Diamante")).toBeVisible();
    await expect(page.getByText("Módulo 1")).toBeVisible();

    // Liga → leaderboard visible
    await page.getByRole("navigation").getByRole("button", { name: "Liga", exact: true }).click();
    await expect(page.getByText("Sua posição")).toBeVisible();
    await expect(page.getByText("Escada das ligas")).toBeVisible();

    // Perfil → profile visible
    await page.getByRole("navigation").getByRole("button", { name: "Perfil", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Viajante" })).toBeVisible();
    await expect(page.getByText("Escada das ligas")).toBeVisible();

    // Início → back home
    await page.getByRole("navigation").getByRole("button", { name: "Início", exact: true }).click();
    await expect(page.getByText(/Próxima lição:/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Começar lição 1" })).toBeVisible();
  });

  test("top bar shows chips: streak, gems, XP, hearts", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Chips");

    // streak chip with "dias" label
    await expect(page.getByText("dias").first()).toBeVisible();

    // gems chip with "gemas" label (scoped: the word also appears elsewhere)
    await expect(page.locator("header").getByText("gemas")).toBeVisible();

    // XP chip
    await expect(page.getByText("XP").first()).toBeVisible();

    // hearts full
    await expect(page.getByText("cheio").first()).toBeVisible();

    // learner name in top bar
    await expect(page.getByText("Chips").first()).toBeVisible();
  });

  test("sound toggle in top bar flips setting server-side", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Som");

    // verify initial sound state (default true)
    const learnerBefore = await getLearner();
    expect(learnerBefore.settings?.sound).toBe(true);

    // click sound toggle (aria-label "Silenciar" when on)
    await page.getByRole("button", { name: "Silenciar" }).click();

    // the settings POST is async — poll the DB until it lands
    await expect.poll(async () => (await getLearner()).settings?.sound).toBe(false);

    // toggle back
    await page.getByRole("button", { name: "Ativar som" }).click();
    await expect.poll(async () => (await getLearner()).settings?.sound).toBe(true);
  });

  test("profile shows learner stats", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Stats");

    await page.getByRole("navigation").getByRole("button", { name: "Perfil", exact: true }).click();

    // name heading + stats section heading
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estatísticas" })).toBeVisible();

    // league + XP line
    await expect(page.getByText(/Liga .* · \d+ XP/)).toBeVisible();

    // stats grid markers
    await expect(page.getByText("Ofensiva").first()).toBeVisible();
    await expect(page.getByText("Vidas").first()).toBeVisible();
    await expect(page.getByText("Gemas").first()).toBeVisible();
    await expect(page.getByText("XP liga").first()).toBeVisible();
  });

  test("settings on profile toggle rain and verify server-side", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Chuva");

    await page.getByRole("navigation").getByRole("button", { name: "Perfil", exact: true }).click();

    // verify initial rain state (default true)
    const learnerBefore = await getLearner();
    expect(learnerBefore.settings?.rain).toBe(true);

    // toggle rain off via Profile UI (switch has aria-label = its label)
    const rainSwitch = page.getByRole("switch", { name: "Chuva de Tóquio (atmosfera)" });
    await rainSwitch.click();

    // the settings POST is async — poll the DB until it lands
    await expect.poll(async () => (await getLearner()).settings?.rain).toBe(false);

    // toggle back on
    await rainSwitch.click();
    await expect.poll(async () => (await getLearner()).settings?.rain).toBe(true);
  });

  test("reset flow: profile reset returns to onboarding and wipes progress", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Reset");

    // navigate to profile
    await page.getByRole("navigation").getByRole("button", { name: "Perfil", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Reset" })).toBeVisible();

    // click reset button
    await page.getByRole("button", { name: "Reiniciar" }).click();

    // confirm reset
    await page.getByRole("button", { name: "Confirmar reinício" }).click();

    // app returns to onboarding
    await expect(page.getByText("Escolha seu caminho")).toBeVisible();

    // verify learner is wiped / back to default state via DB
    const learner = await getLearner();
    expect(learner.name).toBe("Recruta");
    expect(learner.xp).toBe(0);
  });
});
