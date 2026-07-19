import type { LessonDefinition, ModuleDefinition } from "../data/generated/lessons";
import { nextReadyLessonId, readyLessonEntries } from "./track";

export const PROGRESS_SCHEMA_VERSION = 1;

/**
 * Máximo que a UI registra é `completed`. `mastered` é reservado a uma futura
 * integração com verificador independente (ver docs/design/ai-literacy/evidence-contract.md)
 * e não existe neste tipo por decisão estrutural.
 */
export type LessonStatus = "locked" | "available" | "in_progress" | "completed";

export type SkillPractice = {
  skillId: string;
  attempts: number;
  /** Quantas tentativas avaliadas passaram — base do estágio de revisão espaçada. */
  passes: number;
  lastScore: number;
  lastPracticedAt: string;
  nextReviewAt?: string;
};

export type OnboardingGoal = "write_better" | "save_time" | "verify_answers" | "protect_data";
export type OnboardingContext = "work" | "studies" | "business" | "daily_life";
export type OnboardingConfidence = "low" | "medium" | "high";

export type OnboardingState = {
  completed: boolean;
  goal?: OnboardingGoal;
  context?: OnboardingContext;
  confidence?: OnboardingConfidence;
};

export type LearnerProgress = {
  schemaVersion: number;
  contentVersion: string;
  currentLessonId: string;
  lessonStatus: Record<string, LessonStatus>;
  skills: Record<string, SkillPractice>;
  xp: number;
  streak: { current: number; longest: number; lastActivityDate?: string };
  onboarding: OnboardingState;
  counters: { attempts: number };
};

export const XP_PER_ACTIVITY_PASS = 10;
export const XP_PER_LESSON_COMPLETE = 25;

const DAY_MS = 86_400_000;

/**
 * Estado inicial: somente lições com conteúdo (`hasContent`) recebem status;
 * lições `planned` nunca entram no mapa de status (a UI as mostra como "em breve").
 * A primeira lição pronta da trilha nasce `available`; as demais, `locked`.
 * Pré-requisitos `planned` não bloqueiam: como não têm conteúdo, jamais seriam
 * "completados", o que travaria a trilha inteira — a cadeia de desbloqueio do
 * MVP segue a ordem das lições prontas (ver `unlockNextReadyLesson`).
 */
export function createInitialProgress(
  modules: ModuleDefinition[],
  contentVersion: string,
): LearnerProgress {
  const ready = readyLessonEntries(modules);
  const lessonStatus: Record<string, LessonStatus> = {};
  for (const [index, entry] of ready.entries()) {
    lessonStatus[entry.id] = index === 0 ? "available" : "locked";
  }
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    contentVersion,
    currentLessonId: ready[0]?.id ?? "",
    lessonStatus,
    skills: {},
    xp: 0,
    streak: { current: 0, longest: 0 },
    onboarding: { completed: false },
    counters: { attempts: 0 },
  };
}

export function isLessonUnlocked(progress: LearnerProgress, lessonId: string): boolean {
  const status = progress.lessonStatus[lessonId];
  return status === "available" || status === "in_progress" || status === "completed";
}

export function unlockNextReadyLesson(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  completedLessonId: string,
): { progress: LearnerProgress; unlockedLessonId?: string } {
  const nextId = nextReadyLessonId(modules, completedLessonId);
  if (!nextId) return { progress };
  if (progress.lessonStatus[nextId] !== "locked") return { progress, unlockedLessonId: nextId };
  return {
    progress: {
      ...progress,
      lessonStatus: { ...progress.lessonStatus, [nextId]: "available" },
    },
    unlockedLessonId: nextId,
  };
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Sequência por data local: mesma data não repete; dia seguinte incrementa; lacuna recomeça em 1. */
export function applyStreak(progress: LearnerProgress, now: Date): LearnerProgress {
  const today = localDateKey(now);
  const last = progress.streak.lastActivityDate;
  if (last === today) return progress;
  const yesterday = localDateKey(new Date(now.getTime() - DAY_MS));
  const current = last === yesterday ? progress.streak.current + 1 : 1;
  return {
    ...progress,
    streak: {
      current,
      longest: Math.max(progress.streak.longest, current),
      lastActivityDate: today,
    },
  };
}

export function awardXp(progress: LearnerProgress, amount: number): LearnerProgress {
  return { ...progress, xp: progress.xp + amount };
}

/**
 * Atualiza o registro de prática das skills. Na aprovação, agenda a próxima
 * revisão pelo estágio (1ª aprovação → intervalsDays[0], 2ª → [1], …, com clamp
 * no último intervalo). Falhas não reagendam revisão.
 */
export function applyAttemptToSkills(
  progress: LearnerProgress,
  skillIds: string[],
  score: number,
  passed: boolean,
  now: Date,
  intervalsDays: number[],
): LearnerProgress {
  const skills = { ...progress.skills };
  const iso = now.toISOString();
  for (const skillId of skillIds) {
    const previous = skills[skillId];
    const attempts = (previous?.attempts ?? 0) + 1;
    const passes = (previous?.passes ?? 0) + (passed ? 1 : 0);
    const next: SkillPractice = {
      skillId,
      attempts,
      passes,
      lastScore: score,
      lastPracticedAt: iso,
      nextReviewAt: previous?.nextReviewAt,
    };
    if (passed && intervalsDays.length > 0) {
      const stage = Math.min(Math.max(passes - 1, 0), intervalsDays.length - 1);
      next.nextReviewAt = new Date(now.getTime() + intervalsDays[stage] * DAY_MS).toISOString();
    }
    skills[skillId] = next;
  }
  return { ...progress, skills };
}

export function reviewsDue(progress: LearnerProgress, now: Date): SkillPractice[] {
  const iso = now.toISOString();
  return Object.values(progress.skills).filter(
    (skill) => skill.nextReviewAt !== undefined && skill.nextReviewAt <= iso,
  );
}

export type LessonOutcome = {
  completed: boolean;
  lessonScore: number;
  missingActivityIds: string[];
};

/**
 * Conclusão da lição: todas as atividades obrigatórias avaliadas e média das
 * melhores notas >= completion.minimumScore (regra declarada no conteúdo).
 */
export function evaluateLessonCompletion(
  lesson: LessonDefinition,
  bestScores: Record<string, number>,
): LessonOutcome {
  const required = lesson.completion.requiredActivityIds;
  const missingActivityIds = required.filter((id) => bestScores[id] === undefined);
  const lessonScore =
    required.length === 0
      ? 0
      : required.reduce((total, id) => total + (bestScores[id] ?? 0), 0) / required.length;
  return {
    completed: missingActivityIds.length === 0 && lessonScore >= lesson.completion.minimumScore,
    lessonScore,
    missingActivityIds,
  };
}
