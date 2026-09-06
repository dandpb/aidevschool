# Intent — AID-913: telemetria mínima de uso real + funil anonimizado nas 2 journeys live

Paperclip issue: AID-913 (ORDEM AID-910/D do CEO). Owner: Founding Product
Engineer (fa8130d5). **Spec autoritativa:** doc `spec` rev `3a716ea8` na
issue AID-913 (countersign QA GO em AID-918, 2026-09-06 13:19Z). Este arquivo
registra o dispatch; a spec é a única fonte de verdade do desenho.

## Dispatch (ordem AID-910/D, relay CEO AID-920 → AID-921)

As 5–8 sessões O1 (janela ~09-23) devem gerar dado de funil anônimo nas 2
superfícies live (`literacy-standalone-first-lesson`, `os-literacy-guided-mission`).
Telemetria implantada + deployada nas 2 superfícies ANTES da sessão 1.
Sequenciamento: pós-PR #276 (ou paralelo sem conflito) → PR próprio →
countersign QA → merge CEO → deploy confirmado → aviso na AID-913.

## Problema

Zero telemetria real hoje: literacy emite só `lesson_completed` para sink noop
(transporte desligado); o OS emite funil completo de 12 eventos mas nenhuma
superfície define `VITE_ANALYTICS_ENDPOINT` (ADR-0010 §4 pendente de decisão
do board). O coletor deployado aceita só envelope OS v1 e não tem backing
durável (NDJSON /tmp efêmero). Nenhuma decisão pós-O1 sem dado de uso.

## Outcome (spec §2–§6, delta completo)

- literacyDojo: emenda ADR-0009 — envelope v2 (`eventId` + `sessionId` efêmero
  por page load), eventos `lesson_started`/`activity_attempted`,
  instrumentação de `entry_viewed`; batch sink same-origin (20 ev/15s/pagehide).
- Coletor (ADR-0010 estendido): aceita OS v1 + literacy v2 com paridade de
  vocabulário; backing Netlify Blobs idempotente `set("<dia>/<eventId>")`
  (fallback NDJSON /tmp); export GET Bearer `ANALYTICS_EXPORT_TOKEN`.
- Ativação: `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` SOMENTE nos
  `[build.environment]` dos 2 netlify.toml (invariante fail-closed por teste).
- Leitura: `aggregate_funnel` reportVersion 3 com seção `literacyFunnel`
  (k≥5 imutável); `schema_drift_monitor` aceita 2 envelopes; fixtures
  sintéticas; LEITURA_FUNIL_OPB atualizado (export via endpoint + nota F7).
- Copy de privacidade: literacy `/privacidade`+`/termos` (sessionId-only, sem
  installationId); OS página mínima `/privacidade` linkada do onboarding.

## Verificação (spec §7)

Probe executável coletor→export→drift→agregação (evidência central do
countersign); suites dos 2 engines (lint/test/build + e2e/smoke); suites do
gate; smoke pós-deploy (gate de `done` da AID-913, §9).

## Edit de testes existentes (política AID-554)

As suítes v1 codificavam o invariant PRÉ-ativação, superseded pela ordem
AID-910/D: `tests/app/services.analytics.test.ts` (wire NDJSON-por-evento →
batch v2), `tests/domain/analytics.test.ts` (assinatura v2 + identidade),
`dojo_analytics_collector_netlify.test.mjs` (GET 405 → export 401/404),
`dojo_analytics_funnel_aggregation.test.mjs` (reportVersion 2→3 + exemplo
regenerado byte-idêntico), OS `fixtureSchemaDrift.test.ts` (reportVersion
2→3 + literacyFunnel identifier-free). Aceitação registrada nesta issue:
relay CEO AID-921 (diretiva de implementação da spec GO, que especifica a
mudança de invariante §3) + countersign QA AID-918 itens 2–3 (mudança de
invariante e extensão do coletor GO). Trailer `SDLC-ALLOW-TEST-EDIT: AID-913`
no commit da onda; disclosure no PR; QA verifica pre-merge. Nenhuma asserção
de privacidade foi enfraquecida (zero PII, k≥5, identifiersPublished=false
seguem travados — e ganharam asserções novas de identidade v2).
