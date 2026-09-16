# QA observation scripts — os-* re-grant v85 (AID-2175)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para os use cases
`os-literacy-guided-mission`, `os-returning-learner` e `os-voxel-guided-missions`
(9 cenários: os-literacy-hosted-mission, os-verification-recovery,
os-literacy-returning-device, os-onboarding-track-choice, os-returning-recovery,
os-returning-device, os-voxel-hosted-missions, os-renderer-accessibility-recovery,
os-voxel-returning-device):

1. **Producer gates CI-idênticos** — `scripts/integration/cross-engine.sh`
   (deps → unit lint/vitest → contracts → blobs-proof → schema-drift →
   build → smoke pilot + desktop-1280 → report) com node 20 (mesma série do
   job `codexdojo-os (TS)`), incluindo `npm run test:readiness` (argv de
   automação declarado nos 9 scenario YAMLs). Relevância direta do v85: o
   stale veio do merge PR #447/AID-2131 (novos bytes em
   `engines/codexdojo-os-prototype/src/` — canário
   `src/testEnvironment.canary.test.ts` — dentro do sourcePaths `src/` dos
   3 use cases), e a lane unit desta árvore exercita o canário NODE_ENV do
   AID-2131 em primeira mão.
2. **Observação documental first-hand** — seções `#codexdojo-os-guided-journey`
   de student-guide.md e facilitator-guide.md (âncoras exatas dos manualRefs do
   inventory.yaml; hash conferem com o manualFingerprint do producer report)
   + corroboração de código no walk (UI copy, persistência same-profile,
   boundary não-mastery, recovery de verificador indisponível) na árvore do
   head da fase QA.

Sem scripts de browser extras: os 9 cenários já possuem automação Playwright
própria (sourcePaths cobrem os specs); a camada independente é documental
(evidence `observation`), arquivada em `../observations.json` com notas
primeira-mão. Logs da execução em `../logs/`.
