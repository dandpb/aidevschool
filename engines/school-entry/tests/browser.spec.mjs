import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntime } from "../server/runtime.mjs";
import { createApp } from "../server/app.mjs";
import { createChecker } from "../server/health.mjs";
import { createStore } from "../server/store.mjs";
import { hashPassword } from "../server/auth.mjs";
import { CATALOG } from "../server/catalog.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
});
async function fixture(
  t,
  { mode = "recommended", enabled = 4, checker, targetOverrides } = {},
) {
  const store = createStore(":memory:");
  const dest = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end("<h1>Destino de teste</h1>");
  });
  dest.listen(0, "127.0.0.1");
  await once(dest, "listening");
  const destination = `http://127.0.0.1:${dest.address().port}`;
  const selected = CATALOG.slice(0, enabled);
  for (const e of selected) {
    const old = store.list().find((x) => x.id === e.id);
    store.setEnabled(e.id, true, old.version);
  }
  const targets = Object.fromEntries(
    CATALOG.map((e) => [
      e.id,
      targetOverrides?.[e.id] ?? {
        url: destination + "/" + e.id,
        readySelector: "h1",
      },
    ]),
  );
  const ranker = async (_description, engines) => {
    if (mode === "fallback") throw Error("test unavailable");
    return {
      anyFit: mode === "no-match" ? 0.1 : 0.95,
      scores: Object.fromEntries(engines.map((e, i) => [e.id, 3 - i * 0.25])),
    };
  };
  const app = createApp({
    store,
    targets,
    checker: checker ?? (async () => true),
    ranker,
    adminPasswordHash: hashPassword("browser-test-only-password"),
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const base = `http://127.0.0.1:${app.address().port}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  t.after(async () => {
    await context.close();
    await new Promise((r) => app.close(r));
    await new Promise((r) => dest.close(r));
    await checker?.close?.();
    try {
      store.close();
    } catch {}
  });
  return { page, base, store, context, selected, destination };
}
async function ask(page, base) {
  await page.goto(base);
  await page
    .getByLabel("O que você quer aprender ou fazer?")
    .fill("Quero aprender a programar com prática");
  await page
    .getByRole("button", { name: "Encontrar meu caminho", exact: true })
    .click();
  await page.locator("[data-engine-card]").first().waitFor();
}

test("C16 student submits without login and chooses destination", async (t) => {
  const { page, base, selected, destination } = await fixture(t);
  await ask(page, base);
  assert.equal(await page.locator("[data-engine-card]").count(), 3);
  assert.equal(
    await page
      .locator("[data-engine-card]")
      .first()
      .getAttribute("data-engine-id"),
    selected[0].id,
  );
  assert.equal(new URL(page.url()).origin, base);
  await page
    .locator("[data-engine-card]")
    .nth(1)
    .getByRole("button", { name: "Começar" })
    .click();
  await page.waitForURL(destination + "/" + selected[1].id);
  assert.equal(await page.locator("h1").textContent(), "Destino de teste");
});
test("C21 browser distinguishes fallback no match and empty", async (t) => {
  for (const mode of ["fallback", "no-match", "empty"]) {
    const { page, base } = await fixture(t, {
      mode,
      enabled: mode === "empty" ? 0 : 4,
    });
    await page.goto(base);
    await page
      .getByLabel("O que você quer aprender ou fazer?")
      .fill("Quero aprender algo novo");
    await page
      .getByRole("button", { name: "Encontrar meu caminho", exact: true })
      .click();
    await page.locator(`[data-result-mode="${mode}"]`).waitFor();
    assert.equal(
      await page.locator("[data-engine-card]").count(),
      mode === "empty" ? 0 : 4,
    );
    const text = await page.locator("#results").textContent();
    assert.match(
      text,
      mode === "fallback"
        ? /personalizar/
        : mode === "no-match"
          ? /combina bem/
          : /Nenhuma experiência/,
    );
  }
});
test("C22 operator login toggle and logout work in browser", async (t) => {
  const { page, base, store } = await fixture(t, { enabled: 0 });
  await page.goto(base + "/admin/engines");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("browser-test-only-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator("[data-admin-engine]").first().waitFor();
  assert.equal(await page.locator("[data-admin-engine]").count(), 13);
  const first = page.locator("[data-admin-engine]").first();
  const id = await first.getAttribute("data-admin-engine");
  await first.getByRole("checkbox").check();
  await first.getByText("Alteração salva.", { exact: true }).waitFor();
  assert.equal(Boolean(store.list().find((e) => e.id === id).enabled), true);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByRole("button", { name: "Entrar", exact: true }).waitFor();
  assert.equal(await page.locator("[data-admin-engine]").count(), 0);
});
test("C23 mobile and desktop content does not overflow", async (t) => {
  const { page, base } = await fixture(t);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await ask(page, base);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.equal(await page.locator("[data-engine-card]").count(), 3);
  }
});
test("C24 newest student request owns displayed results", async (t) => {
  const { page, base } = await fixture(t);
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/api/recommend", async (route) => {
    await gate;
    try {
      await route.fulfill({
        json: {
          mode: "recommended",
          engines: [
            {
              id: "old",
              name: "Resultado antigo",
              description: "Obsoleto",
              reason: "Old",
            },
          ],
        },
      });
    } catch {}
  });
  await page.goto(base);
  await page
    .getByLabel("O que você quer aprender ou fazer?")
    .fill("Primeiro pedido");
  await page
    .getByRole("button", { name: "Encontrar meu caminho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver experiências disponíveis", exact: true })
    .click();
  await page.locator('[data-result-mode="catalog"]').waitFor();
  release();
  await page.waitForTimeout(100);
  assert.equal(
    await page.getByText("Resultado antigo", { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator("[data-engine-card]").count(), 4);
});

test("E1 entry contract serves the verified two-audience destinations", async (t) => {
  const { page, base } = await fixture(t);
  const response = await page.request.get(base + "/api/entry");
  assert.equal(response.status(), 200);
  const entry = await response.json();
  assert.equal(entry.fundamentals.engineId, "literacyDojo");
  // FSE review 2026-09-30: the standalone app starts with onboarding + the
  // Mapa Inicial (l02) and adapts the order — the contract must say so, not a
  // fixed l01–l14 sequence.
  assert.equal(
    entry.fundamentals.sequence,
    "avaliação inicial + trilha adaptativa",
  );
  assert.equal(entry.fundamentals.cta, "Começar pelos fundamentos");
  assert.equal(entry.journeys.length, 2);
  assert.deepEqual(
    entry.journeys.map((j) => j.id),
    ["cotidiano", "dev"],
  );
  for (const journey of entry.journeys)
    assert.equal(journey.engineId, "literacyDojo");
  const dev = entry.journeys.find((j) => j.id === "dev");
  assert.equal(dev.preview, true);
  assert.deepEqual(
    dev.bridge.lessons.map(([id]) => id),
    ["l15", "l16", "l17", "l21", "l22", "l23", "l27", "l28", "l29"],
  );
  assert.equal(dev.bridge.moduleId, "mod-05");
  // The dev bridge is PLANNED, never "served by the app today".
  assert.match(dev.bridge.label, /planejada/);
  assert.match(dev.bridge.note, /ainda não faz parte/);
});

test("E2 fundamentals CTA launches the verified literacyDojo destination", async (t) => {
  // FSE review 14:38Z: a generated href proves nothing — the launch gate must
  // actually reach the chosen runtime end to end. Real Chromium checker probes
  // the destination (readySelector visible+enabled) before the URL is issued;
  // the student browser then navigates for real and renders the destination.
  const realChecker = createChecker({ allowLocal: true });
  const { page, base, destination } = await fixture(t, {
    enabled: 5,
    checker: realChecker,
  });
  await page.goto(base);
  await page.locator("#start-fundamentals").waitFor();
  await page.locator("#start-fundamentals").click();
  await page.waitForURL(destination + "/literacyDojo");
  assert.equal(await page.locator("h1").textContent(), "Destino de teste");
});

test("E3 entry copy stays honest about progress and the dev preview", async (t) => {
  const { page, base } = await fixture(t);
  await page.goto(base);
  await page.locator("#jornada-dev").waitFor();
  const body = await page.locator("body").textContent();
  assert.match(body, /não sincroniza/);
  assert.doesNotMatch(
    body,
    /progresso sincronizado|sincroniza seu progresso|continuar de onde parou/i,
  );
  assert.doesNotMatch(body, /game-02/);
  assert.match(body, /PRÉVIA/);
  assert.equal(await page.locator("#jornada-dev .bridge-list li").count(), 9);
  assert.match(body, /progresso fica no app/i);
  // FSE review 14:38Z: no per-lesson deep link exists, so the copy must frame
  // the CTA as entering the journey — never an exact-lesson or resumption claim.
  assert.match(body, /entra na jornada/i);
  assert.doesNotMatch(body, /próxima lição|apresenta a próxima/i);
  assert.doesNotMatch(body, /retomar quando quiser/i);
  // FSE review 2026-09-30 (finding 1): the journey is adaptive (onboarding +
  // Mapa Inicial l02, route guided/intermediate); no fixed l01–l14 sequence,
  // no lesson count, and the dev bridge is planned — not in the app today.
  assert.match(body, /avaliação/i);
  assert.match(body, /se adapta/i);
  assert.doesNotMatch(body, /l01–l14|L01–L14/);
  assert.doesNotMatch(body, /14 lições/);
  assert.doesNotMatch(body, /sequência curada/);
  assert.doesNotMatch(body, /no mesmo app de lições/);
  // FSE review 2026-09-30 (finding 3): static copy never affirms availability
  // before the operator/health launch gate has answered.
  assert.doesNotMatch(body, /\(menta, disponível\)/);
  assert.doesNotMatch(body, /desafios disponíveis/);
  assert.match(body, /confirmada no lançamento/i);
});

test("E4 unreleased fundamentals keeps the student on the entry page", async (t) => {
  const { page, base } = await fixture(t, { enabled: 0 });
  await page.goto(base);
  await page.locator("#start-fundamentals").waitFor();
  await page.locator("#start-fundamentals").click();
  await page.waitForFunction(() => {
    const feedback = document.querySelector(".mission-panel .card-feedback");
    return feedback && feedback.textContent.length > 0;
  });
  assert.match(
    await page.locator(".mission-panel .card-feedback").textContent(),
    /não estão disponíveis/,
  );
  assert.equal(new URL(page.url()).origin, base);
});

test("E5 enabled-but-unreachable runtime is reported, never a bare href", async (t) => {
  // FSE review 14:38Z: the operator gate may be open, but if the runtime itself
  // is unreachable the entry check fails — the student must see the unavailable
  // state instead of receiving a link that does not load.
  const { page, base } = await fixture(t, {
    enabled: 5,
    checker: async () => false,
  });
  await page.goto(base);
  await page.locator("#start-fundamentals").waitFor();
  await page.locator("#start-fundamentals").click();
  await page.waitForFunction(() => {
    const feedback = document.querySelector(".mission-panel .card-feedback");
    return feedback && feedback.textContent.length > 0;
  });
  const feedback = await page
    .locator(".mission-panel .card-feedback")
    .textContent();
  assert.match(feedback, /não estão disponíveis/);
  assert.match(feedback, /liberação ou checagem/);
  assert.equal(new URL(page.url()).origin, base);
});

// FSE review 2026-09-30 (finding 4): E2 proves the launch gate against a
// fixture destination — it does NOT prove the chosen runtime. This opt-in spec
// drives the student CTA into a REAL built literacyDojo app. Run it locally
// (and in QA AID-3459) with:
//   cd engines/literacyDojo && npm ci && npm run build && npx vite preview --port 4173
//   cd engines/school-entry && LITERACY_REAL_BASE_URL=http://127.0.0.1:4173 npm run test:browser
// CI keeps the fixture destination: adding the real app here would pull a
// second npm ci + tsc + vite build into the school-entry job (documented
// blocker in the PR body); the first-hand real-app run is recorded as
// evidence on AID-3484 instead.
const REAL_LITERACY_BASE = process.env.LITERACY_REAL_BASE_URL;

test("E6 fundamentals CTA reaches the real literacyDojo app (opt-in)", { skip: !REAL_LITERACY_BASE }, async (t) => {
  const realChecker = createChecker({ allowLocal: true });
  const { page, base } = await fixture(t, {
    enabled: 5,
    checker: realChecker,
    targetOverrides: {
      literacyDojo: {
        url: REAL_LITERACY_BASE + "/?hosted=1",
        readySelector: "h1",
      },
    },
  });
  await page.goto(base);
  await page.locator("#start-fundamentals").waitFor();
  await page.locator("#start-fundamentals").click();
  await page.waitForURL((url) => url.origin === new URL(REAL_LITERACY_BASE).origin);
  // The real app opens on its own onboarding heading — the adaptive journey
  // entry (Mapa Inicial) — proving the runtime end to end, not a stub.
  const heading = page.locator("h1");
  await heading.waitFor({ state: "visible" });
  assert.ok((await heading.textContent())?.length > 0);
  if (process.env.ARTIFACT_DIR)
    await page.screenshot({
      path: join(process.env.ARTIFACT_DIR, "e6-real-literacy-entry.png"),
      fullPage: true,
    });
});

test("E7 resize never multiplies the map animation loop", async (t) => {
  // FSE review 2026-09-30 (finding 2): draw() used to self-schedule while the
  // resize handler called draw() directly, so each resize with animation on
  // created one more permanent RAF chain (1 resize → 2 loops/step, 2 → 3…).
  // Deterministic proof: replace requestAnimationFrame with a manually
  // stepped queue — a healthy loop runs exactly ONE callback per step, no
  // matter how many resize events fired.
  const { page, base } = await fixture(t);
  await page.addInitScript(() => {
    let nextHandle = 1;
    const pending = new Map();
    window.requestAnimationFrame = (cb) => {
      const handle = nextHandle++;
      pending.set(handle, cb);
      return handle;
    };
    window.cancelAnimationFrame = (handle) => {
      pending.delete(handle);
    };
    window.__stepRaf = () => {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const cb of callbacks) cb(window.performance.now());
      return callbacks.length;
    };
  });
  await page.goto(base);
  await page.locator("#start-fundamentals").waitFor();
  assert.equal(await page.evaluate(() => window.__stepRaf()), 1);
  assert.equal(await page.evaluate(() => window.__stepRaf()), 1);
  for (let i = 0; i < 3; i++)
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  // Old code: 1 direct draw + the running chain → 4 callbacks. Fixed: 1.
  assert.equal(await page.evaluate(() => window.__stepRaf()), 1);
  // Pausing cancels the scheduled handle: steps run zero callbacks, and a
  // resize while paused draws synchronously without scheduling anything.
  await page.getByRole("button", { name: /Pausar cenário/ }).click();
  await page.getByRole("button", { name: /Retomar cenário/ }).waitFor();
  assert.equal(await page.evaluate(() => window.__stepRaf()), 0);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  assert.equal(await page.evaluate(() => window.__stepRaf()), 0);
  // Resuming restores exactly one chain — never two.
  await page.getByRole("button", { name: /Retomar cenário/ }).click();
  assert.equal(await page.evaluate(() => window.__stepRaf()), 1);
  assert.equal(await page.evaluate(() => window.__stepRaf()), 1);
});

test("launch revocation refreshes available choices", async (t) => {  const { page, base, store, selected } = await fixture(t);
  await ask(page, base);
  const revoked = store.list().find((engine) => engine.id === selected[0].id);
  store.setEnabled(revoked.id, false, revoked.version);
  await page
    .locator("[data-engine-card]")
    .first()
    .getByRole("button", { name: "Começar" })
    .click();
  await page.locator('[data-result-mode="catalog"]').waitFor();
  assert.equal(
    await page.locator(`[data-engine-id="${revoked.id}"]`).count(),
    0,
  );
  assert.equal(await page.locator("[data-engine-card]").count(), 3);
  assert.match(
    await page.locator("#request-status").textContent(),
    /indisponível/,
  );
  assert.equal(new URL(page.url()).origin, base);
});

test("C17 browser submits through configured non-localhost origin", async (t) => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const base = `http://entry.test:${port}`;
  const dir = mkdtempSync(join(tmpdir(), "entry-origin-"));
  const store = createStore(":memory:");
  const selected = CATALOG[0];
  store.setEnabled(selected.id, true, 0);
  const app = createRuntime(
    {
      NODE_ENV: "test",
      PORT: String(port),
      HOST: "127.0.0.1",
      BASE_URL: base,
      DATA_DIR: dir,
    },
    {
      store,
      targets: {
        [selected.id]: { url: "https://example.org", readySelector: "button" },
      },
      checker: async () => true,
      ranker: async () => ({ anyFit: 1, scores: { [selected.id]: 3 } }),
    },
  );
  app.listen(port, "127.0.0.1");
  await once(app, "listening");
  const mappedBrowser = await chromium.launch({
    args: [
      "--host-resolver-rules=MAP entry.test 127.0.0.1",
      "--no-proxy-server",
    ],
  });
  t.after(async () => {
    await mappedBrowser.close();
    await new Promise((resolve) => app.close(resolve));
    await app.closeResources();
    rmSync(dir, { recursive: true, force: true });
  });
  const page = await mappedBrowser.newPage();
  await ask(page, base);
  assert.equal(new URL(page.url()).origin, base);
  assert.equal(
    await page.locator('[data-result-mode="recommended"]').count(),
    1,
  );
  assert.equal(
    await page
      .locator("[data-engine-card]")
      .first()
      .getAttribute("data-engine-id"),
    selected.id,
  );
});
