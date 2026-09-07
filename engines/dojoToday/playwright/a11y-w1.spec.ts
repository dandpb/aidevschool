import { expect, test } from "@playwright/test";

/**
 * AID-1027/W1 — evidência executável do defeito de a11y da auditoria AID-914
 * (achado vizinho do W0, comprovado 2x: produtor + QA receipt AID-1024):
 * `.track-node.is-mastered .track-glyph` usa --success #16a34a sobre
 * --success-soft #dcfce7 = 3.0:1. Glyph informativo 0.85rem/900 (< 18.66px
 * bold) é texto normal: WCAG AA exige >= 4.5:1.
 *
 * Mutation-guard: na base (color: var(--success)) este spec FALHA em 3.0:1;
 * com o fix (--success-deep #166534) passa em 6.49:1. Cor e fundo são lidos
 * do render vivo (estilo computado), então o guard pega qualquer regressão
 * do par, não apenas o valor do token.
 */

const MASTERED_GLYPH = ".track-node.is-mastered .track-glyph";

test("w1-1: .is-mastered .track-glyph atinge contraste AA (>=4.5:1) — AID-914/W1", async ({
  page,
}) => {
  await page.goto("/");

  const pairs = await page.evaluate((selector) => {
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
    // (mesma regra do spec W0: mínimo dos endpoints é limite inferior válido).
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
    for (const el of document.querySelectorAll(selector)) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.offsetParent === null && el.getClientRects().length === 0) continue;
      const fg = parseRgb(getComputedStyle(el).color);
      if (fg === null) continue;
      for (const bg of backgroundsOf(el)) {
        out.push({
          selector,
          ratio: Number(contrast(fg, bg).toFixed(2)),
          color: getComputedStyle(el).color,
          bg: `rgb(${bg.join(", ")})`,
        });
      }
    }
    return out;
  }, MASTERED_GLYPH);

  // A trilha renderizada tem nós dominados (read model gerado: 2 dominadas).
  // Sem isto o spec seria vazio e provaria nada.
  expect(pairs.length).toBeGreaterThanOrEqual(1);
  for (const pair of pairs) {
    expect(
      pair.ratio,
      `${pair.selector} ${pair.color} sobre ${pair.bg} (AID-914/W1)`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
