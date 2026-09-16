import { expect, test } from "@playwright/test";

/**
 * Guarda automatizada do fix XSS de numeric-fields (PR #460, merge 58098bb5;
 * triagem AID-2201 com veredito first-hand + controle negativo pré-fix @
 * fb4dbc77). Continua a cadeia #262/#264 do mesmo engine: a correção de
 * escape precisa FALHAR em CI se regredir — mutações que removam `escapeHtml`
 * (ou a coerção `Number(...)||0`) do diff do #460 devem quebrar esta spec
 * (payload executando via `__xssMastered=1`, handler `onmouseover` injetado
 * no atributo title, ou pageerror de `.repeat(NaN)`).
 *
 * Cenários: 5183 = hoje hostil (current/freezesMax/masteredCount/totalUnits
 * com payloads HTML); 5184 = streak acesa com `longest` hostil. Servidores
 * declarados no playwright.config.ts via seam DOJOTODAY_TODAY_MODULE.
 */

const NUMERIC_HOSTILE = "http://127.0.0.1:5183";
const NUMERIC_HOSTILE_RECORD = "http://127.0.0.1:5184";

test("guard: campos numéricos hostis renderizam escapados, sem handler injetado e sem pageerror", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(NUMERIC_HOSTILE);

  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();

  // Branch-gating documentado (veredito AID-2201): `current` hostil é string →
  // `s.current > 0` é NaN > 0 = false → headline/sub caem no fallback. O
  // payload de `current` nunca renderiza nesta branch; o fallback é o
  // comportamento correto, não um bypass.
  await expect(page.locator(".streak-current")).toHaveText("Quebre o gelo hoje");
  await expect(page.locator(".streak-sub")).toHaveText(
    "Passe um gate executável para acender a sequência.",
  );
  await expect(page.locator(".streak-flame.is-out")).toBeVisible();
  await expect(page.locator(".streak-current img")).toHaveCount(0);

  // freezesMax hostil: pré-fix ele quebrava o atributo title e injetava um
  // handler real (`onmouseover="window.__xssTitle=1"`). Pós-fix o payload é
  // texto literal escapado dentro do valor do title — nenhum atributo-handler.
  const freezes = page.locator(".streak-freezes");
  expect(await freezes.getAttribute("onmouseover")).toBeNull();
  const title = (await freezes.getAttribute("title")) ?? "";
  expect(title).toContain('cap 2" onmouseover="window.__xssTitle=1');

  // masteredCount hostil: pré-fix o `<img onerror>` executava (controle
  // negativo AID-2201: `__xssMastered=1`). Pós-fix vira texto literal dentro
  // do <strong> da progress-row — nenhum elemento img é criado.
  const strong = page.locator(".progress-row strong");
  await expect(strong).toContainText('<img src=x onerror="window.__xssMastered=1">');
  await expect(page.locator(".progress-row img")).toHaveCount(0);

  // totalUnits hostil: renderiza escapado como texto literal (nenhum elemento
  // img extra na progress-row) e ainda gateia o pct do progress-fill
  // (NaN > 0 = false → width:0%).
  const progressSpan = page.locator(".progress-row span").first();
  await expect(progressSpan).toContainText('18<img src=x onerror="window.__xssTotal=1">');
  await expect(page.locator(".progress-fill")).toHaveCSS("width", "0px");
  expect(await page.locator(".progress-row").getAttribute("onmouseover")).toBeNull();

  // Nenhum payload executou: as sentinelas de execução do controle negativo
  // permanecem indefinidas.
  const flags = await page.evaluate(() => {
    const win = window as {
      __xssCurrent?: number;
      __xssMastered?: number;
      __xssTitle?: number;
      __xssTotal?: number;
    };
    return {
      current: win.__xssCurrent,
      mastered: win.__xssMastered,
      title: win.__xssTitle,
      total: win.__xssTotal,
    };
  });
  expect(flags).toEqual({
    current: undefined,
    mastered: undefined,
    title: undefined,
    total: undefined,
  });

  // A coerção `Number(...)||0` do #460 também é guardada: sem ela, freezesMax
  // hostil faz `"·".repeat(NaN)` lançar RangeError e derrubar o boot.
  expect(pageErrors).toEqual([]);
});

test("guard: recorde hostil com streak acesa renderiza como texto literal, não como elemento", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(NUMERIC_HOSTILE_RECORD);

  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();

  // Streak acesa com current válido: o branch `s.current > 0` renderiza o
  // recorde. `escapeHtml(s.longest)` transforma o <script> hostil em texto
  // literal; sem o escape, o innerHTML criaria um elemento script de verdade
  // (e o texto literal desapareceria do textContent).
  await expect(page.locator(".streak-current")).toContainText("3 dias de sequência");
  await expect(page.locator(".streak-sub")).toContainText(
    "Recorde: <script>window.__xssLongest=1</script>.",
  );
  await expect(page.locator(".streak-sub script")).toHaveCount(0);
  await expect(page.locator(".streak-sub img")).toHaveCount(0);

  // Freeze title benigno segue renderizando o cap numérico.
  const title = (await page.locator(".streak-freezes").getAttribute("title")) ?? "";
  expect(title).toContain("cap 2");

  const fired = await page.evaluate(() => {
    const win = window as { __xssLongest?: number };
    return win.__xssLongest;
  });
  expect(fired).toBeUndefined();
  expect(pageErrors).toEqual([]);
});
