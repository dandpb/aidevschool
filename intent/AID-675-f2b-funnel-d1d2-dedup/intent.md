# Intent — AID-675 F2b: NDJSON→funil D1/D2 + dedup de eventId

Paperclip issue: AID-675 (T1 da ONDA OP-B-F23, ORDEM CEO AID-669/A → AID-673).
Owner: Founding Product Engineer (fa8130d5). This file quotes the dispatch; the
authoritative spec is the `spec` doc rev 1 on AID-673, §2 — one source of truth.

## Problem

O funil F2 existente (`learner/gate/analytics/aggregate_funnel.mjs`, AID-473/
AID-489/AID-492) cobre retenção R1/R7/R21 e ativação, mas não produz as métricas
D1 (split de trilha, conclusão por missão, friction, verificação, render) nem a
D2 (mediana por módulo) do doc `funil-op-b` (AID-639 §§1.1–1.2), e não deduplica
`eventId` — dívida explícita do ADR-0010 Consequências (corrida beacon+fetch).

## Outcome

Mesmo report estendido (`reportVersion` 1→2), delta aditivo: dedup por `eventId`
antes de qualquer corte + seções `trackEntrySplit`, `missionCompletion`,
`activityFriction`, `verificationHealth`, `rendererDegraded`,
`moduleCompletionMedian` (mapeamento missão→módulo lido do
`curriculum/ai-literacy/catalog.yaml` em runtime; catálogo ilegível ⇒ seção
`unavailable`, fail-closed). Transporte permanece OFF; zero evento novo;
analytics ≠ evidência.

## Constraints (anti-escopo hard da spec AID-673 §8)

- Não reescrever a ferramenta nem alterar contratos/testes existentes
  semanticamente (atualizações mecânicas de contagem de fixture são parte do
  contrato de regeneração byte-idêntica).
- k≥5 imutável; identificadores (installationId/sessionId/eventId) nunca
  publicados; NDJSON real nunca commitado (fixtures sintéticas only).
- Drift monitor e paridade intocados (ferramenta); nada toca learner
  state/gates/mastery; zero mudança em ADR-0009/0010; catálogo é só leitura.

Aceite (spec AID-673 §2): `node --test learner/gate/tests/dojo_analytics_funnel_aggregation.test.mjs
learner/gate/tests/dojo_analytics_schema_drift_monitor.test.mjs` verde; examples
byte-idênticos; `cd engines/codexdojo-os-prototype && npm run test` verde; CI verde.
