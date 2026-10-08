import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { type Server, createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, mapInitial, readProgress } from "./support";

/**
 * AID-3563 — regressão retida da guarda anti-veneno do service worker
 * (fallback SPA 200 text/html do host NUNCA é gravado sob chave de asset).
 *
 * Por que uma origem própria: o contrato de produção é o redirect Netlify
 * `/* → /index.html` status 200 (netlify.toml) — qualquer caminho ausente,
 * inclusive com extensão, devolve o shell HTML. O `vite preview` também faz
 * fallback, mas não produz um 404 REAL sob o escopo, e o controle negativo
 * (404 real não gravado; offline rejeita) precisa dele. A origem abaixo
 * serve o `dist/` REAL (build do webServer do projeto pwa) com o contrato do
 * host + um único caminho reservado de 404 real.
 *
 * Cobertura declarada (regressão delimitada; saneação de LEITURA r2 — decisão
 * de revisão 58ea31f2 / precisão PO dc48816b — sem bump de cache):
 *  - novas gravações inválidas recusadas (asset ausente em fallback 200
 *    text/html não entra em NENHUM cache; `<img>` ?bust idem; 404 real idem);
 *  - LEITURA de contaminação PREEXISTENTE na versão efetiva saneia: online a
 *    rede vence e a entrada HTML semeada sob chave de asset é REMOVIDA
 *    (somente ela); offline, com a entrada presente, o fetch REJEITA em vez
 *    de servir o veneno — nunca normalizado como fallback de leitura;
 *  - transição de invalidação por versão: cache `literacydojo-v5` semeado
 *    contaminado ANTES da ativação é purgado pelo `activate` do candidato
 *    (v6) — a demonstração exige o próprio teste, "v5 não criado" não prova;
 *  - invariante de não-regressão: css legítimo cacheado, navegação
 *    online/offline legítima e progresso no IndexedDB preservados.
 *
 * Este spec FALHA na base a1ff9768… (CACHE v5, sem guardas) E no head
 * 1bff0d52 (guarda só de ESCRITA): lá o fallback HTML É gravado sob a chave
 * do asset, a entrada semeada PERMANECE após a leitura online e é SERVIDA
 * offline como fallback de leitura.
 */

const DIST = resolve(process.cwd(), "dist");
const MISSING_ASSET = "/escola/nao-existe.png";
const REAL_404 = "/escola/404-real.png";
const LEGACY_CACHE = "literacydojo-v5";
const LEGACY_POISON_KEY = "/escola/legacy-veneno.png";
const SEEDED_POISON_KEY = "/escola/veneno-existente.png";
const POISON_MARKER = "<!-- veneno-seed -->";

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".d.ts": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".xml": "text/xml; charset=utf-8",
};

const sha = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
const etagOf = (buf: Buffer) => `"${sha(buf).slice(0, 16)}"`;

let server: Server | null = null;
let origin = "";

test.beforeAll(async () => {
  const indexHtml = await readFile(join(DIST, "index.html"));
  const indexEtag = etagOf(indexHtml);

  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    const send = (
      status: number,
      body: Buffer | string,
      type: string,
      extra: Record<string, string> = {},
    ) => {
      res.writeHead(status, {
        "content-type": type,
        "x-content-type-options": "nosniff",
        ...extra,
      });
      res.end(body);
    };
    if (req.method !== "GET") {
      send(405, "method not allowed", "text/plain; charset=utf-8");
      return;
    }
    // CONTROLE NEGATIVO: 404 REAL reservado (não existe no dist).
    if (path === REAL_404) {
      send(404, "not found", "text/plain; charset=utf-8");
      return;
    }
    // Arquivo real do dist; diretório vira index.html local; fora do dist → 404.
    const candidate = resolve(DIST, `.${path.endsWith("/") ? `${path}index.html` : path}`);
    if (candidate.startsWith(`${DIST}/`)) {
      try {
        const body = await readFile(candidate);
        const type = MIME[extname(candidate)] ?? "application/octet-stream";
        const extra: Record<string, string> = { etag: etagOf(body) };
        if (path === "/sw.js") extra["Service-Worker-Allowed"] = "/";
        send(200, body, type, extra);
        return;
      } catch {
        // sem arquivo — cai no fallback SPA abaixo
      }
    }
    // FALLBACK SPA (contrato Netlify `/* → /index.html` 200): corpo e etag da
    // raiz, content-type text/html — o gatilho exato do defeito AID-3556.
    send(200, indexHtml, "text/html; charset=utf-8", { etag: indexEtag });
  });

  await new Promise<void>((resolveListen) => server?.listen(0, "127.0.0.1", resolveListen));
  const address = server?.address();
  if (!address || typeof address !== "object") throw new Error("origem AID-3563 não subiu");
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(() => server?.close());

type Entry = { cache: string; path: string; contentType: string | null; body: string };

async function observeCache(page: import("@playwright/test").Page): Promise<Entry[]> {
  return page.evaluate(async () => {
    const out: { cache: string; path: string; contentType: string | null; body: string }[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const res = await cache.match(req);
        out.push({
          cache: name,
          path: new URL(req.url).pathname,
          contentType: res.headers.get("content-type"),
          body: await res.text(),
        });
      }
    }
    return out;
  });
}

const entriesFor = (entries: Entry[], path: string) =>
  entries.filter((entry) => entry.path === path);

async function fetchProbe(page: import("@playwright/test").Page, path: string) {
  return page.evaluate(async (probePath) => {
    try {
      const response = await fetch(probePath);
      return {
        ok: true as const,
        status: response.status,
        contentType: response.headers.get("content-type"),
        body: await response.text(),
      };
    } catch (error) {
      return { ok: false as const, error: String(error) };
    }
  }, path);
}

async function activeCacheName(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith("literacydojo-"));
    if (names.length !== 1)
      throw new Error(`esperava 1 cache literacydojo-*, achei ${names.join(", ")}`);
    return names[0];
  });
}

test("guarda de escrita: fallback SPA do host nunca é gravado sob chave de asset; legítimo preservado", async ({
  browser,
}) => {
  // baseURL própria: navegações relativas (helpers do support.ts incluídos)
  // precisam cair nesta origem, não na do projeto.
  const context = await browser.newContext({ baseURL: origin });
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const cacheName = await activeCacheName(page);

  // Host contratual: asset ausente responde 200 text/html (shell da raiz).
  const missing = await fetchProbe(page, MISSING_ASSET);
  expect(missing.ok).toBe(true);
  if (!missing.ok) return;
  expect(missing.status).toBe(200);
  expect(missing.contentType ?? "").toContain("text/html");
  expect(missing.body).toContain("/assets/");

  // `<img>` no-cors com query distinta também passa pelo SW e não degrava.
  const imgDecoded = await page.evaluate(async () => {
    const img = new Image();
    img.src = `/escola/nao-existe.png?bust=${Math.random()}`;
    try {
      await img.decode();
      return true;
    } catch {
      return false;
    }
  });
  expect(imgDecoded, "HTML sob chave de asset não é uma imagem decodificável").toBe(false);

  // Asset legítimo continua cacheado com conteúdo genuíno (css real).
  const css = await fetchProbe(page, "/escola/escola.css");
  expect(css.ok && css.status).toBe(200);
  expect(css.ok ? (css.contentType ?? "") : "").toContain("text/css");
  expect(css.ok ? css.body : "").toContain("--paper");
  await expect
    .poll(
      async () => {
        const entries = await observeCache(page);
        return entriesFor(entries, "/escola/escola.css").filter((e) => e.cache === cacheName)
          .length;
      },
      { message: "css legítimo cacheado na versão ativa" },
    )
    .toBeGreaterThan(0);

  // Controle negativo: 404 REAL não gravado.
  const notFound = await fetchProbe(page, REAL_404);
  expect(notFound.ok && notFound.status).toBe(404);

  // Asserção forte (é AQUI que a base a1ff9768… falha): a chave do asset
  // ausente está AUSENTE de QUALQUER cache — nenhum veneno em lugar nenhum.
  await page.waitForTimeout(300); // settle das gravações waitUntil do SW
  const entries = await observeCache(page);
  expect(
    entriesFor(entries, MISSING_ASSET),
    "fallback HTML nunca gravado sob chave de asset",
  ).toEqual([]);
  expect(entriesFor(entries, REAL_404), "404 real não gravado").toEqual([]);

  // Documento legítimo de navegação continua gravado sob a própria chave.
  await page.goto(`${origin}/escola/`);
  await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  await expect
    .poll(async () => (await observeCache(page)).filter((e) => e.path === "/escola/").length, {
      message: "documento /escola/ gravado sob a própria chave",
    })
    .toBeGreaterThan(0);

  // Offline: sem veneno em cache, o asset ausente é REJEITADO (não servido
  // como HTML); a navegação legítima permanece.
  await context.setOffline(true);
  const offlineMissing = await fetchProbe(page, MISSING_ASSET);
  expect(offlineMissing.ok, "offline sem veneno: fetch do asset ausente rejeita").toBe(false);
  const offline404 = await fetchProbe(page, REAL_404);
  expect(offline404.ok).toBe(false);
  await page.goto(`${origin}/escola/`);
  await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  await context.close();
});

test("v5 contaminado é invalidado na ativação v6; contaminação semeada na versão efetiva é saneada na leitura (online remove, offline rejeita)", async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: origin });
  // Gate determinístico: o app registra o SW no boot (src/main.tsx); para
  // semear o v5 ANTES de qualquer ativação, o registro fica bloqueado até o
  // teste liberar explicitamente.
  await context.addInitScript(() => {
    const container = navigator.serviceWorker;
    const original = container.register.bind(container);
    Object.defineProperty(window, "__swGate", { value: { allowed: false }, configurable: true });
    container.register = ((...args: Parameters<ServiceWorkerContainer["register"]>) => {
      const gate = (window as { __swGate?: { allowed: boolean } }).__swGate;
      if (!gate?.allowed)
        return Promise.reject(new Error("registro bloqueado pelo gate do teste AID-3563"));
      return original(...args);
    }) as typeof container.register;
  });
  const page = await context.newPage();
  await page.goto(origin);

  // Semear o cache LEGADO contaminado antes da primeira ativação do SW.
  await page.evaluate(
    async ({ cacheName, key, marker }) => {
      const cache = await caches.open(cacheName);
      await cache.put(
        key,
        new Response(`<!doctype html>${marker}`, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    },
    { cacheName: LEGACY_CACHE, key: LEGACY_POISON_KEY, marker: POISON_MARKER },
  );

  // Liberar o registro e esperar o candidato assumir o controle.
  await page.evaluate(() => {
    const gate = (window as { __swGate?: { allowed: boolean } }).__swGate;
    if (gate) gate.allowed = true;
    return navigator.serviceWorker.register("/sw.js");
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  // TRANSIÇÃO de invalidação (exigida no próprio teste): o activate do
  // candidato purga o v5 contaminado — controller só existe depois do claim,
  // que roda após a purga, mas o poll remove qualquer corrida residual. Na
  // base (CACHE=v5) o seed PERMANECE — é a segunda falha garantida contra a
  // base.
  await expect
    .poll(async () => (await page.evaluate(() => caches.keys())).includes(LEGACY_CACHE), {
      message: "cache legado v5 purgado pelo activate",
    })
    .toBe(false);
  expect(
    (await observeCache(page)).filter((e) => e.path === LEGACY_POISON_KEY),
    "veneno legado sumiu com o v5",
  ).toEqual([]);
  const cacheName = await activeCacheName(page);
  expect(cacheName).toBe("literacydojo-v6");

  // Progresso real no IndexedDB antes da parte offline.
  await completeOnboarding(page);
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");

  // Contaminação PREEXISTENTE na versão EFETIVA (r2): a LEITURA saneia. No
  // head 1bff0d52 (guarda só de escrita) a entrada semeada permanece e é
  // servida offline — falhas garantidas contra ele mais abaixo.
  await page.evaluate(
    async ({ cacheName: active, key, marker }) => {
      const cache = await caches.open(active);
      await cache.put(
        key,
        new Response(`<!doctype html>${marker}`, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    },
    { cacheName, key: SEEDED_POISON_KEY, marker: POISON_MARKER },
  );

  // ONLINE: network-first serve o shell REAL (não o seed)…
  const online = await fetchProbe(page, SEEDED_POISON_KEY);
  expect(online.ok && online.status).toBe(200);
  expect(online.ok ? (online.contentType ?? "") : "").toContain("text/html");
  expect(online.ok ? online.body : "", "rede vence: corpo é o shell real").toContain("/assets/");
  expect(online.ok ? online.body : "").not.toContain(POISON_MARKER);

  // …e SANEIA o cache: a entrada HTML semeada é removida SOMENTE sob essa
  // chave de asset. No head 1bff0d52 ela permanece — falha garantida contra
  // o head (a gravação continuava recusada, mas a leitura não removia).
  await expect
    .poll(
      async () =>
        (await observeCache(page)).filter(
          (e) => e.path === SEEDED_POISON_KEY && e.cache === cacheName,
        ).length,
      { message: "leitura online sana: entrada HTML semeada removida do cache ativo" },
    )
    .toBe(0);

  // Delimitação da saneação: documento de navegação e assets legítimos do
  // precache seguem no cache ativo — só a entrada envenenada sai.
  const kept = (await observeCache(page)).filter((e) => e.cache === cacheName);
  expect(
    kept.filter((e) => e.path === "/").length,
    "documento de navegação preservado pela saneação",
  ).toBeGreaterThan(0);
  expect(
    kept.filter((e) => e.path.startsWith("/assets/")).length,
    "assets legítimos preservados pela saneação",
  ).toBeGreaterThan(0);

  // OFFLINE com o veneno PRESENTE (re-semeado): o caminho de LEITURA
  // rejeita em vez de servir — inversão exata das asserções 352–357 @
  // 1bff0d52, que normalizavam servir o veneno offline como fallback.
  await page.evaluate(
    async ({ cacheName: active, key, marker }) => {
      const cache = await caches.open(active);
      await cache.put(
        key,
        new Response(`<!doctype html>${marker}`, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    },
    { cacheName, key: SEEDED_POISON_KEY, marker: POISON_MARKER },
  );
  await context.setOffline(true);
  const offlineSeeded = await fetchProbe(page, SEEDED_POISON_KEY);
  expect(offlineSeeded.ok, "offline: HTML sob chave de asset é rejeitado, não servido").toBe(false);

  // A rejeição também remove a entrada envenenada (waitUntil do SW segura
  // a exclusão) — e somente ela: assets legítimos seguem para o load offline.
  await expect
    .poll(
      async () =>
        (await observeCache(page)).filter(
          (e) => e.path === SEEDED_POISON_KEY && e.cache === cacheName,
        ).length,
      { message: "rejeição offline remove a entrada envenenada" },
    )
    .toBe(0);
  expect(
    (await observeCache(page)).filter((e) => e.cache === cacheName && e.path.startsWith("/assets/"))
      .length,
    "assets legítimos preservados após a rejeição offline",
  ).toBeGreaterThan(0);

  // Não-regressão offline: app vivo e progresso preservado no IndexedDB.
  await page.goto(origin);
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const progress = await readProgress(page);
  expect(progress?.lessonStatus?.[mapInitial.id]).toBe("completed");
  await context.close();
});
