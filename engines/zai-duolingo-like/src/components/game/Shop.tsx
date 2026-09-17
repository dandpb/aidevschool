"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Gem,
  Heart,
  Snowflake,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { SHOP_CATALOG } from "@/lib/shop-catalog";
import type { ShopItem } from "@/lib/shop-catalog";
import { useGame } from "./store";
import { useSound } from "./useSound";
import { Bip } from "./Bip";

export function Shop() {
  const snapshot = useGame((s) => s.snapshot);
  const streak = useGame((s) => s.snapshot?.streak);
  const refreshState = useGame((s) => s.refreshState);
  const refreshActivity = useGame((s) => s.refreshActivity);
  const setView = useGame((s) => s.setView);
  const play = useSound();

  const items = SHOP_CATALOG;

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!snapshot) return null;
  const learner = snapshot.learner;
  const hearts = snapshot.hearts;

  const heartsFull = hearts.current >= hearts.max;
  const ownedFreezes = streak?.freezes ?? 0;

  const buy = async (item: ShopItem) => {
    setPurchasing(item.slug);
    setToast(null);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug }),
      });
      const data = await res.json();
      if (data.ok) {
        play("achievement");
        setToast({
          type: "success",
          message:
            item.kind === "heart-refill"
              ? `Vidas recarregadas! —${item.cost} 💎`
              : `Congela Ofensiva adquirido! —${item.cost} 💎`,
        });
        await refreshState();
        await refreshActivity();
      } else {
        play("wrong");
        const msg =
          data.error === "insufficient-gems"
            ? `Gemas insuficientes. Você tem ${data.gems}, precisa ${data.cost}.`
            : data.error === "hearts-full"
            ? "Suas vidas já estão cheias!"
            : "Compra falhou. Tente novamente.";
        setToast({ type: "error", message: msg });
      }
    } catch {
      setToast({ type: "error", message: "Erro de conexão. Tente novamente." });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={() => setView("home")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {/* header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full border border-neon-teal/40 bg-card/60 shadow-[0_0_28px_oklch(0.78_0.14_198_/_0.35)]">
          <Gem className="h-8 w-8 text-neon-teal" />
        </div>
        <h1 className="font-display text-2xl font-bold neon-text-teal">
          Loja de Gemas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Troque gemas por itens para proteger sua jornada.
        </p>
      </div>

      {/* gem balance + inventory */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="cozy-card flex items-center gap-3 p-4">
          <Gem className="h-6 w-6 text-neon-teal" />
          <div>
            <p className="font-display text-xl font-bold tabular-nums">
              {learner.gems}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Gemas
            </p>
          </div>
        </div>
        <div className="cozy-card flex items-center gap-3 p-4">
          <Snowflake className="h-6 w-6 text-neon-teal" />
          <div>
            <p className="font-display text-xl font-bold tabular-nums">
              {ownedFreezes}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Congelamentos
            </p>
          </div>
        </div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
              toast.type === "success"
                ? "border-neon-teal/50 bg-neon-teal/10 text-neon-teal"
                : "border-neon-rose/50 bg-neon-rose/10 text-neon-rose"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* items */}
      <div className="space-y-4">
        {items.map((item, i) => {
          const affordable = learner.gems >= item.cost;
          const disabled =
            purchasing === item.slug ||
            !affordable ||
            (item.kind === "heart-refill" && heartsFull);
          const accentRing =
            item.accent === "rose"
              ? "border-neon-rose/40 hover:border-neon-rose/70"
              : "border-neon-teal/40 hover:border-neon-teal/70";
          const accentText =
            item.accent === "rose" ? "text-neon-rose" : "text-neon-teal";

          return (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`cozy-card relative overflow-hidden border-2 p-5 transition ${accentRing}`}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-3xl ${
                      item.accent === "rose" ? "animate-pulse-glow" : "animate-float"
                    }`}
                    style={{
                      animationDuration: "4s",
                    }}
                  >
                    {item.emoji}
                  </div>
                  {/* owned-count badge */}
                  {item.kind === "streak-freeze" && ownedFreezes > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full border border-neon-teal/60 bg-background px-1.5 text-xs font-bold text-neon-teal shadow">
                      {ownedFreezes}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-display text-lg font-bold ${accentText}`}>
                    {item.name}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  {item.kind === "heart-refill" && heartsFull && (
                    <p className="mt-1.5 text-xs font-semibold text-neon-teal">
                      ✓ Vidas já estão cheias
                    </p>
                  )}
                  {item.kind === "streak-freeze" && ownedFreezes > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Você possui {ownedFreezes} unidade
                      {ownedFreezes !== 1 ? "s" : ""}.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1.5">
                  <Gem className="h-4 w-4 text-neon-teal" />
                  <span className="font-bold tabular-nums">{item.cost}</span>
                  <span className="text-xs text-muted-foreground">gemas</span>
                </div>
                <button
                  onClick={() => buy(item)}
                  disabled={disabled}
                  className={`relative flex items-center gap-2 overflow-hidden rounded-2xl px-5 py-2.5 font-display text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    item.accent === "rose"
                      ? "bg-neon-rose/20 text-neon-rose hover:bg-neon-rose/30"
                      : "bg-neon-teal/20 text-neon-teal hover:bg-neon-teal/30"
                  }`}
                >
                  {/* shimmer sweep on enabled buy buttons */}
                  {!disabled && (
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(110deg, transparent 40%, oklch(1 0 0 / 0.18) 50%, transparent 60%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 2.8s linear infinite",
                      }}
                    />
                  )}
                  {purchasing === item.slug ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.span>
                      Comprando...
                    </>
                  ) : (
                    <>Comprar</>
                  )}
                </button>
              </div>

              {!affordable && (
                <p className="mt-2 text-right text-[11px] text-neon-rose">
                  Gemas insuficientes
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* how to earn gems */}
      <div className="mt-6 cozy-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <Bip mood="thinking" size={36} float={false} />
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Como ganhar gemas
          </h3>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="text-neon-amber">✦</span> Complete lições (+2 💎)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-neon-teal">✦</span> Pratique lições antigas (+1-3 💎)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-neon-magenta">✦</span> Desbloqueie conquistas
          </li>
        </ul>
      </div>
    </div>
  );
}
