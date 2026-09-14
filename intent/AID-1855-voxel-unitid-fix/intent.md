# Intent: game-10 unitId fix — U9 → U10-distributed-cache (destrava HASH RING)

Author: Curriculum Platform Engineer (Paperclip AID-1855, despacho CEO AID-1853, follow-up L4 do
verifier-map rev 1 / AID-1582) · Change-id: `AID-1855-voxel-unitid-fix` · Status: accepted

> Origina da AID-1855 (board), nomeando o follow-up L4 do doc `verifier-map`
> (rev 1, AID-1582, fechada 2026-09-13 com countersign CEO). Escopo e limites
> citados sem reescrita:
>
> "1. Diagnosticar o formato correto do unitId (comparar com os outros games
> do catálogo e a especificação de curriculum). 2. Corrigir o catalog.json (e
> qualquer consumidor afetado). 3. Remover a entrada do pin
> `ALLOWED_UNITID_QUIRKS` no teste de cobertura. [...] **Limites:** SEM mudança
> de conteúdo pedagógico além do unitId; SEM tocar outros pins
> (ALLOWED_UNVERIFIED / ALLOWED_PROJECTS_WITHOUT_GAME são de outras issues)."

## Why now

O piloto HASH RING (`game-10-hash-ring`) carrega `unitId:
"U9-distributed-cache"`, quebrando a invariante `game-NN == UNN-*` do catálogo
voxelDojo (game-09 já possui `U9-plugin-system`). A dívida era pinada em
`learner/gate/tests/test_gate_game_coverage.py::ALLOWED_UNITID_QUIRKS`
(mecanismo AID-1594/PR1) e o avaliador independente do HASH RING está
condicionado a este fix (verifier-map §4/L4; AID-1594 intent, Constraints).

## Diagnostic

Padrão do catálogo (16/16 entradas): `game-<NN>-<slug>` → `U<NN>-<slug>`,
com o número casando o projeto do currículo (`curriculum/10_distributed_cache`).
game-10 é a única exceção. Formato correto: `U10-distributed-cache`.
`learning_state.yaml` (units_log) ainda não contém U9/U10 — nenhum estado
canônico referencia o id antigo, portanto a correção é seguro-antes-do-uso:
não há histórico de gate para migrar.

## What changes

1. `engines/voxelDojo/catalog.json:48` — `"U9-distributed-cache"` →
   `"U10-distributed-cache"` (a correção; única mudança de dado).
2. Consumidores derivados/do-emissor (mesma PR):
   - `engines/voxelDojo/game-10-hash-ring/src/reviewSlice.ts` — regenerado por
     `python3 -m learner.substrate` (arquivo gerado; diff = 2 linhas unitId).
   - `engines/voxelDojo/game-10-hash-ring/src/game/controller.test.ts` e
     `playwright/hash-ring.spec.ts` — fixtures/asserts do `unit_id` emitido
     (o emissor `shared/createEmitForGame.ts` lê o unitId do catalog.json em
     runtime — single source — então só os testes que pinam o valor antigo
     precisam acompanhar).
   - `learner/substrate/tests/test_voxel_slice.py` — fixtures do filtro
     por-unidade do substrate (mesma classe de edição de fixture de
     content-wave, AID-554).
3. Pin removido: `ALLOWED_UNITID_QUIRKS` fica `{}` (remoção consciente no
   mesmo PR que paga a dívida — o fluxo exato para o qual o pin foi desenhado).
   `ALLOWED_UNVERIFIED`/`ALLOWED_PROJECTS_WITHOUT_GAME` intocados (membership);
   apenas o comentário inline do game-10 em `ALLOWED_UNVERIFIED` deixou de
   dizer "bloqueado pelo fix de unitId".
4. Docs que fixam o unit corrente como fato: `engines/voxelDojo/PLAN.md`,
   `docs/ARCHITECTURE.md`, `docs/GAP_ANALYSIS.md`,
   `docs/plans/09_plugin_system.md` (nota histórica da colisão),
   `docs/handbook/10_engine_voxelDojo.md`,
   `docs/loops/threejs-dojo/ROUTING_MANIFEST.md`. Não editados (históricos
   append-only): `intent/AID-1594-*`, `docs/loops/threejs-dojo/memory.md`.

## Non-goals

- Avaliador HASH RING em `GAME_SPECS` (issue própria pós-destravamento).
- Porta 5177 vs 5210 no ROUTING_MANIFEST (dívida pré-existente, fora do
  escopo "unitId only").
- Pedagogia, cenários, métricas, outros pins, `engines/` além do game-10.

## Review/merge

R1 §2 (código de engine/domínio): 2 reviews — 1 reviewer da área `engines/`
(Learning Engine Engineer) + 1 qualquer; merger FPE/CEO. Commits de edição de
teste carregam `SDLC-ALLOW-TEST-EDIT: AID-1855`; regeneração derivada
`SDLC-ALLOW-DERIVED-EDIT: AID-1855` (aceitação do owner = AID-1855 board).
