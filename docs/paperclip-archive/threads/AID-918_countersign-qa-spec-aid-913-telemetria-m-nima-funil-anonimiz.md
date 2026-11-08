# AID-918: Countersign QA — spec AID-913: telemetria mínima + funil anonimizado nas 2 journeys live (GO/NO-GO antes da implementação)

- **Status:** done | **Priority:** critical | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-06T13:13:22.98776+00:00 | **Updated:** 2026-11-01T14:15:51.905+00:00
- **ID:** `057c8c6f-fb85-4547-a966-e06e26f0ec1c`

## Description

Countersign QA da spec AID-913 (ORDEM AID-910/D: telemetria mínima de uso real + funil anonimizado nas 2 journeys live, antes do fechamento da janela O1 ~09-23).

**Documento:** spec (rev. 1, `3a716ea8-7ce6-48c8-b4bf-21bdc9ec5e8a`) anexado à issue pai AID-913.

## Checklist de countersign (responder GO / NO-GO com findings)

1. **Fronteira de privacidade**: eventos literacy v2 (`entry_viewed`, `lesson_started`, `activity_attempted`, `lesson_completed`) com `sessionId` efêmero em memória + `eventId`; sem PII, sem texto livre, sem `mastered`; OS vocabulário intocado.
2. **Ativação**: ADR-0010 §4 — a ordem CEO AID-910/D como decisão de ativação; `VITE_ANALYTICS_ENDPOINT` somente nos 2 netlify.toml (same-origin); invariante de teste atualizada fail-closed.
3. **Recepção**: coletor estendido aos envelopes OS v1 + literacy v2 com teste de paridade; rota nova no literacy netlify.toml.
4. **Backing durável**: Netlify Blobs (`set(dia/eventId)` idempotente) + export GET com Bearer token de deploy (segredo fora do repo); fallback /tmp para testes. Tradeoffs declarados aceitáveis?
5. **Leitura**: seção `literacyFunnel` no aggregate_funnel (k≥5 imutável); fixtures sintéticas; LEITURA_FUNIL_OPB.md atualizado.
6. **Copy de privacidade**: literacy `/privacidade` + `/termos` (anexo ADR-0010, ajustado a sessionId-only) + página mínima `/privacidade` no OS (installationId persistido exige aviso).
7. **Verificação**: probe executável (coletor→export→drift→agregação) como evidência central; suites dos 2 engines + e2e/smoke; smoke pós-deploy antes da 1ª sessão.

## Regras
- Emissão/testes só começam após seu GO nesta spec (fluxo vigente: spec → countersign QA → PR → merge CEO).
- Prazo alvo para GO: **2026-09-07** (deploy alvo ~09-09 antes da 1ª sessão O1).
- NO-GO: liste findings por número do checklist; a spec é corrigida e re-contersignada.

Fecha como `done` com o veredito GO/NO-GO no comentário final.

## Document `Continuation Summary` (2026-09-06)

# Continuation Summary

- Issue: AID-918 — Countersign QA — spec AID-913: telemetria mínima + funil anonimizado nas 2 journeys live (GO/NO-GO antes da implementação)
- Status: done
- Priority: critical
- Current mode: review
- Last updated by run: 16171d3f-f827-4736-9bee-173de7d08856
- Agent: QA Lead (opencode_local)

## Objective

Countersign QA da spec AID-913 (ORDEM AID-910/D: telemetria mínima de uso real + funil anonimizado nas 2 journeys live, antes do fechamento da janela O1 ~09-23).

**Documento:** spec (rev. 1, `3a716ea8-7ce6-48c8-b4bf-21bdc9ec5e8a`) anexado à issue pai AID-913.

## Checklist de countersign (responder GO / NO-GO com findings)

1. **Fronteira de privacidade**: eventos literacy v2 (`entry_viewed`, `lesson_started`, `activity_attempted`, `lesson_completed`) com `sessionId` efêmero em memória + `eventId`; sem PII, sem texto livre, sem `mastered`; OS vocabulário intocado.
2. **Ativação**: ADR-0010 §4 — a ordem CEO AID-910/D como decisão de ativação; `VITE_ANALYTICS_ENDPOINT` somente nos 2 netlify.toml (same-origin); invariante de teste atualizada fail-closed.
3. **Recepção**: coletor estendido aos envelopes OS v1 + literacy v2 com teste de paridade; rota nova no literacy netlify.toml.
4. **Backing durável**: Netlify Blobs (`set(dia/eventId)` idempotente) + export GET com Bearer token de deploy (segredo fora do repo); fallback /tmp para testes. Tradeoffs declarados aceitáveis?
5. **Leitura**: seção `literacyFunnel` no aggregate_funnel (k≥5 imutável); fixtures sintéticas
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `16171d3f-f827-4736-9bee-173de7d08856` finished with status `succeeded` at 2026-09-06T13:20:04.674Z.
- Wake acknowledged: AID-918 é o countersign QA da **spec** AID-913 (GO/NO-GO pré-implementação, prazo 2026-09-07). Vou verificar a revisão da spec e ancorar cada item do checklist no código real antes do veredito.

Spec confirmada: rev. `3a716ea8` (rev 1, latest) — é o texto sob countersign. Agora, a ancoragem no repositório.

Engine AGENTS.md (literacy) carregado. Baseline do vocabulário v1 confirmado (`entry_viewed` no vocabulário; `lesson_started`/`activity_attempted` inexistentes). Agora OS, coletor, rotas e ADRs.

ADRs confirmados (0009 §2 exige emenda para sessionId; 0010 §4 pendente de ativação + anexo de copy existe). Últimos groundings: invariantes de teste, agregação, LEITURA, copy atual, OS installationId.

Grounding completo — todos os 7 itens do checklist verificados contra o código real. Veredito: **GO** com 7 achados não-bloqueantes para gate no PR. Publicando o countersign.

**AID-918: GO — issue fechada `done`** (dentro do prazo alvo 09-07).

- **Veredito GO** publicado no comentário final (id `2303aafc`): 7/7 itens do checklist GO, ancorados em código real (`main` @ `505e7a6c`) — vocabulário v1 e pontos de emissão do literacy, 12 eventos do OS i
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `16171d3f-f827-4736-9bee-173de7d08856` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-09-06T13:19:30.416206+00:00

**Veredito: GO** (countersign da spec AID-913, rev. `3a716ea8` — confirmada como `latestRevisionId` do doc `spec` na issue pai). Implementação desbloqueada. 7 achados não-bloqueantes (F1–F7) viram requisitos de verificação no PR; nenhum altera o desenho.

**Método:** leitura da spec rev. 1 + ancoragem executável no repo (`main` @ `505e7a6c`). Nada foi implementado ainda — este GO é pré-implementação por design (fluxo spec → countersign → PR). Evidência central do funnel (probe + smoke pós-deploy) será exigida no countersign de PR/live, conforme §7 da própria spec.

## Checklist — GO por item

1. **Fronteira de privacidade — GO.** Vocabulário v1 conferido em `engines/literacyDojo/src/domain/analytics.ts:20` (`entry_viewed` no vocabulário, zero instrumentação em `src/`; `lesson_started`/`activity_attempted` inexistentes = eventos novos; `lesson_completed` emitido em `src/application/useCases.ts:272`). sessionId efêmero + eventId via **emenda ADR-0009** é exatamente a forma pré-autorizada pelo §2 (ADRs só permitem identificador "efêmero, em memória, não persistido, mediante emenda"). Props primitivas ≤120 chars, construtores fechados, sem `mastered`. OS: 12 eventos conferidos no coletor e em `src/analytics/events.ts` — spec §2.2 não toca emissão.
2. **Ativação — GO.** ADR-0010 §4 (status "ativação pendente de decisão do board") é desbloqueado pela ordem CEO AID-910/D registrada na thread pai. Hoje **zero** superfícies definem `VITE_ANALYTICS_ENDPOINT` (grep repo-wide: só testes/docs com asserções de transporte OFF; invariantes vivos em `engines/literacyDojo/tests/app/services.analytics.test.ts` e `engines/codexdojo-os-prototype/src/app/createServices.analytics.test.ts`). A mudança para "somente os 2 netlify.toml, valor = redirect" mantém fail-closed.
3. **Recepção — GO.** Coletor atual aceita só envelope OS v1 (`learner/gate/netlify-functions/dojo-analytics-collector.mjs`; literacy receberia 422 `unsupported-schema` — confirmado em código e no LEITURA_FUNIL_OPB). Extensão a 2 envelopes + teste de paridade é o caminho correto; rota analytics existe no OS netlify.toml e **não existe** no literacy (a criar). `build-pilot-bundle.mjs:23` stageia o coletor canônico → v2 propaga ao site OS automaticamente.
4. **Backing durável — GO (tradeoffs aceitáveis).** Hoje: NDJSON `/tmp` efêmero com prune 90d, sem export, sem Blobs (grep: zero ocorrências de Blobs/token no repo). `set(dia/eventId)` idempotente resolve dedup na recepção (hoje só na agregação, `aggregate_funnel.mjs` source) e a corrida beacon+fetch (ADR-0010 "Consequências"). Token como segredo de deploy fora do repo ✓. Escala O1 (dezenas de KB/dia) torna consistência eventual/custo GB irrelevantes.
5. **Leitura — GO.** `aggregate_funnel.mjs:55` `DEFAULT_K_MINIMUM = 5` com supressão `n < k` e k inválido lançando (fail-closed) — k≥5 imutável preservado. `schema_drift_monitor.mjs` hoje só envelope OS v1 → extensão necessária e prevista. Fixtures dir existe. `LEITURA_FUNIL_OPB.md` passo 1 hoje é "copiar do backing" → update alvo confirmado.
6. **Copy de privacidade — GO.** Anexo do ADR-0010 existe (linhas 84–102) e diz "aplicar somente quando o board ativar" — condição desta ordem. `engines/literacyDojo/public/privacidade.html`/`termos.html` existem **sem** seção de telemetria (grep vazio) — adição bem-definida. OS não tem `/privacidade` (só cópia dist do literacy no bundle) e persiste `installationId` em localStorage (`src/analytics/collector.ts:24-32`) → página mínima é exigível.
7. **Verificação — GO.** Probe executável coletor→export→drift→agregação como evidência central é o desenho correto (produtor não verifica o próprio trabalho — o probe roda contra o handler independente do emissor). Suites âncora existem (`learner/gate/tests/dojo_analytics_collector_netlify.test.mjs`, OS `collectorParity.test.ts`, comandos lint/test/build/e2e/smoke nos AGENTS dos engines). Smoke pós-deploy antes da 1ª sessão O1 permanece gate obrigatório.

## Findings (não-bloqueantes — gate no PR)

- **F1 (item 1):** a emenda ADR-0009 deve explicitar que supersede o limite "eventos futuros entram um a um, não em lote" (§1) para esta fatia (2 eventos novos + instrumentação de `entry_viewed`); `hint_requested` permanece fora ✓.
- **F2 (item 1):** `activityType` deve ser enum fechado validado nos dois lados (espelhar `ACTIVITY_TYPES` do OS); teste de paridade deve rejeitar valor desconhecido.
- **F3 (item 2, nit):** citação "ADR-463 §3.0" refere-se ao **draft AID-463** (board), não a um ADR; k≥5 está codificado em ADR-0010 §3 e no código. Corrigir citação na spec ou no PR.
- **F4 (item 3):** o redirect novo no literacy netlify.toml deve vir **antes** do fallback `/*` (first-match-wins); smoke pós-deploy deve bater na rota real nos 2 sites.
- **F5 (item 4):** comportamento real do Blobs default-store em function só é provável pós-deploy — §7.4 é gate duro; export não deve adicionar headers CORS; `sec-fetch-site` same-origin aplica-se só ao POST de ingestão (GET operador isento, como a spec diz).
- **F6 (item 6):** copy literacy sessionId-only deve também **remover** a frase do anexo "Apagar os dados do site remove o identificador de instalação" (não há installationId no literacy); página do OS linkada do onboarding.
- **F7 (item 5):** sessionId do literacy é por page-load — reload divide a sessão; aceitável na escala O1, mas o LEITURA deve registrar para o facilitador não ler funil dividido como drop-off.

## Limitações explícitas

- GO é da **spec** (rev. `3a716ea8`); nenhuma verificação de implementação foi possível/executada porque ela ainda não existe. Merge continua condicionado a: CI verde + probe + suites dos 2 engines + e2e/smoke no PR, e countersign final do funnel live pós-deploy antes do `done` da AID-913 (já previsto na spec §9).
- Plataforma Netlify (Blobs, ordem de redirects em produção) não é verificável deste ambiente; coberta por F4/F5 + smoke §7.4.

**Disposição:** `done` — GO emitido dentro do prazo alvo (09-07). Implementação (AID-913) desbloqueada.

---

