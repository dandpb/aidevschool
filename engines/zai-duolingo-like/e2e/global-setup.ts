// Global setup for the E2E suite: recreate the e2e database from scratch
// (schema + curriculum + rival learners) so every run starts deterministic.

import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { E2E_DB_URL } from "../playwright.config";

export default async function globalSetup() {
  const root = path.resolve(__dirname, "..");

  execSync("npx prisma db push --force-reset --skip-generate", {
    cwd: root,
    env: { ...process.env, DATABASE_URL: E2E_DB_URL },
    stdio: "inherit",
  });

  const { CURRICULUM } = await import("../src/lib/curriculum-data");
  const db = new PrismaClient({ datasources: { db: { url: E2E_DB_URL } } });
  try {
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

    // phantom league rivals (mirrors tests/helpers.ts)
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
  } finally {
    await db.$disconnect();
  }
  console.log("E2E database ready:", E2E_DB_URL);
}
