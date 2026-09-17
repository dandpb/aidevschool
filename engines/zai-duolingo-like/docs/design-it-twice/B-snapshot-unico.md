# Design B — "Snapshot Único Imutável" (restrição: interface mínima)

> Subagente do exercício DESIGN-IT-TWICE (2026-08-16). Veredito e comparação: ver README.md desta pasta.

**2 entry points**: `createLearnerState({ store, clock })` (construção) + `readSnapshot()` (uso).

- Snapshot imutável, total, autossuficiente: `readonly` profundo, `contract: 1`, `asOf` ISO.
- **Manutenção temporal atômica invisível** (I2): regen de hearts, decaimento de streak e reset
  semanal de liga acontecem dentro da chamada, numa transação — caller nunca orquestra.
- **Totalidade (I3)**: todo campo sempre presente; `undefined` impossível por construção;
  types.ts é deletado — drift vira erro de compilação.
- **Tempos absolutos (I6)**: `hearts.nextRegenAt` + `asOf` em vez de `heartRegenMs` relativo —
  countdown com correção de skew de graça.
- **Zero ordering constraints**, um único error mode (`StateUnavailableError`).
- Seam interna: `LearnerStore.transact()` com 2 adapters reais (Prisma / in-memory);
  `Clock` explícito na construção — mata o `Date.now()` escondido.

Trade-offs assumidos: notificações one-shot como flags por janela (toast pode reaparecer em refetch
dentro da janela); over-fetch para quem só quer gems; single-learner embutido na assinatura
(decisão consciente). Fora: escritas, leaderboard/achievements/curriculum (agregados separados),
endpoints por fatia (rejeitado — fatia é problema do cliente), cache/push.
