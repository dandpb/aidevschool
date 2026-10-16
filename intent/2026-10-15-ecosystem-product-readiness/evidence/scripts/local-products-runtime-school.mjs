import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  ROOT,
  serve,
  browser,
  context,
  shot,
  check,
  closeContext,
  freePort,
  safeEnv,
} from "./local-products-runtime.mjs";

export async function observe(r) {
  const engine = path.join(ROOT, "engines/school-entry"),
    pw = await browser(r),
    owned = [];
  let ctx;
  const { hashPassword } = await import(path.join(engine, "server/auth.mjs"));
  const password = "Synthetic-readiness-only-20261015";
  const data = path.join(r.logDir, "private-data");
  await mkdir(data, { recursive: true });
  try {
    const quest = await serve(r, "sdlc-quest", (p) => [
      "node",
      "tools/serve.cjs",
      "--port",
      String(p),
    ]);
    owned.push(quest);
    const targetsFile = path.join(r.logDir, "targets.json");
    await writeFile(
      targetsFile,
      JSON.stringify({
        "sdlc-quest": { url: quest.origin, readySelector: "#mission-panel button" },
      }),
    );
    const app = await serve(r, "school-entry", () => ["node", "server/main.mjs"], {
      DATA_DIR: data,
      ENGINE_TARGETS_FILE: targetsFile,
      ALLOW_LOCAL_TARGETS: "1",
      ADMIN_PASSWORD_HASH: hashPassword(password),
      NODE_ENV: "test",
    });
    owned.push(app);
    r.privateStorage = {
      path: data,
      database: path.join(data, "release.sqlite"),
      target: quest.origin,
      providerKey: "absent",
    };
    ctx = await context(r, pw, "operator-and-student");
    const { p } = ctx;
    await p.goto(app.origin);
    await p.getByRole("heading", { name: "Por onde você quer começar?" }).waitFor();
    check(
      r,
      "Page identity and meaningful entry",
      (await p.title()) !== "" && !(await p.locator("nextjs-portal").count()),
    );
    await shot(r, p, "school-entry-first");
    const anon = await p.request.put(app.origin + "/api/admin/engines/sdlc-quest", {
      headers: { Origin: app.origin },
      data: { enabled: true, version: 0 },
    });
    check(r, "Anonymous release denied", anon.status() === 401, { httpStatus: anon.status() });
    await p
      .getByLabel("O que você quer aprender ou fazer?")
      .fill("Quero praticar o fluxo de desenvolvimento com IA");
    await p.getByRole("button", { name: "Encontrar meu caminho", exact: true }).click();
    await p.locator('[data-result-mode="empty"]').waitFor();
    check(
      r,
      "Default catalogue honestly empty",
      (await p.locator("[data-engine-card]").count()) === 0,
    );
    await shot(r, p, "school-entry-empty");
    await p.goto(app.origin + "/admin/engines");
    await p.getByLabel("Senha", { exact: true }).fill(password);
    await p.getByRole("button", { name: "Entrar", exact: true }).click();
    await p.locator("[data-admin-engine]").first().waitFor();
    check(
      r,
      "All thirteen destinations initially disabled",
      (await p.locator("[data-admin-engine]").count()) === 13 &&
        (await p.locator("[data-admin-engine] input:checked").count()) === 0,
    );
    const row = p.locator('[data-admin-engine="sdlc-quest"]');
    await row.getByRole("checkbox").check();
    await row.getByText("Alteração salva.", { exact: true }).waitFor();
    await shot(r, p, "school-entry-operator-enabled");
    await p.goto(app.origin);
    await p
      .getByLabel("O que você quer aprender ou fazer?")
      .fill("Quero praticar o fluxo de desenvolvimento com IA");
    await p.getByRole("button", { name: "Encontrar meu caminho", exact: true }).click();
    await p.locator('[data-result-mode="fallback"]').waitFor({ timeout: 18000 });
    const n = await p.locator("[data-engine-card]").count();
    check(
      r,
      "Real checker makes enabled Quest eligible",
      n === 1 && (await p.locator('[data-engine-id="sdlc-quest"]').count()) === 1,
    );
    check(
      r,
      "Missing provider key has distinct honest fallback",
      /personalizar/.test(await p.locator("#results").innerText()),
      { cards: n },
    );
    await shot(r, p, "school-entry-eligible-fallback");
    await p.getByRole("button", { name: "Começar", exact: true }).click();
    await p.waitForURL(quest.origin + "/", { timeout: 18000 });
    await p.locator("#start-mission").waitFor();
    check(
      r,
      "Launch repeats real health check and reaches actual Quest",
      await p.locator("#start-mission").isEnabled(),
    );
    await p.locator("#start-mission").click();
    await p.locator("#exercise").waitFor();
    await shot(r, p, "school-entry-launched-real-quest");
    r.cases.push({
      id: "operator-check-launch",
      status: "pass",
      source: "engines/school-entry/README.md#configurar-um-destino",
      method:
        "Actual entry runtime with private SQLite; real Chromium checker without overrides; actual Quest HTTP destination",
      empty: true,
      anonymousDenied: true,
      enabledTarget: "sdlc-quest",
      cards: n,
      launch: quest.origin,
    });
    r.cases.push({
      id: "recommendation-provider-positive-timeout",
      status: "unverified",
      reason:
        "No TypeSafe credential/call authorization. Missing-key fallback observed; producer model tests cover timeout/error but do not prove configured provider.",
    });
    await closeContext(ctx);
    ctx = null;
    const { createRuntime } = await import(path.join(engine, "server/runtime.mjs"));
    const badPort = await freePort();
    const broken = createRuntime(
      safeEnv({
        PORT: String(badPort),
        HOST: "127.0.0.1",
        DATA_DIR: path.join(r.logDir, "closed-storage"),
        NODE_ENV: "test",
      }),
    );
    await new Promise((res) => broken.listen(badPort, "127.0.0.1", res));
    broken.runtime.store.close();
    try {
      ctx = await context(r, pw, "storage-error");
      await ctx.p.goto(`http://127.0.0.1:${badPort}`);
      await ctx.p
        .getByRole("button", { name: "Ver experiências disponíveis", exact: true })
        .click();
      await ctx.p
        .locator("#request-status")
        .filter({ hasText: /erro|possível|disponível|falha/i })
        .waitFor();
      const resp = await ctx.p.request.get(`http://127.0.0.1:${badPort}/api/engines`);
      check(
        r,
        "Closed private SQLite returns service error rather than empty",
        resp.status() === 503 && (await ctx.p.locator('[data-result-mode="empty"]').count()) === 0,
        {
          httpStatus: resp.status(),
          scope: "in-process actual createRuntime; explicit close of its private store only",
        },
      );
      await shot(r, ctx.p, "school-entry-storage-error");
      r.cases.push({
        id: "storage-error",
        status: "pass",
        method:
          "Actual private SQLite explicitly closed after runtime startup; no checker/ranker mock",
      });
      await closeContext(ctx);
      ctx = null;
    } finally {
      await new Promise((res) => broken.close(res));
      await broken.runtime.checker.close?.();
      r.servers.push({
        engine: "school-entry",
        origin: `http://127.0.0.1:${badPort}`,
        pid: process.pid,
        method: "createRuntime in observer, private closed SQLite fault",
        stopped: true,
      });
    }
    check(r, "No page JavaScript errors", r.errors.length === 0);
  } catch (e) {
    if (ctx) {
      await shot(r, ctx.p, "school-entry-failure").catch(() => {});
      await closeContext(ctx, true);
      ctx = null;
    }
    throw e;
  } finally {
    await pw.close();
    for (const h of owned.reverse()) await h.stop();
    r.allOwnedProcessesStopped = owned.every(
      (h) => h.rec.exitCode !== null || h.rec.signal !== null,
    );
  }
}
