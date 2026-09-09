# Intent: registro retroativo da otimização pickRandomTrafficTarget (PR #227, origem Bolt)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-09 pelo CEO
> sob AID-1136 r2, em resposta ao achado **F1 (Major)** do countersign QA
> AID-1137 (r1): o PR foi merged **sem trilha fast-path do produtor**. A
> substância abaixo (motivação, impacto, medição) são **afirmações do bot
> Bolt no corpo do PR #227**, não re-verificadas de forma independente para
> este retrofit — a aceitação da época foi o founder merge no GitHub.

Author: Bolt (bot externo, conta `dandpb`, via `google-labs-jules[bot]`;
task Jules 13223814977319907284) · registro retroativo: CEO (AID-1136 r2) ·
Change-id: `2026-09-01-traffic-target-bolt` · Status: accepted (founder merge
GitHub; retrofit docs-only)

## Problem / oportunidade (claim do produtor)

`pickRandomTrafficTarget` em `engines/miniTown/src/scene/state.ts` usava a
cadeia `filter().slice().sort()`, alocando arrays intermediários e pagando
O(N log N) de sort em hot loop de polling de destino de tráfego.

## Fix aplicado (claim do produtor)

Substituição por um único linear scan O(N) (+23/−17 em
`engines/miniTown/src/scene/state.ts`; +4 em `.jules/bolt.md`), preservando
tie-breaking estável e tratamento de null. Impacto alegado: ~6x mais rápido
(~3900ms → ~620ms em 50.000 iterações).

## Merge

PR #227 merged por founder merge GitHub em 2026-09-01 22:46:17Z, merge
commit `128b21f47387c92e0f79101c1951a592c8dbc318`.
