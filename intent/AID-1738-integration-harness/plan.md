# Plan: harness de integração first-class (AID-1738 §5.2)

Arquivos (ordem):

1. `scripts/integration/cross-engine.sh` — runner nomeado. Fases:
   `deps` (self `npm ci` a menos que `--skip-self-install` + 4 installs pnpm
   `--frozen-lockfile` + dojoToday npm + `pip install -e` raiz),
   `contracts` (`node --test learner/gate/tests/*.test.mjs`, glob AID-1601),
   `blobs-proof` (npm ci netlify-functions + `verify_deployed_blobs.mjs`,
   AID-947), `schema-drift` (fixtures synthetic+synthetic-v4, AID-473 F2),
   `build` (`npm run build` com as 8 `VITE_*` same-origin), `smoke`
   (playwright install skippável + `bundle-missions.mjs` + pilot config +
   3 specs desktop com `--retries=$INTEGRATION_PLAYWRIGHT_RETRIES`),
   `report` (`readiness-report.mjs` com `READINESS_TEST_RUN=passed`).
   `set -euo pipefail`; fase desconhecida → exit 2. cwd sempre o diretório do
   OS (espelha o `working-directory` do job); argv idênticos aos inline até
   main `4bb7600`.
2. `scripts/integration/README.md` — contrato (tabela fase→prova→comando),
   uso local/CI, knobs, política de extensão (passo cross-engine novo = fase
   nomeada aqui, não `- run:` ad-hoc), não-metas.
3. `.github/workflows/ci.yml` — job `codexdojo-os` mantém id/name/defaults e
   chama `bash ../../scripts/integration/cross-engine.sh --skip-self-install`
   com `INTEGRATION_PLAYWRIGHT_RETRIES: "1"`. Artifact upload inalterado
   (paths de test-results produzidos pela fase smoke no mesmo cwd).

Invariantes de behavior (verificados):

- Required check `codexdojo-os (TS)` inalterado (id+nome do job).
- Ordem lógica preservada: lint/test do OS dependem só do self `npm ci`
  (deps do OS não incluem workspaces irmãos — package.json conferido);
  integração roda depois, como antes.
- `--skip-self-install` só omite o `npm ci` que o job já executou.

## Verificação (self-verify, primeira mão)

- `bash -n` OK; `--help` exit 2 (uso); fase desconhecida exit 2.
- Execução local first-class: `cross-engine.sh contracts schema-drift` →
  contracts 116 tests (115 pass + 1 skip pré-existente), schema-drift
  `0 drift(s) across 214/262 lines` exit 0.
- YAML parse do ci.yml + estrutura do job conferida.
- `scripts/sdlc_guard_check.sh --base origin/main` → clean.
- CI do PR (matriz completa) é a verificação final das fases pesadas
  (deps/blobs/build/smoke/report) — required checks verdes no PR.

## Review

PR próprio, branch `aid-r3b/integration-harness`; aguarda review
(single-writer FPE até R1). Reviewer sugerido: PRE (dono CI) + QA Lead.
