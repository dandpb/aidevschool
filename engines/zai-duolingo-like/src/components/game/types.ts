// Vertical Protocol — shared client-side types

import type { DailyChallengeState } from "@/lib/daily-challenge";

export type { DailyChallengeState };

export type View =
  | "cinematic"
  | "onboarding"
  | "home"
  | "path"
  | "lesson"
  | "complete"
  | "leaderboard"
  | "profile"
  | "playground"
  | "achievements"
  | "shop";

export interface LeagueMeta {
  label: string;
  color: string;
  emoji: string;
  threshold: number;
}

export interface SwipeItem {
  label: string;
  detail: string;
  value: "ai" | "real";
}

export interface ClientExercise {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank" | "swipe" | "order";
  prompt: string;
  explanation: string;
  narrative?: string;
  options?: string[];
  correctIndex?: number;
  statement?: string;
  isTrue?: boolean;
  template?: string;
  banks?: { label: string; correctSlot: number | null }[];
  blanks?: number;
  swipeRightIf?: "ai" | "real";
  rightLabel?: string;
  leftLabel?: string;
  // one name end to end: swipe exercises carry SwipeItem objects,
  // order exercises carry plain strings (the scrambled items)
  items?: string[] | SwipeItem[];
  correctOrder?: number[];
}

export interface ClientLesson {
  id: string;
  slug: string;
  title: string;
  order: number;
  xpReward: number;
  completed: boolean;
  stars: number;
  attempts: number;
  unlocked: boolean;
  exercises: string;
  narrative: string;
  tip: string;
}

export interface ClientModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: "amber" | "teal" | "rose" | "magenta";
  order: number;
  unlocked: boolean;
  lessons: ClientLesson[];
}

export interface Standing {
  id: string;
  name: string;
  leagueXp: number;
  isMe: boolean;
  isRival: boolean;
  rank: number;
}

export interface LeaderboardData {
  league: string;
  leagueMeta: LeagueMeta;
  standings: Standing[];
  total: number;
  promoteZone: number;
  demoteZone: number;
}

export interface LessonResult {
  ok: boolean;
  passed: boolean;
  correctCount: number;
  total: number;
  stars: number;
  xpGained: number;
  heartsLost: number;
  gemsGained: number;
  streakTouched: boolean;
  streakBroke: boolean;
  newStreak: number;
  newAchievements?: {
    slug: string;
    title: string;
    emoji: string;
    gemReward: number;
    xpReward: number;
  }[];
  dailyChallengeAwarded?: boolean;
  dailyChallengeGems?: number;
}

export interface AchievementClient {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  accent: "amber" | "teal" | "magenta" | "rose" | "violet";
  gemReward: number;
  xpReward: number;
  category: "inicio" | "trilha" | "ofensiva" | "mestre" | "explorador";
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  detail: string | null;
  xpDelta: number;
  createdAt: string;
}

export interface PracticeResult {
  ok: boolean;
  passed: boolean;
  correctCount: number;
  total: number;
  gemsGained: number;
  newAchievements?: {
    slug: string;
    title: string;
    emoji: string;
    gemReward: number;
    xpReward: number;
  }[];
}

export interface LearnerStats {
  totalLessons: number;
  completedLessons: number;
  avgAccuracy: number;
  totalStars: number;
  maxStars: number;
  bestStreak: number;
  currentStreak: number;
  totalXp: number;
  practiceCount: number;
  playgroundCount: number;
  achievementsUnlocked: number;
  gems: number;
  league: string;
}
