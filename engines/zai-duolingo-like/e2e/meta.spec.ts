import { test, expect, type APIRequestContext } from "@playwright/test";
import type { Exercise } from "@/lib/grader";
import {
  wipeLearner,
  freshOnboardedPage,
  getLearner,
  e2eDb,
} from "./helpers";

// ─── helpers ───────────────────────────────────────────────────────────────

function correctAnswers(exercises: Exercise[]): unknown[] {
  return exercises.map((ex) => {
    switch (ex.type) {
      case "multiple-choice":
        return ex.correctIndex;
      case "true-false":
        return ex.isTrue;
      case "fill-blank": {
        const answer: number[] = [];
        for (let slot = 0; slot < ex.blanks; slot++) {
          answer.push(ex.banks.findIndex((b) => b.correctSlot === slot));
        }
        return answer;
      }
      case "swipe":
        return ex.items.map((item) => item.value);
      case "order":
        return [...ex.correctOrder];
    }
  });
}

async function completeLessonByApi(request: APIRequestContext, lessonId: string, exercises: Exercise[]) {
  const answers = await correctAnswers(exercises);
  const res = await request.post(`/api/lesson/${lessonId}/complete`, {
    data: { answers },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ─── Shop ──────────────────────────────────────────────────────────────────

test.describe("Shop", () => {
  test("buy streak freeze reduces gems and increments freeze count", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Comprador");

    // open shop via gems chip in top bar
    await page.getByTitle("Abrir loja").click();
    await expect(page.getByText("Loja de Gemas")).toBeVisible();

    // fresh learner starts with 20 gems
    await expect(page.getByText("20").first()).toBeVisible();

    // buy "Congela Ofensiva" (10 gems)
    const freezeCard = page.locator("div.cozy-card").filter({
      has: page.getByRole("heading", { name: "Congela Ofensiva" }),
    });
    await freezeCard.getByRole("button", { name: "Comprar" }).click();

    // success toast
    await expect(page.getByText(/Congela Ofensiva adquirido!/)).toBeVisible();

    // gems dropped to 10
    await expect(page.getByText("10").first()).toBeVisible();

    // DB assertion
    const learner = await getLearner();
    expect(learner.gems).toBe(10);
    expect(learner.streak?.freezes).toBe(1);
  });

  test("buy heart refill restores hearts and reduces gems", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Curandeiro");

    // set hearts to 2 via DB
    const db = e2eDb();
    const learnerRow = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    await db.learner.update({
      where: { id: learnerRow.id },
      data: { hearts: 2, heartsUpdatedAt: new Date() },
    });
    await db.$disconnect();

    // reload so app reads fresh state
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

    // open shop
    await page.getByTitle("Abrir loja").click();
    await expect(page.getByText("Loja de Gemas")).toBeVisible();

    // buy "Recarregar Vidas" (5 gems)
    const refillCard = page.locator("div.cozy-card").filter({
      has: page.getByRole("heading", { name: "Recarregar Vidas" }),
    });
    await refillCard.getByRole("button", { name: "Comprar" }).click();

    // success toast
    await expect(page.getByText(/Vidas recarregadas!/)).toBeVisible();

    // DB assertion: hearts full, gems reduced
    const learner = await getLearner();
    expect(learner.hearts).toBe(5);
    expect(learner.gems).toBe(15); // 20 - 5
  });

  test("unaffordable item disables the buy button (no purchase happens)", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Pobre");

    // set gems to 2 via DB
    const db = e2eDb();
    const learnerRow = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    await db.learner.update({
      where: { id: learnerRow.id },
      data: { gems: 2 },
    });
    await db.$disconnect();

    // reload so app reads fresh state
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

    // open shop
    await page.getByTitle("Abrir loja").click();
    await expect(page.getByText("Loja de Gemas")).toBeVisible();

    // "Congela Ofensiva" costs 10, learner has 2 — the UI disables the
    // purchase client-side (the server-side 400 is covered by vitest)
    const freezeCard = page.locator("div.cozy-card").filter({
      has: page.getByRole("heading", { name: "Congela Ofensiva" }),
    });
    await expect(freezeCard.getByRole("button", { name: "Comprar" })).toBeDisabled();

    // no purchase happened
    const learner = await getLearner();
    expect(learner.gems).toBe(2);
  });
});

// ─── Leaderboard ───────────────────────────────────────────────────────────

test("Leaderboard shows 7 standings with player marked and zone markers", async ({
  page,
  request,
}) => {
  await freshOnboardedPage(page, request, "Competidor");

  // navigate to Liga via bottom nav
  await page.getByRole("button", { name: "Liga" }).click();
  await expect(page.getByText(/Liga Bronze/)).toBeVisible();

  // 6 rivals (each with an "npc" badge) + 1 player = 7 standings
  await expect(page.getByText("npc", { exact: true })).toHaveCount(6);

  // player row is highlighted and the name carries the "(você)" suffix
  await expect(page.getByText("Competidor (você)")).toBeVisible();

  // promotion / demotion zone markers exist (TrendingUp / TrendingDown / Minus icons)
  await expect(page.locator("svg[class*='lucide-trending-up']").first()).toBeVisible();
});

// ─── Achievements ──────────────────────────────────────────────────────────

test.describe("Achievements", () => {
  test("fresh learner sees all locked achievements", async ({ page, request }) => {
    await freshOnboardedPage(page, request, "Iniciante");

    // navigate to achievements from home
    await page.getByRole("button", { name: /Conquistas/ }).click();
    await expect(page.getByText("Conquistas").first()).toBeVisible();

    // all badges should show ??? (locked) — at least one visible
    await expect(page.getByText("???").first()).toBeVisible();

    // progress should be 0%
    await expect(page.getByText("0%")).toBeVisible();
  });

  test("completing lesson 1 unlocks 'Primeiro Passo' achievement", async ({
    page,
    request,
  }) => {
    await freshOnboardedPage(page, request, "Conquistador");

    // get first lesson from DB
    const db = e2eDb();
    const mod = await db.module.findFirstOrThrow({
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    const lesson = mod.lessons[0];
    const exercises = JSON.parse(lesson.exercises);
    await db.$disconnect();

    // complete lesson via API
    await completeLessonByApi(request, lesson.id, exercises);

    // navigate to achievements
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();
    await page.getByRole("button", { name: /Conquistas/ }).click();
    await expect(page.getByText("Conquistas").first()).toBeVisible();

    // unlocked badge cards show their title (locked ones show "???")
    await expect(page.getByText("Primeiro Passo", { exact: true })).toBeVisible();
    // header counter shows the unlocks (primeiro-passo + compilador-iniciante
    // + estrela-perfeita from the perfect run — just assert it's non-zero)
    await expect(page.getByText(/[1-9]\d* de \d+ selos desbloqueados/)).toBeVisible();
  });
});

// ─── Activity Feed ─────────────────────────────────────────────────────────

test("Activity feed shows lesson completion entry", async ({ page, request }) => {
  await freshOnboardedPage(page, request, "Ativo");

  // get first lesson from DB
  const db = e2eDb();
  const mod = await db.module.findFirstOrThrow({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  const lesson = mod.lessons[0];
  const exercises = JSON.parse(lesson.exercises);
  await db.$disconnect();

  // complete lesson via API
  await completeLessonByApi(request, lesson.id, exercises);

  // navigate to profile where ActivityFeed renders
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Início" })).toBeVisible();
  await page.getByRole("button", { name: "Perfil" }).click();
  await expect(page.getByText("Linha do tempo")).toBeVisible();

  // Activity feed should show a lesson_complete entry
  await expect(page.getByText(/Lição concluída/)).toBeVisible();
});

// ─── Daily Challenge ───────────────────────────────────────────────────────

test("Daily challenge card shows lesson and completes after lesson finish", async ({
  page,
  request,
}) => {
  await freshOnboardedPage(page, request, "Desafiante");

  // fetch daily challenge to know which lesson to complete
  const dcRes = await request.get("/api/daily-challenge");
  expect(dcRes.ok()).toBeTruthy();
  const dcData = await dcRes.json();
  const challengeLessonId = dcData.challenge.lessonId;

  // get challenge lesson exercises
  const db = e2eDb();
  const challengeLesson = await db.lesson.findUniqueOrThrow({
    where: { id: challengeLessonId },
  });
  const exercises = JSON.parse(challengeLesson.exercises);

  // Home should show the daily challenge card with the lesson title
  // (exact: the title also appears inside the "Próxima lição:" line)
  await expect(page.getByText(dcData.challenge.lessonTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("Desafio do dia")).toBeVisible();

  // Complete the challenge lesson via API
  // If the lesson is not the first one, we may need to unlock prior lessons.
  // The daily challenge test in tests/api/daily-challenge.test.ts handles this;
  // for E2E we do the same walk.
  const allLessons = await db.lesson.findMany({
    orderBy: [{ moduleId: "asc" }, { order: "asc" }],
  });
  const idx = allLessons.findIndex((l) => l.id === challengeLessonId);
  for (let i = 0; i < idx; i++) {
    const ex = JSON.parse(allLessons[i].exercises);
    await completeLessonByApi(request, allLessons[i].id, ex);
  }
  await completeLessonByApi(request, challengeLessonId, exercises);
  await db.$disconnect();

  // reload home — daily challenge should show completed state
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

  // completed state: "Desafio concluído" and "Volte amanhã para um novo desafio!"
  await expect(page.getByText("Desafio concluído")).toBeVisible();
  await expect(page.getByText("Volte amanhã para um novo desafio!")).toBeVisible();
});
