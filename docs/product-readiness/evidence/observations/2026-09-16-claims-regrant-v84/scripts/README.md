# Observation scripts — claims re-grant v84 (AID-2174)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para os 3 use cases os-*
re-ancorados sobre a main `067f41e9` após o STALE-WINDOW pós-merge #447
(AID-2174, mesma classe das AID-2153/v83 e AID-2140/v82):

- `os-literacy-guided-mission` — cenários `os-literacy-hosted-mission`,
  `os-verification-recovery`, `os-literacy-returning-device`
- `os-returning-learner` — cenários `os-onboarding-track-choice`,
  `os-returning-recovery`, `os-returning-device`
- `os-voxel-guided-missions` — cenários `os-voxel-hosted-missions`,
  `os-renderer-accessibility-recovery`, `os-voxel-returning-device`

Causa do drift (fingerprint sobre arquivos de teste/env, sem mudança de
comportamento das claims): o PR #447 (merge `067f41e9`, AID-2131 — "normalize
NODE_ENV=test inside vitest") adicionou
`engines/codexdojo-os-prototype/src/testEnvironment.canary.test.ts` (novo, 8
linhas, canário de env dentro de `src/`) e modificou
`engines/codexdojo-os-prototype/vite.config.ts` (+5: `env: { NODE_ENV: 'test'
}` no bloco `test` do vitest) — `engines/codexdojo-os-prototype/src/` é
sourcePath dos 3 use cases (inventory.yaml linhas 73/90/107). Repro first-hand
na main `067f41e9`: `cli.py check --require-current` → rc=1, STALE-WINDOW nos
3 use cases (log `logs/check-main-067f41e9.log`).

## Producer gates (executados first-hand no kickoff desta branch)

Gates executados num clone sandbox do kickoff (árvore = main `067f41e9` +
este scaffold; `evidence/observations/` não entra em nenhum sourcePath,
fingerprints idênticos aos da main). Runtime: node 24 + overrides de sessão
`NPM_CONFIG_INCLUDE=dev` e `NODE_ENV=development` (mesma receita do v83,
documentada em `2026-09-16-claims-regrant-v83/scripts/README.md`).

1. `engines/codexdojo-os-prototype` — `npm run test:readiness`: build:pilot +
   pilot smoke + `chapter-continuity`/`renderer-fallback`/`readiness-recovery`
   desktop-1280 (log `logs/os-readiness.log`), readiness reports emitidos em
   `engines/codexdojo-os-prototype/test-results/readiness/` e arquivados em
   `logs/os-readiness/` (9 cenários os-*).

Resultados first-hand são registrados na mensagem do commit de escrita, no
recibo da AID-2174 e no PR (o scaffold do kickoff é pré-execução).

## Verificação de não-mudança-de-comportamento (producer, first-hand)

Diff do PR #447 limitado aos sourcePaths: apenas o canário de env
(`src/testEnvironment.canary.test.ts`, asserções de ambiente do vitest) e o
`vite.config.ts` (bloco `test`); nenhum componente de UI/rota/estado do
codexdojo-os-prototype foi tocado — o fix normaliza NODE_ENV para o vitest
(motivação: react dev build em worker), não altera os fluxos de missão
hospedada, onboarding/retorno ou renderer-fallback cobertos pelas claims.

## Observação documental first-hand

Guias (`student-guide.md`/`facilitator-guide.md`, âncoras manualRefs do
inventory.yaml) + walk de código na árvore do kickoff com citações arquivo:linha
em `../observations.json`, re-verificadas contra a árvore pós-#447 (line numbers
podem ter deslocado vs v83). Sem scripts de browser extras: os 9 cenários já
possuem automação própria (pilot/specs); a camada independente é documental
(evidence `observation`/`document-review`), arquivada em `../observations.json`.
Logs das execuções em `../logs/`.
