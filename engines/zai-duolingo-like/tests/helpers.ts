// Shared test helpers: database lifecycle, seeding, and request builders.
//
// Every API test file should call `resetDatabase()` in a beforeEach (or
// beforeAll when the suite is read-only) so tests stay independent on the
// single shared sqlite file.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CURRICULUM } from "@/lib/curriculum-data";
import { getCurrentLearner } from "@/lib/game";

// Delete all rows in FK-safe order.
export async function resetDatabase() {
  await db.dailyChallenge.deleteMany();
  await db.achievement.deleteMany();
  await db.activityLog.deleteMany();
  await db.chatThread.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.streak.deleteMany();
  await db.settings.deleteMany();
  await db.learner.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
}

// Load the full curriculum (mirrors prisma/seed.ts).
export async function seedCurriculum() {
  for (const mod of CURRICULUM) {
    await db.module.create({
      data: {
        slug: mod.slug,
        title: mod.title,
        subtitle: mod.subtitle,
        description: mod.description,
        icon: mod.icon,
        accent: mod.accent,
        order: mod.order,
        lessons: {
          create: mod.lessons.map((lesson) => ({
            slug: lesson.slug,
            title: lesson.title,
            narrative: lesson.narrative,
            tip: lesson.tip,
            order: lesson.order,
            xpReward: lesson.xpReward,
            exercises: JSON.stringify(lesson.exercises),
          })),
        },
      },
    });
  }
}

// Seed the phantom league rivals (mirrors prisma/seed.ts).
export async function seedRivals() {
  const rivals = [
    { name: "Yuki-7", leagueXp: 142 },
    { name: "Compiler_Aya", leagueXp: 98 },
    { name: "Shrine_Keep", leagueXp: 76 },
    { name: "NeonOtter", leagueXp: 54 },
    { name: "Static_Monk", leagueXp: 31 },
    { name: "RainWalker", leagueXp: 12 },
  ];
  for (const r of rivals) {
    await db.learner.create({
      data: {
        id: `rival-${r.name}`,
        name: r.name,
        leagueXp: r.leagueXp,
        league: "bronze",
        hearts: 5,
        maxHearts: 5,
        gems: 0,
      },
    });
  }
}

// Full baseline: curriculum + rivals + the default learner (created lazily by
// getCurrentLearner on first access, with streak + settings rows).
export async function seedBaseline() {
  await seedCurriculum();
  await seedRivals();
  return getCurrentLearner();
}

// The default (non-rival) learner — the single profile all routes operate on.
export async function currentLearner() {
  return db.learner.findFirstOrThrow({
    where: { NOT: { id: { startsWith: "rival-" } } },
  });
}

// Fetch the first lesson of the first module (always unlocked), with its
// parsed exercises — the canonical lesson for completion/practice tests.
export async function firstLesson() {
  const mod = await db.module.findFirstOrThrow({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  const lesson = mod.lessons[0];
  return { module: mod, lesson, exercises: JSON.parse(lesson.exercises) as any[] };
}

// Build answers that are all correct for the given parsed exercises.
export function correctAnswers(exercises: any[]): unknown[] {
  return exercises.map((ex) => {
    switch (ex.type) {
      case "multiple-choice":
        return ex.correctIndex;
      case "true-false":
        return ex.isTrue;
      case "fill-blank": {
        // bank index whose correctSlot === slot, per slot
        const answer: number[] = [];
        for (let slot = 0; slot < ex.blanks; slot++) {
          answer.push(ex.banks.findIndex((b: any) => b.correctSlot === slot));
        }
        return answer;
      }
      case "swipe":
        return ex.items.map((item: any) => item.value);
      case "order":
        return [...ex.correctOrder];
      default:
        return null;
    }
  });
}

// Build answers that are all wrong for the given parsed exercises.
export function wrongAnswers(exercises: any[]): unknown[] {
  return exercises.map((ex) => {
    switch (ex.type) {
      case "multiple-choice":
        return (ex.correctIndex + 1) % ex.options.length;
      case "true-false":
        return !ex.isTrue;
      case "fill-blank":
        return new Array(ex.blanks).fill(-1);
      case "swipe":
        return ex.items.map((item: any) => (item.value === "ai" ? "real" : "ai"));
      case "order":
        return [...ex.correctOrder].reverse();
      default:
        return null;
    }
  });
}

// Request builders matching how the store calls the routes.
export function postJson(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getReq(url: string): NextRequest {
  return new NextRequest(url);
}

// Route handlers with dynamic segments take `{ params: Promise<{ id }> }`.
export function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
