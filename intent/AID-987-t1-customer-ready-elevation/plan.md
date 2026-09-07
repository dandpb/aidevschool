# Plan — AID-987/T1

Status: **approved** (spec derivada da proposal AID-981 aceita; ordem CEO AID-986).

## Ordem de trabalho (arquivos)

1. `docs/product-readiness/scenarios/dojotoday-returning-next-day.yaml` (novo)
2. `docs/product-readiness/scenarios/voxel-standalone-return-reentry.yaml` (novo)
3. `docs/product-readiness/scenarios/pixelquest-returning-evidence-handoff.yaml` (novo)
4. `engines/shared/teaching-evidence/funnelTelemetry.ts` (novo) + wire em
   `evidenceTransport.ts` (`dualEmit`, channels voxeldojo/pixelquest).
5. `learner/gate/netlify-functions/dojo-analytics-collector.mjs` (envelope v3
   + source no Blobs) + `learner/gate/tests/dojo_analytics_collector_v3.test.mjs`
   (novo) + AUTHORIZED += 2 tomls em `dojo_analytics_activation_surfaces.test.mjs`.
6. dojoToday: `playwright/fixtures/today.day-n.ts`, `today.day-n-plus-1.ts`,
   `vite.config.ts` (seam), `playwright.config.ts` (2 webServers),
   `playwright/continuity.spec.ts`, `src/main.ts` (daily-view-open + demo
   notice), `netlify.toml`, `scripts/readiness-report.mjs` (+cenário).
7. voxel: `game-02-warehouse/playwright/warehouse.spec.ts` (+re-entry),
   `game-02-warehouse/netlify.toml` (novo), `engines/voxelDojo/scripts/readiness-report.mjs`
   (+cenário).
8. pixelquest: `pixel-quest/playwright/returning.spec.ts` (novo),
   `engines/pixelDojo/scripts/readiness-report.mjs` (+cenário).
9. `docs/product-readiness/inventory.yaml` (tier/rotas/scenarioIds/sourcePaths)
   + `python3 docs/product-readiness/tools/cli.py render`.
10. Verificação §6 da spec → `intent/AID-987-t1-customer-ready-elevation/evidence/`.
11. PR único → main (merge é CEO single-writer, janela entre sessões O1).

## Provas

- Verificação executável desta sessão gravada em `evidence/verify.log` (+
  saídas-chave); countersign independente é a ordem irmã AID-988 (QA) —
  produtor ≠ verificador.

## Riscos → mitigações

- Fixture data drift vs gerador: fixtures são dados de TESTE tipados, não
  projeção gerada; o arquivo canônico segue intocado.
- Playwright portos ocupados: portos novos 5181/5182 strictPort.
- Coletor: validação v3 fail-closed espelha v2 (nenhuma aceitação frouxa);
  teste de paridade de vocabulário lê o módulo TS canônico.
