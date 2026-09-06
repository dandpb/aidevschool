# Plan — AID-913 (spec rev 3a716ea8, GO AID-918)

Passos de entrega (PR único, spec §9). Cada passo com sua verificação menor.

1. **Emissores literacy v2** — `src/domain/analytics.ts` (envelope v2,
   construtores com identidade, `lesson_started`/`activity_attempted`,
   `entry_viewed`), `src/adapters/analyticsIdentity.ts` (sessionId efêmero),
   `src/adapters/analyticsBatchSink.ts` (buffer 20/15s/pagehide, beacon),
   instrumentação em `src/application/useCases.ts` + `src/app/App.tsx`.
   Verificação: `tests/domain/analyticsV2.test.ts`,
   `tests/adapters/analyticsBatchSink.test.ts`,
   `tests/app/funnelEmission.test.ts` (4 eventos do funil).
2. **Coletor v2** — `learner/gate/netlify-functions/dojo-analytics-collector.mjs`:
   2 envelopes com paridade, `BlobsEventStore` idempotente (dia/eventId),
   export GET Bearer (sem CORS headers; sec-fetch-site só no POST).
   Verificação: `dojo_analytics_collector_v2.test.mjs` + paridade +
   `collectorParity.test.ts` (OS) verde.
3. **Ativação** — env + redirects nos 2 netlify.toml; invariante executável
   nova `dojo_analytics_activation_surfaces.test.mjs` (somente os 2 tomls,
   valor same-origin canônico, redirect antes do fallback /*, token fora).
4. **Leitura** — `aggregate_funnel.mjs` reportVersion 3 + `literacyFunnel`;
   `schema_drift_monitor.mjs` 2 envelopes; fixtures sintéticas literacy;
   exemplo byte-idêntico regenerado; LEITURA_FUNIL_OPB (export + nota
   reload-quebra-sessão F7).
5. **Copy de privacidade** — literacy `/privacidade`+`/termos` (sem
   installationId), OS `/privacidade` + link no onboarding.
6. **Probe executável** — `learner/gate/analytics/probe_collector_export.mjs`
   (POST sintético 2 envelopes → export token → drift → agregação →
   assert literacyFunnel + supressão k + zero identificadores no report).
7. **Onda de edit de testes v1 (AID-554)** — atualização dos pins descritos
   no intent; commit com trailer `SDLC-ALLOW-TEST-EDIT: AID-913`.
8. **Matriz** — literacy: gen:content+lint+test+build+test:e2e; OS:
   lint+test+build+test:smoke; gate: node --test analytics + probe exit 0.
9. **PR** — base `aid916-literacy-corridor` (de-conflict com PR #276; merge
   só depois de #276), disclosure de edits + F1–F7, countersign QA (relay
   child), merge CEO, deploy, smoke pós-deploy (§7.4), `done` AID-913.

## Estado

- Passos 1–6: implementados (commits f28b85f9, 2ebc39d4, 3ffe1deb).
- Passo 7–8: concluídos nesta sessão (matriz verde; smoke OS em andamento
  no momento da escrita — ver receipt no PR).
- Passo 9: PR aberto após rebase no head do corredor.
