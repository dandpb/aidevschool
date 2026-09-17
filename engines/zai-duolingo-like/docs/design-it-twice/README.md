# DESIGN-IT-TWICE — Módulo "estado do learner" (seam /api/state)

Exercício executado em 2026-08-16 com 4 subagentes paralelos, cada um com uma restrição
radical de design, seguindo o skill `codebase-design` (mattpocock/skills).

## Os 4 designs

| Arquivo | Restrição | Entry points | Ideia central |
|---|---|---|---|
| A-state-hub.md | Máxima flexibilidade | 4 | snapshot(query) com fatias/campos + settle() + canal de sinais com cursor + subscribe opcional |
| B-snapshot-unico.md | Interface mínima | 2 | readSnapshot() sem parâmetros, snapshot imutável total, manutenção temporal atômica invisível |
| C-estado-como-funcao.md | Caller comum trivial | 1 | snapshot(opts?) — o tipo do cliente É Awaited<ReturnType>; notices[] transientes |
| D-nucleo-puro-ports.md | Ports & adapters | 1 + construção | sync() com 4 ports (Clock, Store, LeagueReset, ActivityLog), 2 adapters reais cada |

## Veredito

**Vencedor: híbrido com C como espinha**, mais dois transplantes:

1. **Espinha de C** — `snapshot(opts?: { clock? })` em `src/lib/game-state/`; a rota vira adapter
   de uma linha; types.ts perde os tipos duplicados; `notices[]` absorve `recentFreezeUsed`,
   `leagueReset` e os próximos toasts; convenção "mutações retornam GameSnapshot" elimina refetch.
2. **De B** — timestamps absolutos (`hearts.nextRegenAt` + `snapshot.at`) no lugar de duração
   relativa (countdown imune a skew), e `readonly` profundo no snapshot.
3. **De D** — seam interna de construção `createGameState({ clock, store })` com TestClock e
   SQLite temporário nos testes. SEM LeagueResetPort/ActivityLogPort separados (um adapter só =
   seam hipotética); viram estágios do pipeline interno recebendo `now`.
4. **De A** — apenas a ideia fica registrada: se surgir um segundo consumer (mobile, bot de
   WhatsApp), o canal de sinais com cursor e fatias parciais se justifica. Hoje, selectors do
   Zustand dão granularidade de graça.

## Por quê

- **Depth**: C tem o maior leverage por símbolo — um ponto de entrada substitui rota de 100 linhas,
  4 tipos duplicados e o refreshState; drift vira erro de compilação, não disciplina.
- **Locality**: B/C/D concentram manutenção temporal + contrato num lugar só; A dispersa em
  política de retenção de cursor e ordering constraint (settle → snapshot).
- **Seam placement**: D é o mais disciplinado (HTTP rebaixado a adapter de 6 linhas); C é o mais
  pragmático (dois adapters reais: HTTP + in-process; testes com SQLite temp, replace-don't-layer).

## Plano de migração (sem big-bang)

1. Criar `src/lib/game-state/` ao lado do código atual.
2. Reescrever `/api/state/route.ts` como adapter fino sobre o novo módulo.
3. Migrar o store para um `snapshot` único, componente a componente (TopBar → Shop → resto).
4. Deletar campos soltos e tipos duplicados de types.ts.
5. Testes novos na interface (snapshot() com TestClock + SQLite temporário), substituindo os antigos.
