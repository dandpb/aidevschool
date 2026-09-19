# Plan (retroativo): `evaluateTrace` sem alocação de arrays — PR #507

> **RETROSPECTIVE RECORD** (AID-2579, classe AID-767/F1; precedente
> AID-771). Plano documentado após o merge; o "plano" real foi o corpo do
> PR do bot + countersign CEO AID-2577 (comentário GH 5744922239).

Change-id: `2026-09-19-evaluatetrace-bolt-pr507` · From:
`intent/2026-09-19-evaluatetrace-bolt-pr507/intent.md` · Status: approved
(retroativo; aceitação original = merge com countersign AID-2577)

## O que mudou (diff real do merge `13f22ef4`, head `114b9f09`)

- `engines/voxelDojo/game-14-river-delta/src/sim/levels.ts` (+9/−2, única
  mudança): em `evaluateTrace`, `[...truthIds].filter(...).length` e
  `[...collected].filter(...).length` substituídos por contadores
  incrementados em laços `for...of` (`missing`, `extra`); condição `exact`
  inalterada. Nenhum outro arquivo (sem nota em `.jules/bolt.md` neste PR).

## Verificação (época do merge — countersign AID-2577, GH 5744922239)

- CI no head `114b9f09`: **42/42 verde**, incluindo
  `voxelDojo games/game-14-river-delta (TS)`, `product readiness (claims)`,
  `SDLC guardrails (diff)` (diff audit first-hand do countersign:
  "semantically equivalent for-of counting replacing spread+filter
  allocations").
- Medição de performance é claim do produtor (corpo do PR #507), sem
  benchmark anexado — não re-executada para este retrofit.

## Riscos

- Hot path de avaliação de trace: risco de mudança de comportamento
  descartado no countersign (mesmas contagens, `exact` inalterado);
  regressão futura re-entra como novo `intent.md` (Maintain).

## Proof (deste retrofit docs-only)

- `git ls-tree origin/main intent/2026-09-19-evaluatetrace-bolt-pr507/`
  contém `intent.md` + `plan.md` após o merge deste registro.
- CI do PR do retrofit verde, incluindo `SDLC guardrails (diff)`
  (nenhum path derivado, nenhuma edição de teste).

## Follow-ups

- Readiness re-grant v97: PR #508 (fábrica AID-1357) pendente de
  observação independente — não é bloqueio deste registro.
- Mudanças futuras em `evaluateTrace`: nova issue Paperclip + trilha
  `intent/` canônica antes do merge (ordenamento AID-2219).
