import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

/**
 * AID-5190/W7 — contrato de componentes HUD (design-foundations §7.2/§7.3)
 * no literacyDojo: anatomia canônica dos 4 papéis com testids `hud-*`,
 * medidor com `role="progressbar"` + `aria-valuetext` (B9c), MasteryBadge
 * cor+texto+glifo (B3) — bounded context local: máximo "concluídas", nunca
 * mastered (§7.4) —, ReviewDue reason+dueIn pt-BR derivado do
 * `nextReviewAt`, live region de sequência/revisões e responsividade
 * 375/768/1280 com alvos ≥44px (B6).
 *
 * Especificação compartilhada entre engines (mesma forma de asserts em
 * dojoToday e codexdojo-os-prototype — métrica HUD §6 do contrato).
 *
 * Cenário: corredor semeado (l01–l03 concluídas) + nextReviewAt manipulado
 * para o passado (harness do corredor, manipulação de storage só em teste —
 * padrão corridor.spec.ts §4.4) → revisão "atrasada N dias" renderiza na
 * home com o medidor e o resumo de trilha em estado não-trivial.
 *
 * Mutation-guard: remover qualquer testid, o valuetext do medidor, o glifo
 * do MasteryBadge, a derivão pt-BR do dueIn (src/domain/reviewDue.ts) ou a
 * live region falha este spec.
 */

const DUE_IN_PTBR = /(atrasada \d+ (dia|dias)|devida hoje|devida amanhã|em \d+ (dia|dias))/;

async function seedHomeWithOverdueReview(page: import("@playwright/test").Page, daysOverdue = 2) {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03"],
    skillsPracticed: true,
  });
  const progress = await readProgress(page);
  if (!progress) throw new Error("progresso ausente após seeding");
  const overdue = new Date(Date.now() - daysOverdue * 86_400_000).toISOString();
  for (const skill of Object.values(progress.skills ?? {})) {
    skill.nextReviewAt = overdue;
  }
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
}

test("w7-1: anatomia dos 4 papéis com testids hud-* no render vivo — AID-5190/W7", async ({
  page,
}) => {
  await seedHomeWithOverdueReview(page);

  // StreakChip: texto "N dias" + glifo decorativo aria-hidden.
  const streak = page.getByTestId("hud-streak");
  await expect(streak).toBeVisible();
  await expect(streak).toContainText(/Sequência: \d+ (dia|dias)/);
  expect(await streak.locator("[aria-hidden='true']").count()).toBeGreaterThanOrEqual(1);

  // ProgressMeter: role=progressbar + valuetext "N% concluído" + now/min/max.
  const meter = page.getByTestId("hud-progress");
  await expect(meter).toHaveAttribute("role", "progressbar");
  await expect(meter).toHaveAttribute("aria-valuetext", /% concluído$/);
  await expect(meter).toHaveAttribute("aria-valuenow", /^\d+$/);
  await expect(meter).toHaveAttribute("aria-valuemin", "0");
  await expect(meter).toHaveAttribute("aria-valuemax", /^\d+$/);
  // Leitura textual "X de Y lições concluídas" sempre adjacente (nunca só barra).
  await expect(page.getByTestId("hud-mastery-badge")).toContainText(/\d+ de \d+ lições concluídas/);

  // MasteryBadge: cor + texto + glifo (B3) — teto local é "concluídas".
  const badge = page.getByTestId("hud-mastery-badge");
  expect(await badge.locator("[aria-hidden='true']").count()).toBeGreaterThanOrEqual(1);
  await expect(badge).not.toContainText("mastered");

  // ReviewDue: reason + dueIn pt-BR ("atrasada N dias" do nextReviewAt passado).
  await expect(page.getByTestId("hud-review-due")).toHaveText(/^Revisão atrasada 2 dias$/);

  // B9c no documento inteiro: todo medidor com role tem valuetext; toda
  // trilha visual .progress-track tem o role.
  const meters = await page.locator("[role='progressbar']").all();
  expect(meters.length).toBeGreaterThanOrEqual(1);
  for (const m of meters) {
    await expect(m).toHaveAttribute("aria-valuetext", /% concluído$/);
  }
  expect(await page.locator(".progress-track:not([role='progressbar'])").count()).toBe(0);
});

test("w7-2: live region anuncia sequência/revisões 1× por sessão — AID-5190/W7", async ({
  page,
}) => {
  await seedHomeWithOverdueReview(page);
  // <output> carrega role="status" implícito (aria-live polite) — padrão do
  // OnboardingScreen; o texto muda depois do render, então é anunciado.
  const live = page.getByTestId("hud-live-region");
  await expect(page.locator("output[data-testid='hud-live-region']")).toBeVisible();
  await expect(live).toContainText(/Sequência: \d+ (dia|dias)/);
  await expect(live).toContainText(/revisão devida/);
});

test("w7-3: smoke responsivo 375/768/1280 com screenshots + alvos ≥44px — AID-5190/W7", async ({
  page,
}) => {
  await seedHomeWithOverdueReview(page);
  for (const width of [375, 768, 1280] as const) {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 800 });
    await expect(page.getByTestId("hud-streak")).toBeVisible();
    await page.screenshot({
      fullPage: true,
      path: test.info().outputPath(`w7-hud-${width}.png`),
    });
  }

  // B6 (§7.3): alvo de toque ≥44px nos controles DO HUD (superfície diária
  // home-screen) no mobile — links do rodapé ficam fora do contrato §7.
  await page.setViewportSize({ width: 375, height: 667 });
  const undersized = await page.evaluate(() => {
    const hud = document.querySelector("[data-testid='home-screen']");
    if (!(hud instanceof HTMLElement)) throw new Error("home-screen ausente");
    const out: string[] = [];
    for (const el of hud.querySelectorAll<HTMLElement>(
      "button, a[href], input:not([type='hidden'])",
    )) {
      if (el.offsetParent === null && el.getClientRects().length === 0) continue;
      if (el.disabled) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height > 0 && (rect.height < 44 || rect.width < 44)) {
        out.push(
          `${el.tagName}#${el.id}.${el.className} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        );
      }
    }
    return out;
  });
  expect(undersized, `controles <44px no HUD@375: ${undersized.join(", ")}`).toEqual([]);
});
