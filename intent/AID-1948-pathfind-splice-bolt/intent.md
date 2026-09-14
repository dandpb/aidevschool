# Intent: O(1) swap-and-pop na extração do frontier BFS do miniTown (PR #429)

Author: google-labs-jules[bot] (Bolt, performance) no login do founder · Change-id: AID-1948-pathfind-splice-bolt · Status: accepted (merge gated on QA countersign AID-1948 — GO 2026-09-14 21:41Z)

> Originates from Paperclip triage AID-1948 (despacho da auditoria SDLC
> AID-1947, Registro #1): PR #429 sem cadeia Paperclip — este registro
> fast-path cobre o elo do produtor ANTES do merge
> (docs/sdlc/README.md §PRs automatizados, política AID-1136 Registro #7).
> Veredito independente (QA Lead ca6a3f95, fresh-context): **GO** —
> comentário `608ae8bd-29ca-4285-93af-7aac2f881403` na issue AID-1948.

## Problem

`bfs()` em `engines/miniTown/src/sim/paths.ts` extraía células do frontier
com `bucket.splice(idx, 1)[0]` — O(N) por extração (shift de todos os
elementos posteriores) + pressão de GC no hot loop de pathfinding, chamado
a cada planejamento de rota de residentes/veículos.

## Proposed outcome

Extração O(1) swap-and-pop no bucket de mesmo custo: remove exatamente a
célula selecionada, preserva o multiset do bucket e a disciplina de 1 draw
de `rng()` por extração; custo ótimo e conectividade dos caminhos
inalterados; suíte do miniTown verde no head do PR.

## Affected users and systems

`engines/miniTown/src/sim/paths.ts` (+7/−1, única mudança de código) e
`.jules/bolt.md` (+6, notas de aprendizado do bot — docs-only). Nenhum outro
engine; nenhum learner state (miniTown nunca escreve estado canônico).

## Constraints

- Diff bounded ao head `cab3aaa3d21cc68560c2827485209f94cbc4b729` (1 commit, 2 arquivos).
- CI verde no head incluindo `SDLC guardrails (diff)` (39 checks = 38 success + 1 skipped, first-hand AID-1947).
- Aceitação: merge single-writer CEO citando o countersign AID-1948 OU founder merge no GitHub.
- Producer ≠ verifier: o bot nunca verifica o próprio diff (veredito QA fresh-context registrado ANTES do merge).

## Open questions

None. Achado não-bloqueante LOW (cosmético): entradas de `.jules/bolt.md`
fora de ordem cronológica (`2024-05-31` após 2025) e heading `2025-02-18`
duplicado — sweeping futuro de docs pode normalizar.

