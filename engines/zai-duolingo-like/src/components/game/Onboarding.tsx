"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Cpu, Sparkles } from "lucide-react";
import { useGame } from "./store";
import { Bip } from "./Bip";

type PathId = "neon-syntax" | "silicon-shrine";

const PATHS: {
  id: PathId;
  codename: string;
  title: string;
  subtitle: string;
  desc: string;
  accent: "amber" | "magenta";
  art: string;
}[] = [
  {
    id: "neon-syntax",
    codename: "CONCEITO CINEMÁTICO · 01",
    title: "Neon Syntax",
    subtitle: "O Compilador de Akihabara",
    desc: "Em uma Tóquio úmida e nublada onde a fronteira entre humano e IA se desfaz, você é um «Compilador». Os sistemas críticos da cidade estão falhando por «Decadência Lógica». Para salvar o distrito de Akihabara, domine os fundamentos da Inteligência Artificial.",
    accent: "amber",
    art: "/art/akihabara-neon.png",
  },
  {
    id: "silicon-shrine",
    codename: "CONCEITO CINEMÁTICO · 02",
    title: "Silicon Shrine",
    subtitle: "O Sacerdote-Técnico de Odaiba",
    desc: "Nas ilhas artificiais de Odaiba, este RPG mistura tradições xintoístas antigas com robótica de ponta. Você é um aprendiz de sacerdote-técnico encarregado de manter os «AI Kami» que alimentam a infraestrutura de Tóquio sob um céu opressivo e enevoado.",
    accent: "magenta",
    art: "/art/odaiba-shrine.png",
  },
];

export function Onboarding() {
  const initLearner = useGame((s) => s.initLearner);
  const loading = useGame((s) => s.loading);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<PathId | null>(null);

  const chosen = PATHS.find((p) => p.id === selected) ?? null;

  const handleStart = () => {
    initLearner(name.trim() || "Recruta", selected ?? "neon-syntax");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <Bip mood="thinking" size={96} />
        <h1 className="mt-4 font-display text-3xl font-bold neon-text-amber sm:text-4xl">
          Escolha seu caminho
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          O Vertical Protocol tem duas narrativas. O currículo é o mesmo, mas a
          atmosfera muda. Você poderá trocar depois.
        </p>
      </div>

      {/* name */}
      <div className="mx-auto mb-8 max-w-md">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Como devemos te chamar?
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Seu codinome de Compilador..."
          className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-base outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {PATHS.map((p, i) => {
          const isSel = selected === p.id;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              onClick={() => setSelected(p.id)}
              className={`group relative overflow-hidden rounded-3xl border p-1 text-left transition ${
                isSel
                  ? p.accent === "amber"
                    ? "neon-border-amber"
                    : "neon-border-magenta"
                  : "border-border/70 hover:border-primary/50"
              }`}
            >
              {/* art header */}
              <div className="relative h-44 overflow-hidden rounded-[20px]">
                <img
                  src={p.art}
                  alt={p.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
                  {p.accent === "amber" ? (
                    <Cpu className="h-3 w-3 text-neon-amber" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-neon-magenta" />
                  )}
                  {p.codename}
                </div>
                {isSel && (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow">
                    selecionado
                  </div>
                )}
              </div>

              <div className="p-5">
                <h2
                  className={`font-display text-2xl font-bold ${
                    p.accent === "amber" ? "neon-text-amber" : "neon-text-magenta"
                  }`}
                >
                  {p.title}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                  {p.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {p.desc}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleStart}
          disabled={!selected || loading}
          className="flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-display text-base font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_44px_oklch(0.84_0.17_66_/_0.65)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Compilando..." : "Iniciar jornada"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {chosen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-xs text-muted-foreground"
        >
          Caminho escolhido:{" "}
          <span className={chosen.accent === "amber" ? "neon-text-amber" : "neon-text-magenta"}>
            {chosen.title}
          </span>
        </motion.p>
      )}
    </div>
  );
}
