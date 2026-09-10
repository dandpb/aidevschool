# Plan — F2 `2026-09-10-entry-brief-instrumentation` (registro de build)

> Transcrição canônica do doc `plan` rev `d5417460` da issue AID-1218, ACEITO pela ORDEM CEO AID-1245. O card canônico de plan (`36c7a792`) segue pendente como formalização founder/no-op. Este arquivo acompanha o PR de build (padrão AID-913).

# Plan — F2 `2026-09-10-entry-brief-instrumentation` (build FPE)

From: spec doc `spec` **rev `be088dfc`** (review-ready; input UX incorporado) · Plan lead: System Designer · Build: FPE (fa8130d5) · Countersign: QA (ca6a3f95)
Gates já vencidos: intent `accepted` no main (PR #320, merge `c33031ee5`) · input UX obrigatório entregue (AID-1223 doc `input-ux` rev `5bc1d804`; veredito: sem divergência estrutural) · go-signal CEO comentário `7813c494`.
Gate seguinte: `request_confirmation` da **spec** (`confirmation:AID-1218:spec:be088dfc-da26-4eb6-a816-f412405e5fab`) → **plan gate** (confirmação deste doc) → subtasks FPE → PR → countersign QA.

## 1. Entregas (por spec §2, ordem de dependência)

| # | Entrega | Arquivos ( literacyDojo=LD / codexdojo-os-prototype=OS ) | Depende de |
| --- | --- | --- | --- |
| P1 | Protocolo host-engine +2 nomes `mission-event` | `LD src/host/protocol.ts` (`EngineMissionEventName`), `LD src/host/validation.ts` (whitelist) | — |
| P2 | Emissores LD | `LD src/domain/analytics.ts` (+2 construtores fechados + prop opcional `entry`), `LD src/app/App.tsx` (entry_viewed na 1ª rota renderizada, qualquer destino de `resumeSession`), `LD src/screens/LessonScreen.tsx` (intro→`lesson_brief_viewed`; apresentação→`activity_presented` 1×/índice/sessão), `LD src/host/LiteracyMissionAdapter.ts` (forwarding), `LD src/application/useCases.ts` (portas se o player não emitir direto) | P1 |
| P3 | Receptor OS | `OS src/analytics/events.ts` (+`mission.brief_viewed`, `activity.presented` ao vocabulário fechado + `EVENT_VOCABULARIES`), `OS src/host/validation.ts` (whitelist `mission.event`), verificar forwarding genérico do `MissionShell`, fixtures/parity | P1 |
| P4 | Coletor | `learner/gate/netlify-functions/dojo-analytics-collector.mjs` — espelhar nomes/props nos 2 validadores; teste `collectorParity` estendido | P2, P3 |
| P5 | Agregação v4 | `learner/gate/analytics/aggregate_funnel.mjs`: `REPORT_VERSION` 3→4, +`activationDetail` (OS first-visit×returning por prop `entry`/`journey.returned`), +`briefExposure` (segmentos R3, bins, medianas contínuas (b)/(c), nota-canário do resíduo, linhas de glossário R1/R3/R4), classificação `probe.` determinística + lista legada; `schema_drift_monitor.mjs` aceita vocabulário estendido; fixtures sintéticas + exemplo regenerado; LEITURA_FUNIL_OPB atualizada | P4 |
| P6 | Documentos | Emendas ADR-0009 (eventos de exposição + prop `entry`) e ADR-0010 (convenção `probe.`); `intent/2026-09-10-entry-brief-instrumentation/spec.md` + `plan.md` no PR de build (padrão AID-913); nota de cobertura voxelDojo no report | P5 |

## 2. Invariantes de implementação (spec R6 — travados por teste)

- Envelopes OS v1 / literacy v2 / surfaces v3 existentes válidos **byte-a-byte** (schemas e validadores só ganham casos aditivos).
- Prop `entry` **opcional**: ausência continua válida (retro-compat); envelopes pré-v4 lidos como "não instrumentado (pré-v4)" na leitura, nunca rejeitados.
- Sink literacy v2 **noop em missão hospedada permanece** (`LD services.ts:78-86`): os novos eventos chegam ao funil OS somente via protocolo host-engine → `MissionShell` — sem segunda via de emissão (duplicação impossível por construção).
- Dedup `<dia>/<eventId>` e retention 90d intocados; zero PII (só enums/inteiros/booleans/UUIDs pseudônimos); tracker O1 intocado (AID-909).
- `activity_presented`: 1 emissão por (sessão, índice absoluto da lição); re-render/retry/retomada não reemitem índices já apresentados na sessão.

## 3. Provas (por entrega, mapeadas a R7)

1. **P1–P3:** unit LD/OS — construtores fechados, whitelist aceita os 2 novos nomes e rejeita fora do vocabulário; fixture de missão hospedada emitindo `mission.brief_viewed`+`activity.presented` no shell; teste de paridade emissor↔receptor estendido.
2. **P2:** teste de sessão retomada pós-reload (`resumeSession`→lesson) emite `entry_viewed` com `entry:"lesson-resume"` exatamente 1×; rota `home` e onboarding idem; intro renderiza → `lesson_brief_viewed` 1×; navegação p/ índice i → `activity_presented` 1× (2ª exposição do mesmo índice na sessão = 0 emissões).
3. **P4:** `collectorParity` verde com os novos nomes/props nos 2 validadores; envelope sem `entry` continua aceito.
4. **P5 (R7d, prova-chave da série histórica):** replay do export real da janela 09-06→09-10 no agregador v4 reproduz **todas as seções v3 com valores idênticos** ao relatório QA AID-1212; seções novas (`activationDetail`/`briefExposure`) calculadas sobre o mesmo replay (células com n<5 suprimidas e declaradas). Fixtures sintéticas cobrem os 3 valores de `entry`, os 4 bins, os 2 segmentos + resíduo-canário, e sondas `probe.`/legadas.
5. **P6:** emendas ADR passam o lint de docs; diff do PR de build contém spec.md/plan.md sob `intent/2026-09-10-entry-brief-instrumentation/`.
6. **Countersign QA (ca6a3f95):** verificação independente das provas 1–5 + inspeção zero-PII (padrão Anexo B) antes do merge.

## 4. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Re-emissão em re-render/retomada (infla `activity_presented`) | Emissão por (sessão, índice) com guarda no player; fixture dedicada (prova 2); QA verifica |
| Vocabulário OS fechado — emenda exige ADR formal | Emenda ADR-0009 faz parte da entrega P6 (mesmo PR), não follow-up |
| Quebra da série histórica v3 | R7d como prova-chave de merge (replay 09-06→09-10 idêntico); nenhuma seção v3 editada, só seções novas |
| Custo das medianas contínuas (b)/(c) | Fallback declarado na spec R3: se estourar o teto da triagem AID-1215 §1.2, mediana é o 1º item cortado — decidir no plan gate, não no meio do build |
| k≥5 suprime seções novas nas 1ªs janelas (n=6+3) | Esperado e declarado no report; não enfraquecer k |

## 5. Fora de escopo (spec §6)

Superfícies v3; UI/fluxo de ativação F1; streak F3; retrofit l08–l13; eventos como evidência O1; mudanças de contrato do coletor além de vocabulário aditivo.
