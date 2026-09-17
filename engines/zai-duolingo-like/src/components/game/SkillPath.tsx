"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Star, Check, Crown, ChevronLeft, ChevronRight, RotateCw, Search, X, PlayCircle } from "lucide-react";
import { useGame } from "./store";
import type { ClientModule, ClientLesson } from "./types";

const ACCENT_MAP = {
  amber: {
    text: "neon-text-amber",
    border: "neon-border-amber",
    bg: "bg-neon-amber",
    textRaw: "text-neon-amber",
    glow: "shadow-[0_0_24px_oklch(0.84_0.17_66_/_0.45)]",
    grad: "from-neon-amber/30 to-neon-amber/5",
  },
  teal: {
    text: "neon-text-teal",
    border: "neon-border-teal",
    bg: "bg-neon-teal",
    textRaw: "text-neon-teal",
    glow: "shadow-[0_0_24px_oklch(0.78_0.14_198_/_0.45)]",
    grad: "from-neon-teal/30 to-neon-teal/5",
  },
  rose: {
    text: "neon-text-rose",
    border: "neon-border-magenta",
    bg: "bg-neon-rose",
    textRaw: "text-neon-rose",
    glow: "shadow-[0_0_24px_oklch(0.66_0.22_18_/_0.45)]",
    grad: "from-neon-rose/30 to-neon-rose/5",
  },
  magenta: {
    text: "neon-text-magenta",
    border: "neon-border-magenta",
    bg: "bg-neon-magenta",
    textRaw: "text-neon-magenta",
    glow: "shadow-[0_0_24px_oklch(0.72_0.22_352_/_0.45)]",
    grad: "from-neon-magenta/30 to-neon-magenta/5",
  },
};

export function SkillPath() {
  const curriculum = useGame((s) => s.curriculum);
  const setView = useGame((s) => s.setView);
  const refreshCurriculum = useGame((s) => s.refreshCurriculum);
  const [query, setQuery] = useState("");

  // self-heal a boot-time curriculum fetch failure instead of showing
  // "Carregando trilha..." forever: retry every 2s until it lands
  useEffect(() => {
    if (curriculum) return;
    const iv = setInterval(() => {
      refreshCurriculum().catch(() => {});
    }, 2000);
    return () => clearInterval(iv);
  }, [curriculum, refreshCurriculum]);

  // filter modules/lessons by search query
  const filtered = useMemo(() => {
    if (!curriculum) return [];
    const q = query.trim().toLowerCase();
    if (!q) return curriculum;
    return curriculum
      .map((mod) => ({
        ...mod,
        lessons: mod.lessons.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            mod.title.toLowerCase().includes(q)
        ),
      }))
      .filter((mod) => mod.lessons.length > 0);
  }, [curriculum, query]);

  if (!curriculum) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Carregando trilha...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        onClick={() => setView("home")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold neon-text-amber">
          Árvore de Habilidades
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trilhe o caminho do Recruta ao Diamante. Cada lição demora ~3 minutos.
        </p>
      </div>

      {/* search bar */}
      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar lição ou módulo..."
          className="w-full rounded-2xl border border-border bg-card/60 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-neon-teal/50 focus:ring-2 focus:ring-neon-teal/20"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            aria-label="Limpar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma lição encontrada para &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="space-y-12">
          {filtered.map((mod, modIdx) => (
            <ModuleSection key={mod.id} module={mod} modIdx={modIdx} />
          ))}
        </div>
      )}

      {/* finale */}
      <div className="mt-12 text-center">
        <div className="mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full border border-neon-amber/50 bg-card/60 shadow-[0_0_32px_oklch(0.84_0.17_66_/_0.4)]">
          <Crown className="h-10 w-10 text-neon-amber" />
        </div>
        <p className="mt-3 font-display text-lg font-bold neon-text-amber">
          Mestre do Vertical Protocol
        </p>
        <p className="text-sm text-muted-foreground">
          Complete todas as lições para selar seu lugar na névoa.
        </p>
      </div>

      {/* floating "Continue" FAB */}
      <ContinueFab />
    </div>
  );
}

function ContinueFab() {
  const curriculum = useGame((s) => s.curriculum);
  const startLesson = useGame((s) => s.startLesson);
  const snapshot = useGame((s) => s.snapshot);

  // find the current (next incomplete unlocked) lesson
  let current: { lesson: ClientLesson; module: ClientModule } | null = null;
  if (curriculum) {
    for (const mod of curriculum) {
      for (const lesson of mod.lessons) {
        if (lesson.unlocked && !lesson.completed) {
          current = { lesson, module: mod };
          break;
        }
      }
      if (current) break;
    }
  }

  if (!current || (snapshot && snapshot.hearts.current <= 0)) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => startLesson(current!.lesson, current!.module)}
      className="fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.5)] animate-cta-pulse"
    >
      <PlayCircle className="h-5 w-5" />
      <span className="max-w-[180px] truncate">{current.lesson.title}</span>
      <ChevronRight className="h-4 w-4" />
    </motion.button>
  );
}

function ModuleSection({ module, modIdx }: { module: ClientModule; modIdx: number }) {
  const accent = ACCENT_MAP[module.accent];
  const totalLessons = module.lessons.length;
  const completedLessons = module.lessons.filter((l) => l.completed).length;
  const modulePct =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <section>
      {/* module header */}
      <div
        className={`relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br ${accent.grad} p-5`}
      >
        <div className="flex items-center gap-4">
          <img
            src={module.icon}
            alt={module.title}
            className="h-16 w-16 rounded-2xl border border-border/60 bg-background/50 object-contain p-1.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Módulo {modIdx + 1}
              </span>
              {!module.unlocked && (
                <span className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> bloqueado
                </span>
              )}
              {module.unlocked && (
                <span className={`rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${accent.textRaw}`}>
                  {completedLessons}/{totalLessons}
                </span>
              )}
            </div>
            <h2 className={`font-display text-xl font-bold ${accent.text}`}>
              {module.title}
            </h2>
            <p className="text-sm text-muted-foreground">{module.subtitle}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          {module.description}
        </p>

        {/* module progress bar */}
        {module.unlocked && totalLessons > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/50">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${modulePct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, var(--neon-${module.accent === "amber" ? "amber" : module.accent === "teal" ? "teal" : module.accent === "rose" ? "rose" : "magenta"}), var(--neon-magenta))`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* winding path */}
      <div className="relative mt-2 px-2">
        {/* path connector line — glowing animated circuit trace */}
        <svg
          className="absolute left-1/2 top-0 h-full w-24 -translate-x-1/2"
          viewBox="0 0 100 1000"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={`path-grad-${module.slug}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.4 0.04 285 / 0.5)" />
              <stop offset="50%" stopColor="oklch(0.6 0.1 285 / 0.6)" />
              <stop offset="100%" stopColor="oklch(0.4 0.04 285 / 0.5)" />
            </linearGradient>
          </defs>
          {/* base dashed line */}
          <path
            d="M50,0 Q20,80 50,160 Q80,240 50,320 Q20,400 50,480 Q80,560 50,640 Q20,720 50,800 Q80,880 50,960"
            stroke="oklch(0.35 0.04 285 / 0.4)"
            strokeWidth="2"
            strokeDasharray="4 6"
            fill="none"
          />
          {/* glowing overlay for unlocked modules */}
          {module.unlocked && (
            <path
              d="M50,0 Q20,80 50,160 Q80,240 50,320 Q20,400 50,480 Q80,560 50,640 Q20,720 50,800 Q80,880 50,960"
              stroke={`url(#path-grad-${module.slug})`}
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="6 10"
              style={{
                filter: "drop-shadow(0 0 3px oklch(0.78 0.14 198 / 0.4))",
                animation: "dash-flow 3s linear infinite",
              }}
            />
          )}
        </svg>

        <div className="relative space-y-6 py-4">
          {module.lessons.map((lesson, idx) => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              accent={accent}
              side={idx % 2 === 0 ? "left" : "right"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LessonNode({
  lesson,
  accent,
  side,
}: {
  lesson: ClientLesson;
  accent: (typeof ACCENT_MAP)[keyof typeof ACCENT_MAP];
  side: "left" | "right";
}) {
  const startLesson = useGame((s) => s.startLesson);
  const startPractice = useGame((s) => s.startPractice);
  const setView = useGame((s) => s.setView);
  const curriculum = useGame((s) => s.curriculum);
  const snapshot = useGame((s) => s.snapshot);

  const parentModule = curriculum?.find((m) => m.lessons.some((l) => l.id === lesson.id));

  const handle = () => {
    if (!lesson.unlocked) return;
    // completed lessons can be replayed as practice (no hearts cost)
    if (lesson.completed) {
      if (parentModule) startPractice(lesson, parentModule);
      return;
    }
    if (snapshot && snapshot.hearts.current <= 0) {
      setView("home");
      return;
    }
    if (parentModule) startLesson(lesson, parentModule);
  };

  const isCurrent = lesson.unlocked && !lesson.completed;
  const isCompleted = lesson.completed;

  return (
    <div
      className={`flex ${
        side === "left" ? "justify-start" : "justify-end"
      }`}
    >
      <motion.button
        whileHover={lesson.unlocked ? { scale: 1.04 } : undefined}
        whileTap={lesson.unlocked ? { scale: 0.97 } : undefined}
        onClick={handle}
        disabled={!lesson.unlocked}
        className={`relative flex w-[78%] max-w-xs flex-col items-center rounded-2xl border p-4 text-center transition ${
          !lesson.unlocked
            ? "cursor-not-allowed border-border/50 bg-card/30 opacity-60"
            : isCompleted
            ? "border-border/70 bg-card/60"
            : `${accent.border} bg-card/70 ${accent.glow}`
        }`}
      >
        {/* status badge */}
        <div className="absolute -right-2 -top-2">
          {!lesson.unlocked ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
              <Lock className="h-4 w-4" />
            </span>
          ) : isCompleted ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-neon-teal/60 bg-background text-neon-teal">
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background ${accent.textRaw} animate-pulse-glow`}>
              <Star className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* stars */}
        {isCompleted && (
          <div className="mb-2 flex gap-0.5">
            {[0, 1, 2].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${
                  s < lesson.stars
                    ? "fill-neon-amber text-neon-amber"
                    : "text-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* title */}
        <p className="font-display text-sm font-bold leading-tight">
          {lesson.title}
        </p>

        {/* meta */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {isCompleted ? (
            <span className="flex items-center gap-1 font-semibold text-neon-teal">
              <RotateCw className="h-3 w-3" /> Praticar · +💎
            </span>
          ) : (
            <>
              <span className={`font-semibold ${accent.textRaw}`}>
                +{lesson.xpReward} XP
              </span>
              {/* difficulty dots: 15XP=1 dot, 20XP=2 dots */}
              <span className="flex items-center gap-0.5" title={`Dificuldade ${lesson.xpReward >= 20 ? "Média" : "Suave"}`}>
                {[0, 1].map((d) => (
                  <span
                    key={d}
                    className={`h-1.5 w-1.5 rounded-full ${
                      d < (lesson.xpReward >= 20 ? 2 : 1)
                        ? accent.textRaw.replace("text-", "bg-")
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </span>
            </>
          )}
          {lesson.attempts > 0 && (
            <span>· {lesson.attempts}x</span>
          )}
        </div>

        {isCurrent && (
          <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            atual
          </span>
        )}
      </motion.button>
    </div>
  );
}
