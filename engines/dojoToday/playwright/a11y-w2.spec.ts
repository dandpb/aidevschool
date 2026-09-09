import { type Page, expect, test } from "@playwright/test";

/**
 * AID-1089/W2 — evidência executável do state contract (proposta AID-914 §2.3,
 * doc proposal rev 1 — docs/design/design-foundations.md ainda não publicado)
 * nos controles primários da superfície de missão do dojoToday:
 * 1. `:focus-visible` usa a alias `--ads-focus` (§2.3-4);
 * 2. `:disabled` tem aparência própria + cursor:not-allowed (§2.3-5);
 * 3. `:hover:not(:disabled)` e `:active:not(:disabled)` existem nos controles (§2.3-2/3);
 * 4. loading assíncrono: disable + `aria-busy` + região `role=status` (§2.3-6);
 * 5. feedback de erro por cor + borda + texto (§2.3, containers de feedback).
 */

/** Resolve um token CSS (--ads-focus etc.) para rgb() computável. */
async function resolveToken(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);
}

test("w2-1: :focus-visible dos controles usa a alias --ads-focus (>=2px + offset >=2px)", async ({
  page,
}) => {
  await page.goto("/");
  const expected = await resolveToken(page, "--ads-focus");
  expect(expected, "alias --ads-focus resolvida").not.toBe("");

  const controls = ["#soc-q", "#soc-send"];
  for (const selector of controls) {
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
        color: cs.outlineColor,
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
    expect(info?.color, `${selector} outline-color == --ads-focus`).toBe(expected);
  }
});

test("w2-2: :disabled tem aparência própria + cursor:not-allowed (não só opacity)", async ({
  page,
}) => {
  await page.goto("/");

  const btn = page.locator("#soc-send");
  const rest = await btn.evaluate((node) => {
    const cs = getComputedStyle(node);
    return { bg: cs.backgroundColor, opacity: cs.opacity, cursor: cs.cursor, shadow: cs.boxShadow };
  });
  await btn.evaluate((node) => {
    (node as HTMLButtonElement).disabled = true;
  });
  const disabled = await btn.evaluate((node) => {
    const cs = getComputedStyle(node);
    return { bg: cs.backgroundColor, opacity: cs.opacity, cursor: cs.cursor, shadow: cs.boxShadow };
  });
  expect(disabled.cursor, "cursor not-allowed no :disabled").toBe("not-allowed");
  expect(disabled.opacity, ":disabled não pode ser só opacity").toBe("1");
  expect(disabled.bg, "background próprio no :disabled").not.toBe(rest.bg);
  expect(disabled.shadow, "sombra 3D removida no :disabled").toBe("none");

  const link = page.locator("#soc-config-btn");
  const linkRest = await link.evaluate((node) => getComputedStyle(node).color);
  await link.evaluate((node) => {
    (node as HTMLButtonElement).disabled = true;
  });
  const linkDisabled = await link.evaluate((node) => {
    const cs = getComputedStyle(node);
    return { color: cs.color, cursor: cs.cursor, decoration: cs.textDecorationLine };
  });
  expect(linkDisabled.cursor, "link-btn cursor not-allowed").toBe("not-allowed");
  expect(linkDisabled.color, "link-btn cor própria no :disabled").not.toBe(linkRest);
  expect(linkDisabled.decoration, "link-btn line-through no :disabled").toContain("line-through");
});

test("w2-3: :hover e :active (:not(:disabled)) existem nos controles do loop", async ({ page }) => {
  await page.goto("/");

  // :hover é verificável no render vivo (estado real via pointer).
  const send = page.locator("#soc-send");
  const restFilter = await send.evaluate((node) => getComputedStyle(node).filter);
  await send.hover();
  const hoverFilter = await send.evaluate((node) => getComputedStyle(node).filter);
  expect(hoverFilter, ":hover:not(:disabled) muda estado no .btn-primary").not.toBe(restFilter);

  // :active não é sustentável via CDP sem clique mantido: confere a regra no
  // bundle servido (mesma estratégia do check estático W0 no receipt).
  const activeRules = await page.evaluate(() => {
    const wanted = [".btn-primary:active:not(:disabled)", ".link-btn:active:not(:disabled)"];
    const found: string[] = [];
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (
          rule instanceof CSSStyleRule &&
          wanted.includes(rule.selectorText.replace(/\s+/g, ""))
        ) {
          found.push(rule.selectorText.replace(/\s+/g, ""));
        }
      }
    }
    return found;
  });
  expect(activeRules, "regras :active:not(:disabled) no bundle").toContain(
    ".btn-primary:active:not(:disabled)",
  );
  expect(activeRules, "regras :active:not(:disabled) no bundle").toContain(
    ".link-btn:active:not(:disabled)",
  );
});

test("w2-4: loading assíncrono — botão disable + aria-busy e reply é role=status com aria-live/atomic", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "dojoToday:aiConfig",
      JSON.stringify({
        baseUrl: "http://127.0.0.1:5180/fake-ai",
        apiKey: "test-key",
        model: "test-model",
      }),
    );
  });

  let release: (() => void) | undefined;
  let markHit: (() => void) | undefined;
  const hit = new Promise<void>((resolve) => {
    markHit = resolve;
  });
  await page.route("**/fake-ai/chat/completions", async (route) => {
    markHit?.();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: "Resposta socrática de teste." } }] }),
    });
  });

  const reply = page.locator("#soc-reply");
  await expect(reply).toHaveAttribute("role", "status");
  await expect(reply).toHaveAttribute("aria-live", "polite");
  await expect(reply).toHaveAttribute("aria-atomic", "true");

  await page.fill("#soc-q", "O que é um rate limiter?");
  await page.click("#soc-send");
  await hit;
  await expect(page.locator("#soc-send")).toBeDisabled();
  await expect(page.locator("#soc-send")).toHaveAttribute("aria-busy", "true");
  release?.();
  await expect(reply).toContainText("Resposta socrática de teste.");
  await expect(page.locator("#soc-send")).not.toBeDisabled();
  await expect(page.locator("#soc-send")).not.toHaveAttribute("aria-busy", "true");
});

test("w2-5: feedback de erro comunica estado por cor + borda + texto (nunca só cor)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "dojoToday:aiConfig",
      JSON.stringify({
        baseUrl: "http://127.0.0.1:5180/fake-ai",
        apiKey: "test-key",
        model: "test-model",
      }),
    );
  });
  await page.route("**/fake-ai/chat/completions", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
  );

  const reply = page.locator("#soc-reply");
  await page.fill("#soc-q", "pergunta que vai falhar");
  await page.click("#soc-send");
  await expect(reply).toContainText("HTTP 500");
  const state = await reply.evaluate((node) => {
    const cs = getComputedStyle(node);
    return {
      color: cs.color,
      border: cs.borderTopColor,
      bg: cs.backgroundColor,
      cls: node.className,
    };
  });
  expect(state.cls, "classe .is-error no feedback de erro").toContain("is-error");
  expect(state.color, "texto de erro em --ads-error-text").toContain("rgb(");
  const errorText = await resolveToken(page, "--ads-error-text");
  expect(state.color).toBe(errorText);
  expect(state.border, "borda de erro difere do repouso").not.toBe("rgb(236, 230, 245)");
});
