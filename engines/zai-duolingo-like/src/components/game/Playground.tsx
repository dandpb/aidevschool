"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Send,
  Sparkles,
  Trash2,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useGame } from "./store";
import { Bip } from "./Bip";

const STARTER_PROMPTS = [
  "Escreva um e-mail de vendas para uma padaria usando a regra Contexto + Tarefa + Formato.",
  "Aja como um professor de história e explique a Revolução Industrial em 3 bullets.",
  "Resuma os riscos de alucinação em IA em linguagem simples.",
  "Crie um prompt de imagem: um gato samurai sob néon na chuva.",
];

export function Playground() {
  const setView = useGame((s) => s.setView);
  const thread = useGame((s) => s.playgroundThread);
  const loading = useGame((s) => s.playgroundLoading);
  const send = useGame((s) => s.sendPlaygroundMessage);
  const newThread = useGame((s) => s.newPlaygroundThread);
  const snapshot = useGame((s) => s.snapshot);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ensure a thread exists
  useEffect(() => {
    if (!thread) newThread();
  }, [thread, newThread]);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [thread?.messages.length, loading]);

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    send(content);
    setInput("");
  };

  const handleClear = () => {
    newThread();
  };

  const messages = thread?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col px-4 py-4">
      {/* header */}
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex-1" />
        <button
          onClick={handleClear}
          className="flex items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium transition hover:border-neon-rose/50 hover:text-neon-rose"
          title="Limpar conversa"
        >
          <Trash2 className="h-3.5 w-3.5" /> Limpar
        </button>
      </div>

      {/* title strip */}
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-neon-teal/30 bg-card/40 px-4 py-2.5 backdrop-blur">
        <Sparkles className="h-4 w-4 text-neon-teal animate-flicker" />
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-neon-teal">
            Playground de IA
          </p>
          <p className="text-[11px] text-muted-foreground">
            Pratique prompts com Bip, seu tutor de IA. Zero código — só conversa.
          </p>
        </div>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        className="cozy-scroll flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/40 bg-background/30 p-3"
      >
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bip mood="thinking" size={88} />
            <p className="mt-3 text-sm font-medium">
              Oi{snapshot?.learner ? `, ${snapshot.learner.name}` : ""}! Sou o Bip.
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Me peça qualquer coisa. Tente um dos exemplos abaixo, ou escreva
              seu próprio prompt. Vamos praticar a regra de ouro: Contexto +
              Tarefa + Formato.
            </p>
            <div className="mt-4 grid w-full max-w-md gap-2">
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  className="group flex items-start gap-2 rounded-xl border border-border/60 bg-card/50 p-3 text-left text-xs transition hover:border-neon-teal/50 hover:bg-card/80"
                >
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-amber" />
                  <span className="leading-snug">{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <img
                  src="/art/bip-idle.png"
                  alt="Bip"
                  className="mr-2 mt-1 h-7 w-7 shrink-0 object-contain"
                  draggable={false}
                />
              )}
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border/60 bg-card/70 backdrop-blur"
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* typing indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <img
              src="/art/bip-thinking.png"
              alt="Bip"
              className="mr-2 mt-1 h-7 w-7 shrink-0 object-contain animate-float"
              draggable={false}
            />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border/60 bg-card/70 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-neon-teal [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-neon-teal [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-neon-teal" />
            </div>
          </motion.div>
        )}
      </div>

      {/* input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Escreva seu prompt para o Bip..."
          disabled={loading}
          className="cozy-scroll max-h-32 flex-1 resize-none rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm outline-none transition focus:border-neon-teal/60 focus:ring-2 focus:ring-neon-teal/20 disabled:opacity-60"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_20px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_30px_oklch(0.84_0.17_66_/_0.6)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Enviar"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Bip pode cometer erros. Verifique fatos importantes. · Enter envia,
        Shift+Enter quebra linha.
      </p>
    </div>
  );
}
