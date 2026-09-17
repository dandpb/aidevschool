# W1 — Bugfix por violação de invariante

**Quando usar:** quando um módulo documenta um comportamento ("sempre X") e
você suspeita que a implementação não cumpre. Não discuta o bug: prove-o.

## Fluxo

1. Identifique a invariante documentada (comentário de módulo, README, nota).
2. Escreva um teste que afirma a invariante — ele deve falhar (red).
3. Corrija o mínimo para o teste passar (green).
4. Rode a suíte completa (nada mais pode quebrar) + lint + typecheck.
5. Registre a decisão em `.agents/notes/implemented/`.

## Execução real (2026-08-19)

- **Invariante:** o cabeçalho de `src/lib/lesson-completion.ts` diz _"the clock
  lives at the seam: one timestamp drives the whole pipeline"_.
- **Suspeita:** `lastTouch`, `lastPlayed` e `completedAt` usavam `new Date()`
  (relógio de parede) em vez do `now` injetado via `opts.now`.
- **Red:** `tests/unit/lesson-completion-clock.test.ts` injeta `now: T` fixo e
  afirma que os timestamps persistidos equivalem a T. Falhou com diferença de
  ~30min — exatamente o gap entre o clock injetado e o relógio real.
- **Green:** 5 call sites trocados para `new Date(now)`; grep confirmou zero
  `new Date()` restantes no módulo.
- **Gates:** suíte 123/123, lint 0, tsc 0. Nota:
  `.agents/notes/implemented/architecture/2026-08-19-lesson-attempt-clock-consistency.md`.

## Valor

Bug latente (invisível em produção hoje, real em qualquer replay/backfill)
encontrado por prova, não por opinião — e agora há um teste de regressão que
impede a invariante de voltar a ser aspiracional.
