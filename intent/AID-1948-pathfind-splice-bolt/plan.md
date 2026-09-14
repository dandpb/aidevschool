# Plan: O(1) swap-and-pop na extração do frontier BFS do miniTown (PR #429)

Change-id: AID-1948-pathfind-splice-bolt · From: intent/AID-1948-pathfind-splice-bolt/intent.md · Status: approved (countersign QA GO, AID-1948 2026-09-14)

## Files that change

- `engines/miniTown/src/sim/paths.ts` — +7/−1 dentro de `bfs()`: `idx` + leitura `bucket[idx]`, `bucket.pop()`, e `if (idx < bucket.length && last !== undefined) bucket[idx] = last;` substituem `bucket.splice(...)[0]`. Guarda `if (!cell) continue` mantida antes da mutação; `frontiers.delete(lowest)` para bucket vazio inalterado.
- `.jules/bolt.md` — +6: duas notas de aprendizado do bot (iterators V8; swap-and-pop). Docs-only.
- `intent/AID-1948-pathfind-splice-bolt/` (este record) — commitado antes do merge (fast path §PRs automatizados).

Sem testes novos (nenhum contrato novo; suíte existente cobre propriedades do pathfinder).

## Order of work

1. Bot abre PR #429 com o swap-and-pop (feito; head `cab3aaa3`).
2. QA Lead verifica fresh-context: revisão de equivalência + test/typecheck/lint no head + probe diferencial (feito — veredito GO, AID-1948).
3. Este record é commitado (single-writer CEO) — antes do merge.
4. Merge single-writer CEO do PR #429 citando o countersign AID-1948, com guarda `expected_head_sha = cab3aaa3d21cc68560c2827485209f94cbc4b729` (abort se o head mover).
5. Recibo do merge (SHA) na issue AID-1948; triagem fechada com record commitado/verificável.

## Risks

- Ordem intra-bucket muda → caminho específico retornado pode diferir entre versões para mesma seed — **por design** (tie-break aleatório é o recurso anti-grid); custo ótimo, conectividade e determinismo por seed preservados (probe 300 grids).
- Total de draws de `rng()` por chamada varia entre versões (ex. 95→94) — sem contrato de contagem para pathfinding; disciplina 1-draw-por-extração estrutural intacta.
- Head do PR movido por re-save do bot — mitigado pela guarda `expected_head_sha` no merge (merge falha limpo em vez de mergear árvore adulterada).
- Perf claim (O(1) vs O(N)) aceito por análise estrutural, sem benchmark executável — não é gate.

## Proof

First-hand no head `cab3aaa3` (clone limpo; linux; pnpm 9.15.9; NODE_ENV=development), registrado na issue AID-1948:

- `cd engines/miniTown && pnpm run test` → **31/31 passed** (4 arquivos)
- `cd engines/miniTown && pnpm run typecheck` → **exit 0**
- `cd engines/miniTown && pnpm run lint` → **exit 0** (biome, 25 arquivos)
- Probe diferencial QA (scratch, não commitado): 300 grids aleatórios (271 com caminho) — conectividade idêntica old-vs-new; caminhos válidos; custo == Dijkstra de referência; determinismo por seed na versão nova.
- CI no head: 39 checks = 38 success + 1 skipped, incl. `SDLC guardrails (diff)` (first-hand AID-1947).

## Verification split

Producer (Bolt bot via google-labs-jules[bot]) ≠ verifier — nunca dispensado.
QA Lead (ca6a3f95) verificou fresh-context contra este plan (veredito GO,
AID-1948, antes do merge). Merge: single-writer CEO citando o countersign,
ou founder merge no GitHub (aceite do dono humano).

