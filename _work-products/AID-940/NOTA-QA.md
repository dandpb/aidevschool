# Nota QA — leitura do funil 2026-09-06 (countersign final AID-913 §9 / AID-940)

- **Janela UTC:** 2026-09-06T00:00Z–23:59Z (export das 2 superfícies, `from=2026-09-06&to=2026-09-06`).
- **Origem:** export NDJSON live via Bearer (literacy + OS), combinados em 9 linhas.
  Drift `schema_drift_monitor.mjs` (monitorVersion 2): **0 drifts, 9/9 válidos** (2 OS v1 + 5 literacy v2 + 2 duplicatas de re-POST deliberadas).
- **Agregação `aggregate_funnel.mjs` reportVersion 3** (`funil-2026-09-06.json/.md`): OS `totalEvents=3`/`duplicateEvents=1`; literacy `literacyFunnel.totalEvents=4`/`duplicateEvents=1`/`totalSessions=4`; `identifiersPublished=false`; todas as células com n<k=5 suprimidas (só `n` publicado) — dry-run do pipeline conforme o escopo honesto do runbook (1–3 instalações ⇒ tudo suprimido).
- **Eventos sintéticos a excluir de qualquer leitura orgânica** (marcadores):
  - literacy `contentVersion`: `smoke-aid934`, `deploy-probe-a913`, `qa-countersign-a940` (lessonIds `deploy-probe`, `qa-smoke-a940`); `3a5d35e2-…-000000000002` (contentVersion `2026-09-06.1`, UUID determinístico — provável walk scriptado, não orgânico).
  - OS: eventId `qa-a940-os-01f313a1` (dimensions.installationId `qa-a940-os`, contentVersion `qa-countersign-a940`) e `0a5d35e1-0000-4000-8000-smoke00000001` (smoke do produtor, sem contentVersion).
  - **Zero eventos orgânicos confirmados nesta janela** (a AID-940 descrevia o `entry_viewed` `2f55f42d…` como "orgânico": o export mostra `contentVersion:"smoke-aid934"` — sintético rotulado; imprecisão de descrição, sem impacto no pipeline).
- **Dedup em produção comprovado em dado real:** re-POST byte-idêntico do mesmo eventId nas 2 superfícies (teste de idempotência do countersign) → 2 linhas duplicadas no NDJSON exportado, removidas corretamente pela agregação (1+1 `duplicateEvents`).
- **Defeito aberto (child da AID-940):** o re-POST duplicar linhas no export é impossível sob `BlobsEventStore` (chave `dia/source/eventId`, `setJSON` idempotente) ⇒ o backing live é o fallback NDJSON `/tmp` (efêmero por instância) nas 2 superfícies — o "backing durável Blobs" da ativação AID-913 não está ativo em produção. Funil/privacidade não quebram (dedup na agregação + k≥5 fail-closed), mas há risco de perda de eventos por reciclagem de instância antes/durante O1.
- NDJSON bruto NUNCA é commitado; exports permanecem em `/tmp` (fora do repo).
