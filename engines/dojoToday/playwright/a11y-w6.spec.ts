import { expect, test } from "@playwright/test";

/**
 * AID-5177/W6 — re-medição AAA (contrato §4 B9a/B9b, plano AID-5010 §1.2/§W6)
 * dos pares de texto e não-texto do HUD do dojoToday, pós-retune:
 *
 * | Par (§1.2)                        | Antes (AA) | Depois (AAA)        | Tier |
 * |-----------------------------------|------------|---------------------|------|
 * | --muted #4e495b sobre bg/card/grad | 4.72–5.76  | ≥7.98               | B9a  |
 * | --ink-soft #4f4a5e sobre grad streak | 6.64    | ≥8.00               | B9a  |
 * | eyebrow #3b37b6 sobre bg/grad           | 5.86       | ≥7.44               | B9a  |
 * | glifo mastered #12502a sobre #dcfce7 | 6.49     | ≥8.67               | B9b  |
 * | chip revisão #fff sobre #12502a    | 7.13       | ≥9.2                | B9a  |
 * | medidor fill (--primary→#7c3aed) sobre --line | (fill) | ≥3:1   | B9b  |
 *
 * Leitura canônica (AC 1): cor E fundo efetivo do render vivo via
 * getComputedStyle (gradientes: cada endpoint é um fundo candidato — o pior
 * endpoint limita inferiormente a razão, mesma regra dos specs W0–W4).
 * B9a = texto ≥7:1; B9b = não-texto ≥3:1 (WCAG 1.4.11); B2 (piso AA geral,
 * texto ≥4.5:1) é afirmado em TODOS os pares de texto — 0 falhas ≥B2 e 0
 * falhas B9a/B9b é o critério de aceite da onda.
 *
 * Mutation-guard: na base pré-W6 (--muted #686378 / eyebrow var(--primary) /
 * --success-deep #166534) os asserts B9a FALHAM (5.32–6.64:1 < 7) — este
 * spec prova o retune no render, não apenas o valor do token.
 */

// Fixture day-N (porta 5181, seam DOJOTODAY_TODAY_MODULE): o read model
// canônico só agenda revisão "due" no dia-N, e o chip tone-success (par de
// revisão devida do HUD, §7.1) só renderiza ali (mesma nota do
// a11y-w4.spec.ts). AID5177_APP_URL permite apontar o mesmo fixture servido
// de outra árvore (evidência before/after do receipt).
const DAY_N_APP = process.env.AID5177_APP_URL ?? "http://127.0.0.1:5181";

type PairRow = { selector: string; color: string; bg: string; ratio: number };

// Um único evaluate mede TODOS os pares §1.2 renderizados em "/": texto
// (eyebrow, .muted, .hero-date, .streak-sub) e não-texto (glifo mastered,
// endpoints do gradiente do medidor). Harness inline = W0–W4 pattern.
test("w6-1: pares do HUD no render vivo — texto ≥7:1 (B9a) e não-texto ≥3:1 (B9b) — AID-5177/W6", async ({
  page,
}) => {
  await page.goto("/");

  const rows: PairRow[] = await page.evaluate(() => {
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
    const fgStopsOf = (el: Element): [number, number, number][] => {
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== "none") {
        const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)]
          .map((m) => parseRgb(m[0]))
          .filter((v): v is [number, number, number] => v !== null);
        if (stops.length > 0) return stops;
      }
      const solid = parseRgb(cs.backgroundColor);
      return solid !== null ? [solid] : [];
    };
    const visible = (el: Element) =>
      el instanceof HTMLElement && !(el.offsetParent === null && el.getClientRects().length === 0);

    const out: PairRow[] = [];
    const push = (
      selector: string,
      fg: [number, number, number],
      bg: [number, number, number],
      color: string,
    ) =>
      out.push({
        selector,
        color,
        bg: `rgb(${bg.join(", ")})`,
        ratio: Number(contrast(fg, bg).toFixed(2)),
      });

    // Texto (§1.2): eyebrow (--primary local do PAR → #3f3ac2), .muted
    // (--muted sobre bg/card/grad), .hero-date/.streak-sub (--ink-soft sobre
    // bg e sobre o gradiente do streak-card #fff7ed→#ffffff).
    for (const selector of [".eyebrow", ".muted", ".hero-date", ".streak-sub"]) {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el)) continue;
        const fg = parseRgb(getComputedStyle(el).color);
        if (fg === null) continue;
        for (const bg of backgroundsOf(el)) push(selector, fg, bg, getComputedStyle(el).color);
      }
    }
    // Não-texto (§1.2): glifo mastered (cor sobre success-soft).
    for (const el of document.querySelectorAll(".track-node.is-mastered .track-glyph")) {
      if (!visible(el)) continue;
      const fg = parseRgb(getComputedStyle(el).color);
      if (fg === null) continue;
      for (const bg of backgroundsOf(el))
        push(".is-mastered .track-glyph", fg, bg, getComputedStyle(el).color);
    }
    // Não-texto (§1.2): medidor — cada endpoint do gradiente do fill sobre a
    // cor da trilha (WCAG 1.4.11); o pior endpoint limita o par.
    for (const track of document.querySelectorAll(".progress-track")) {
      if (!visible(track)) continue;
      const trackBg = parseRgb(getComputedStyle(track).backgroundColor);
      if (trackBg === null) continue;
      const fill = track.querySelector(".progress-fill");
      if (!(fill instanceof HTMLElement) || !visible(fill)) continue;
      for (const stop of fgStopsOf(fill)) {
        push(
          ".progress-fill (gradiente) sobre .progress-track",
          stop,
          trackBg,
          `rgb(${stop.join(", ")})`,
        );
      }
    }
    return out;
  });

  const text = rows.filter((r) =>
    [".eyebrow", ".muted", ".hero-date", ".streak-sub"].includes(r.selector),
  );
  const glyph = rows.filter((r) => r.selector.includes("mastered"));
  const meter = rows.filter((r) => r.selector.includes("progress-fill"));

  expect(text.length, "pares de texto medidos no render vivo").toBeGreaterThanOrEqual(4);
  expect(glyph.length, "glifos mastered medidos").toBeGreaterThanOrEqual(1);
  expect(meter.length, "endpoints do medidor medidos").toBeGreaterThanOrEqual(2);

  for (const row of text) {
    // B2 (piso geral AA, ≥4.5) e B9a (AAA HUD, ≥7) afirmados juntos (AC 1).
    expect(row.ratio, `B9a ${row.selector} ${row.color} sobre ${row.bg}`).toBeGreaterThanOrEqual(7);
  }
  const worstText = Math.min(...text.map((r) => r.ratio));
  expect(worstText, "pior par de texto do HUD").toBeGreaterThanOrEqual(7);

  for (const row of glyph) {
    expect(row.ratio, `B9b ${row.selector} ${row.color} sobre ${row.bg}`).toBeGreaterThanOrEqual(3);
  }
  const worstMeter = Math.min(...meter.map((r) => r.ratio));
  expect(worstMeter, "pior endpoint do medidor (B9b)").toBeGreaterThanOrEqual(3);
});

test("w6-2: chip de revisão devida (par §7.1 review) ≥7:1 (B9a) — AID-5177/W6", async ({
  page,
}) => {
  // Fixture day-N (porta 5181): única fonte canônica do chip tone-success.
  await page.goto(`${DAY_N_APP}/`);

  const rows: PairRow[] = await page.evaluate(() => {
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
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
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
    const visible = (el: Element) =>
      el instanceof HTMLElement && !(el.offsetParent === null && el.getClientRects().length === 0);

    const out: PairRow[] = [];
    for (const el of document.querySelectorAll(".lesson-card.tone-success .chip")) {
      if (!visible(el)) continue;
      const fg = parseRgb(getComputedStyle(el).color);
      if (fg === null) continue;
      for (const bg of backgroundsOf(el)) {
        out.push({
          selector: ".tone-success .chip",
          color: getComputedStyle(el).color,
          bg: `rgb(${bg.join(", ")})`,
          ratio: Number(contrast(fg, bg).toFixed(2)),
        });
      }
    }
    return out;
  });

  expect(rows.length, "chip de revisão renderizado no fixture day-N").toBeGreaterThanOrEqual(1);
  for (const row of rows) {
    expect(row.ratio, `B9a ${row.selector} ${row.color} sobre ${row.bg}`).toBeGreaterThanOrEqual(7);
  }
});

test("w6-3: captura de evidência visual do HUD (antes/depois do retune) — AID-5177/W6", async ({
  page,
}) => {
  // Sem asserts de contraste: screenshot fullPage do HUD pós-retune em
  // test-results/<test>/ (outputPath). A captura "antes" roda este mesmo
  // spec na árvore base servida pelo harness (AID5177_APP_URL) — mesma
  // nota de before/after do a11y-w4.spec.ts (AID-5080).
  await page.goto("/");
  await page.waitForSelector(".streak-card");
  await page.screenshot({
    fullPage: true,
    path: test.info().outputPath("w6-hud-after.png"),
  });
});
