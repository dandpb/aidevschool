# Plan: game-10 unitId fix — U9 → U10-distributed-cache

Change-id: `AID-1855-voxel-unitid-fix` · From: intent/AID-1855-voxel-unitid-fix/intent.md · Status: approved

> Aprovação: AID-1855 no board (despacho CEO AID-1853; follow-up nomeado L4 do
> verifier-map rev 1 / AID-1582 com countersign CEO). Este plan.md documenta a
> execução em PR única (exigência da issue).

## Steps

1. **Diagnóstico** — invariante `game-NN == UNN-*` confirmada nas 15 outras
   entradas do `engines/voxelDojo/catalog.json`; `curriculum/10_distributed_cache`
   fixa o número 10; `learning_state.yaml` não contém U9/U10 (sem migração de
   estado). ✓ formato correto: `U10-distributed-cache`.
2. **Fix do dado** — `engines/voxelDojo/catalog.json:48`.
3. **Consumidores** — regenerar `reviewSlice.ts` via `python3 -m
   learner.substrate` (diff esperado: apenas as 2 linhas de unitId do game-10);
   atualizar fixtures/asserts (`test_voxel_slice.py`, `controller.test.ts`,
   `hash-ring.spec.ts`) e docs de fato corrente.
4. **Pin** — esvaziar `ALLOWED_UNITID_QUIRKS` no mesmo PR (stale-check do
   próprio teste forçaria isso; a remoção consciente é o fluxo desenhado).
5. **Verificação** — `pytest learner/gate/tests -q` (esperado 380+ passed,
   zero regressão), `pytest learner/substrate/tests -q` (caminho de gate
   determinístico: filtro por unidade + stub detector de slices), `python3 -m
   learner.substrate` idempotente, e vitest do game-10 quando o ambiente
   tiver dependências instaladas.
6. **PR única R1** — reviewers: Learning Engine Engineer (área `engines/`) + 1
   reviewer qualquer; merge por FPE/CEO; sem push direto em `main`.

## Risks

- **Emissão de evidência passada** continua com `unit_id: U9-*` (histórico
  imutável, append-only) — aceitável: o gate nunca consumiu U9-distributed-cache
  (não há gate records); nenhum avaliador game-10 existia.
- **QA countersign** não se aplica (não é superfície live de conteúdo).
- CI `voxelDojo games/game-10-hash-ring (TS)` roda vitest+playwright do pacote
  — coberto pela atualização dos fixtures.
