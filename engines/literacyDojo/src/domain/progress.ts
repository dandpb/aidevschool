import type { LessonDefinition, ModuleDefinition } from "../data/generated/lessons";
import { nextReadyLessonId, readyLessonEntries } from "./track";

export const PROGRESS_SCHEMA_VERSION = 3;
export const MAP_INITIAL_LESSON_ID = "l02";

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
export type OnboardingTaskCategory = "scheduling" | "communication" | "news_research";
export type LearningRoute = "guided" | "intermediate";
export type AudienceChoice = "ia_pratica" | "trilha_dev";

export type MapInitialState = {
  attempts: number;
  hintRequested: boolean;
  retried: boolean;
  firstAttemptPassed: boolean;
};

export type OnboardingState = {
  completed: boolean;
  goal?: OnboardingGoal;
  context?: OnboardingContext;
  confidence?: OnboardingConfidence;
  taskCategory?: OnboardingTaskCategory;
  route?: LearningRoute;
  audience?: AudienceChoice;
  mapInitial?: MapInitialState;
};

export type AchievementId =
  | "first_lesson"
  | "first_module"
  | "track_complete"
  | "streak_3"
  | "streak_7"
  | "first_application";

export type Achievement = {
  id: AchievementId;
  unlockedAt: string;
};

/** Metadados de exibição das conquistas (engajamento, nunca competência). */
export const ACHIEVEMENT_DEFINITIONS: {
  id: AchievementId;
  title: string;
  description: string;
}[] = [
  {
    id: "first_lesson",
    title: "Primeira lição",
    description: "Concluiu a primeira lição da trilha.",
  },
  {
    id: "first_module",
    title: "Primeiro módulo",
    description: "Concluiu todas as lições de um módulo.",
  },
  {
    id: "track_complete",
    title: "Trilha completa",
    description: "Concluiu todas as 14 lições da trilha.",
  },
  {
    id: "streak_3",
    title: "3 dias seguidos",
    description: "Praticou em 3 dias seguidos.",
  },
  {
    id: "streak_7",
    title: "7 dias seguidos",
    description: "Praticou em 7 dias seguidos.",
  },
  {
    id: "first_application",
    title: "Aplicação real",
    description: "Relatou o uso da IA em uma tarefa real de trabalho.",
  },
];

export type DailyGoal = {
  /** Data local (yyyy-mm-dd) a que se refere o xpEarned; vazio = nenhum XP hoje. */
  date: string;
  xpEarned: number;
};

export type ApplicationReport = {
  lessonId: string;
  reportedAt: string;
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
  achievements: Achievement[];
  dailyGoal: DailyGoal;
  applications: ApplicationReport[];
};

export const XP_PER_ACTIVITY_PASS = 10;
export const XP_PER_LESSON_COMPLETE = 25;
/** Meta diária simples (engajamento): juntar 10 XP por dia. */
export const DAILY_GOAL_XP = 10;

const DAY_MS = 86_400_000;

/** Clamp de estágio para repetição espaçada: sempre dentro do intervalo válido. */
export function clampStage(stage: number, maxStage: number): number {
  return Math.min(Math.max(stage, 0), maxStage);
}

/**
 * Estado inicial: somente lições com conteúdo (`hasContent`) recebem status;
 * lições `planned` nunca entram no mapa de status (a UI as mostra como "em breve").
 * A primeira lição pronta nasce `available`; o onboarding a substitui pelo
 * Mapa Inicial antes de qualquer pessoa abrir a trilha.
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
    achievements: [],
    dailyGoal: { date: "", xpEarned: 0 },
    applications: [],
  };
}

export function isLessonUnlocked(progress: LearnerProgress, lessonId: string): boolean {
  const status = progress.lessonStatus[lessonId];
  return status === "available" || status === "in_progress" || status === "completed";
}

export function startLesson(progress: LearnerProgress, lessonId: string): LearnerProgress {
  const current = progress.lessonStatus[lessonId];
  return {
    ...progress,
    currentLessonId: lessonId,
    lessonStatus: {
      ...progress.lessonStatus,
      [lessonId]: current === "completed" ? "completed" : "in_progress",
    },
  };
}

export function completeOnboarding(
  progress: LearnerProgress,
  input: {
    goal: OnboardingGoal;
    context: OnboardingContext;
    confidence: OnboardingConfidence;
    taskCategory: OnboardingTaskCategory;
    audience: AudienceChoice;
  },
): LearnerProgress {
  return {
    ...progress,
    onboarding: {
      completed: true,
      goal: input.goal,
      context: input.context,
      confidence: input.confidence,
      taskCategory: input.taskCategory,
      audience: input.audience,
    },
    currentLessonId: MAP_INITIAL_LESSON_ID,
    lessonStatus: {
      ...progress.lessonStatus,
      l01: "locked",
      [MAP_INITIAL_LESSON_ID]: "available",
    },
  };
}

export function unlockNextReadyLesson(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  completedLessonId: string,
): { progress: LearnerProgress; unlockedLessonId?: string } {
  const nextId = nextLessonIdFor(progress, modules, completedLessonId);
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

export function mapInitialRoute(mapInitial: MapInitialState | undefined): LearningRoute {
  return mapInitial?.firstAttemptPassed && !mapInitial.hintRequested && !mapInitial.retried
    ? "intermediate"
    : "guided";
}

function nextLessonIdFor(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  completedLessonId: string,
): string | undefined {
  if (completedLessonId === MAP_INITIAL_LESSON_ID) {
    return progress.onboarding.route === "intermediate" ? "l03" : "l01";
  }
  if (completedLessonId === "l01" && progress.onboarding.route === "guided") return "l03";
  return nextReadyLessonId(modules, completedLessonId);
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Sequência por data local: mesma data não repete; dia seguinte incrementa; lacuna recomeça em 1 (sem punição além disso). */
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

/** XP acumulado + XP do dia (meta diária reinicia a cada data local). */
export function awardXp(progress: LearnerProgress, amount: number, now: Date): LearnerProgress {
  const today = localDateKey(now);
  const dailyGoal: DailyGoal = {
    date: today,
    xpEarned: (progress.dailyGoal.date === today ? progress.dailyGoal.xpEarned : 0) + amount,
  };
  return { ...progress, xp: progress.xp + amount, dailyGoal };
}

export type DailyGoalStatus = {
  earned: number;
  goal: number;
  done: boolean;
};

export function dailyGoalStatus(progress: LearnerProgress, now: Date): DailyGoalStatus {
  const today = localDateKey(now);
  const earned = progress.dailyGoal.date === today ? progress.dailyGoal.xpEarned : 0;
  return { earned, goal: DAILY_GOAL_XP, done: earned >= DAILY_GOAL_XP };
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
      const stage = clampStage(passes - 1, intervalsDays.length - 1);
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

/** Agenda de revisões futuras (nextReviewAt no futuro), ordenada por data. */
export function upcomingReviews(progress: LearnerProgress, now: Date): SkillPractice[] {
  const iso = now.toISOString();
  return Object.values(progress.skills)
    .filter((skill) => skill.nextReviewAt !== undefined && skill.nextReviewAt > iso)
    .sort((a, b) => (a.nextReviewAt ?? "").localeCompare(b.nextReviewAt ?? ""));
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

// ---------------------------------------------------------------------------
// Conquistas (engajamento — nunca competência)
// ---------------------------------------------------------------------------

function moduleFullyCompleted(module: ModuleDefinition, progress: LearnerProgress): boolean {
  const ready = module.lessons.filter((entry) => entry.hasContent);
  return (
    ready.length > 0 && ready.every((entry) => progress.lessonStatus[entry.id] === "completed")
  );
}

/** Conquistas que o estado atual já satisfaz (independe do que já foi desbloqueado). */
export function earnedAchievementIds(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
): AchievementId[] {
  const earned: AchievementId[] = [];
  const completedCount = Object.values(progress.lessonStatus).filter(
    (status) => status === "completed",
  ).length;
  if (completedCount >= 1) earned.push("first_lesson");
  if (modules.some((module) => moduleFullyCompleted(module, progress))) {
    earned.push("first_module");
  }
  const ready = readyLessonEntries(modules);
  if (ready.length > 0 && ready.every((entry) => progress.lessonStatus[entry.id] === "completed")) {
    earned.push("track_complete");
  }
  if (progress.streak.longest >= 3) earned.push("streak_3");
  if (progress.streak.longest >= 7) earned.push("streak_7");
  if (progress.applications.length >= 1) earned.push("first_application");
  return earned;
}

/** Desbloqueia as conquistas novas; retorna o progresso e as recém-desbloqueadas. */
export function applyAchievements(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  now: Date,
): { progress: LearnerProgress; newlyUnlocked: Achievement[] } {
  const unlocked = new Set(progress.achievements.map((achievement) => achievement.id));
  const newlyUnlocked: Achievement[] = earnedAchievementIds(progress, modules)
    .filter((id) => !unlocked.has(id))
    .map((id) => ({ id, unlockedAt: now.toISOString() }));
  if (newlyUnlocked.length === 0) return { progress, newlyUnlocked };
  return {
    progress: { ...progress, achievements: [...progress.achievements, ...newlyUnlocked] },
    newlyUnlocked,
  };
}

/** Registra uma aplicação real relatada (sem texto livre — só a lição de origem). */
export function recordApplication(
  progress: LearnerProgress,
  lessonId: string,
  now: Date,
): LearnerProgress {
  if (progress.applications.some((report) => report.lessonId === lessonId)) return progress;
  return {
    ...progress,
    applications: [...progress.applications, { lessonId, reportedAt: now.toISOString() }],
  };
}

// ---------------------------------------------------------------------------
// Ciclo de vida do progresso (consolidado neste módulo)
// ---------------------------------------------------------------------------

export function emptyMapInitialState(): MapInitialState {
  return {
    attempts: 0,
    hintRequested: false,
    retried: false,
    firstAttemptPassed: false,
  };
}

function updateMapInitial(
  progress: LearnerProgress,
  update: (current: MapInitialState) => MapInitialState,
): LearnerProgress {
  const current = progress.onboarding.mapInitial ?? emptyMapInitialState();
  return {
    ...progress,
    onboarding: { ...progress.onboarding, mapInitial: update(current) },
  };
}

export function recordMapInitialAttempt(
  progress: LearnerProgress,
  evaluation: { pass: boolean },
): LearnerProgress {
  return updateMapInitial(progress, (mapInitial) => ({
    ...mapInitial,
    attempts: mapInitial.attempts + 1,
    firstAttemptPassed: mapInitial.attempts === 0 ? evaluation.pass : mapInitial.firstAttemptPassed,
  }));
}

export function recordMapInitialHintRequest(progress: LearnerProgress): LearnerProgress {
  return updateMapInitial(progress, (mapInitial) => ({ ...mapInitial, hintRequested: true }));
}

export function recordMapInitialRetry(progress: LearnerProgress): LearnerProgress {
  return updateMapInitial(progress, (mapInitial) => ({ ...mapInitial, retried: true }));
}

/**
 * Registra uma tentativa de atividade: contador, metadados do Mapa Inicial,
 * prática de skills, sequência e XP. Não emite evidência/analytics — isso
 * continua nos casos de uso (produtor ≠ verificador; side effects isolados).
 */
export function recordActivityAttempt(
  progress: LearnerProgress,
  input: {
    lessonId: string;
    evaluation: { pass: boolean; score: number };
    skillIds: string[];
    intervalsDays: number[];
    now: Date;
  },
): LearnerProgress {
  let next: LearnerProgress = {
    ...progress,
    counters: { attempts: progress.counters.attempts + 1 },
  };
  if (input.lessonId === MAP_INITIAL_LESSON_ID) {
    next = recordMapInitialAttempt(next, input.evaluation);
  }
  next = applyAttemptToSkills(
    next,
    input.skillIds,
    input.evaluation.score,
    input.evaluation.pass,
    input.now,
    input.intervalsDays,
  );
  next = applyStreak(next, input.now);
  if (input.evaluation.pass) next = awardXp(next, XP_PER_ACTIVITY_PASS, input.now);
  return next;
}

/**
 * Agenda (ou reagenda) a revisão espaçada das skills de uma lição.
 * Usa o mesmo clampStage de applyAttemptToSkills (única fonte do clamp).
 */
export function scheduleReviewForLesson(
  progress: LearnerProgress,
  lesson: LessonDefinition,
  now: Date,
  intervalIndex = 0,
): LearnerProgress {
  const intervals = lesson.review.intervalsDays;
  if (intervals.length === 0) return progress;
  const stage = clampStage(intervalIndex, intervals.length - 1);
  const nextReviewAt = new Date(now.getTime() + intervals[stage] * DAY_MS).toISOString();
  const skills = { ...progress.skills };
  for (const skillId of lesson.skillIds) {
    const previous: SkillPractice = skills[skillId] ?? {
      skillId,
      attempts: 0,
      passes: 0,
      lastScore: 0,
      lastPracticedAt: now.toISOString(),
    };
    skills[skillId] = { ...previous, nextReviewAt };
  }
  return { ...progress, skills };
}

export type CompleteLessonResult = {
  progress: LearnerProgress;
  outcome: LessonOutcome;
  nextLessonId?: string;
  newlyUnlocked?: Achievement[];
};

/**
 * Conclusão de lição: avalia, marca completo, aplica rota do onboarding no
 * Mapa Inicial, concede XP, agenda revisão, desbloqueia próxima lição,
 * muta currentLessonId e desbloqueia conquistas.
 */
export function completeLesson(
  progress: LearnerProgress,
  lesson: LessonDefinition,
  bestScores: Record<string, number>,
  modules: ModuleDefinition[],
  now: Date,
): CompleteLessonResult {
  const outcome = evaluateLessonCompletion(lesson, bestScores);
  if (!outcome.completed) {
    return { progress, outcome };
  }

  let next: LearnerProgress = {
    ...progress,
    lessonStatus: { ...progress.lessonStatus, [lesson.id]: "completed" },
  };
  if (lesson.id === MAP_INITIAL_LESSON_ID) {
    next = {
      ...next,
      onboarding: { ...next.onboarding, route: mapInitialRoute(next.onboarding.mapInitial) },
    };
  }
  next = awardXp(next, XP_PER_LESSON_COMPLETE, now);
  next = scheduleReviewForLesson(next, lesson, now, 0);
  const unlocked = unlockNextReadyLesson(next, modules, lesson.id);
  next = unlocked.progress;
  next = { ...next, currentLessonId: unlocked.unlockedLessonId ?? lesson.id };
  const withAchievements = applyAchievements(next, modules, now);
  next = withAchievements.progress;

  return {
    progress: next,
    outcome,
    nextLessonId: unlocked.unlockedLessonId,
    newlyUnlocked: withAchievements.newlyUnlocked,
  };
}
