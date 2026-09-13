# AID-1583 — Auditoria da instrumentação de aprendizagem (2026-09-12)

Dono: Learner Analytics Engineer (AID-1583, onboarding; parent AID-1580).
Escopo: superfícies de aprendizagem live (literacyDojo standalone + host OS,
dojoToday, voxelDojo, PixelQuest) e o pipeline de telemetria
(coletor → drift monitor → agregação). Fronteiras canônicas: ADR-0009
(analytics ≠ evidência; vocabulário fechado) e ADR-0010 (coletor
same-origin; k≥5 imutável, AID-463 §3.0). Toda linha abaixo cita
arquivo:linha ou artefato verificável no repo (`main` @ `2bdbcb12`,
docs em `6ec26544`).

## 1. Inventário — o que existe e funciona

### 1.1 Coletor same-origin (live desde AID-913, 2026-09-06)

| Item | Evidência |
| --- | --- |
| Rota única `/__dojo/bridge/v1/analytics` aceita os 3 envelopes (OS v1, literacy v2, surfaces v3) | `learner/gate/netlify-functions/dojo-analytics-collector.mjs:14-36` |
| Dedup por `eventId`; NDJSON day-rotated `events-YYYY-MM-DD.ndjson`; retenção 90d | mesmo arquivo; ADR-0010 |
| Backing durável (Blobs) e export corrigidos | fixes AID-947 e AID-961 registrados em `dojo-analytics-collector.mjs:19-36` |
| Export autenticado por `ANALYTICS_EXPORT_TOKEN` (segredo de deploy, fora do repo) | `docs/piloto/LEITURA_FUNIL_OPB.md:50-58` |

### 1.2 Emissores por superfície (quem emite o quê, hoje)

| Superfície | Envelope | Eventos | Emissão (file:line) | Deploy com endpoint |
| --- | --- | --- | --- | --- |
| codexdojo-os-prototype (host) | OS v1 | 14 nomes fechados (12 originais + `mission.brief_viewed`/`activity.presented` F2) | `engines/codexdojo-os-prototype/src/analytics/events.ts:1-10`; emissores em `src/journey/useJourneyController.ts`, `src/host/MissionShell.tsx`, `src/mentor/*` | Sim — `engines/codexdojo-os-prototype/netlify.toml:18` |
| literacyDojo (standalone + missão hospedada) | literacy v2 | 10 nomes: `entry_viewed`, `mapa_inicial_done`, `route_chosen`, `lesson_started`, `activity_attempted`, `lesson_completed`, `review_started`, `review_completed`, `lesson_brief_viewed`, `activity_presented` | `engines/literacyDojo/src/domain/analytics.ts:28-38,76-87`; batch sink `src/adapters/analyticsBatchSink.ts` | Sim — `engines/literacyDojo/netlify.toml:13` |
| dojoToday | surfaces v3 | 1: `daily-view-open` | `engines/dojoToday/src/main.ts:401` | Sim — `engines/dojoToday/netlify.toml:20` |
| voxelDojo (jogos) | surfaces v3 | `voxel-loop-complete`, `evidence-handoff` (piggyback no transporte de evidência) | `engines/shared/teaching-evidence/evidenceTransport.ts:51-56` via `dualEmit`; fábrica `engines/voxelDojo/shared/createEmitForGame.ts` | Parcial — só `engines/voxelDojo/game-02-warehouse/netlify.toml:18` |
| PixelQuest | surfaces v3 | `pixelquest-encounter-complete`, `evidence-handoff` | `engines/pixelDojo/pixel-quest/src/game/evidence/emitter.ts` (usa `dualEmit`) | **Não** — nenhum `netlify.toml` em `engines/pixelDojo/` (varredura 2026-09-12) |
| miniTown (Level 0) | — | nenhum | — | Sem `VITE_ANALYTICS_ENDPOINT` em `engines/miniTown/netlify.toml` |

### 1.3 Consumo offline (agregação + drift)

| Item | Evidência |
| --- | --- |
| `aggregate_funnel.mjs` reportVersion 4, 18 seções (`activationFunnel`, `retention` narrow/wide, `trackEntrySplit`, `missionCompletion`, `activityFriction`, `verificationHealth`, `rendererDegraded`, `moduleCompletionMedian`, `literacyFunnel`, `glossary`, `activationDetail`, `briefExposure`, `probeClassification`) + `surfacesFunnel` condicional (AID-1525) | `learner/gate/analytics/aggregate_funnel.mjs` (1720 linhas); seções listadas em `learner/gate/tests/fixtures/analytics/example-funnel-report.json` (chaves top-level) |
| `schema_drift_monitor.mjs` (monitorVersion 2+): exit 1 em drift de vocabulário; classifica os 3 envelopes | `learner/gate/analytics/schema_drift_monitor.mjs`; uso em `docs/piloto/LEITURA_FUNIL_OPB.md:66-71` |
| 13 suites `.mjs` de analytics no CI (job codexdojo-os), incl. surfaces_v3 (AID-1547) e parity produtor↔coletor | `.github/workflows/ci.yml:225-250`; suites em `learner/gate/tests/dojo_analytics_*.test.mjs` |
| k≥5 imutável; identificadores (`installationId`/`sessionId`/`eventId`) nunca publicados; fixtures 100% sintéticas | `learner/gate/analytics/README.md:9-17`; travado por teste (countersign PR #355) |
| Procedimento operacional de leitura (export → drift → agregar → interpretar) | `docs/piloto/LEITURA_FUNIL_OPB.md` |

## 2. Lacunas — o que falta e onde quebra

Numeradas para referência cruzada no plano e em follow-ups. Severidade é
relativa à janela O1 (n=5–8 até ~09-23; ADR-0009:160-162).

| # | Lacuna | Evidência | Impacto O1 |
| --- | --- | --- | --- |
| G1 | PixelQuest tem emissor surfaces v3 mas **não há deploy** com o endpoint → fonte `pixelquest` nunca chega ao coletor | §1.2 (nenhum netlify.toml) | Nulo (surface fora do escopo O1); torna `surfacesFunnel` incapaz de reportar essa fonte |
| G2 | voxelDojo: **1 de N** jogos com endpoint (`game-02-warehouse`) | §1.2 | Nulo em O1; cobertura enviesada pós-O1 |
| G3 | dojoToday emite **só o 1º passo** do funil dev (`daily-view-open`); nenhum evento de engajamento/retorno | `engines/dojoToday/src/main.ts:401` (único emit) | Funil dev = 1 degrau; não mede CTA/retorno |
| G4 | miniTown (Level 0) sem telemetria | §1.2 | Entrada do público leigo não aparece no funil |
| G5 | `briefExposure.hostedMissions` cobre só `engineId=literacyDojo` (voxelDojo não emite brief nesta onda) | `docs/piloto/LEITURA_FUNIL_OPB.md:103` | Já documentado como follow-up |
| G6 | **k≥5 × n=5–8**: toda célula agregada fica suprimida (só `n` publicado). Valor da janela = dry-run do pipeline + evidência manual (ficha P6), não métricas de funil | `docs/piloto/LEITURA_FUNIL_OPB.md:39-44` | Desenho do plano (§3 do plano de medição) |
| G7 | **Última leitura de funil = 2026-09-06** (`_work-products/AID-940/funil-2026-09-06.md`: 3 eventos aceitos, todas as células suprimidas, baseline zero). 6 dias sem export durante a janela O1 | work product AID-940 (único `funil-*` em `_work-products/`) | Risco de descobrir quebra de pipeline só no fechamento (~09-23) |
| G8 | literacy standalone usa `sessionId` efêmero por page load, **sem installationId** → retenção cross-dia do literacy standalone não é mensurável pelo pipeline (retenção OS usa `installationId` do envelope v1) | ADR-0009 emenda AID-913 (`docs/design/adr/0009-product-analytics.md:160-176`); reload = 2 sessões (`LEITURA_FUNIL_OPB.md:34-38`) | Retenção O1 do literacy depende da ficha manual |

## 3. Veredito da auditoria

O pipeline (coleta → dedup → drift → agregação k-anon) está **completo,
testado em CI e ativado nas 2 journeys live** — não falta infra para medir
O1. As lacunas reais para a janela são operacionais (G7: cadência de
leitura) e de escala (G6/G8: k-anonimato e sessão efêmera), ambas
endereçáveis sem mudar código: cadência de export + ficha manual como
evidência primária em n<5. G1–G5 são dívidas de cobertura pós-O1 com dono
natural (dono da engine, via issue conjunta de telemetria — boundary do
meu papel).

Follow-ups sugeridos (fora do escopo AID-1583): cobertura de emissão
(G1–G5) como issue conjunta com o dono da engine; decisão de board sobre
instalação anonimizada persistente no literacy (G8) via emenda ADR-0009 —
só se o funil futuro exigir retenção cross-dia do standalone.
