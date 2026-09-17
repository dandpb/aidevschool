// Vertical Protocol — seed script
// Loads the cozy cyberpunk curriculum into the database.

import { db } from "../src/lib/db";
import { CURRICULUM } from "../src/lib/curriculum-data";

async function main() {
  console.log("🌱 Seeding Vertical Protocol curriculum...");

  // Wipe existing curriculum (keep learners/progress untouched in fresh installs)
  await db.lessonProgress.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();

  for (const mod of CURRICULUM) {
    const created = await db.module.create({
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
    console.log(`  ✓ Módulo: ${created.title} (${mod.lessons.length} lições)`);
  }

  // Ensure a default learner exists so the single-device cozy app just works
  let learner = await db.learner.findFirst();
  if (!learner) {
    learner = await db.learner.create({
      data: {
        name: "Recruta",
        path: "neon-syntax",
        hearts: 5,
        maxHearts: 5,
        gems: 20,
      },
    });
    await db.streak.create({ data: { learnerId: learner.id } });
    await db.settings.create({ data: { learnerId: learner.id } });
    console.log(`  ✓ Learner padrão criado: ${learner.id}`);
  }

  // Seed a few phantom league rivals for the leaderboard
  const rivals = [
    { name: "Yuki-7", leagueXp: 142 },
    { name: "Compiler_Aya", leagueXp: 98 },
    { name: "Shrine_Keep", leagueXp: 76 },
    { name: "NeonOtter", leagueXp: 54 },
    { name: "Static_Monk", leagueXp: 31 },
    { name: "RainWalker", leagueXp: 12 },
  ];
  for (const r of rivals) {
    await db.learner.upsert({
      where: { id: `rival-${r.name}` },
      update: { leagueXp: r.leagueXp, name: r.name, league: "bronze" },
      create: {
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
  console.log(`  ✓ ${rivals.length} rivais de liga seedados`);

  console.log("🌱 Seed completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
