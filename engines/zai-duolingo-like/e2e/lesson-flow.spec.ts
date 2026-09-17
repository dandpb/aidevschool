import { test, expect, type Page } from "@playwright/test";
import { wipeLearner, freshOnboardedPage, getLearner, e2eDb } from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getExerciseTypeLabel(page: Page): Promise<string> {
  const text = await page
    .locator("p")
    .filter({ hasText: /Múltipla escolha|Verdadeiro ou Falso|Complete a lacuna|Deslize para julgar|Ordene os passos/ })
    .first()
    .textContent();
  return text ?? "";
}

async function answerMultipleChoice(page: Page, correctIndex: number) {
  // Options rendered as buttons with A, B, C, D letter badges
  const letter = String.fromCharCode(65 + correctIndex);
  await page.locator("button").filter({ has: page.locator("span").filter({ hasText: letter }).first() }).first().click();
}

async function answerTrueFalse(page: Page, value: boolean) {
  const label = value ? "Verdadeiro" : "Falso";
  await page.getByRole("button", { name: label }).click();
}

async function answerFillBlank(page: Page, bankLabel: string) {
  await page.getByRole("button", { name: bankLabel }).click();
}

async function clickVerify(page: Page) {
  await page.getByRole("button", { name: "Verificar" }).click();
}

async function clickContinueOrFinish(page: Page) {
  const btn = page.getByRole("button", { name: /Continuar|Finalizar lição/ });
  await expect(btn).toBeVisible();
  await btn.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Start lesson 1 from Home CTA, verify lesson player opens
// ─────────────────────────────────────────────────────────────────────────────
test("start lesson 1 from home CTA and see first exercise", async ({ page, request }) => {
  await freshOnboardedPage(page, request, "Teste Lição");

  // Home shows the primary CTA for the first lesson when no lessons completed
  const cta = page.getByRole("button", { name: "Começar lição 1" });
  await expect(cta).toBeVisible();
  await cta.click();

  // Lesson intro screen
  await expect(page.getByText("IA não é mágica, é padrão")).toBeVisible();
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();

  // Start the lesson
  await page.getByRole("button", { name: "Começar" }).click();

  // First exercise visible with type label and prompt
  await expect(page.getByText("Múltipla escolha")).toBeVisible();
  await expect(
    page.getByText("Em uma frase simples: o que a IA de hoje realmente faz?")
  ).toBeVisible();

  // Progress indicator present (e.g. "1/4")
  await expect(page.getByText("1/4")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Answer all exercises of lesson 1 correctly → completion → XP increased
// ─────────────────────────────────────────────────────────────────────────────
test("complete lesson 1 with all correct answers and verify rewards", async ({ page, request }) => {
  await freshOnboardedPage(page, request, "Teste Perfeito");

  // Read initial XP from the TopBar chip (third stat chip: XP)
  const xpChip = page.locator("header").locator("div").filter({ hasText: /XP$/ }).first();
  const initialXpText = await xpChip.locator("span.font-bold").textContent();
  const initialXp = parseInt(initialXpText ?? "0", 10);

  // Start lesson 1
  await page.getByRole("button", { name: "Começar lição 1" }).click();
  await page.getByRole("button", { name: "Começar" }).click();

  // Exercise 1: multiple-choice (correct = index 1)
  await answerMultipleChoice(page, 1);
  await clickVerify(page);
  await expect(page.getByText("Padrão reconhecido")).toBeVisible();
  await clickContinueOrFinish(page);

  // Exercise 2: true-false (correct = false)
  await answerTrueFalse(page, false);
  await clickVerify(page);
  await expect(page.getByText("Padrão reconhecido")).toBeVisible();
  await clickContinueOrFinish(page);

  // Exercise 3: fill-blank (correct = bank "dados")
  await answerFillBlank(page, "dados");
  await clickVerify(page);
  await expect(page.getByText("Padrão reconhecido")).toBeVisible();
  await clickContinueOrFinish(page);

  // Exercise 4: multiple-choice (correct = index 2)
  await answerMultipleChoice(page, 2);
  await clickVerify(page);
  await expect(page.getByText("Padrão reconhecido")).toBeVisible();
  await clickContinueOrFinish(page); // "Finalizar lição"

  // Completion screen shows pass state
  await expect(page.getByText("Lição completa!")).toBeVisible();
  await expect(page.getByText(/Decadência Lógica reduzida/)).toBeVisible();

  // 3 filled stars for 100% accuracy
  await expect(page.locator("svg.fill-neon-amber")).toHaveCount(3);

  // XP reward shown in reward grid
  await expect(page.getByText("+15", { exact: true })).toBeVisible();

  // Navigate back home
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

  // XP chip increased
  const newXpText = await xpChip.locator("span.font-bold").textContent();
  const newXp = parseInt(newXpText ?? "0", 10);
  expect(newXp).toBeGreaterThan(initialXp);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Wrong answer costs hearts
// ─────────────────────────────────────────────────────────────────────────────
test("wrong answer in lesson 1 costs a heart", async ({ page, request }) => {
  await freshOnboardedPage(page, request, "Teste Coração");

  const learnerBefore = await getLearner();
  const initialHearts = learnerBefore.hearts;

  // Start lesson 1
  await page.getByRole("button", { name: "Começar lição 1" }).click();
  await page.getByRole("button", { name: "Começar" }).click();

  // Exercise 1: answer WRONG (index 0 instead of correct 1)
  await answerMultipleChoice(page, 0);
  await clickVerify(page);
  await expect(page.getByText("Estática nos dados")).toBeVisible();
  await clickContinueOrFinish(page);

  // Answer remaining exercises correctly to still pass (3/4 correct = 75% >= 50%)
  // Exercise 2: true-false (correct = false)
  await answerTrueFalse(page, false);
  await clickVerify(page);
  await clickContinueOrFinish(page);

  // Exercise 3: fill-blank (correct = "dados")
  await answerFillBlank(page, "dados");
  await clickVerify(page);
  await clickContinueOrFinish(page);

  // Exercise 4: multiple-choice (correct = index 2)
  await answerMultipleChoice(page, 2);
  await clickVerify(page);
  await clickContinueOrFinish(page);

  // Completion screen shows hearts lost
  await expect(page.getByText("Lição completa!")).toBeVisible();
  // The reward grid shows "Vidas" with value "-1"
  await expect(page.getByText("-1")).toBeVisible();

  // Verify DB hearts decreased by 1
  const learnerAfter = await getLearner();
  expect(learnerAfter.hearts).toBe(initialHearts - 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Lesson with swipe exercise (module 1, lesson 3)
// ─────────────────────────────────────────────────────────────────────────────
test("complete a lesson containing a swipe exercise", async ({ page, request }) => {
  const db = e2eDb();
  try {
    await wipeLearner();
    await request.post("/api/init", { data: { name: "Teste Swipe", path: "neon-syntax" } });

    // Find lesson IDs for module 1
    const lessons = await db.lesson.findMany({
      where: { module: { order: 0 } },
      orderBy: { order: "asc" },
    });
    const lesson1 = lessons[0];
    const lesson2 = lessons[1];
    const lesson3 = lessons[2];

    // Mark lessons 1 and 2 completed so lesson 3 unlocks
    const learner = await db.learner.findFirst({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    if (!learner) throw new Error("No learner found");

    await db.lessonProgress.createMany({
      data: [
        { learnerId: learner.id, lessonId: lesson1.id, completed: true, stars: 3, bestScore: 4 },
        { learnerId: learner.id, lessonId: lesson2.id, completed: true, stars: 3, bestScore: 3 },
      ],
    });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

    // Navigate to SkillPath
    await page.getByRole("navigation").getByRole("button", { name: "Trilha", exact: true }).click();
    await expect(page.getByText("Árvore de Habilidades")).toBeVisible();

    // Click the lesson 3 NODE button (contains the "+N XP" meta); the
    // floating ContinueFab also carries the title, so filter it out
    await page.locator("button").filter({ hasText: lesson3.title }).filter({ hasText: "XP" }).click();

    // Lesson intro
    await expect(page.getByText(lesson3.title).first()).toBeVisible();
    await page.getByRole("button", { name: "Começar" }).click();

    // Lesson 3 exercises from curriculum: MC, SWIPE, TF
    // Walk through until we hit the swipe exercise
    let swipeSeen = false;
    for (let step = 0; step < 10; step++) {
      const typeLabel = await getExerciseTypeLabel(page);

      if (typeLabel.includes("Deslize")) {
        swipeSeen = true;
        // Swipe exercise m1l3e2: items = [ai, real, ai, real]
        // swipeRightIf="ai", rightLabel="Treino", leftLabel="Uso"
        // Correct: right (Treino) for ai, left (Uso) for real
        await page.getByRole("button", { name: /Treino/ }).click();
        await page.getByRole("button", { name: /Uso/ }).click();
        await page.getByRole("button", { name: /Treino/ }).click();
        await page.getByRole("button", { name: /Uso/ }).click();
        await clickVerify(page);
        await clickContinueOrFinish(page);
        break;
      } else if (typeLabel.includes("Múltipla")) {
        // First MC: correctIndex = 1
        await answerMultipleChoice(page, 1);
        await clickVerify(page);
        await clickContinueOrFinish(page);
      } else if (typeLabel.includes("Verdadeiro")) {
        // TF: isTrue = false
        await answerTrueFalse(page, false);
        await clickVerify(page);
        await clickContinueOrFinish(page);
      } else {
        break;
      }
    }
    expect(swipeSeen).toBe(true);

    // Finish any remaining exercises
    for (let step = 0; step < 5; step++) {
      const finishBtn = page.getByRole("button", { name: "Finalizar lição" });
      if (await finishBtn.isVisible().catch(() => false)) {
        await finishBtn.click();
        break;
      }
      const verifyBtn = page.getByRole("button", { name: "Verificar" });
      if (await verifyBtn.isVisible().catch(() => false)) {
        const typeLabel = await getExerciseTypeLabel(page);
        if (typeLabel.includes("Verdadeiro")) {
          await answerTrueFalse(page, false);
        } else {
          await answerMultipleChoice(page, 1);
        }
        await clickVerify(page);
        await clickContinueOrFinish(page);
      } else {
        break;
      }
    }

    await expect(page.getByText(/Lição completa!|Continue tentando/)).toBeVisible();
  } finally {
    await db.$disconnect();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Lesson with order exercise (module 1, lesson 2)
// ─────────────────────────────────────────────────────────────────────────────
test("complete a lesson containing an order exercise", async ({ page, request }) => {
  const db = e2eDb();
  try {
    await wipeLearner();
    await request.post("/api/init", { data: { name: "Teste Ordem", path: "neon-syntax" } });

    const lessons = await db.lesson.findMany({
      where: { module: { order: 0 } },
      orderBy: { order: "asc" },
    });
    const lesson1 = lessons[0];
    const lesson2 = lessons[1];

    // Mark lesson 1 completed so lesson 2 unlocks
    const learner = await db.learner.findFirst({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    if (!learner) throw new Error("No learner found");

    await db.lessonProgress.create({
      data: {
        learnerId: learner.id,
        lessonId: lesson1.id,
        completed: true,
        stars: 3,
        bestScore: 4,
      },
    });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

    // Navigate to SkillPath
    await page.getByRole("navigation").getByRole("button", { name: "Trilha", exact: true }).click();
    await expect(page.getByText("Árvore de Habilidades")).toBeVisible();

    // Click lesson 2
    await page.locator("button").filter({ hasText: lesson2.title }).filter({ hasText: "XP" }).click();

    // Lesson intro
    await expect(page.getByText(lesson2.title).first()).toBeVisible();
    await page.getByRole("button", { name: "Começar" }).click();

    // Lesson 2 exercises: ORDER, MC, TF
    let orderSeen = false;
    for (let step = 0; step < 10; step++) {
      const typeLabel = await getExerciseTypeLabel(page);

      if (typeLabel.includes("Ordene")) {
        orderSeen = true;
        // OrderExercise: initial scramble is emitted as answer on mount.
        // The UI exposes ▲/▼ arrow buttons for reordering, but the initial
        // order is random. For this test we verify the UI renders and the
        // verify flow works; we do not guarantee a correct answer due to
        // the random scramble. Documented limitation.
        await expect(page.getByText("Arraste para ordenar")).toBeVisible();
        await clickVerify(page);
        // Reveal shows either "Sequência perfeita!" or "Ordem correta:"
        await expect(
          page.getByText(/Sequência perfeita!|Ordem correta:/)
        ).toBeVisible();
        await clickContinueOrFinish(page);
        break;
      } else if (typeLabel.includes("Múltipla")) {
        // MC: correctIndex = 3 ("Todas as alternativas")
        await answerMultipleChoice(page, 3);
        await clickVerify(page);
        await clickContinueOrFinish(page);
      } else if (typeLabel.includes("Verdadeiro")) {
        // TF: isTrue = true
        await answerTrueFalse(page, true);
        await clickVerify(page);
        await clickContinueOrFinish(page);
      } else {
        break;
      }
    }
    expect(orderSeen).toBe(true);

    // Finish remaining exercises
    for (let step = 0; step < 5; step++) {
      const finishBtn = page.getByRole("button", { name: "Finalizar lição" });
      if (await finishBtn.isVisible().catch(() => false)) {
        await finishBtn.click();
        break;
      }
      const verifyBtn = page.getByRole("button", { name: "Verificar" });
      if (await verifyBtn.isVisible().catch(() => false)) {
        const typeLabel = await getExerciseTypeLabel(page);
        if (typeLabel.includes("Verdadeiro")) {
          await answerTrueFalse(page, true);
        } else {
          await answerMultipleChoice(page, 3);
        }
        await clickVerify(page);
        await clickContinueOrFinish(page);
      } else {
        break;
      }
    }

    await expect(page.getByText(/Lição completa!|Continue tentando/)).toBeVisible();
  } finally {
    await db.$disconnect();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Practice mode — complete lesson 1, then practice it for gems
// ─────────────────────────────────────────────────────────────────────────────
test("practice mode on completed lesson awards gems without costing hearts", async ({ page, request }) => {
  const db = e2eDb();
  try {
    await wipeLearner();
    await request.post("/api/init", { data: { name: "Teste Prática", path: "neon-syntax" } });

    const lessons = await db.lesson.findMany({
      where: { module: { order: 0 } },
      orderBy: { order: "asc" },
    });
    const lesson1 = lessons[0];

    // Mark lesson 1 as completed
    const learner = await db.learner.findFirst({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    if (!learner) throw new Error("No learner found");

    await db.lessonProgress.create({
      data: {
        learnerId: learner.id,
        lessonId: lesson1.id,
        completed: true,
        stars: 3,
        bestScore: 4,
      },
    });

    // Set known hearts count
    await db.learner.update({ where: { id: learner.id }, data: { hearts: 5 } });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

    // Navigate to SkillPath
    await page.getByRole("navigation").getByRole("button", { name: "Trilha", exact: true }).click();
    await expect(page.getByText("Árvore de Habilidades")).toBeVisible();

    // Find the completed lesson node and click it (triggers practice)
    const lessonNode = page.locator("button").filter({ hasText: lesson1.title }).first();
    await expect(lessonNode).toBeVisible();

    const learnerBefore = await getLearner();
    const initialGems = learnerBefore.gems;
    const initialHearts = learnerBefore.hearts;

    await lessonNode.click();

    // Practice intro shows "Modo prática" badge
    await expect(page.getByText("Modo prática")).toBeVisible();
    await page.getByRole("button", { name: "Começar" }).click();

    // Answer all 4 exercises correctly for max gems (3 gems for 100%)
    for (let i = 0; i < 4; i++) {
      const typeLabel = await getExerciseTypeLabel(page);
      if (typeLabel.includes("Múltipla")) {
        if (i === 0) await answerMultipleChoice(page, 1);
        else await answerMultipleChoice(page, 2);
      } else if (typeLabel.includes("Verdadeiro")) {
        await answerTrueFalse(page, false);
      } else if (typeLabel.includes("lacuna")) {
        await answerFillBlank(page, "dados");
      }
      await clickVerify(page);
      await clickContinueOrFinish(page);
    }

    // Practice completion screen
    await expect(page.getByText("Prática concluída!")).toBeVisible();
    await expect(page.getByText(/gemas coletadas/)).toBeVisible();

    // Verify gems increased, hearts unchanged
    const learnerAfter = await getLearner();
    expect(learnerAfter.gems).toBeGreaterThan(initialGems);
    expect(learnerAfter.hearts).toBe(initialHearts);
  } finally {
    await db.$disconnect();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Zero hearts gate — lesson start blocked when hearts = 0
// ─────────────────────────────────────────────────────────────────────────────
test("zero hearts blocks starting a new lesson", async ({ page, request }) => {
  const db = e2eDb();
  try {
    await wipeLearner();
    await request.post("/api/init", { data: { name: "Teste Sem Vida", path: "neon-syntax" } });

    // Set hearts to 0
    const learner = await db.learner.findFirst({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    if (!learner) throw new Error("No learner found");
    await db.learner.update({ where: { id: learner.id }, data: { hearts: 0 } });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();

    // Hearts chip shows 0/5
    await expect(page.getByRole("banner").getByText("0/5")).toBeVisible();

    // Navigate to SkillPath
    await page.getByRole("navigation").getByRole("button", { name: "Trilha", exact: true }).click();
    await expect(page.getByText("Árvore de Habilidades")).toBeVisible();

    // The floating Continue FAB should NOT appear when hearts <= 0
    await expect(
      page.locator("button").filter({ hasText: /Começar/ })
    ).not.toBeVisible();

    // Click the first (uncompleted) lesson node — SkillPath redirects to home
    const lessonNode = page.locator("button").filter({ hasText: "IA não é mágica" }).first();
    await lessonNode.click();

    // Should land back on home view
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();
    await expect(page.getByText("Próxima lição:")).toBeVisible();
  } finally {
    await db.$disconnect();
  }
});