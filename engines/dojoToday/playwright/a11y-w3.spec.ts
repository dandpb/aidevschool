import { type Page, expect, test } from "@playwright/test";

/**
 * AID-1096/W3 — evidência executável do forced-colors wave 1 (baseline B7 da
 * proposta AID-914 §3.1; padrão: docs/design/design-foundations.md §4):
 * 1. controles primários do loop mantêm borda >=2px em forced-colors
 *    (box-shadow é suprimido — sem a media query o botão fica sem aresta);
 * 2. :focus-visible sobrevive a forced-colors (outline >=2px + offset >=2px);
 * 3. :disabled mapeia para GrayText (aparência própria distinguível);
 * 4. container de feedback de erro preserva borda >=2px + Mark (B3: nunca só cor).
 *
 * Mutation-guard: sem o bloco `@media (forced-colors: active)` de W3 em
 * styles.css, `.btn-primary` computa border-width 0px (border: none) e o
 * teste w3-1 falha — verificado na direção sem-fix antes do commit.
 */

/** Resolve uma cor de system-color keyword (GrayText/Mark) para rgb computável. */
async function resolveSystemColor(page: Page, keyword: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = name;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, keyword);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
});

test("w3-1: controles do loop mantêm borda >=2px em forced-colors (aresta sem box-shadow)", async ({
  page,
}) => {
  await page.goto("/");
  // .socrates-send é .btn-primary: a aresta vinha da box-shadow 3D, suprimida
  // em forced-colors — precisa da borda explícita >=2px do bloco W3.
  const info = await page.evaluate(() => {
    const node = document.querySelector(".socrates-send");
    if (!(node instanceof HTMLElement)) return null;
    const cs = getComputedStyle(node);
    return { width: cs.borderTopWidth, style: cs.borderTopStyle };
  });
  expect(info, ".socrates-send").not.toBeNull();
  expect(info?.style, ".socrates-send border-style").toBe("solid");
  expect(
    Number.parseFloat(info?.width ?? "0"),
    ".socrates-send border-width >= 2px",
  ).toBeGreaterThanOrEqual(2);

  // .link-btn é affordance de texto (sublinhado), não de caixa: o que precisa
  // sobreviver em forced-colors é o underline, não uma borda.
  const link = await page.evaluate(() => {
    const node = document.querySelector(".link-btn");
    if (!(node instanceof HTMLElement)) return null;
    const cs = getComputedStyle(node);
    return {
      style: cs.textDecorationLine,
      thickness: cs.textDecorationThickness,
    };
  });
  expect(link, ".link-btn").not.toBeNull();
  expect(link?.style, ".link-btn underline").toContain("underline");
});

test("w3-2: :focus-visible sobrevive a forced-colors (outline >=2px + offset >=2px)", async ({
  page,
}) => {
  await page.goto("/");
  for (const selector of ["#soc-q", "#soc-send"]) {
    const el = page.locator(selector);
    await el.focus();
    const info = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      if (!(node instanceof HTMLElement)) return null;
      const cs = getComputedStyle(node);
      return {
        width: cs.outlineWidth,
        style: cs.outlineStyle,
        offset: cs.outlineOffset,
      };
    }, selector);
    expect(info, selector).not.toBeNull();
    expect(info?.style, `${selector} outline-style`).not.toBe("none");
    expect(
      Number.parseFloat(info?.width ?? "0"),
      `${selector} outline-width >= 2px`,
    ).toBeGreaterThanOrEqual(2);
    expect(
      Number.parseFloat(info?.offset ?? "0"),
      `${selector} outline-offset >= 2px`,
    ).toBeGreaterThanOrEqual(2);
  }
});

test("w3-3: :disabled mapeia para GrayText (aparência própria preservada)", async ({ page }) => {
  await page.goto("/");
  const grayText = await resolveSystemColor(page, "GrayText");
  expect(grayText, "GrayText resolvido").not.toBe("");

  const info = await page.evaluate(() => {
    const send = document.querySelector<HTMLButtonElement>("#soc-send");
    if (!send) return null;
    send.disabled = true;
    const cs = getComputedStyle(send);
    return { color: cs.color, borderColor: cs.borderTopColor };
  });
  expect(info, "#soc-send").not.toBeNull();
  expect(info?.color, "color == GrayText").toBe(grayText);
  expect(info?.borderColor, "border-color == GrayText").toBe(grayText);
});

test("w3-4: container de feedback de erro preserva borda >=2px em forced-colors", async ({
  page,
}) => {
  await page.goto("/");
  const mark = await resolveSystemColor(page, "Mark");
  expect(mark, "Mark resolvido").not.toBe("");

  const info = await page.evaluate(() => {
    const reply = document.querySelector<HTMLElement>("#soc-reply");
    if (!reply) return null;
    reply.classList.add("is-error");
    reply.textContent = "Falha ao consultar o Sócrates. Tente de novo.";
    const cs = getComputedStyle(reply);
    return {
      width: cs.borderTopWidth,
      style: cs.borderTopStyle,
      color: cs.borderTopColor,
    };
  });
  expect(info, "#soc-reply").not.toBeNull();
  expect(info?.style, "border-style solid").toBe("solid");
  expect(Number.parseFloat(info?.width ?? "0"), "border-width >= 2px").toBeGreaterThanOrEqual(2);
  expect(info?.color, "border-color == Mark").toBe(mark);
});
