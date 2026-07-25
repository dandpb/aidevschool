import type { Clock } from "../adapters/clock";
import type { ContentRepository } from "../application/ports";
import type { CatalogLessonEntry, ModuleDefinition, SkillId } from "../data/generated/lessons";
import type { DailyGoalStatus, LearnerProgress, LessonStatus, SkillPractice } from "./progress";
import { dailyGoalStatus, reviewsDue, upcomingReviews } from "./progress";
import { readyLessonEntries, trackSummary } from "./track";

export const STATUS_LABEL: Record<LessonStatus, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluída",
};

export type ModuleSummary = {
  module: ModuleDefinition;
  completedCount: number;
  totalCount: number;
};

export type TrackQueries = {
  mission: CatalogLessonEntry | undefined;
  reviewLesson: CatalogLessonEntry | undefined;
  dailyGoal: DailyGoalStatus;
  trackSummary: { completed: number; total: number };
  dueReviews: SkillPractice[];
  upcomingReviews: SkillPractice[];
  moduleSummaries: ModuleSummary[];
  statusLabel: typeof STATUS_LABEL;
};

/**
 * Modelo de leitura consolidado para as telas da trilha.
 * Centraliza as derivações que antes estavam espelhadas em Home, Progresso e Mapa.
 */
export function buildTrackQueries(
  progress: LearnerProgress,
  content: ContentRepository,
  clock: Clock,
): TrackQueries {
  const modules = content.listModules();
  const ready = readyLessonEntries(modules);
  const now = clock();

  const mission =
    ready.find(
      (entry) =>
        entry.id === progress.currentLessonId && progress.lessonStatus[entry.id] !== "completed",
    ) ??
    ready.find((entry) => {
      const status = progress.lessonStatus[entry.id];
      return status === "available" || status === "in_progress";
    });

  const due = reviewsDue(progress, now);
  const reviewLesson =
    due.length > 0
      ? ready.find(
          (entry) =>
            progress.lessonStatus[entry.id] === "completed" &&
            entry.skillIds.includes(due[0].skillId as SkillId),
        )
      : undefined;

  const moduleSummaries: ModuleSummary[] = modules.map((module) => ({
    module,
    completedCount: module.lessons.filter(
      (lesson) => progress.lessonStatus[lesson.id] === "completed",
    ).length,
    totalCount: module.lessons.length,
  }));

  return {
    mission,
    reviewLesson,
    dailyGoal: dailyGoalStatus(progress, now),
    trackSummary: trackSummary(modules, progress),
    dueReviews: due,
    upcomingReviews: upcomingReviews(progress, now),
    moduleSummaries,
    statusLabel: STATUS_LABEL,
  };
}
