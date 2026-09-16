# Observation scripts — claims re-grant v83 (AID-2153)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para os 6 use cases re-ancorados
sobre a main `74d8b0b4` após o STALE-WINDOW pós-merge #448 (run 35115499021;
AID-2153, mesma classe da AID-2140/v82):

- `literacy-standalone-corridor-mod01-03` — cenários `literacy-corridor-happy-path`,
  `literacy-corridor-gate-retry`, `literacy-corridor-review-window`,
  `literacy-corridor-grandfathered-return`, `literacy-corridor-resume-mid-module`
- `os-literacy-guided-mission` — cenários `os-literacy-hosted-mission`,
  `os-verification-recovery`, `os-literacy-returning-device`
- `os-returning-learner` — cenários `os-onboarding-track-choice`,
  `os-returning-recovery`, `os-returning-device`
- `os-voxel-guided-missions` — cenários `os-voxel-hosted-missions`,
  `os-renderer-accessibility-recovery`, `os-voxel-returning-device`
- `minitown-explore-only` — cenário `minitown-explore-only`
- `dojotoday-daily-guidance` — cenários `dojotoday-active-unit-guidance`,
  `dojotoday-read-only-boundary`, `dojotoday-returning-next-day`

Causa do drift (fingerprint sobre docs, sem mudança de comportamento das claims):

- PR #448 (merge `2fcdf16f`, commit `3c4c2192`) mudou bytes em
  `engines/literacyDojo/src/` + `curriculum/ai-literacy/modules/01..03` (content
  pass AID-2104) → stale `literacy-standalone-corridor-mod01-03` e
  `os-literacy-guided-mission`;
- PR #450 (commit `5abe4436`) mudou bytes em
  `engines/codexdojo-os-prototype/src/styles/journey.css` e
  `engines/miniTown/src/main.ts` (design conformance AID-2120) → stale
  `os-returning-learner`, `os-voxel-guided-missions`, `minitown-explore-only`;
- PR #453 (commit `0ad95371`, sweep AID-2092) mudou comentários em
  `learner/substrate/dashboard_snapshot.py` (contagem 16→17, docstring only) —
  path coberto pelos sourcePaths de `dojotoday-read-only-boundary`
  (`learner/substrate/`) → stale `dojotoday-daily-guidance`. Nota de processo:
  o sweep de contagens não checou o acoplamento sourcePaths→claims; registrado
  no recibo da AID-2153 como lição (checar `sourcePaths` antes de merges em
  paths mapeados).

Re-anchor intermediário: um primeiro kickoff desta re-grant foi cortado na main
`4f59246b` (1be450ac, 5 use cases); o merge do PR #453 na janela de countersign
introduziu o stale de dojoToday e a branch foi re-anciada na tip `74d8b0b4`
(regra 1 do REGRANT-RUNBOOK: cortar na tip corrente), agora cobrindo 6 use cases.

## Producer gates (executados first-hand no kickoff desta branch)

Gates executados direto num clone sandbox do kickoff (árvore = main `74d8b0b4` +
este scaffold; `evidence/observations/` não entra em nenhum sourcePath,
fingerprints idênticos aos da main). Portas fixas verificadas livres antes de
cada run (guards `--strictPort` + `e2e-port-guard` falham rápido se ocupadas).
Runtime: node 24.18.0 (CI: node 20) + overrides de sessão
`NPM_CONFIG_INCLUDE=dev` (npm ci com devDependencies como no CI; `~/.npmrc` tem
`omit=dev`) e `NODE_ENV=development` para os `corepack pnpm install` do
bundle-missions (pnpm pula devDependencies com NODE_ENV=production ambiente).
Sandbox sem delta de árvore: `git status` limpo pós-gen:content, zero literais
alterados — não houve override de portas.

1. `engines/literacyDojo` — `npm run test:e2e`: suíte completa (corridor +
   happy-path/retry/resume + a11y/pwa) e readiness reports emitidos em
   `engines/literacyDojo/test-results/readiness/` (log `logs/literacy-e2e.log`);
   desta suíte alimentam o re-grant apenas os 5 cenários do corredor
   (reports filtrados em `logs/literacy-readiness/`).
2. `engines/codexdojo-os-prototype` — `npm run test:readiness`: build:pilot +
   pilot smoke 8/8 + `chapter-continuity`/`renderer-fallback`/
   `readiness-recovery` desktop-1280 (log `logs/os-readiness.log`), readiness
   reports emitidos (arquivados em `logs/os-readiness/` — 9 cenários os-*).
3. `engines/miniTown` — `pnpm run smoke` (MINITOWN_PORT=5189) e readiness report
   `minitown-explore-only.json` (log `logs/minitown-smoke.log`, report em
   `logs/minitown-readiness/`).
4. `engines/dojoToday` — `npm run test:readiness` (= selfcheck + playwright
   `readiness.spec.ts`/`continuity.spec.ts` + readiness-report; log
   `logs/dojotoday-readiness.log`, 2 reports em `logs/dojotoday-readiness/`) e
   `npm run selfcheck` (fato de producer para o cenário observation-only
   `dojotoday-read-only-boundary`: regeneração read-only do snapshot, log no
   mesmo arquivo).

## Observação documental first-hand

Guias (`student-guide.md`/`facilitator-guide.md`, âncoras manualRefs do
inventory.yaml) + walk de código na árvore do kickoff com citações arquivo:linha
em `../observations.json`, re-verificadas contra a árvore pós-#448/#450/#453
(line numbers podem ter deslocado vs v82). Notas verificam também que as
mudanças que causaram o stale window são de conteúdo/estilo (voice pass
literacy; design tokens CSS; comentário de design no main.ts do miniTown;
docstring de contagem no dashboard_snapshot.py), consistentes com as claims
publicadas — drift de fingerprint, não de comportamento.

Sem scripts de browser extras: os 18 cenários já possuem automação própria ou
são observation-only (`dojotoday-read-only-boundary`); a camada independente é
documental (evidence `observation`/`document-review`), arquivada em
`../observations.json`. Logs das execuções em `../logs/`.
