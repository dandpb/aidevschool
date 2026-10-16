import path from "node:path";
import { createRequire } from "node:module";
import { lstat, readFile } from "node:fs/promises";
import {
  ROOT,
  serve,
  browser,
  context,
  shot,
  check,
  closeContext,
  command,
  pause,
  checkAbort,
} from "./local-products-runtime.mjs";

async function nav(p, name) {
  await p.getByRole("navigation").getByRole("button", { name, exact: true }).click();
}
async function enter(p, url) {
  await p.goto(url);
  const skip = p.getByRole("button", { name: "pular introdução" });
  await skip.waitFor();
  await skip.click();
}
async function onboarding(r, p, url, pathId) {
  await enter(p, url);
  await p.getByRole("heading", { name: "Escolha seu caminho" }).waitFor();
  await p.getByPlaceholder("Seu codinome de Compilador...").fill(`QA ${pathId}`);
  await p
    .getByRole("button", { name: pathId === "neon-syntax" ? /Neon Syntax/ : /Silicon Shrine/ })
    .click();
  await p.getByRole("button", { name: "Iniciar jornada", exact: true }).click();
  await p.getByRole("navigation").waitFor();
  check(
    r,
    `Real visible onboarding ${pathId}`,
    await p.getByRole("button", { name: "Começar lição 1", exact: true }).isVisible(),
  );
  await shot(r, p, `zai-onboarding-${pathId}`);
}
async function openLesson(p, l) {
  await nav(p, "Trilha");
  await p
    .locator("button")
    .filter({ hasText: l.title })
    .filter({ hasText: /XP|Praticar/ })
    .first()
    .click();
  await p.getByRole("button", { name: "Começar", exact: true }).click();
}
async function answer(r, p, ex, wrong = false) {
  await checkAbort(r);
  for (
    let i = 0;
    i < 12 && (await p.getByRole("button", { name: "Fechar", exact: true }).count());
    i++
  ) {
    const close = p.getByRole("button", { name: "Fechar", exact: true }).first();
    try {
      await close.focus();
      await p.keyboard.press("Enter");
    } catch (e) {
      if (await p.getByRole("button", { name: "Fechar", exact: true }).count()) throw e;
    }
    await pause(400);
    r.checks.push({
      name: "Dismissed offered achievement overlay with its visible close control and keyboard",
      status: "pass",
    });
  }
  await p.getByRole("heading", { name: ex.prompt, exact: true }).waitFor();
  if (ex.type === "multiple-choice")
    await p
      .getByRole("button", {
        name: ex.options[wrong ? (ex.correctIndex + 1) % ex.options.length : ex.correctIndex],
        exact: false,
      })
      .click();
  else if (ex.type === "true-false")
    await p
      .getByRole("button", {
        name: (wrong ? !ex.isTrue : ex.isTrue) ? "Verdadeiro" : "Falso",
        exact: true,
      })
      .click();
  else if (ex.type === "fill-blank")
    for (let i = 0; i < ex.blanks; i++)
      await p
        .getByRole("button", { name: ex.banks.find((b) => b.correctSlot === i).label, exact: true })
        .last()
        .click();
  else if (ex.type === "swipe")
    for (const [i, item] of ex.items.entries()) {
      const label = item.value === ex.swipeRightIf ? ex.rightLabel : ex.leftLabel;
      await p.getByRole("button", { name: label, exact: true }).click();
      await pause(260);
    }
  else if (ex.type === "order") {
    await p.getByText(ex.items[0], { exact: true }).waitFor();
    for (const [target, idx] of ex.correctOrder.entries()) {
      for (let moves = 0; moves < ex.items.length; moves++) {
        const drag = p.getByRole("button", { name: "Arrastar", exact: true });
        let current = -1;
        for (let j = 0; j < (await drag.count()); j++) {
          const text = await drag.nth(j).locator("..").innerText();
          if (text.includes(ex.items[idx])) {
            current = j;
            break;
          }
        }
        if (current === target) break;
        if (current < 0) throw Error("Order item missing " + ex.items[idx]);
        await drag
          .nth(current)
          .locator("..")
          .getByRole("button", { name: "Mover para cima", exact: true })
          .click();
      }
    }
  } else throw Error("Unknown exercise " + ex.type);
  await p.getByRole("button", { name: "Verificar", exact: true }).click();
  await p.getByText(wrong ? "Estática nos dados" : "Padrão reconhecido", { exact: true }).waitFor();
  r.checks.push({
    name: `Visible ${wrong ? "wrong" : "correct"} exercise ${ex.id}`,
    status: "pass",
    exerciseType: ex.type,
  });
  await p.getByRole("button", { name: /^(Continuar|Finalizar lição)$/ }).click();
}
async function complete(r, p, l, { wrongFirst = false, practice = false } = {}) {
  for (const [i, ex] of l.exercises.entries()) await answer(r, p, ex, wrongFirst && i === 0);
  await p
    .getByRole("heading", {
      name: practice ? "Prática concluída!" : "Lição completa!",
      exact: true,
    })
    .waitFor({ timeout: 15000 });
  await shot(r, p, `zai-${practice ? "practice" : "complete"}-${l.slug}`);
}
export async function observe(r) {
  const engine = path.join(ROOT, "engines/zai-duolingo-like"),
    owned = [];
  let ctx, pw, db;
  try {
    const dbFile = path.join(r.logDir, "readiness-app.db");
    try {
      await lstat(dbFile);
      throw Error("Refuse to reset an existing app database");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const env = {
      DATABASE_URL: `file:${dbFile}`,
      LLM_API_KEY: "",
      TYPESAFE_API_KEY: "",
      OPENAI_API_KEY: "",
      NODE_ENV: "production",
    };
    r.privateStorage = {
      database: dbFile,
      url: env.DATABASE_URL,
      existing: false,
      schema: "prisma/schema.prisma",
      seed: "prisma/seed.ts",
      seedDeletesOnlyThisDiscardableDatabase: true,
    };
    await command(r, engine, ["npm", "run", "db:push"], env, true);
    await command(r, engine, ["bun", "prisma/seed.ts"], env, true);
    const req = createRequire(path.join(engine, "package.json"));
    const { PrismaClient } = req("@prisma/client");
    db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    const counts = { modules: await db.module.count(), lessons: await db.lesson.count() };
    check(
      r,
      "Explicit private app schema and seed contain nine modules and twenty-seven lessons",
      counts.modules === 9 && counts.lessons === 27,
      { counts, database: dbFile },
    );
    const dataCommand = await command(
      r,
      engine,
      [
        "bun",
        "-e",
        'import { CURRICULUM } from "./src/lib/curriculum-data.ts"; console.log(JSON.stringify(CURRICULUM));',
      ],
      env,
      true,
    );
    const curriculum = JSON.parse(await readFile(dataCommand.rec.stdout, "utf8"));
    r.catalog = curriculum.map((m) => ({
      slug: m.slug,
      lessons: m.lessons.map((l) => ({
        slug: l.slug,
        exercises: l.exercises.map((e) => ({ id: e.id, type: e.type })),
      })),
    }));
    const next = await serve(
      r,
      "zai-duolingo-like",
      (p) => [
        "node",
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(p),
      ],
      env,
    );
    owned.push(next);
    pw = await browser(r);
    ctx = await context(r, pw, "next-curriculum");
    let p = ctx.p;
    await onboarding(r, p, next.origin, "neon-syntax");
    const first = curriculum[0].lessons[0];
    await p.getByRole("button", { name: "Começar lição 1", exact: true }).click();
    await p.getByRole("button", { name: "Começar", exact: true }).click();
    await answer(r, p, first.exercises[0], true);
    await p.reload();
    const skip = p.getByRole("button", { name: "pular introdução" });
    if (await skip.isVisible()) await skip.click();
    await p.getByRole("navigation").waitFor();
    check(
      r,
      "Partial lesson return restores profile and restarts uncompleted lesson",
      await p.getByRole("button", { name: "Começar lição 1", exact: true }).isVisible(),
    );
    await shot(r, p, "zai-partial-return");
    let finished = 0;
    const variants = new Set();
    for (const m of curriculum)
      for (const l of m.lessons) {
        await openLesson(p, l);
        await complete(r, p, l, { wrongFirst: finished === 0 });
        for (const e of l.exercises) variants.add(e.type);
        finished++;
        const learner = await db.learner.findFirst({
          where: { NOT: { id: { startsWith: "rival-" } } },
        });
        const progress = await db.lessonProgress.count({
          where: { learnerId: learner.id, completed: true },
        });
        check(r, `Persisted visible lesson completion ${l.slug}`, progress === finished, {
          completed: progress,
        });
        r.cases.push({
          id: `next-lesson-${l.slug}`,
          status: "pass",
          module: m.slug,
          lesson: l.slug,
          exercises: l.exercises.map((e) => ({ id: e.id, type: e.type })),
          via: "real UI controls and completion API initiated by UI; canonical CURRICULUM ground truth",
        });
        await p.getByRole("button", { name: "Trilha", exact: true }).first().click();
      }
    check(
      r,
      "All twenty-seven offered lessons and five interaction types executed",
      finished === 27 && variants.size === 5,
      { variants: [...variants] },
    );
    const before = await db.learner.findFirst({ where: { NOT: { id: { startsWith: "rival-" } } } });
    await openLesson(p, first);
    await complete(r, p, first, { practice: true });
    const after = await db.learner.findUnique({ where: { id: before.id } });
    check(
      r,
      "Completed lesson reopens as practice without hearts or XP gain",
      before.xp === after.xp && before.hearts === after.hearts,
      { hearts: after.hearts, xp: after.xp },
    );
    r.cases.push({ id: "practice-review", status: "pass", lesson: first.slug });
    await nav(p, "Início");
    await p
      .getByRole("button", { name: /Playground|Praticar prompts/ })
      .first()
      .click();
    await p
      .getByPlaceholder("Escreva seu prompt para o Bip...")
      .fill("Explique o que é IA em uma frase.");
    const chatResponse = p.waitForResponse((x) => x.url().endsWith("/api/chat"));
    await p.getByRole("button", { name: "Enviar", exact: true }).click();
    const resp = await chatResponse;
    const payload = await resp.json();
    await pause(500);
    await shot(r, p, "zai-chat-missing-provider");
    check(
      r,
      "Chat without provider returns explicit server error",
      resp.status() === 503 && payload.ok === false,
      { status: resp.status(), error: payload.error },
    );
    r.cases.push({
      id: "chat-missing-provider",
      status: "pass",
      httpStatus: resp.status(),
      payload,
      rendered: await p
        .locator("main")
        .innerText()
        .catch(() => p.locator("body").innerText()),
    });
    r.cases.push({
      id: "chat-configured-provider",
      status: "unverified",
      reason:
        "LLM_API_KEY intentionally empty; configured positive and real provider failure/timeout need an authorized disposable provider.",
    });
    await nav(p, "Perfil");
    await p.getByRole("button", { name: "Reiniciar", exact: true }).click();
    await p.getByRole("button", { name: "Confirmar reinício", exact: true }).click();
    await p.getByRole("heading", { name: "Escolha seu caminho" }).waitFor();
    await p.getByPlaceholder("Seu codinome de Compilador...").fill("QA silicon shrine");
    await p.getByRole("button", { name: /Silicon Shrine/ }).click();
    await p.getByRole("button", { name: "Iniciar jornada", exact: true }).click();
    await p.getByRole("navigation").waitFor();
    check(
      r,
      "Second onboarding path uses same curriculum",
      await p.getByRole("button", { name: "Começar lição 1", exact: true }).isVisible(),
    );
    await shot(r, p, "zai-onboarding-silicon-shrine");
    r.cases.push({ id: "onboarding-silicon-shrine", status: "pass", sameCurriculum: true });
    await closeContext(ctx);
    ctx = null;
    await next.stop();
    await checkAbort(r);
    const bun = await serve(
      r,
      "zai-duolingo-like",
      () => ["bun", ".next/standalone/server.js"],
      env,
    );
    owned.push(bun);
    ctx = await context(r, pw, "bun-standalone");
    p = ctx.p;
    await enter(p, bun.origin);
    await p.getByRole("navigation").waitFor();
    await p.getByRole("button", { name: "Começar lição 1", exact: true }).click();
    await p.getByRole("button", { name: "Começar", exact: true }).click();
    await complete(r, p, first);
    await shot(r, p, "zai-bun-complete");
    r.cases.push({
      id: "bun-standalone",
      status: "pass",
      samePrivateDatabase: dbFile,
      lesson: first.slug,
      coverage:
        "entry/onboarding-return and representative lesson; all27 curriculum executed under Next runtime",
    });
    await closeContext(ctx);
    ctx = null;
    check(r, "No browser JavaScript page errors", r.errors.length === 0);
  } catch (e) {
    if (ctx) {
      await shot(r, ctx.p, "zai-failure").catch(() => {});
      await closeContext(ctx, true);
      ctx = null;
    }
    throw e;
  } finally {
    await pw?.close();
    for (const h of owned.reverse()) await h.stop();
    await db?.$disconnect();
    r.allOwnedProcessesStopped = owned.every(
      (h) => h.rec.exitCode !== null || h.rec.signal !== null,
    );
  }
}
