"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useGame } from "@/components/game/store";
import { RainBackground } from "@/components/game/RainBackground";
import { TopBar } from "@/components/game/TopBar";
import { BottomNav } from "@/components/game/BottomNav";
import { Cinematic } from "@/components/game/Cinematic";
import { Onboarding } from "@/components/game/Onboarding";
import { Home } from "@/components/game/Home";
import { SkillPath } from "@/components/game/SkillPath";
import { LessonPlayer } from "@/components/game/LessonPlayer";
import { LessonComplete } from "@/components/game/LessonComplete";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Profile } from "@/components/game/Profile";
import { Playground } from "@/components/game/Playground";
import { Achievements } from "@/components/game/Achievements";
import { AchievementToasts } from "@/components/game/AchievementToasts";
import { Shop } from "@/components/game/Shop";
import { StreakMilestoneOverlay } from "@/components/game/StreakMilestone";
import { FreezeToast } from "@/components/game/FreezeToast";
import { LeagueResetToast } from "@/components/game/LeagueResetToast";

// hydration-safe client detection: returns false on server + during hydration,
// true after hydration on the client. No setState-in-effect.
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const HUB_VIEWS = ["home", "path", "leaderboard", "profile", "playground", "achievements", "shop"];
const FULLSCREEN_VIEWS = ["cinematic", "onboarding", "lesson", "complete"];

function LoadingSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="relative h-28 w-28">
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, oklch(0.78 0.14 198 / 0.4), transparent 70%)",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
        <img
          src="/art/bip-thinking.png"
          alt="Bip inicializando"
          className="relative z-10 h-full w-full animate-float object-contain"
          draggable={false}
        />
      </div>
      <p className="mt-6 font-display text-sm font-semibold uppercase tracking-[0.3em] text-neon-amber animate-flicker">
        Inicializando Protocolo
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Conectando aos servidores de Tóquio...
      </p>
    </div>
  );
}

export default function Page() {
  const view = useGame((s) => s.view);
  const bootstrap = useGame((s) => s.bootstrap);
  const snapshot = useGame((s) => s.snapshot);
  
  // mounted gate: SSR + first client render show a cozy splash to avoid any
  // hydration mismatch from client-only libraries (framer-motion, Math.random).
  const mounted = useIsClient();

  useEffect(() => {
    if (mounted && !snapshot) bootstrap();
  }, [mounted, snapshot, bootstrap]);

  const rainEnabled = snapshot?.settings?.rain ?? true;
  const reducedMotion = snapshot?.settings?.reducedMotion ?? false;

  const variant = snapshot?.learner?.path === "silicon-shrine" ? "odaiba" : "tokyo";

  const isHub = HUB_VIEWS.includes(view);
  const isFullscreen = FULLSCREEN_VIEWS.includes(view);

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <RainBackground enabled={rainEnabled} reducedMotion={reducedMotion} variant={variant} />
        <main className="relative z-10 flex flex-1 flex-col">
          <LoadingSplash />
        </main>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen flex-col ${
        reducedMotion ? "cozy-reduce-motion" : ""
      }`}
    >
      <RainBackground
        enabled={rainEnabled}
        reducedMotion={reducedMotion}
        variant={variant}
      />

      {isHub && <TopBar onOpenProfile={() => useGame.getState().setView("profile")} />}

      <main className={`relative z-10 flex flex-1 flex-col ${isHub ? "pb-24" : ""}`}>
        {view === "cinematic" && <Cinematic />}
        {view === "onboarding" && <Onboarding />}
        {view === "home" && <Home />}
        {view === "path" && <SkillPath />}
        {view === "lesson" && <LessonPlayer />}
        {view === "complete" && <LessonComplete />}
        {view === "leaderboard" && <Leaderboard />}
        {view === "profile" && <Profile />}
        {view === "playground" && <Playground />}
        {view === "achievements" && <Achievements />}
        {view === "shop" && <Shop />}
      </main>

      {isHub && <BottomNav />}

      {isFullscreen && <div className="flex-1" />}

      <AchievementToasts />
      <StreakMilestoneOverlay />
      <FreezeToast />
      <LeagueResetToast />
    </div>
  );
}
