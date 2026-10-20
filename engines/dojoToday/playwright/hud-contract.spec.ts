import { expect, test } from "@playwright/test";

/**
 * AID-5190/W7 — contrato de componentes HUD (design-foundations §7.2/§7.3):
 * anatomia canônica dos 4 papéis com testids `hud-*`, medidores com
 * `role="progressbar"` + `aria-valuetext` (B9c — meta 1/3 → 3/3 engines),
 * MasteryBadge cor+texto+glifo (B3), ReviewDue reason+dueIn pt-BR, live
 * region anunciando sequência/revisões e responsividade 375/768/1280 com
 * alvos ≥44px (B6).
 *
 * Especificação compartilhada entre engines (mesma forma de asserts em
 * literacyDojo e codexdojo-os-prototype — métrica HUD do contrato §6:
 * specs E2E HUD compartilhadas ≥1).
 *
 * Leitura canônica: atributos no DOM renderizado ("/" = read model gerado;
 * fixture day-N na porta 5181 para as variantes de reason due/overdue).
 *
 * Mutation-guard: remover qualquer testid, o role/valuetext do medidor, o
 * glifo do MasteryBadge, a formatação pt-BR do dueIn ou a live region falha
 * este spec; na base pré-W7 o seletor `hud-*` não resolve (0 elementos).
 */

const HUD_TESTIDS = ["hud-streak", "hud-progress", "hud-mastery-badge", "hud-review-due"] as const;

const DUE_IN_PTBR = /(atrasada \d+ (dia|dias)|devida hoje|devida amanhã|em \d+ (dia|dias))/;

test("w7-1: anatomia dos 4 papéis com testids hud-* no render vivo — AID-5190/W7", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector(".streak-card");

  for (const testid of HUD_TESTIDS) {
    const locator = page.getByTestId(testid);
    expect((await locator.count()) > 0, `testid ${testid} presente`).toBe(true);
  }

  // StreakChip: texto "N dias" + glifo decorativo aria-hidden.
  const streak = page.getByTestId("hud-streak");
  await expect(streak).toBeVisible();
  await expect(streak).toContainText(/sequência/i);
  expect(await streak.locator(".streak-flame[aria-hidden='true']").count()).toBe(1);

  // ProgressMeter: role=progressbar + valuetext "N% concluído" + agora/min/max.
  const meter = page.getByTestId("hud-progress");
  await expect(meter).toHaveAttribute("role", "progressbar");
  await expect(meter).toHaveAttribute("aria-valuetext", /% concluído$/);
  await expect(meter).toHaveAttribute("aria-valuenow", /^\d+$/);
  await expect(meter).toHaveAttribute("aria-valuemin", "0");
  await expect(meter).toHaveAttribute("aria-valuemax", "100");
  // Leitura textual "X/Y dominadas" sempre adjacente (nunca só barra).
  await expect(page.locator(".progress-row")).toContainText(/\/\d+ dominadas/);

  // MasteryBadge: cor + texto + glifo (B3) — vocabulário canônico.
  const badge = page.getByTestId("hud-mastery-badge");
  await expect(badge).toContainText("dominadas");
  await expect(badge).toContainText("verificadas por gate");
  expect(await badge.locator("[aria-hidden='true']").count()).toBeGreaterThanOrEqual(1);

  // ReviewDue: reason + dueIn em pt-BR legível (read model gerado: overdue).
  const reviews = page.getByTestId("hud-review-due");
  expect(await reviews.count()).toBeGreaterThanOrEqual(1);
  for (const card of await reviews.all()) {
    await expect(card.locator(".due-in")).toHaveText(DUE_IN_PTBR);
  }
  // Nenhum dueIn de máquina vaza para a HUD.
  expect(
    await page
      .locator(".due-in")
      .filter({ hasText: /^overdue|^today|^in \d+d$/ })
      .count(),
  ).toBe(0);

  // B9c no documento inteiro: TODO medidor com role tem valuetext; toda
  // trilha visual .progress-track tem o role.
  const meters = await page.locator("[role='progressbar']").all();
  expect(meters.length).toBeGreaterThanOrEqual(1);
  for (const m of meters) {
    await expect(m).toHaveAttribute("aria-valuetext", /% concluído$/);
  }
  expect(await page.locator(".progress-track:not([role='progressbar'])").count()).toBe(0);
});

test("w7-2: live region anuncia sequência/revisões 1× por abertura — AID-5190/W7", async ({
  page,
}) => {
  await page.goto("/");
  const live = page.getByTestId("hud-live-region");
  await expect(live).toHaveAttribute("role", "status");
  await expect(live).toHaveAttribute("aria-live", "polite");
  // O texto é inserido DEPOIS do render (requestAnimationFrame) — o poll
  // prova o anúncio, não a mera presença do elemento.
  await expect
    .poll(async () => (await live.textContent()) ?? "", { timeout: 5_000 })
    .toContain("Sequência");
  await expect(live).toContainText(/revis/);
});

test("w7-3: ReviewDue reason due+overdue em pt-BR no fixture day-N — AID-5190/W7", async ({
  page,
}) => {
  // Porta 5181 (DOJOTODAY_TODAY_MODULE=fixtures/today.day-n.ts): revisão
  // "due hoje" + "overdue 44d" no mesmo render — as duas variantes do par.
  await page.goto("http://127.0.0.1:5181/");
  const reviews = page.getByTestId("hud-review-due");
  expect(await reviews.count()).toBeGreaterThanOrEqual(2);
  await expect(reviews.filter({ hasText: "devida hoje" })).toHaveCount(1);
  await expect(reviews.filter({ hasText: "atrasada 44 dias" })).toHaveCount(1);
});

test("w7-4: smoke responsivo 375/768/1280 com screenshots + alvos ≥44px — AID-5190/W7", async ({
  page,
}) => {
  for (const width of [375, 768, 1280] as const) {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 800 });
    await page.goto("/");
    await page.waitForSelector(".streak-card");
    await page.screenshot({
      fullPage: true,
      path: test.info().outputPath(`w7-hud-${width}.png`),
    });
  }

  // B6 (§7.3): alvo de toque ≥44px em qualquer controle do HUD no mobile.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await page.waitForSelector(".streak-card");
  const undersized = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      "button, a[href], input:not([type='hidden'])",
    )) {
      if (!(el instanceof HTMLElement)) continue;
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
