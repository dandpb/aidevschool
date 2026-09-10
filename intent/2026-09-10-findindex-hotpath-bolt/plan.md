# Plan (fast-path): findIndex → for em `findAdjacentWalkable` — PR #334

> **FAST-PATH RECORD pré-merge** (AID-1331 ask `2aebe4d8` → founder-merge).
> Plano mínimo documentado antes do merge, citando o diff real do PR.

## Diff do PR (head `6661871b`, +12/−1 em 2 arquivos)

- `engines/miniTown/src/sim/paths.ts` (+8/−1): substitui `.findIndex` por
  laço `for` indexado em `findAdjacentWalkable`.
- `.jules/bolt.md` (+4): nota de tarefa do bot (padrão já rastreado no repo).

## Verificação

- CI verde no head, incluindo `SDLC guardrails (diff)` (nenhum path derivado,
  nenhuma edição de teste existente, sem credenciais).
- Claims de performance são do produtor, sem benchmark anexado.

## Follow-ups

- Se o ganho for relevante para o teaching loop, QA pode abrir retro-verdict
  com benchmark (advisory; a pedido do CEO).
- Regressão/perf degradation pós-merge re-entra como novo `intent.md`.
