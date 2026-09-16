# QA observation scripts — os-voxel re-grant v79 (AID-1972)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para o use case
`os-voxel-guided-missions` (cenários `os-voxel-hosted-missions`,
`os-renderer-accessibility-recovery`, `os-voxel-returning-device`):

1. **Producer gates CI-idênticos** — `scripts/integration/cross-engine.sh`
   (deps → unit lint/vitest → contracts → blobs-proof → schema-drift →
   build → smoke pilot + desktop-1280 → report) com node 20 (mesma série do
   job `codexdojo-os (TS)`), incluindo `npm run test:readiness` (argv de
   automação declarado nos 3 scenario YAMLs).
2. **Observação documental first-hand** — seções `#codexdojo-os-guided-journey`
   de student-guide.md e facilitator-guide.md (âncoras exatas dos manualRefs do
   inventory.yaml; hash conferem com o manualFingerprint do producer report) +
   corroboração de código no walk (UI copy e persistência same-profile).

Sem scripts de browser extras: os 3 cenários já possuem automação Playwright
própria (sourcePaths cobrem os specs); a camada independente é documental
(evidence `observation`), arquivada em `../observations.json` com notas
primeira-mão. Logs da execução em `../logs/`.
