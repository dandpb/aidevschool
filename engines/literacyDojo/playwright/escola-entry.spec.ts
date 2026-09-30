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
  // R2 (AID-3453): este teste é PERFIL FRESCO (sem SW controlando no primeiro
  // acesso). Ele NÃO prova o perfil retornante SW-controlado — essa cobertura
  // está na regressão F1 abaixo (raiz → /escola/ → offline → raiz).
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

test("F1 regressão real: retornante SW-controlado raiz → /escola/ → offline → shell da raiz e progresso preservados", async ({
  page,
  context,
}) => {
  // Perfil retornante: instala o SW pela raiz e constrói progresso real.
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await completeOnboarding(page);
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");

  // Visita a escola SOB CONTROLE do SW. Regressão do bug F1: a resposta de
  // /escola/ era gravada sob a chave raiz e sobrescrevia o shell offline.
  await page.goto("/escola/");
  await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();

  // Offline: a raiz precisa continuar servindo o SHELL DA RAIZ (app vivo com
  // progresso no IndexedDB) — não o HTML da escola com refs quebrados.
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const progress = await readProgress(page);
  expect(progress?.lessonStatus?.[mapInitial.id]).toBe("completed");

  // E a escola offline funciona pela PRÓPRIA chave de navegação (isolamento
  // F1): HTML + subrecursos de caminho fixo vindos do cache.
  await page.goto("/escola/");
  await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
});

test("F2 update real: URL fixa atualiza da rede (network-first) e /assets/ permanece cache-first", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  // Semeia corpos STALE no cache do SW para uma URL fixa (/escola/escola.css)
  // e para um asset hashed real (precached na instalação do SW).
  const seeded = await page.evaluate(async () => {
    const cacheName = (await caches.keys()).find((key) => key.startsWith("literacydojo-"));
    if (!cacheName) throw new Error("cache do SW não encontrado");
    const cache = await caches.open(cacheName);
    await cache.put("/escola/escola.css", new Response("/* stale-seed */"));
    const keys = await cache.keys();
    const assetRequest = keys.find((request) =>
      new URL(request.url).pathname.startsWith("/assets/"),
    );
    if (assetRequest) await cache.put(assetRequest, new Response("// stale-seed"));
    return { assetUrl: assetRequest?.url ?? null };
  });
  expect(seeded.assetUrl).toBeTruthy();

  // ONLINE — a política por rota decide quem vence:
  const online = await page.evaluate(async (assetUrl) => {
    const fixedBody = await (await fetch("/escola/escola.css")).text();
    const assetBody = await (await fetch(assetUrl)).text();
    return { fixedBody, assetBody };
  }, seeded.assetUrl);
  // URL fixa: network-first — o conteúdo REAL do build vence o seed stale…
  expect(online.fixedBody).toContain("--paper");
  expect(online.fixedBody).not.toContain("stale-seed");
  // …enquanto /assets/ (imutável por hash): cache-first — o seed stale vence.
  expect(online.assetBody).toContain("stale-seed");

  // OFFLINE — a URL fixa agora cacheia o corpo NOVO (fallback atualizado).
  await context.setOffline(true);
  const offlineFixed = await page.evaluate(async () => (await fetch("/escola/escola.css")).text());
  expect(offlineFixed).toContain("--paper");
  expect(offlineFixed).not.toContain("stale-seed");
});
