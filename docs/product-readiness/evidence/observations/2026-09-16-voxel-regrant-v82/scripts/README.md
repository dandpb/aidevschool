# Observation scripts — voxel claims re-grant v82 (AID-2140)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para os use cases
`os-voxel-guided-missions` (cenários `os-voxel-hosted-missions`,
`os-renderer-accessibility-recovery`, `os-voxel-returning-device`) e
`voxel-standalone-learning-loop` (cenários `voxel-standalone-loop`,
`voxel-accessible-renderer`, `voxel-standalone-return-reentry`), re-ancorados
sobre a main `7b07b89c` após o STALE-WINDOW de 08:31Z (PRs #435/#436 mudaram
bytes em `engines/voxelDojo/` — DESIGN.md hud-panel, AGENTS.md stale counts,
comentário sceneHarness.ts — cobertos pelos sourcePaths de ambos os use cases;
herança AID-2140).

## Producer gates (executados first-hand, árvore byte-idêntica à main 7b07b89c)

Os gates rodaram numa cópia sandbox do repo cujo ÚNICO delta vs worktree são
literais de porta efêmeros (52NN→53NN, 5175→5375, 5177→5377, 4174→4374,
4176→4376, 5178→5378) — necessário porque os servidores de porta fixa do host
compartilhado estavam ocupados por sessão concorrente (AID-2106, lock em
5202-5206/5175-5180/5177 desde 09:56Z); `reuseExistingServer:true` nos
webServers de engine teria reusado a árvore da outra sessão, invalidando a
evidência. Prova: `logs/copy-delta-vs-worktree.diff` (todas as linhas changed
são literais de porta). Runtime: node 24.18.0 (CI: node 20) + override de
sessão `omit=dev` do npm (`NPM_CONFIG_INCLUDE=dev`) para o `npm ci` do
bundle-missions instalar devDependencies como no CI.

1. `engines/voxelDojo` — `pnpm run smoke`: 17/17 games pass (75 testes
   playwright ✓, log `logs/voxel-smoke.log`), readiness report emitido
   (`logs/voxel-readiness/voxel-standalone-loop.json`,
   `voxel-standalone-return-reentry.json`).
2. `engines/codexdojo-os-prototype` — `npm run test:readiness`: build:pilot +
   pilot smoke 8/8 + `chapter-continuity`/`renderer-fallback`/
   `readiness-recovery` desktop-1280 pass (log `logs/os-readiness.log`),
   readiness reports emitidos (`logs/os-readiness/*.json`, incluindo os 3
   cenários os-voxel).

## Observação documental first-hand

Guias (`student-guide.md`/`facilitator-guide.md`, âncoras manualRefs do
inventory.yaml) + walk de código na árvore 7b07b89c com citações arquivo:linha
em `../observations.json`. Notas incluem a verificação de que as mudanças de
docs que causaram o stale window (DESIGN.md #0b0e14, contagem 17) são
consistentes com o catalog.json da árvore (17 entradas game-*), i.e. o drift
era de fingerprint, não de comportamento.

Sem scripts de browser extras: os 6 cenários já possuem automação própria ou
são observation-only (`voxel-accessible-renderer`); a camada independente é
documental (evidence `observation`/`document-review`), arquivada em
`../observations.json`. Logs das execuções em `../logs/`.
