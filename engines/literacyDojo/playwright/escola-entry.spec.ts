import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, mapInitial, readProgress } from "./support";

/**
 * AID-3453 — aceitação da entrada estática /escola/ no BUILD REAL.
 * Roda apenas no projeto "pwa" (vite build + vite preview): o spec afirma o
 * contrato de serving do dist (assets diretos do diretório público, redirect
 * de diretório e fallback SPA da raiz), que não existe no dev server.
 */
test("entrada /escola/ serve a página, os assets diretos e o fallback SPA do build", async ({
  page,
}) => {
  // Página renderizada pelo module JS: missão do contrato + duas jornadas.
  await page.goto("/escola/");
  await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  await expect(page.locator("#jornada-cotidiano")).toContainText("IA no cotidiano");
  await expect(page.locator("#jornada-dev")).toContainText("prévia planejada");
  await expect(page.locator("#world")).toBeVisible();
  await expect(page.locator("#start-fundamentals")).toHaveAttribute("href", "/");
  // Sem overflow horizontal nos dois extremos de viewport (mobile default 360 e desktop).
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    const layout = await page.locator("body").evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  }

  // Assets diretos: arquivos públicos copiados ao dist, servidos sem fallback.
  const css = await page.request.get("/escola/escola.css");
  expect(css.status()).toBe(200);
  expect(css.headers()["content-type"] ?? "").toContain("text/css");
  const js = await page.request.get("/escola/escola.js");
  expect(js.status()).toBe(200);
  expect((await js.text()).length).toBeGreaterThan(1000);

  // Fallback SPA preservado: rota desconhecida continua servindo o shell da
  // raiz (index.html do app com assets hashed) — a entrada não o intercepta.
  // (`/escola` sem barra é normalização de host: redirect no provedor,
  // fallback local; nenhum link da página o usa.)
  const unknown = await page.request.get("/rota-que-nao-existe");
  expect(unknown.status()).toBe(200);
  expect(await unknown.text()).toContain("/assets/");
});

test("jornada real: /escola/ → fundamentos → onboarding → lição concluída com progresso persistido", async ({
  page,
}) => {
  await page.goto("/escola/");
  // CTA direto same-origin: entra no app de lições pela raiz.
  await page.locator("#start-fundamentals").click();
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");

  // Onboarding real → lição desbloqueada (Mapa Inicial) → feedback de conclusão.
  await completeOnboarding(page);
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");

  // Progresso salvo no dispositivo e intacto após reload na mesma origem
  // (o welcome é só do onboarding fresco; com lição concluída o app resume
  // no home da trilha).
  const before = await readProgress(page);
  expect(before?.lessonStatus?.[mapInitial.id]).toBe("completed");
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const after = await readProgress(page);
  expect(after?.lessonStatus?.[mapInitial.id]).toBe("completed");
  expect(after?.currentLessonId).toBe(before?.currentLessonId);
});
