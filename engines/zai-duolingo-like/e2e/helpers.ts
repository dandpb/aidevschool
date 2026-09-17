// Shared E2E helpers: deterministic state setup via direct DB access (the
// test process and the dev server share the same SQLite file; specs run
// serially, so short writes are safe) and common UI flows.

import { expect, type Page, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DB_URL } from "../playwright.config";

export function e2eDb() {
  return new PrismaClient({ datasources: { db: { url: E2E_DB_URL } } });
}

// Wipe every trace of the player learner (rivals + curriculum stay).
// The app recreates the default learner lazily on the next request.
export async function wipeLearner() {
  const db = e2eDb();
  try {
    await db.dailyChallenge.deleteMany();
    await db.achievement.deleteMany();
    await db.activityLog.deleteMany();
    await db.chatThread.deleteMany();
    await db.lessonProgress.deleteMany();
    await db.streak.deleteMany();
    await db.settings.deleteMany();
    await db.learner.deleteMany({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
  } finally {
    await db.$disconnect();
  }
}

// Onboard a fresh learner through the real API.
export async function onboard(
  request: APIRequestContext,
  name = "Agente E2E",
  path: "neon-syntax" | "silicon-shrine" = "neon-syntax"
) {
  const res = await request.post("/api/init", { data: { name, path } });
  expect(res.ok()).toBeTruthy();
}

// Fresh state + onboarded learner + browser on the home view.
export async function freshOnboardedPage(
  page: Page,
  request: APIRequestContext,
  name = "Agente E2E"
) {
  await wipeLearner();
  await onboard(request, name);
  await page.goto("/");
  // hub chrome (bottom nav) means bootstrap routed to a hub view
  await expect(
    page.getByRole("navigation").getByRole("button", { name: "Início", exact: true })
  ).toBeVisible();
  return name;
}

// The player learner row as the DB sees it.
export async function getLearner() {
  const db = e2eDb();
  try {
    return await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
      include: { streak: true, settings: true },
    });
  } finally {
    await db.$disconnect();
  }
}
