"use client";

import { create } from "zustand";
import { fetchSnapshot, type GameSnapshot } from "./game-state";
import type {
  View,
  ClientModule,
  ClientLesson,
  ClientExercise,
  LeaderboardData,
  LessonResult,
  AchievementClient,
  ChatMessage,
  ActivityItem,
  PracticeResult,
  DailyChallengeState,
  LearnerStats,
} from "./types";

interface AchievementToast {
  slug: string;
  title: string;
  emoji: string;
  gemReward: number;
  xpReward: number;
}

// A league-reset notice held client-side until the toast is dismissed —
// the server's notices[] are transient, the toast needs dwell time.
export interface LeagueResetNotice {
  promoted: boolean;
  demoted: boolean;
  oldLeague: string;
  newLeague: string;
}

// parse the lesson's exercise JSON — server and client share one shape,
// so this is a plain parse with no normalization
function parseExercises(raw: string): ClientExercise[] {
  try {
    return JSON.parse(raw) as ClientExercise[];
  } catch {
    return [];
  }
}

interface GameStore {
  // routing
  view: View;
  setView: (v: View) => void;

  // the learner's world — one snapshot behind one seam (src/lib/game-state)
  snapshot: GameSnapshot | null;
  // client clock at receipt, so countdowns derive from server timestamps
  snapshotAt: number;

  // other slices (separate endpoints)
  curriculum: ClientModule[] | null;
  leaderboard: LeaderboardData | null;
  achievements: AchievementClient[] | null;
  activity: ActivityItem[] | null;
  dailyChallenge: DailyChallengeState | null;
  stats: LearnerStats | null;

  // notice handling (freeze toast re-arms only when the notice reappears
  // after an absence; league-reset persists until dismissed)
  freezeNoticeActive: boolean;
  freezeToastDismissed: boolean;
  leagueResetNotice: LeagueResetNotice | null;

  // active lesson
  activeLesson: { lesson: ClientLesson; module: ClientModule; exercises: ClientExercise[] } | null;
  activeExerciseIdx: number;
  answers: unknown[];
  lastResult: LessonResult | null;
  // practice mode: redo a completed lesson for gems (no hearts cost)
  practiceMode: boolean;
  lastPracticeResult: PracticeResult | null;

  // playground
  playgroundThread: { id: string; messages: ChatMessage[] } | null;
  playgroundLoading: boolean;

  // transient UI
  bipMood: "idle" | "happy" | "sad" | "thinking" | "sleep";
  setBipMood: (m: GameStore["bipMood"]) => void;
  loading: boolean;
  achievementToasts: AchievementToast[];
  pushAchievementToasts: (toasts: AchievementToast[]) => void;
  dismissAchievementToast: (slug: string) => void;

  // actions
  bootstrap: () => Promise<void>;
  refreshState: () => Promise<void>;
  refreshCurriculum: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  refreshDailyChallenge: () => Promise<void>;
  refreshStats: () => Promise<void>;
  initLearner: (name: string, path: "neon-syntax" | "silicon-shrine") => Promise<void>;
  startLesson: (lesson: ClientLesson, module: ClientModule) => void;
  startPractice: (lesson: ClientLesson, module: ClientModule) => void;
  setAnswer: (idx: number, answer: unknown) => void;
  goNextExercise: () => void;
  goPrevExercise: () => void;
  submitLesson: () => Promise<void>;
  submitPractice: () => Promise<void>;
  refillHearts: () => Promise<void>;
  updateSettings: (s: Partial<GameSnapshot["settings"]>) => Promise<void>;
  resetGame: () => Promise<void>;
  sendPlaygroundMessage: (message: string) => Promise<void>;
  newPlaygroundThread: () => void;
}

// build the state slice that activates a lesson (practiceMode distinguishes
// startLesson from startPractice)
function buildActiveLesson(
  lesson: ClientLesson,
  module: ClientModule,
  practiceMode: boolean
) {
  const exercises = parseExercises(lesson.exercises);
  return {
    activeLesson: { lesson, module, exercises },
    activeExerciseIdx: 0,
    answers: new Array(exercises.length).fill(null),
    lastResult: null,
    lastPracticeResult: null,
    practiceMode,
    view: "lesson" as const,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  view: "cinematic",
  setView: (v) => set({ view: v }),

  snapshot: null,
  snapshotAt: 0,

  curriculum: null,
  leaderboard: null,
  achievements: null,
  activity: null,
  dailyChallenge: null,
  stats: null,

  freezeNoticeActive: false,
  freezeToastDismissed: false,
  leagueResetNotice: null,

  activeLesson: null,
  activeExerciseIdx: 0,
  answers: [],
  lastResult: null,
  practiceMode: false,
  lastPracticeResult: null,

  playgroundThread: null,
  playgroundLoading: false,

  bipMood: "idle",
  setBipMood: (m) => set({ bipMood: m }),
  loading: false,
  achievementToasts: [],
  // single dedup rule: a slug toasts once per visible batch
  pushAchievementToasts: (toasts) =>
    set((s) => {
      const visible = new Set(s.achievementToasts.map((t) => t.slug));
      return {
        achievementToasts: [
          ...s.achievementToasts,
          ...toasts.filter((t) => !visible.has(t.slug)),
        ],
      };
    }),
  dismissAchievementToast: (slug) =>
    set((s) => ({ achievementToasts: s.achievementToasts.filter((t) => t.slug !== slug) })),

  bootstrap: async () => {
    set({ loading: true });
    try {
      await get().refreshState();
      await get().refreshCurriculum();
      await get().refreshDailyChallenge();
      // returning learners (any XP or a custom name) skip the cinematic
      const snap = get().snapshot;
      if (snap && (snap.learner.xp > 0 || snap.learner.name !== "Recruta")) {
        set({ view: "home" });
      }
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },

  // the single sync entry over the snapshot seam: fetch, store, route notices
  refreshState: async () => {
    const snap = await fetchSnapshot();
    const freezeUsed = snap.notices.some((n) => n.kind === "freeze-used");
    const reset = snap.notices.find((n) => n.kind === "league-reset");
    set((s) => ({
      snapshot: snap,
      snapshotAt: Date.now(),
      freezeNoticeActive: freezeUsed,
      // re-arm the freeze toast only when the notice appears after an absence
      freezeToastDismissed:
        freezeUsed && !s.freezeNoticeActive ? false : s.freezeToastDismissed,
      // league-reset notices are transient server-side; hold until dismissed
      leagueResetNotice:
        reset && reset.kind === "league-reset"
          ? {
              promoted: reset.promoted,
              demoted: reset.demoted,
              oldLeague: reset.oldLeague,
              newLeague: reset.newLeague,
            }
          : s.leagueResetNotice,
    }));
  },

  refreshCurriculum: async () => {
    const res = await fetch("/api/curriculum", { cache: "no-store" });
    if (!res.ok) throw new Error("curriculum fetch failed");
    const data = await res.json();
    set({ curriculum: data.modules });
  },

  refreshLeaderboard: async () => {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!res.ok) throw new Error("leaderboard fetch failed");
    const data = await res.json();
    set({ leaderboard: data });
  },

  initLearner: async (name, path) => {
    set({ loading: true });
    try {
      await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, path }),
      });
      await get().refreshState();
      set({ view: "home" });
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },

  startLesson: (lesson, module) => {
    set(buildActiveLesson(lesson, module, false));
  },

  startPractice: (lesson, module) => {
    set(buildActiveLesson(lesson, module, true));
  },

  setAnswer: (idx, answer) => {
    const answers = [...get().answers];
    answers[idx] = answer;
    set({ answers });
  },

  goNextExercise: () => {
    const idx = get().activeExerciseIdx;
    const total = get().activeLesson?.exercises.length ?? 0;
    if (idx < total - 1) set({ activeExerciseIdx: idx + 1 });
  },

  goPrevExercise: () => {
    const idx = get().activeExerciseIdx;
    if (idx > 0) set({ activeExerciseIdx: idx - 1 });
  },

  submitLesson: async () => {
    const active = get().activeLesson;
    if (!active) return;
    set({ loading: true });
    try {
      const res = await fetch(`/api/lesson/${active.lesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: get().answers }),
      });
      const data = await res.json();
      set({ lastResult: data });
      await get().refreshState();
      await get().refreshCurriculum();
      await get().refreshAchievements();
      await get().refreshDailyChallenge();
      // surface any freshly-unlocked achievements as toasts
      if (data.newAchievements && data.newAchievements.length > 0) {
        get().pushAchievementToasts(data.newAchievements);
      }
      set({ view: "complete" });
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },

  submitPractice: async () => {
    const active = get().activeLesson;
    if (!active) return;
    set({ loading: true });
    try {
      const res = await fetch(`/api/lesson/${active.lesson.id}/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: get().answers }),
      });
      const data = await res.json();
      set({ lastPracticeResult: data });
      await get().refreshState();
      await get().refreshActivity();
      await get().refreshAchievements();
      if (data.newAchievements && data.newAchievements.length > 0) {
        get().pushAchievementToasts(data.newAchievements);
      }
      set({ view: "complete" });
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },

  refreshActivity: async () => {
    try {
      const res = await fetch("/api/activity", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      set({ activity: data.activity });
    } catch {
      /* noop */
    }
  },

  refreshDailyChallenge: async () => {
    try {
      const res = await fetch("/api/daily-challenge", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      set({ dailyChallenge: data.challenge });
    } catch {
      /* noop */
    }
  },

  refreshStats: async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      set({ stats: data });
    } catch {
      /* noop */
    }
  },

  refillHearts: async () => {
    try {
      const res = await fetch("/api/heart/refill", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        await get().refreshState();
      }
    } catch {
      /* noop */
    }
  },

  updateSettings: async (s) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      await get().refreshState();
    } catch {
      /* noop */
    }
  },

  resetGame: async () => {
    set({ loading: true });
    try {
      await fetch("/api/reset", { method: "POST" });
      await get().refreshState();
      await get().refreshCurriculum();
      await get().refreshAchievements();
      set({
        view: "onboarding",
        activeLesson: null,
        lastResult: null,
        playgroundThread: null,
        achievementToasts: [],
        leagueResetNotice: null,
      });
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },

  refreshAchievements: async () => {
    try {
      const res = await fetch("/api/achievements", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      set({ achievements: data.achievements });
      // GET is read-only now; unlock toasts come from mutation responses only.
    } catch {
      /* noop */
    }
  },

  newPlaygroundThread: () => {
    set({ playgroundThread: { id: "", messages: [] } });
  },

  sendPlaygroundMessage: async (message) => {
    const thread = get().playgroundThread ?? { id: "", messages: [] };
    const userMsg = { role: "user" as const, content: message };
    // optimistic: append user message immediately
    set({
      playgroundThread: {
        id: thread.id,
        messages: [...thread.messages, userMsg],
      },
      playgroundLoading: true,
    });
    try {
      // 1) get the LLM reply from the app's chat backend
      const miniRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: thread.messages,
        }),
      });
      const miniData = await miniRes.json();
      if (!miniData.ok) {
        throw new Error(miniData.error || "model-failed");
      }
      const reply = miniData.reply as string;
      const replyMsg = { role: "assistant" as const, content: reply };
      set({
        playgroundThread: {
          id: thread.id,
          messages: [...get().playgroundThread!.messages, replyMsg],
        },
      });

      // 2) persist the exchange + sync achievements via the Next.js route
      try {
        const saveRes = await fetch("/api/playground/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            reply,
            threadId: thread.id || undefined,
          }),
        });
        const saveData = await saveRes.json();
        if (saveData.ok) {
          // update thread id (may be newly created)
          set((s) => ({
            playgroundThread: s.playgroundThread
              ? { ...s.playgroundThread, id: saveData.threadId }
              : s.playgroundThread,
          }));
          if (saveData.newAchievements && saveData.newAchievements.length > 0) {
            get().pushAchievementToasts(saveData.newAchievements);
          }
          await get().refreshState();
        }
      } catch {
        // persistence is best-effort; the reply is already shown
      }
    } catch {
      const errReply = {
        role: "assistant" as const,
        content:
          "⚠️ Os servidores de Tóquio estão instáveis com a chuva. Tente novamente em instantes.",
      };
      set((s) => ({
        playgroundThread: s.playgroundThread
          ? {
              id: s.playgroundThread.id,
              messages: [...s.playgroundThread.messages, errReply],
            }
          : { id: "", messages: [errReply] },
      }));
    } finally {
      set({ playgroundLoading: false });
    }
  },
}));
