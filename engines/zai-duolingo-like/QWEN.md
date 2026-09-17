# QWEN.md — convenções do Vertical Protocol

Jogo cozy-cyberpunk de letramento em IA ("Duolingo de IA"): Next.js 16 +
Prisma (SQLite) + Zustand, single-page com view routing no store.

## Comandos

- Testes: `npm test` (vitest; serial, sqlite compartilhado em `db/test.db`
  recriado pelo global-setup)
- Gates completos de uma vez: `npm run verify` (testes + lint + typecheck)
- Lint: `npm run lint` · Typecheck: `npx tsc --noEmit`
- E2E: `npm run test:e2e` (a suíte sobe sozinha via `next start` na porta 3100
  com `db/e2e.db` próprio; requer `npm run build` antes)
- Chat LLM (`/api/chat`) usa env: `LLM_API_KEY` (obrigatória), `LLM_BASE_URL`
  (default z.ai/GLM), `LLM_MODEL`. Qualquer endpoint OpenAI-compatible serve.

## Como mexer no código

- Rotas API: imitar `src/app/api/streak/milestone/route.ts`
  (`force-dynamic`, `getCurrentLearner`, allowlist de entrada, respostas
  `{ ok, ... }` / `{ ok: false, error }`).
- Testes de API: imitar `tests/api/streak-milestone.test.ts` usando os helpers
  de `tests/helpers.ts` (`resetDatabase`, `seedBaseline`, `postJson`).
- Estado do learner (leitura): usar a seam `src/lib/game-state` (`snapshot()`);
  não refazer consultas avulsas de learner/streak/hearts.
- Regras de unlock de lição: usar `src/lib/lesson-unlock`
  (`isModuleUnlocked`/`isLessonUnlocked`) — nunca reimplementar a regra.
- Regras e histórico de decisões: `.agents/notes/` (lifecycle
  proposed → implemented/rejected).

## Workflow de features

Toda feature não-trivial começa por uma spec escrita ANTES do código:
template em `docs/workflow-dev-ia/templates/spec.md`, exemplo real executado
em `docs/workflow-dev-ia/examples/spec-meta-semanal.md`. Gates obrigatórios
antes de declarar pronto: `npm test` + `npm run lint` + `npx tsc --noEmit`
(ou `npm run verify`), com o resultado real registrado na seção 6 da spec.
Guia completo dos 9 fundamentos: `docs/workflow-dev-ia/README.md`;
aprendizados dos 11 casos executados: `docs/workflow-dev-ia/aprendizados.md`.

Skills que mantêm os workflows vivos (invocáveis por nome em qualquer repo):
- `spec-first` — feature com spec antes do código (caso 0)
- `prove-the-bug` — bugfix com teste red como prova (W1)
- `safe-refactor` — refactor com verde antes/depois (W2/W3)
- `quality-loop` — melhoria com medida e parada (W7)
- `delegate-verify` — delegação com brief + verificação (W6)
- `repo-health` — checkup periódico de gates/deps (W5/W8/W9)
