import { expect, test } from "@playwright/test";

/**
 * AID-1023/W0 — evidência executável dos defeitos de a11y da auditoria AID-914 (§1.2/§1.4):
 * 1. todo controle interativo focado via teclado tem outline visível 3px + offset 2px;
 * 2. texto que usa --muted atinge contraste WCAG AA >= 4.5:1 contra o fundo efetivo
 *    (cor computada no render vivo, gradientes avaliados nos dois endpoints).
 * O 3º fix (OS token fantasma --text) é coberto por check estático no receipt do PR.
 */

const INTERACTIVE = "button, input, textarea, select, a, summary";
const AUDITED_TEXT_SELECTORS = [
  ".muted",
  ".streak-freezes",
  ".lesson-project",
  ".track-glyph",
  ".track-num",
  ".note",
];

test("w0-1: navegação por teclado mostra foco visível (outline 3px, offset 2px) em todos os controles", async ({
  page,
}) => {
  await page.goto("/");

  const checked: string[] = [];
  for (let tab = 0; tab < 20; tab += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate((selector) => {
      const el = document.activeElement;
      if (el === null || !el.matches(selector)) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || el.className || el.textContent?.slice(0, 24) || "",
        width: cs.outlineWidth,
        style: cs.outlineStyle,
        offset: cs.outlineOffset,
        color: cs.outlineColor,
      };
    }, INTERACTIVE);
    if (info === null) continue;
    checked.push(`${info.tag}#${info.id}`);
    expect(info.style, `${info.tag}#${info.id} outline-style`).not.toBe("none");
    expect(info.width, `${info.tag}#${info.id} outline-width`).toBe("3px");
    expect(info.offset, `${info.tag}#${info.id} outline-offset`).toBe("2px");
    expect(info.color, `${info.tag}#${info.id} outline-color`).not.toBe("rgba(0, 0, 0, 0)");
  }
  // A página renderiza summary, input e buttons: sem regra :focus-visible isto falha.
  expect(checked.length).toBeGreaterThanOrEqual(3);
});

test("w0-2: --muted atinge contraste AA (>=4.5:1) nos textos auditados (AID-914 §1.4)", async ({
  page,
}) => {
  await page.goto("/");

  const ratios = await page.evaluate(
    ({ selectors }) => {
      const lin = (channel: number) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (r: number, g: number, b: number) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const parseRgb = (value: string): [number, number, number] | null => {
        const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m === null) return null;
        if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null;
        return [Number(m[1]), Number(m[2]), Number(m[3])];
      };
      const contrast = (fg: [number, number, number], bg: [number, number, number]) => {
        const l1 = luminance(...fg);
        const l2 = luminance(...bg);
        const hi = Math.max(l1, l2);
        const lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
      };
      // Fundos efetivos: sobe a árvore até achar cor opaca ou gradiente
      // (luminância de blend fica entre os endpoints, então o mínimo dos
      // endpoints é limite inferior válido da razão).
      const backgroundsOf = (el: Element): [number, number, number][] => {
        let node: Element | null = el;
        while (node !== null) {
          const cs = getComputedStyle(node);
          if (cs.backgroundImage !== "none") {
            const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)]
              .map((m) => parseRgb(m[0]))
              .filter((v): v is [number, number, number] => v !== null);
            if (stops.length > 0) return stops;
          }
          const solid = parseRgb(cs.backgroundColor);
          if (solid !== null) return [solid];
          node = node.parentElement;
        }
        return [[255, 255, 255]];
      };

      const out: { selector: string; ratio: number; color: string; bg: string }[] = [];
      // Escopo W0 = regras auditadas com --muted (AID-914 §1.4). Overrides de estado
      // (ex.: .is-mastered .track-glyph em --success sobre --success-soft) são
      // achados vizinhos, reportados no receipt — não parte desta ordem.
      // W1 (AID-1027) cobre esse par em a11y-w1.spec.ts a partir de 2026-09-07.
      const parseColor = (value: string): [number, number, number] | null => {
        const v = value.trim();
        if (v.startsWith("#")) {
          const h = v.slice(1);
          const full =
            h.length === 3
              ? h
                  .split("")
                  .map((c) => c + c)
                  .join("")
              : h;
          if (full.length !== 6) return null;
          return [
            Number.parseInt(full.slice(0, 2), 16),
            Number.parseInt(full.slice(2, 4), 16),
            Number.parseInt(full.slice(4, 6), 16),
          ];
        }
        return parseRgb(v);
      };
      const mutedToken = parseColor(
        getComputedStyle(document.documentElement).getPropertyValue("--muted"),
      );
      for (const selector of selectors) {
        for (const el of document.querySelectorAll(selector)) {
          if (!(el instanceof HTMLElement)) continue;
          if (el.offsetParent === null && el.getClientRects().length === 0) continue;
          const fg = parseRgb(getComputedStyle(el).color);
          if (fg === null || mutedToken === null) continue;
          if (fg.join(",") !== mutedToken.join(",")) continue;
          for (const bg of backgroundsOf(el)) {
            out.push({
              selector,
              ratio: Number(contrast(fg, bg).toFixed(2)),
              color: getComputedStyle(el).color,
              bg: `rgb(${bg.join(", ")})`,
            });
          }
        }
      }
      return out;
    },
    { selectors: AUDITED_TEXT_SELECTORS },
  );

  // Sem o ajuste do token (--muted #8a83a0) vários pares caem em 2.95–3.6:1.
  expect(ratios.length).toBeGreaterThanOrEqual(5);
  for (const pair of ratios) {
    expect(pair.ratio, `${pair.selector} ${pair.color} sobre ${pair.bg}`).toBeGreaterThanOrEqual(
      4.5,
    );
  }
});
