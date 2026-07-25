import type { ActivityDefinition, LessonDefinition } from "../data/generated/lessons";
import { emptyAnswerFor } from "./evaluation";
import type { ActivityAnswer, EvaluationResult } from "./evaluation";
import type { AttemptFeedback } from "./feedback";
import type { OnboardingState } from "./progress";

export type LessonMode = "initial" | "review";

export type AttemptState = {
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
};

export type HintState = {
  index: number;
  shown: string[];
};

export type LessonSessionPhase = "intro" | "attempting" | "feedback" | "completed";

export type LessonSession = {
  lessonId: string;
  mode: LessonMode;
  phase: LessonSessionPhase;
  onboarding?: OnboardingState;
  startedAt?: Date;
  currentActivityIndex: number;
  answers: Record<string, ActivityAnswer>;
  attempts: Record<string, AttemptState>;
  best: Record<string, AttemptState>;
  hints: Record<string, HintState>;
  finishPayload?: FinishPayload;
};

export type FinishPayload = {
  bestScores: Record<string, number>;
  durationSeconds?: number;
};

export type LessonSessionCommand =
  | { type: "start"; now: Date }
  | { type: "submit"; evaluation: EvaluationResult; feedback: AttemptFeedback }
  | { type: "hint"; hint: string | null }
  | { type: "retry" }
  | { type: "next" }
  | { type: "finish"; now: Date };

export type DispatchResult = {
  session: LessonSession;
  finishPayload?: FinishPayload;
};

export function createLessonSession(
  lessonId: string,
  mode: LessonMode = "initial",
  onboarding?: OnboardingState,
): LessonSession {
  return {
    lessonId,
    mode,
    phase: "intro",
    onboarding,
    currentActivityIndex: 0,
    answers: {},
    attempts: {},
    best: {},
    hints: {},
  };
}

export function currentActivity(
  session: LessonSession,
  lesson: LessonDefinition,
): ActivityDefinition | undefined {
  return lesson.activities[session.currentActivityIndex];
}

export function currentAnswer(
  session: LessonSession,
  activity: ActivityDefinition,
): ActivityAnswer {
  return session.answers[activity.id] ?? emptyAnswerFor(activity);
}

export function latestAttempt(
  session: LessonSession,
  activityId: string,
): AttemptState | undefined {
  return session.attempts[activityId];
}

export function bestAttempt(session: LessonSession, activityId: string): AttemptState | undefined {
  return session.best[activityId];
}

export function hintsFor(session: LessonSession, activityId: string): HintState {
  return session.hints[activityId] ?? { index: 0, shown: [] };
}

export function isLastActivity(session: LessonSession, lesson: LessonDefinition): boolean {
  return session.currentActivityIndex === lesson.activities.length - 1;
}

export function requiredActivitiesPassed(
  session: LessonSession,
  requiredActivityIds: string[],
): boolean {
  return requiredActivityIds.every((id) => session.best[id]?.evaluation.pass);
}

export function canFinish(session: LessonSession, lesson: LessonDefinition): boolean {
  return requiredActivitiesPassed(session, lesson.completion.requiredActivityIds);
}

export function dispatch(
  session: LessonSession,
  lesson: LessonDefinition,
  command: LessonSessionCommand,
): DispatchResult {
  switch (command.type) {
    case "start":
      return { session: startSession(session, command.now) };
    case "submit":
      return { session: submitAttempt(session, lesson, command.evaluation, command.feedback) };
    case "hint":
      return { session: recordHint(session, lesson, command.hint) };
    case "retry":
      return { session: retryCurrentActivity(session, lesson) };
    case "next":
      return { session: nextActivity(session, lesson) };
    case "finish":
      return finishLesson(session, lesson, command.now);
  }
}

function startSession(session: LessonSession, now: Date): LessonSession {
  if (session.phase !== "intro") return session;
  return {
    ...session,
    phase: "attempting",
    startedAt: now,
    currentActivityIndex: 0,
  };
}

function submitAttempt(
  session: LessonSession,
  lesson: LessonDefinition,
  evaluation: EvaluationResult,
  feedback: AttemptFeedback,
): LessonSession {
  if (session.phase !== "attempting") return session;
  const activity = currentActivity(session, lesson);
  if (!activity) return session;

  const attempt: AttemptState = { evaluation, feedback };
  const previousBest = session.best[activity.id];
  const keepBest =
    previousBest && previousBest.evaluation.score >= evaluation.score ? previousBest : attempt;

  return {
    ...session,
    phase: "feedback",
    attempts: { ...session.attempts, [activity.id]: attempt },
    best: { ...session.best, [activity.id]: keepBest },
  };
}

function recordHint(
  session: LessonSession,
  lesson: LessonDefinition,
  hint: string | null,
): LessonSession {
  const activity = currentActivity(session, lesson);
  if (!activity) return session;
  const current = hintsFor(session, activity.id);
  const next: HintState = {
    index: current.index + 1,
    shown: hint !== null ? [...current.shown, hint] : current.shown,
  };
  return { ...session, hints: { ...session.hints, [activity.id]: next } };
}

function retryCurrentActivity(session: LessonSession, lesson: LessonDefinition): LessonSession {
  if (session.phase !== "feedback" && session.phase !== "attempting") return session;
  const activity = currentActivity(session, lesson);
  if (!activity) return session;

  const { [activity.id]: _removedAttempt, ...attempts } = session.attempts;
  const { [activity.id]: _removedAnswer, ...answers } = session.answers;
  void _removedAttempt;
  void _removedAnswer;

  return {
    ...session,
    phase: "attempting",
    attempts,
    answers,
  };
}

function nextActivity(session: LessonSession, lesson: LessonDefinition): LessonSession {
  if (session.phase !== "feedback") return session;
  const activity = currentActivity(session, lesson);
  if (!activity || !session.attempts[activity.id]?.evaluation.pass) return session;
  if (session.currentActivityIndex >= lesson.activities.length - 1) return session;

  return {
    ...session,
    phase: "attempting",
    currentActivityIndex: session.currentActivityIndex + 1,
  };
}

function finishLesson(session: LessonSession, lesson: LessonDefinition, now: Date): DispatchResult {
  if (session.phase !== "feedback") return { session };
  const activity = currentActivity(session, lesson);
  if (!activity || !isLastActivity(session, lesson)) return { session };
  if (!canFinish(session, lesson)) return { session };

  const bestScores = Object.fromEntries(
    Object.entries(session.best).map(([id, state]) => [id, state.evaluation.score]),
  );
  const durationSeconds = session.startedAt
    ? Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000))
    : undefined;

  const finishPayload: FinishPayload = {
    bestScores,
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
  };

  return {
    session: {
      ...session,
      phase: "completed",
      finishPayload,
    },
    finishPayload,
  };
}

export function setAnswer(
  session: LessonSession,
  lesson: LessonDefinition,
  answer: ActivityAnswer,
): LessonSession {
  const activity = currentActivity(session, lesson);
  if (!activity) return session;
  return { ...session, answers: { ...session.answers, [activity.id]: answer } };
}
