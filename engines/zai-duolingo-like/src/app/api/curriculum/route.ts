import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";
import { isModuleUnlocked, isLessonUnlocked } from "@/lib/lesson-unlock";

export const dynamic = "force-dynamic";

// GET /api/curriculum — modules + lessons with the learner's progress overlaid
export async function GET() {
  const learner = await getCurrentLearner();

  const modules = await db.module.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  const progress = await db.lessonProgress.findMany({
    where: { learnerId: learner.id },
  });
  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId)
  );

  const result = modules.map((mod, modIdx) => {
    const moduleUnlocked = isModuleUnlocked(modules, completedIds, modIdx);

    const lessons = mod.lessons.map((lesson, lessonIdx) => {
      const p = progressMap.get(lesson.id);
      const unlocked = isLessonUnlocked(modules, completedIds, modIdx, lessonIdx);
      return {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        order: lesson.order,
        xpReward: lesson.xpReward,
        completed: p?.completed ?? false,
        stars: p?.stars ?? 0,
        attempts: p?.attempts ?? 0,
        unlocked,
        exercises: lesson.exercises,
        narrative: lesson.narrative,
        tip: lesson.tip,
      };
    });

    return {
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
      subtitle: mod.subtitle,
      description: mod.description,
      icon: mod.icon,
      accent: mod.accent,
      order: mod.order,
      unlocked: moduleUnlocked,
      lessons,
    };
  });

  return NextResponse.json({ modules: result });
}
