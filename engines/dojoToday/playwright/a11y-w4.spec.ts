import { expect, test } from "@playwright/test";

/**
 * AID-5080/W4 — evidência executável do defeito AA vigente do plano AID-5010
 * (§1.2/§W4): o chip `.tone-success .chip` renderiza branco sobre --success
 * #16a34a = 3.30:1 (0.72rem = texto normal no WCAG: exige >=4.5). Os chips
 * danger (4.70) e trap (5.70) passam; só o par success falhava.
 *
 * O read model canônico (src/data/today.ts) hoje agenda apenas revisões
 * "overdue" (tom danger), então o chip success é exercido no fixture
 * determinístico day-N (AID-987/T1) servido na porta 5181 pelo seam
 * DOJOTODAY_TODAY_MODULE — a card renderizada pelo próprio reviewCard()
 * com reason "due", não um DOM sintético.
 *
 * Mutation-guard: na base (background: var(--success)) este spec FALHA em
 * 3.30:1; com o fix W4 (--success-deep #166534, mesmo padrão W1/AID-1027)
 * passa em 7.13:1 — resolve AA e já cobre B9a/AAA. Cor e fundo são lidos
 * do render vivo (estilo computado), então o guard pega qualquer regressão
 * do par, não apenas o valor do token.
 */

const SUCCESS_CHIP = ".lesson-card.tone-success .chip";

// Fixture day-N (porta 5181, seam DOJOTODAY_TODAY_MODULE): URL absoluta —
// o parâmetro baseURL via test.use não se propaga neste runner (mesma nota
// de harness do a11y-w3.spec.ts). AID5080_APP_URL permite apontar o mesmo
// fixture servido de outra árvore (evidência before/after do receipt).
const APP = process.env.AID5080_APP_URL ?? "http://127.0.0.1:5181";

test("w4-1: .tone-success .chip atinge contraste AA (>=4.5:1) — AID-5010/W4", async ({ page }) => {
  await page.goto(`${APP}/`);

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
    // (mesma regra dos specs W0/W1: mínimo dos endpoints é limite inferior).
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
  }, SUCCESS_CHIP);

  // O fixture day-N agenda uma revisão "due" (tom success): sem chip
  // renderizado o spec seria vazio e provaria nada.
  expect(pairs.length).toBeGreaterThanOrEqual(1);
  // Recibo do produtor (AID-5080/W4): pares medidos no render vivo.
  console.log(`w4-1 measured pairs: ${JSON.stringify(pairs)}`);
  await page
    .locator(".lesson-card.tone-success")
    .first()
    .screenshot({ path: "test-results/aid5080-dojo-success-chip.png" });
  for (const pair of pairs) {
    expect(
      pair.ratio,
      `${pair.selector} ${pair.color} sobre ${pair.bg} (AID-5010/W4)`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
