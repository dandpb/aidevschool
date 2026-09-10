# Intent: otimização de `findAdjacentWalkable` (PR #334, origem Bolt)

> **FAST-PATH RECORD pré-merge** — registrado em 2026-09-10 pelo SM
> (AID-1331, mandato rolling CEO) após triagem registrada: ask `2aebe4d8`
> (AID-1331) respondido pelo CEO às 20:58Z escolhendo o caminho de aceitação
> **(b) founder merge no GitHub**. A substância abaixo (o quê/por quê) são
> **afirmações do bot Bolt no corpo do PR #334**, não verificadas
> independentemente para este registro — a aceitação planejada é o founder
> merge no próprio PR (política `docs/sdlc/README.md` §PRs automatizados,
> AID-1136 Registro #7).

Author: Bolt (bot externo, conta `dandpb`, via `google-labs-jules[bot]`) ·
registro: SM (AID-1331 ask `2aebe4d8`) · Change-id:
`2026-09-10-findindex-hotpath-bolt` · Status: registered-pre-merge (aguardando
founder merge GitHub)

## Problem (claim do produtor)

`findAdjacentWalkable` usava `.findIndex`, alocando uma closure a cada chamada
em hot loop de simulação (pathfinding/adjacência), com custo de execução e GC.

## Outcome pretendido (claim do produtor)

Redução mensurável de overhead de CPU em taxas altas de spawn
(veículos/residentes); produtor alega ~2–3x por lookup — **alegação sem
benchmark anexado** (ver Follow-ups em `plan.md`).

## Trigger / origem

PR #334 aberto 2026-09-10T19:50:10Z (task Jules
`17207391230481370489`). CI no head `6661871b` verde, incluindo o job
`SDLC guardrails (diff)` (check-runs verificados às ~20:3xZ pelo SM).

## Aceitação (forma registrada)

Founder merge no GitHub (opção (b), CEO via ask `2aebe4d8`, 20:58Z). Sem
countersign QA — o dono humano assume a verificação no gate, na forma da
política; achados pós-merge re-entram como novo `intent.md` (Maintain).
