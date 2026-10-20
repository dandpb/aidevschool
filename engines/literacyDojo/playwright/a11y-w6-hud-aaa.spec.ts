import { expect, test } from "@playwright/test";

import { seedCorridorProgress } from "./support";

/**
 * AID-5177/W6 — re-medição AAA (contrato §4 B9a/B9b, plano AID-5010 §1.2/§W6)
 * dos pares do HUD do literacyDojo, pós-retune:
 *
 * | Par (§1.2)                              | Antes (AA) | Depois (AAA) | Tier |
 * |-----------------------------------------|------------|--------------|------|
 * | --muted #454f6a sobre --bg #f8f4ea      | 4.52       | ≥7.41        | B9a  |
 * | --muted-strong #3f4a66 sobre --bg       | 6.27       | ≥8.02        | B9a  |
 * | stat-done #0d5c3b sobre --success-bg #e8f8ef | 5.32  | ≥7.32        | B9a  |
 * | extremo do gradiente .progress-fill #0284c7 sobre trilha #e5e9f0 | 2.28 | ≥3.36 | B9b |
 *
 * Leitura canônica (AC 1): valores REAIS via getComputedStyle — pares de
 * texto lidos dos tokens computados em :root (custom properties têm var()
 * substituído no valor computado; mesma leitura do hud-aliases.spec.ts/W5),
 * e o medidor lido do ELEMENTO vivo (gradiente computado do .progress-fill
 * sobre a cor da trilha — cada endpoint é um candidato; o pior limita o
 * par, regra dos specs W0–W4 do dojoToday).
 *
 * Mutation-guard: na base pré-W6 (--muted #657089 / #4f5a75 / #14734d /
 * extremo #0ea5e9) os asserts FALHAM (4.52 < 7; 6.27 < 7; 5.32 < 7; 2.28 <
 * 3) — o spec prova o retune em valores computados, não comentários.
 */

type PairRow = { pair: string; fg: string; bg: string; ratio: number };

// Harness WCAG (mesma matemática dos specs W0–W4 do dojoToday).
function contrastOf(fg: [number, number, number], bg: [number, number, number]) {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (r: number, g: number, b: number) =>
    0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const l1 = luminance(...fg);
  const l2 = luminance(...bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseHexish(value: string): [number, number, number] | null {
  const v = value.trim().toLowerCase();
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
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m === null) return null;
  if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

test("w6-1: pares de TEXTO do HUD ≥7:1 (B9a) e ≥4.5:1 (B2) — tokens computados — AID-5177/W6", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement).getPropertyValue("--ads-progress-text").trim()
        .length > 0,
  );

  const rows: PairRow[] = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const token = (name: string) => cs.getPropertyValue(name).trim();
    return [
      { pair: "--muted sobre --bg", fg: token("--muted"), bg: token("--bg") },
      {
        pair: "--muted sobre --surface-strong",
        fg: token("--muted"),
        bg: token("--surface-strong"),
      },
      { pair: "--muted sobre --surface", fg: token("--muted"), bg: token("--surface") },
      { pair: "--muted-strong sobre --bg", fg: token("--muted-strong"), bg: token("--bg") },
      {
        pair: "stat-done --success-text sobre --success-bg",
        fg: token("--success-text"),
        bg: token("--success-bg"),
      },
    ];
  });

  expect(rows.length, "linhas §1.2 do literacy").toBe(5);
  const parsed = rows.map((row) => {
    const fg = parseHexish(row.fg);
    const bg = parseHexish(row.bg);
    expect(fg, `token do par "${row.pair}" resolve em cor (${row.fg})`).not.toBeNull();
    expect(bg, `fundo do par "${row.pair}" resolve em cor (${row.bg})`).not.toBeNull();
    return { ...row, ratio: Number(contrastOf(fg!, bg!).toFixed(2)) };
  });

  for (const row of parsed) {
    // B2 (piso AA ≥4.5) e B9a (AAA HUD ≥7) afirmados juntos (AC 1).
    expect(row.ratio, `B9a ${row.pair} (${row.fg} sobre ${row.bg})`).toBeGreaterThanOrEqual(7);
  }
  expect(
    Math.min(...parsed.map((r) => r.ratio)),
    "pior par de texto do HUD",
  ).toBeGreaterThanOrEqual(7);
});

test("w6-2: medidor — extremo do gradiente ≥3:1 (B9b) sobre a trilha — AID-5177/W6", async ({
  page,
}) => {
  // Home semeada (corridor harness §4.4): a trilha renderiza .progress-track
  // com .progress-fill de largura > 0 — o gradiente computado é o par real.
  await page.goto("/");
  await page.locator(".product-bar").waitFor();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("home-screen").waitFor();

  const rows: PairRow[] = await page.evaluate(() => {
    const parseRgb = (value: string): [number, number, number] | null => {
      const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m === null) return null;
      if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    const visible = (el: Element) =>
      el instanceof HTMLElement && !(el.offsetParent === null && el.getClientRects().length === 0);
    const out: { pair: string; fg: string; bg: string }[] = [];
    for (const track of document.querySelectorAll(".progress-track")) {
      if (!visible(track)) continue;
      const trackBg = parseRgb(getComputedStyle(track).backgroundColor);
      if (trackBg === null) continue;
      const fill = track.querySelector(".progress-fill");
      if (!(fill instanceof HTMLElement) || !visible(fill)) continue;
      const cs = getComputedStyle(fill);
      if (cs.backgroundImage === "none") continue;
      const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)]
        .map((m) => parseRgb(m[0]))
        .filter((v): v is [number, number, number] => v !== null);
      for (const stop of stops) {
        out.push({
          pair: "extremo/parada do gradiente .progress-fill sobre .progress-track",
          fg: `rgb(${stop.join(", ")})`,
          bg: `rgb(${trackBg.join(", ")})`,
        });
      }
    }
    return out;
  });

  expect(rows.length, "paradas do gradiente do medidor medidas").toBeGreaterThanOrEqual(3);
  const parsed = rows.map((row) => {
    const fg = parseHexish(row.fg)!;
    const bg = parseHexish(row.bg)!;
    return { ...row, ratio: Number(contrastOf(fg, bg).toFixed(2)) };
  });
  for (const row of parsed) {
    expect(row.ratio, `B9b ${row.pair} (${row.fg} sobre ${row.bg})`).toBeGreaterThanOrEqual(3);
  }
  // O extremo ciano (fim do gradiente) é o par flagrado no audit (2.28:1).
  const cyan = parsed.filter((r) => r.fg.includes("2, 132, 199"));
  expect(cyan.length, "extremo ciano #0284c7 presente no gradiente").toBeGreaterThanOrEqual(1);
  expect(Math.min(...cyan.map((r) => r.ratio)), "extremo ciano ≥3:1 (B9b)").toBeGreaterThanOrEqual(
    3,
  );
});

test("w6-3: captura de evidência visual do HUD (antes/depois do retune) — AID-5177/W6", async ({
  page,
}) => {
  // Sem asserts de contraste: screenshot fullPage da home com o HUD
  // pós-retune em test-results/<test>/ (outputPath). A captura "antes"
  // roda este spec na árvore base servida pelo harness.
  await page.goto("/");
  await page.locator(".product-bar").waitFor();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("home-screen").waitFor();
  await page.screenshot({
    fullPage: true,
    path: test.info().outputPath("w6-hud-after.png"),
  });
});
