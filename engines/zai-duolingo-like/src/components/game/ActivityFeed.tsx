"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  Heart,
  Gem,
  Trophy,
  Sparkles,
  RotateCw,
  MessageSquare,
  Award,
  Clock,
  Loader2,
} from "lucide-react";
import { useGame } from "./store";
import type { ActivityItem } from "./types";

const TYPE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: (detail: string | null) => string }
> = {
  lesson_complete: {
    icon: CheckCircle2,
    color: "text-neon-amber",
    label: (d) => `Lição concluída${d ? `: ${d}` : ""}`,
  },
  practice: {
    icon: RotateCw,
    color: "text-neon-teal",
    label: (d) => `Praticou${d ? `: ${d}` : ""}`,
  },
  streak_touch: {
    icon: Flame,
    color: "text-neon-amber",
    label: () => "Ofensiva tocada",
  },
  heart_lost: {
    icon: Heart,
    color: "text-neon-rose",
    label: () => "Perdeu uma vida",
  },
  heart_refill: {
    icon: Heart,
    color: "text-neon-rose",
    label: () => "Vidas recarregadas",
  },
  achievement: {
    icon: Trophy,
    color: "text-neon-amber",
    label: (d) => `Conquista: ${d ?? "selo"}`,
  },
  playground: {
    icon: MessageSquare,
    color: "text-neon-teal",
    label: () => "Praticou prompt no Playground",
  },
  streak_freeze_owned: {
    icon: Award,
    color: "text-neon-violet",
    label: () => "Comprou Congela Ofensiva",
  },
  streak_freeze_used: {
    icon: Award,
    color: "text-neon-violet",
    label: () => "Congelamento usado — ofensiva protegida",
  },
  daily_challenge: {
    icon: Trophy,
    color: "text-neon-teal",
    label: () => "Desafio do dia completo",
  },
  streak_milestone: {
    icon: Flame,
    color: "text-neon-amber",
    label: (d) => `Marco de ofensiva: ${d} dias`,
  },
  league_promotion: {
    icon: Trophy,
    color: "text-neon-teal",
    label: (d) => `Promoção de liga: ${d}`,
  },
  league_demotion: {
    icon: Trophy,
    color: "text-neon-rose",
    label: (d) => `Rebaixamento de liga: ${d}`,
  },
  league_reset: {
    icon: Trophy,
    color: "text-neon-magenta",
    label: () => "Liga reiniciada semanalmente",
  },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

// Group activity items by day: "Hoje", "Ontem", or a date label.
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDay.getTime() === today.getTime()) return "Hoje";
  if (itemDay.getTime() === yesterday.getTime()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ActivityFeed() {
  const activity = useGame((s) => s.activity);
  const refreshActivity = useGame((s) => s.refreshActivity);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    refreshActivity();
  }, [refreshActivity]);

  // fetch hasMore/cursor flags on mount (independent of store activity)
  useEffect(() => {
    fetch("/api/activity?limit=10")
      .then((r) => r.json())
      .then((d) => {
        setHasMore(d.hasMore ?? false);
        setNextCursor(d.nextCursor ?? null);
      })
      .catch(() => {});
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/activity?cursor=${encodeURIComponent(nextCursor)}&limit=10`);
      const data = await res.json();
      if (data.activity && data.activity.length > 0) {
        // append to the store's activity
        useGame.setState((s) => ({
          activity: [...(s.activity ?? []), ...data.activity],
        }));
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch {
      /* noop */
    } finally {
      setLoadingMore(false);
    }
  };

  if (!activity || activity.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/30 p-6 text-center text-sm text-muted-foreground">
        Nenhuma atividade ainda. Complete uma lição para começar sua jornada!
      </div>
    );
  }

  // group by day label
  const groups: { label: string; items: ActivityItem[] }[] = [];
  for (const item of activity) {
    const label = dayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div key={gi}>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((item, i) => (
              <ActivityRow key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-neon-teal/40 hover:text-neon-teal disabled:opacity-50"
        >
          {loadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            "Ver atividade anterior"
          )}
        </button>
      )}
    </div>
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const meta = TYPE_META[item.type] ?? {
    icon: Sparkles,
    color: "text-muted-foreground",
    label: (d: string | null) => d ?? item.type,
  };
  const Icon = meta.icon;

  // color-coded left border by activity category
  const borderColor =
    item.type === "lesson_complete"
      ? "border-l-neon-amber"
      : item.type === "practice"
      ? "border-l-neon-teal"
      : item.type === "achievement" || item.type === "streak_milestone"
      ? "border-l-neon-magenta"
      : item.type === "heart_lost" || item.type === "league_demotion"
      ? "border-l-neon-rose"
      : item.type === "daily_challenge"
      ? "border-l-neon-teal"
      : item.type === "league_promotion"
      ? "border-l-neon-teal"
      : "border-l-border/60";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      className={`flex items-center gap-3 rounded-xl border border-border/40 border-l-3 ${borderColor} bg-card/40 px-3 py-2.5`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/60 ${meta.color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {meta.label(item.detail)}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {timeAgo(item.createdAt)}
        </p>
      </div>
      {item.xpDelta > 0 && (
        <span className="flex items-center gap-0.5 rounded-full bg-neon-magenta/15 px-2 py-0.5 text-[11px] font-bold text-neon-magenta">
          <Gem className="h-2.5 w-2.5" />+{item.xpDelta} XP
        </span>
      )}
    </motion.div>
  );
}
