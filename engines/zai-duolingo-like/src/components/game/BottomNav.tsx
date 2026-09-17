"use client";

import { Home, Map, Trophy, User, Sparkles } from "lucide-react";
import { useGame } from "./store";
import type { View } from "./types";

const NAV_ITEMS: {
  view: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { view: "home", label: "Início", icon: Home },
  { view: "path", label: "Trilha", icon: Map },
  { view: "playground", label: "IA", icon: Sparkles },
  { view: "leaderboard", label: "Liga", icon: Trophy },
  { view: "profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);

  return (
    <footer className="sticky bottom-0 z-30 mt-auto border-t border-border/60 bg-background/85 backdrop-blur-lg">
      {/* safe-area padding for iOS */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <nav className="mx-auto flex max-w-5xl items-center justify-around px-1 py-1">
          {NAV_ITEMS.map((item) => {
            const active = view === item.view;
            const Icon = item.icon;
            const isPlayground = item.view === "playground";
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 transition ${
                  active
                    ? isPlayground
                      ? "text-neon-teal"
                      : "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    isPlayground
                      ? active
                        ? "border border-neon-teal/50 bg-neon-teal/15 shadow-[0_0_18px_oklch(0.78_0.14_198_/_0.4)]"
                        : "border border-neon-teal/30 bg-neon-teal/10"
                      : active
                      ? "bg-primary/15 shadow-[0_0_16px_oklch(0.84_0.17_66_/_0.3)]"
                      : ""
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isPlayground && !active ? "text-neon-teal/70" : ""}`}
                  />
                </span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
