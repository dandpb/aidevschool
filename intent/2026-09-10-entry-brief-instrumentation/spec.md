# Spec — F2 `2026-09-10-entry-brief-instrumentation` (registro de build)

> Transcrição canônica do doc `spec` rev `be088dfc` da issue AID-1218 (lead System Designer; input UX AID-1223 rev `5bc1d804` incorporado). O card canônico de spec (`ffe1137a`) segue pendente como formalização founder/no-op (ORDEM AID-1245). Este arquivo acompanha o PR de build (padrão AID-913).

# Spec — F2 `2026-09-10-entry-brief-instrumentation`: instrumentar entrada, brief e exposição à 1ª atividade

Change-id: `2026-09-10-entry-brief-instrumentation` · From: intent **aceito e registrado no main** (PR #320 merge `c33031ee5`, commit `14e94816`, status `accepted`) · Status: **review-ready** (input UX obrigatório recebido e incorporado; aguardando `request_confirmation` do owner)
Author: System Designer (lead da spec) · Colaboração obrigatória: UX Designer (0bfa47c1, autor do draft) — **entregue** via AID-1223 doc `input-ux` rev `5bc1d804`, relay verbatim no comentário `48122a09`, aceito pelo CEO no comentário `7813c494` · Build: FPE (fa8130d5) · Countersign: QA (ca6a3f95)
Base verificada first-hand: main `e839d0fc` (clone read-only; HEAD atual `c33031e` = merge docs-only do intent, sem impacto no inventário) + relatório QA AID-1212 doc `measurement` rev `8a86b1e0` + decisão CEO AID-1216 + triagem SM AID-1215 rev `9040fe6b` §1.2/§4-B1 + input UX AID-1223 (verificação first-hand do UX em `LessonScreen.tsx:216-279`, `useCases.ts:260-268`, `App.tsx:58-67`).

---

## 0. Inventário de evidência (o que existe hoje, verificado no código)

| Fato | Fonte (main `e839d0fc`) |
| --- | --- |
| Vocabulário OS v1 fechado com 12 eventos; dims enriquecidas `installationId`+`sessionId`+contexto; `eventId` = string 1..128 (`event-<uuid>` na emissão real) | `engines/codexdojo-os-prototype/src/analytics/events.ts` (+`collector.ts:52,87`) |
| Missões hospedadas: engine publica `mission-event` (nomes fechados no protocolo) → `MissionShell` reemite como evento OS v1 com contexto | `src/host/protocol.ts:17-23`, `src/host/validation.ts:90-112`, `src/host/MissionShell.tsx:165-179` |
| Literacy v2: sink **noop em missão hospedada** — o OS é a única fonte das missões hospedadas; duplicação impossível por construção | `engines/literacyDojo/src/app/services.ts:78-86` |
| Gap entrada literacy: `entry_viewed` só na rota `home` — retomada pós-reload de lição em andamento (`resumeSession` → kind "lesson") e onboarding **não emitem** (2/3 sessões do 1º relatório) | `src/app/App.tsx:158-183`, `src/application/useCases.ts:482-490`; relatório §4/§8.4 |
| Gap exposição: entre `mission.started`/`lesson_started` e a 1ª submissão não existe evento — intro da lição (fase `"intro"` do player) e apresentação de atividade são invisíveis | `src/screens/LessonScreen.tsx:211-221`, `src/host/LiteracyMissionAdapter.ts:154-166` |
| Coletor aceita OS v1 + literacy v2 + surfaces v3 com paridade travada por teste; dedup idempotente por `<dia>/<eventId>`; retention 90d | `learner/gate/netlify-functions/dojo-analytics-collector.mjs` |
| Agregação reportVersion 3: funil ativação OS (onboarding.started→completed→mission.started→mission.completed) + `literacyFunnel` (entry_viewed→lesson_started→activity_attempted→lesson_completed), k≥5, dedup, cortes D1/D2 | `learner/gate/analytics/aggregate_funnel.mjs:46,58-69,609-615` |
| `journey.returned`: emitido no load quando já há progresso; 4/6 sessões OS do 1º relatório são retorno — o funil raso de onboarding não as segmenta | `src/journey/useJourneyController.ts:76-79`; relatório §3/§8.4 |
| Sondas usam eventIds não-UUID sem convenção formal (prefixos `aid###` informais) | relatório §8.5; `SAFE_IDENTIFIER` em `events.ts:111` |
| **(UX, verificação first-hand)** A intro da lição É o brief na visão do aprendiz: fase `"intro"` renderiza o framing de missão (eyebrow `MISSÃO DA VILA`, card **"Pedido da Vila Lume"**, ciclo Entender→Escolher→Conferir→Aplicar, CTA "Começar missão"); em missão hospedada não há tela de brief do host antes dela; `resumeSession()` retorna exatamente 3 destinos {onboarding, lesson, home} | input UX AID-1223: `LessonScreen.tsx:216-279`, `useCases.ts:260-268`, `App.tsx:58-67` |

## 1. Requirements (cada open question do intent é respondida)

- **R1 (outcome a — entrada 100%).** Toda sessão interativa das 2 superfícies tem exatamente 1 evento de entrada por page load. OS: já atendido (`onboarding.started` ∨ `journey.returned`; relatório §3 entrada=100%) — sem mudança de emissão. Literacy: `entry_viewed` passa a ser emitido na **primeira rota renderizada**, qualquer que seja, com nova prop **opcional** `entry` ∈ {`home`,`lesson-resume`,`onboarding`} (prop ausente em envelopes antigos continua válida ⇒ aditivo retro-compat). **Glossário do report v4 (binding):** "`lesson-resume` = retomada pós-reload de lição em andamento (chamado de 'deep-link' no relatório da janela 09-06→09-10)" — mantém as séries cross-referenciáveis sem reescrever história; o termo "deep-link" fica aposentado no vocabulário novo (não existe roteamento por URL por lição no literacy app — o mecanismo real é retomada por estado). Prop `entry` ausente em envelopes **pré-v4** = "**não instrumentado (pré-v4)**", nunca "unknown" (senão a série antiga parece ruído de dado).
- **R2 (open question 1 — conjunto mínimo de eventos).** Exatamente **2 nomes novos** de exposição, espelhados nos dois envelopes:
  - literacy v2: `lesson_brief_viewed` {lessonId, lessonVersion} — fase intro renderizada; `activity_presented` {lessonId, activityType, activityIndex≥0} — atividade do índice i tornada visível pela 1ª vez na sessão (1 emissão por índice; re-render/retry não reemitem).
  - OS v1 (via protocolo host-engine `mission-event` estendido): `mission.brief_viewed` (sem dims além do contexto enriquecido) e `activity.presented` {activityType} — nomes dotted do vocabulário OS.
  - Nada além disso: sem evento de "scroll", "focus", "exit" — o abandono é inferido por ausência de submissão + dwell (bins), não por evento de saída (pagehide não é confiável e infla o envelope).
- **R3 (outcome b — segmentação F1).** A agregação passa a segmentar, por sessão: **"saiu no brief"** = `started` ∧ `brief_viewed` ∧ ¬`activity_presented`; **"saiu na 1ª atividade"** = `activity_presented`(índice 0) ∧ ¬1ª submissão; com dwell (`started→brief`, `brief→1ª apresentação`, `apresentação→1ª submissão`) em bins {`<15s`,`15-60s`,`1-5min`,`>5min`}. **Glossário do report v4 (binding, input UX Q1):** os rótulos medem **comportamento observado (exposição)**, não leitura nem compreensão — o gloss de "saiu no brief" é "**viu o brief e não chegou à 1ª atividade**" (nunca "leu o brief e saiu"); "saiu na 1ª atividade" não é glosado como "não entendeu o que fazer" — essa é exatamente a hipótese F1 que os eventos + sessões O1 vão testar. **Resíduo declarado:** a categorização é exaustiva exceto `started ∧ ¬brief_viewed` (esperado ~0, pois a intro renderiza junto com o started); o report v4 o declara como **nota de qualidade de dados (canário de defeito de emissão se crescer)**, não como segmento de aprendiz. **Medianas contínuas (decisão SD, input UX Q2):** a seção nova publica também a mediana contínua de (b) brief→1ª apresentação e (c) apresentação→1ª submissão por segmento (mesma regra k≥5), para comparabilidade direcional com o tempo contínuo do scorecard O1 (AID-641 §3); (a) started→brief será ~100% <15s por construção (nota de uso no report). Fallback declarado: se o custo de build exceder o teto de esforço da triagem (AID-1215 §1.2), a mediana contínua é o **primeiro item a cair**, registrado no plan — os bins são o compromisso.
- **R4 (open question 2 — série histórica).** `REPORT_VERSION` 3→**4**: todas as seções existentes do v3 permanecem com definição e números idênticos para o mesmo input (linha de base do 1º relatório comparável); as novas informações vivem em seções **novas** (`activationDetail` OS por tipo de entrada first-visit/returning; `briefExposure` literacy). Nenhum estágio novo é inserido nas listas existentes. O report v4 inclui as linhas de glossário de R1/R3 e declara o mapeamento para os artefatos de pesquisa O1: estes referem a tela pelo **nome visível ao aprendiz ("Pedido da Vila Lume")**, com o mapeamento analítico (`brief`/`lesson_brief_viewed` ↔ intro/"Pedido da Vila Lume") declarado no relatório ("brief" é vocabulário de analista — o aprendiz nunca vê essa palavra).
- **R5 (open question 3 — prefixo de sonda, §8.5).** Emenda ao ADR-0010: tráfego sintético/verificação usa identificadores com prefixo `probe.` (ex.: `probe.qa.a958-watchdog`); produção mantém `installation-`/`session-`/`event-` + UUID. A agregação classifica tier sintético **deterministicamente** por prefixo `probe.` + lista legada de marcadores conhecidos (elimina inferência por timing onde há marcador). O coletor NÃO passa a rejeitar eventIds não-UUID não-prefixados (retro-compat); o drift monitor reporta contagem de non-UUID como diagnóstico sem falhar.
- **R6 (restrições inegociáveis).** Vocabulário aditivo: envelopes OS v1 / literacy v2 / surfaces v3 existentes continuam válidos byte-a-byte; dedup e retention 90d intactos; zero PII (só enums/inteiros/booleans/UUIDs pseudônimos — ADR-0009/0010); analytics ≠ evidência de funil O1 (regra AID-909 — novos eventos não entram no tracker; bins/medianas são comparabilidade direcional, nunca medida de participante); producer ≠ verificador (countersign QA ca6a3f95).
- **R7 (aceite observável).** No próximo relatório QA em janela acordada: (a) 100% das sessões interativas com evento de entrada; (b) segmentação brief×1ª atividade publicada com o glossário comportamental de R3 (k≥5 pode suprimir células com n pequeno — declarado, não é falha); (c) auditoria zero-PII por inspeção como no Anexo B do 1º relatório; (d) replay do export da janela 09-06→09-10 no agregador v4 reproduz as seções v3 com valores idênticos.

## 2. Design (mapeamento no repo — insumo para o plan do FPE)

1. **Emissores literacy** (`engines/literacyDojo/src/`): `domain/analytics.ts` (+2 construtores fechados, +prop opcional `entry`), `app/App.tsx` (entry_viewed na 1ª rota qualquer), `screens/LessonScreen.tsx` (emissão intro/apresentação — standalone via v2 sink; hospedado via adapter), `host/LiteracyMissionAdapter.ts` + `host/protocol.ts` (+2 nomes `mission-event`), `application/useCases.ts` (portas de emissão se o player não emitir direto).
2. **Receptor OS** (`engines/codexdojo-os-prototype/src/`): `analytics/events.ts` (+2 nomes ao vocabulário fechado e `EVENT_VOCABULARIES`), `host/validation.ts` (whitelist `mission.event`), `MissionShell` forwarding já é genérico (verificar), fixtures/parity.
3. **Coletor** (`learner/gate/netlify-functions/dojo-analytics-collector.mjs`): espelhar os novos nomes/props nos 2 validadores (paridade travada por teste — `collectorParity`).
4. **Leitura** (`learner/gate/analytics/`): `aggregate_funnel.mjs` v4 (+`activationDetail`, +`briefExposure` com bins, medianas contínuas (b)/(c) e nota-canário do resíduo, classificação `probe.`, linhas de glossário), `schema_drift_monitor.mjs` aceita vocabulário estendido, fixtures sintéticas + exemplo regenerado, LEITURA_FUNIL_OPB atualizada.
5. **Documentos**: emendas ADR-0009 (eventos de exposição + prop `entry`) e ADR-0010 (convenção `probe.`); `intent/2026-09-10-entry-brief-instrumentation/` (intent.md no PR de abertura ✔ merge `c33031ee5`; spec.md/plan.md no PR de build — padrão AID-913).
6. **Sem mudança**: envelopes surfaces v3, coletor de contratos (dedup/retention/export), tracker O1 (AID-909), substrate/learner state, UI de ativação (F1).

## 3. Policy applied

- `intent/README.md` (cadeia intent→spec→plan; status `accepted` registrado no main via PR #320 — Passo 0 fechado); `docs/sdlc/README.md` + templates.
- ADR-0009 (fronteira de privacidade inviolável; vocabulário fechado; emenda formal para extensão), ADR-0010 (coletor; paridade emissor↔receptor travada por teste).
- Regras do tracker AID-909 (analytics não conta participantes O1); producer≠verificador (countersign QA por PR).
- Engine AGENTS: literacy (sink noop hospedado preservado; sem `mastered`; sem texto livre), OS (vocabulário fechado; contexto enriquecido).
- Triagem SM AID-1215 §1 item 2 (gaps menores → teto de esforço: esta spec define o conjunto mínimo = 2 eventos + 1 prop opcional; nada de evento de saída/scroll/focus).

## 4. Perguntas ao UX (colaboração obrigatória) — **RESPONDIDAS** (AID-1223, input aceito)

1. **Rótulos da segmentação (R3): SIM** — cobrem o vocabulário F1 ("saiu no brief" ↔ "nunca viu a 1ª atividade"; "saiu na 1ª atividade" ↔ "viu a atividade e não submeteu"; ≥1 submissão já medido). A intro É o brief na visão do aprendiz (verificado first-hand; espelho `lesson_brief_viewed`↔`mission.brief_viewed` coerente). Ressalvas incorporadas em R3/R4: exposição ≠ leitura (gloss comportamental); resíduo como canário de qualidade; artefatos O1 usam o nome visível "Pedido da Vila Lume".
2. **Bins de dwell: SIM para o 1º corte** — cobrem a linha de base (abandonos <1min em 15-60s; conclusões 130s/316s em 1-5min/>5min); granularidade fina vive no scorecard O1; n minúsculo + k≥5 pune mais bins. Mediana contínua de (b)/(c) aceita como aditivo (decisão SD em R3, com fallback declarado).
3. **Prop `entry` {home, lesson-resume, onboarding}: conjunto correto** — mapeia 1:1 com `resumeSession()` (verificado); "deep-link" aposentado com linha de glossário cross-referenciada (R1); prop ausente pré-v4 = "não instrumentado (pré-v4)" (R1).

**Veredito UX:** nenhuma divergência que exija mudar §1/§3; ressalvas estritamente aditivas de glossário/relatório — incorporadas nesta revisão. Input: AID-1223 doc `input-ux` rev `5bc1d804` / comentário `48122a09`.

## 5. Flagged concerns

- **Re-emissão em re-render/retomada:** `activity_presented` é por (sessão, índice) — retomar no meio da lição emite só o índice retomado (ordinal absoluto da lição). Owner: FPE no plan; QA verifica com fixture.
- **k≥5 com n pequeno:** as seções novas podem sair suprimidas nas primeiras janelas (n=6+3). Esperado e declarado — não enfraquecer k. Owner: QA (relatório).
- **Cobertura voxelDojo:** engines voxel não emitem os novos eventos nesta onda (bounded context); a segmentação OS vale para `engineId=literacyDojo` e o report declara cobertura. Adoção voxel = follow-up data-gated. Owner: SD agenda.
- **Prefixo `probe.` é convenção + classificação, não validação:** sondas legadas sem prefixo continuam aceitas (retro-compat) e classificadas pela lista legada. Owner: QA na próxima onda de sondas.
- **Custo das medianas contínuas:** derivadas dos mesmos timestamps dos bins, mas se o custo de build estourar o teto da triagem, a mediana é o primeiro item cortado (bins são o compromisso) — decisão registrada no plan gate. Owner: FPE avalia, SD decide no gate.

## 6. Out of scope

Superfícies v3 (dojoToday/voxelDojo/pixelquest); mudanças de UI/fluxo de ativação (F1, gated a Design pós-O1); streak/retorno (F3, gated O1); retrofit l08–l13 (O3-C2); qualquer uso dos eventos como evidência de funil O1; mudanças de contrato do coletor além de vocabulário aditivo.
