import type { Clock } from "../adapters/clock";
import type { ContentRepository } from "../application/ports";
import type { CatalogLessonEntry, ModuleDefinition, SkillId } from "../data/generated/lessons";
import {
  CHECKPOINT_SELECTION,
  type CheckpointDefinition,
  isCheckpointAvailable,
  isCheckpointCompleted,
  isLessonGateLocked,
} from "./checkpoints";
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

export type CheckpointSummary = {
  checkpoint: CheckpointDefinition;
  module: ModuleDefinition;
  available: boolean;
  completed: boolean;
  /** Módulo seguinte travado aguardando este desafio (mensagem do gate no mapa). */
  gatesModuleTitle?: string;
};

export type TrackQueries = {
  mission: CatalogLessonEntry | undefined;
  /** Desafio pendente (available e não concluído) — vira a missão do Home. */
  pendingCheckpoint: CheckpointSummary | undefined;
  checkpointSummaries: CheckpointSummary[];
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

  const checkpointSummaries: CheckpointSummary[] = CHECKPOINT_SELECTION.flatMap((checkpoint) => {
    const module = modules.find((entry) => entry.id === checkpoint.moduleId);
    if (!module) return [];
    return [
      {
        checkpoint,
        module,
        available: isCheckpointAvailable(progress, modules, checkpoint.id),
        completed: isCheckpointCompleted(progress, checkpoint.id),
      },
    ];
  });

  // Mensagem do gate no mapa: primeira lição locked do módulo ativado.
  for (const summary of checkpointSummaries) {
    for (const other of moduleSummaries) {
      const first = other.module.lessons.find((lesson) => lesson.hasContent);
      if (first && isLessonGateLocked(progress, modules, first.id)) {
        summary.gatesModuleTitle = other.module.title;
      }
    }
  }

  const pendingCheckpoint = checkpointSummaries.find(
    (summary) => summary.available && !summary.completed,
  );

  return {
    mission,
    pendingCheckpoint,
    checkpointSummaries,
    reviewLesson,
    dailyGoal: dailyGoalStatus(progress, now),
    trackSummary: trackSummary(modules, progress),
    dueReviews: due,
    upcomingReviews: upcomingReviews(progress, now),
    moduleSummaries,
    statusLabel: STATUS_LABEL,
  };
}
