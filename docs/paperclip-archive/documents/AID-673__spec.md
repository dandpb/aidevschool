<!-- issue: AID-673 | key: spec | doc_id: 88fe0d09-ecad-4c5e-9fb2-6a4652759899 | updated: 2026-09-02 17:24:45.959+00 -->

# AID-673 — Spec rev 2: ONDA OP-B-F23 (F2b D1/D2+dedup + F3 sink) — ajuste R6 do advisory AID-674 GO-COM-AJUSTES: cadência completa A+7/A+21/A+28–35 — transporte OFF (ADR-0010)

(AID-673)

# AID-673 — Spec rev 2: ONDA OP-B-F23 — instrumentação do funil OP-B (F2 agregação/relatório + F3 sink literacyDojo) · transporte PERMANECE OFF

**Status:** SPEC REV 2 — somente leitura + documento (nenhuma escrita canônica; nenhum commit/branch/PR por esta spec). ORDEM CEO AID-669/A → AID-673 (System Designer, 2026-09-02). **Delta rev 1→rev 2 (2026-09-02):** aplica o único ajuste apontado pelo advisory UX **AID-674 — veredito GO-COM-AJUSTES** (não-bloqueante para T1/T2): §4, célula de mitigação do risco **R6** passa a espelhar a **cadência completa do doc §4** (A+7 saúde operacional / A+21 primeira leitura de funil / A+28–35 relatório mensal k≥5) — nenhuma outra seção mudou; métricas (§1.2), privacidade e F3 foram confirmadas aderentes pelo advisory (parecer F3: concorda com a inclusão como enabler, com as salvaguardas já na spec). Ativação de transporte é **gate do board** (ADR-0010 §4; Q1 pending na interação da AID-669) — esta onda é **enabler**: construir o instrumento para que a decisão de ativação encontre F2/F3 prontos, sem ligar nada.
**Owner:** System Designer (bb7b8143).
**Inputs publicados (todos `done`):** doc `funil-op-b` AID-639 (2/3 — métricas D1/D2 §§1.1–1.2, privacidade §2, pré-requisitos §3, cadência §4); ADR-0009 (analytics literacyDojo) e ADR-0010 (coletor OS, accepted/testado, ativação pendente); AID-470 (F1 coletor, `done`), **AID-473 (F2 agregação + drift monitor, `done`)**, AID-489 (QA GO do F2, `done`), AID-492 (hardening F2, `done`); specs-padrão de porta AID-610 §6 / AID-644; janela 21d AID-670 (correndo; checkpoints d+7/d+21 dependem de instrumento de funil); gate O3-C2 condicionado a "evidência OP-B" (spec O3-C1 rev 2 §8.7).
**Baseline lida e citada (first-hand, workspace intocado):** `origin/main` @ `4c2aeb7` (pós-merge PR #248, O3-C1) — leitura direta de `learner/gate/analytics/` (3 ferramentas + README), `learner/gate/tests/dojo_analytics_*.test.mjs`, `learner/gate/netlify-functions/dojo-analytics-collector.mjs`, `learner/gate/AGENTS.md`, `engines/codexdojo-os-prototype/src/analytics/events.ts` + `src/app/createServices.ts` + `createServices.analytics.test.ts` + `netlify.toml`, `engines/literacyDojo/src/application/ports.ts` (:51 `AnalyticsSink`), `src/adapters/analyticsSinks.ts`, `src/domain/analytics.ts`, `src/application/useCases.ts` (:246 `completeLesson`, :263 `progress.save`), `src/app/services.ts`, `src/host/LiteracyMissionAdapter.ts` (:29 `?hosted=1`), `netlify.toml` do literacyDojo; git log/ancestry para os commits abaixo.

---

## 0. Sumário executivo — e a ERRATA que reformula a onda

**Errata material à premissa da ORDEM (e do doc `funil-op-b`):** a ORDEM AID-673 §2 e o doc `funil-op-b` (AID-639) afirmam "**F2 (NDJSON→funil + drift monitor) NÃO EXISTE**" — verificado first-hand, **F2 JÁ EXISTE em main** desde 2026-08-31: commits `b649fc6f` (feat: agregação + drift monitor, **AID-473 F2**) e `88d7b034` (hardening fail-closed, AID-492), merged via **PR #218** (`58597df9`), ambos **ancestrais do próprio pin `7a4e5df` citado pelo doc** (verificado por `git merge-base --is-ancestor`); QA independente deu GO (AID-489). Ferramentas: `learner/gate/analytics/aggregate_funnel.mjs` (funil R1/R7/R21 narrow+wide, graça 2d, variante estrita, review-return H1, funil de ativação onboarding→mission.completed, k≥5 fail-closed), `schema_drift_monitor.mjs` (exit 1 em drift, cross-check "monitor-bug"), `ndjson_input.mjs`; testes em CI (`dojo_analytics_funnel_aggregation.test.mjs`, `dojo_analytics_schema_drift_monitor.test.mjs`; paridade `collectorParity.test.ts` + `fixtureSchemaDrift.test.ts` no OS). O `learner/gate/AGENTS.md` já documenta a fatia. **Impacto:** a onda F2 muda de *construir* para **estender lacunas** — custo menor, mesmo valor para o gate O3-C2. Errata do doc `funil-op-b` entra pela porta UX (§5.1), que é a owner do doc.

**O que esta spec entrega:** (1) **F2b** — extensão da agregação existente com as métricas que faltam para D1 e o resto de D2 (doc §§1.1–1.2): split de entrada por trilha, conclusão por missão, friction intra-atividade, saúde da verificação, degradação de render, mediana de conclusão por módulo + **dedup de `eventId`** (dívida explícita do ADR-0010 Consequências); (2) **F3** — composição do `AnalyticsSink` do literacyDojo em `app/services.ts` atrás de `VITE_ANALYTICS_ENDPOINT`, ligando o **piloto já autorizado** `lesson_completed` (ADR-0009 Limites) com supressão em modo hosted; (3) portas de pipeline (§5). **Anti-escopo hard no §8** — em particular: transporte OFF em toda superfície de build; zero evento novo; zero mudança em ADR-0009/0010.

## 1. Decisões de design (evidência → decisão)

### 1.1 F2 vira F2b (delta), não greenfield
Evidência no §0. Decisão: preservar a ferramenta existente (contratos, boundaries e testes já travados por AID-473/AID-489/AID-492) e **estender o mesmo report** (`reportVersion` 1→2) com as seções novas. Não reescrever, não criar segunda ferramenta (regra: consolidar primeiro). O drift monitor **não muda** — vocabulário continua fechado nos 12 eventos; paridade continua travada por CI.

### 1.2 Escopo de métricas = exatamente o doc `funil-op-b` §§1.1–1.2 (nada a mais)
A ORDEM amarra as métricas ao doc (propriedade UX). F2b adiciona **somente** o que o doc pede e a ferramenta hoje não produz:

| Métrica (doc) | Definição observável (doc §1.1/§1.2) | Estado em `aggregate_funnel.mjs` |
| --- | --- | --- |
| Split de entrada por trilha (D1) | % de `installationId` cujo primeiro `mission.started` tem `trackId: dev` vs `ai-pratica`, por coorte semanal (`mode:"initial"` + contexto `trackId`) | **falta** |
| Conclusão por missão (D1) | `mission.completed {result:"completed"}` / `mission.started` por `missionId` (foco l27/l28/l29 = capítulos dev 14/15/16) | **falta** |
| Friction intra-atividade (D1) | `structured_attempt.passed`/`structured_attempt.submitted` por `activityType` × `missionId` (foco `prompt_builder` l27-a2, `rubric_review` l28-a2/l29-a2) + `hint.requested` + `retry.requested` | **falta** |
| Saúde da verificação (D1) | frequência de `verification.state_changed` com `state:"rejected"/"gateway-unavailable"` | **falta** |
| Degradação de render (D1) | frequência de `renderer.degraded` (fallback DOM nas missões literacy) | **falta** |
| Mediana de conclusão por módulo (D2) | conclusão por `missionId` agregada por módulo (ia_pratica); mediana entre módulos (tripwire AID-524 §5) | **falta** |
| R1/R7/R21 narrow+wide, graça 2d, estrita, H1 review-return, funil de ativação | doc §1.2 / AID-463 §2.1 | **existe** |
| Monitor de drift de vocabulário | emissor↔coletor↔relatório | **existe** (intocado) |
| Dedup de `eventId` | ADR-0010 Consequências: "duplicatas de `eventId` (corrida beacon+fetch) são deduplicadas só na agregação futura" | **falta** (dívida explícita do ADR) |

### 1.3 Dedup de `eventId` entra agora (fecho de dívida do ADR-0010)
A corrida beacon+fetch pode duplicar linhas no NDJSON; o ADR deferiu a dedup para a agregação. F2b deduplica por `eventId` (primeira ocorrência na ordem de sort existente) **antes** de qualquer corte e reporta `duplicateEvents` no bloco `source` — sem isso, todos os cortes novos herdam contagem dupla invisível.

### 1.4 F3 = composição + piloto autorizado, com supressão hosted
Evidência first-hand: a infraestrutura ADR-0009 existe **inteira** (porta `AnalyticsSink` em `ports.ts:51`; adapters `noopAnalyticsSink`/`consoleAnalyticsSink`/`httpNdjsonAnalyticsSink(endpoint)` + seletor `analyticsSinkFromEnv(endpoint, isDev)`; construtores fechados e `buildLessonCompletedEvent` em `domain/analytics.ts`; teste `tests/domain/analytics.test.ts`) — mas **nada é composto**: `Services` não tem campo `analytics`, `createServices()` não instancia sink, e há **zero call sites de `.track()`**. Decisão: (a) compor `analyticsSinkFromEnv(import.meta.env.VITE_ANALYTICS_ENDPOINT, import.meta.env.DEV)` em `createServices()` (+ `overrides.analytics` para testes); (b) ligar **somente** o evento piloto `lesson_completed` — único autorizado pelo ADR-0009 ("um evento piloto (`lesson_completed`) instrumentado no engine"); os outros 3 do conjunto mínimo (`entry_viewed`, `mapa_inicial_done`, `route_chosen`) seguem **não instrumentados** (entram por fatias próprias); (c) emissão **após** `progress.save` com sucesso em `completeLesson` (`useCases.ts:263`; regra ADR-0009 §4), fire-and-forget, falha de analytics nunca bloqueia; (d) **modo hosted (`?hosted=1`) usa sink noop** — missões hospedadas já são medidas pelo emissor do OS (12 eventos, contexto `engineId: literacyDojo`); sem isso, uma futura ativação contaria a mesma missão nos dois vocabulários (dupla contagem por construção).

### 1.5 Incompatibilidade de envelope literacy↔coletor OS é fronteira, não defeito
O coletor OS valida o envelope do OS (`isAnalyticsBatch` + `validateAnalyticsEvent` com `installationId`/`sessionId` e os 12 nomes); o sink literacy posta linhas `ProductAnalyticsEvent {source:"literacydojo"}` → o coletor responderia `422` e os eventos se perderiam. Decisão: **proibido apontar o sink literacy para `/__dojo/bridge/v1/analytics`**; a superfície receptora de literacy é decisão de ativação (backing, §7). Documentado no adapter e nesta spec; zero mudança nos ADRs.

## 2. F2b — especificação (tarefa T1, FPE)

**Onde:** `learner/gate/analytics/aggregate_funnel.mjs` (+ `README.md`, testes, fixtures). **Nada de deploy** — ferramenta offline tools-only (ORDEM §1: "Zero deploy obrigatório no Landing 1").

1. **Dedup:** aceitos são deduplicados por `eventId` (ordem de sort vigente: `occurredAt`,`sequence`); `source.duplicateEvents` reporta o total removido.
2. **Seções novas do report (`reportVersion: 2`), todas k≥5, identificadores nunca publicados, coortes por ISO-week (chave já usada pela ferramenta):**
   - `trackEntrySplit`: por coorte semanal, n de instalações com `mission.started {mode:"initial"}` e o primeiro deles com `trackId` de cada valor; taxas relativas; célula `n<k` suprimida.
   - `missionCompletion`: por `missionId`: instalações com ≥1 `mission.started` (denominador) e ≥1 `mission.completed {result:"completed"}` (numerador) + taxa; supressão por célula; missões sem contexto `missionId` contam como `unattributed` (reportado, nunca adivinhado).
   - `activityFriction`: por `activityType` × `missionId`: `structured_attempt.passed`/`structured_attempt.submitted` (taxa) + contagens de `hint.requested` e `retry.requested` no mesmo corte; supressão por célula.
   - `verificationHealth`: contagem/frequência de `verification.state_changed` por `state` (foco `rejected`/`gateway-unavailable`), sem `missionId` no corte (estado é da ponte).
   - `rendererDegraded`: contagem de `renderer.degraded` por `fallback` (e `reason` agregado), contexto `engineId` quando presente.
   - `moduleCompletionMedian` (D2): mapeia `missionId`→`moduleId` lendo `curriculum/ai-literacy/catalog.yaml` **no momento da execução offline** (a ferramenta vive no mesmo repo do currículo; sem cópia do mapeamento); calcula taxa de conclusão por módulo (mesma definição de `missionCompletion`) e a **mediana entre módulos** (ia_pratica). Catálogo ausente/ilegível ⇒ seção marcada `unavailable` com motivo — **fail-closed, nunca fabrica**.
3. **Markdown:** o render existente ganha as seções novas (mesmo estilo de tabela; células suprimidas como hoje).
4. **Fixtures/report de exemplo:** fixtures sintéticas estendidas cobrindo cada corte novo (incluindo caso de dedup e caso `unavailable` de catálogo); `example-funnel-report.json|.md` regenerados **byte-idênticos** (contrato vigente: artefato commitado obsoleto falha CI).
5. **Testes:** estender `dojo_analytics_funnel_aggregation.test.mjs` (dedup; cada seção; supressão k≥5; `unavailable`); CLI continua fail-closed (padrão AID-492: `--k` < 5, NaN, valor ausente ⇒ exit 2 sem report).
6. **Boundary inalterada:** analytics ≠ evidência; nada escreve learner state/gates/mastery; NDJSON real nunca é commitado (fixtures sintéticas only); k≥5 continua floor imutável.

**Aceite (porta FPE):** `node --test learner/gate/tests/dojo_analytics_funnel_aggregation.test.mjs learner/gate/tests/dojo_analytics_schema_drift_monitor.test.mjs` verde; regeneração byte-idêntica dos examples; `cd engines/codexdojo-os-prototype && npm run test` verde (paridade/drift intocados); CI verde; nenhum novo evento/vocabulário.

## 3. F3 — especificação (tarefa T2, FPE)

**Onde:** `engines/literacyDojo/src/app/services.ts` (composição), `src/application/useCases.ts` (emissão do piloto), `src/vite-env.d.ts` (declaração de tipo), testes. **Zero mudança de ADR; zero evento novo; nenhum build define o env.**

1. **Composição:** `Services` ganha `analytics: AnalyticsSink`; `createServices()` compõe `overrides?.analytics ?? analyticsSinkFromEnv(import.meta.env.VITE_ANALYTICS_ENDPOINT, import.meta.env.DEV)`. Defaults intocados: sem env ⇒ noop em prod / console em dev (ADR-0009 §3).
2. **Supressão hosted:** quando o app roda hosted (`?hosted=1`, `LiteracyMissionAdapter.ts:29` / `hostAdapter !== null`), o sink literacy composto é **noop** (§1.4d). O seam exato (flag em `createServices` vs wrap em `App.tsx`) é do FPE; o requisito é observável: hosted não emite nada pelo sink literacy.
3. **Emissão do piloto:** em `completeLesson`, **após** `progress.save` bem-sucedido, emitir `buildLessonCompletedEvent({lessonId, lessonVersion, score, durationSeconds?, occurredAt: clock, contentVersion})` exatamente 1× por conclusão; `track` nunca lança/adia a resposta (contrato dos sinks; useCase não pode depender de rede). `UseCaseDeps` ganha `analytics` (default noop nos testes de unidade).
4. **Guardas de teste (espelho do `createServices.analytics.test.ts` do OS):** (a) sem env ⇒ zero chamadas de fetch (noop/console); (b) `VITE_ANALYTICS_ENDPOINT=""` ⇒ zero rede; (c) env definido ⇒ `httpNdjsonAnalyticsSink` selecionado; (d) hosted ⇒ noop mesmo com env; (e) `lesson_completed` emitido 1×/conclusão com envelope válido (`isValidAnalyticsEvent`); (f) **nenhum outro nome** de evento instrumentado (grep-audit do diff).
5. **Documentação de fronteira (§1.5):** comentário no adapter + nota no README do engine: endpoint literacy ≠ rota do coletor OS; recepção de literacy é decisão de ativação.
6. **Tipagem:** declarar `VITE_ANALYTICS_ENDPOINT?: string` em `vite-env.d.ts` (declaração de tipo **não** habilita nada).

**Aceite (porta FPE):** `cd engines/literacyDojo && npm run lint && npm run test && npm run build` verde; guardas (a)–(f) presentes; `netlify.toml` e CI sem o env; diff não toca ADRs/currículo/ids.

## 4. Riscos → mitigação nesta spec

| # | Risco | Mitigação |
| --- | --- | --- |
| R1 | Dupla contagem literacy×OS em modo hosted numa futura ativação | Sink literacy noop em hosted (§3.2) + guard (d) |
| R2 | Cortes D1 com n pequeno vazarem identidade | k≥5 por célula em toda seção nova; identificadores nunca publicados (contrato vigente da ferramenta) |
| R3 | Mapeamento missão→módulo divergir do catálogo | Lido do `catalog.yaml` canônico em tempo de execução; sem cópia; `unavailable` fail-closed (§2.2) |
| R4 | Regressão da ferramenta F2 travada por AID-489/AID-492 | Extensão aditiva (`reportVersion: 2`); testes/contracts existentes intocados; examples byte-idênticos |
| R5 | Alguém "ligar" transporte por engano nesta onda | Guardas de teste zero-rede (OS já coberto; literacy passa a ter); anti-scope §8; ativação board-only |
| R6 | Relatório de dados reais ser reivindicado antes de existir coleta | Cadência **completa** do doc §4 permanece (espelhada desde a rev 2 — ajuste AID-674): **A+7** saúde operacional (volume, rejeições do coletor, degradação — **sem decisão de produto**); **A+21** primeira leitura de funil; **A+28–35** relatório mensal k≥5 — nenhuma leitura/relatório antes do seu marco, e o checkpoint de saúde do A+7 não pode ser pulado por leitura literal desta spec; a onda produz **zero** relatório de dados reais (coletor desligado, sem dados) |

## 5. Pipeline de portas (padrão AID-610 §6; produtor ≠ verificador)

1. **Advisory UX (porta A — paralela):** UX (0bfa47c1) valida aderência da spec ao doc `funil-op-b` (métricas §§1.1–1.2, privacidade §2, cadência §4) **e emite errata do próprio doc** (linha "F2 NÃO EXISTE" → existe desde AID-473; conclusão de estado corrigida). GO/com ajustes comentado na AID-673.
2. **T1 — F2b (FPE fa8130d5):** §2 acima. Paralela a T2 (superfícies disjuntas: `learner/gate/analytics/` vs `engines/literacyDojo/`).
3. **T2 — F3 (FPE fa8130d5):** §3 acima.
4. **QA independente (QA Lead ca6a3f95; blockedBy T1+T2):** verificação wave-level (padrão AID-489/AID-631/AID-638): recomputar funil por terceira via sobre fixtures; conferir guardas OFF-by-default (zero rede sem env, hosted noop, dedup); conferir que nenhum build define o env; CI verde; GO/NO-GO é propriedade da QA.
5. **Close-out (SD):** receipt na AID-673 + registro do estado do enabler OP-B para o gate O3-C2/l30+ (sem produção; decisão de ativação segue board).

**Sem porta de promoção nesta onda** — não há deploy: F2b é tools-only e F3 é composição atrás de env que nenhuma superfície define. Precheck estendido de ativação (env pin same-origin + coletor `202` em lote sintético, doc `funil-op-b` §3.3) é passo separado pós-decisão do board.

**Esforço estimado:** T1 ≈ 3–4h FPE (seções + fixtures + testes); T2 ≈ 2–3h FPE (composição + guardas); QA 1 ciclo; advisory ≈ 30–60min UX.

## 6. Método de verificação

- **Desta spec (executado):** leitura integral first-hand das fontes @ `4c2aeb7` (lista no cabeçalho); ancestry git dos commits F2 (`b649fc6f`, `88d7b034` < `7a4e5df` < `4c2aeb7`; merge PR #218 `58597df9`); issues AID-473/AID-489/AID-492 `done`; ausência de `VITE_ANALYTICS_ENDPOINT` em toda superfície de build (grep repo: apenas `vite-env.d.ts`/`createServices.ts`/`createServices.analytics.test.ts`/`netlify.toml` do OS — todos como consumers/guardas, nenhum definindo valor); zero call sites `.track(` no literacyDojo; `learner/gate/analytics/` completo e testado.
- **Da onda (portas):** aceites §2/§3 por tarefa + QA independente §5.4. Eficácia de leitura de funil NÃO é presumida — só existirá com ativação (board) + janela de dados (doc §4).

## 7. Decisões explicitamente reservadas (board / ativação — NÃO tomadas aqui)

1. **Ativar transporte em produção** — board-only (ADR-0010 §4; Q1 já pending na AID-669). Esta onda não configura nada.
2. **Backing durável do NDJSON + retenção 90d/agregados** — decisão de ativação (doc §3.2; filesystem da function é efêmero).
3. **Superfície receptora de literacy** (coletor próprio vs extensão) e mesma-origin para literacy — decisão de ativação; spec só proíbe a rota do coletor OS (§1.5).
4. **Instrumentar `entry_viewed`/`mapa_inicial_done`/`route_chosen`** — fatias próprias futuras (ADR-0009), fora desta onda.
5. **Copy `/privacidade`+`/termos`** — texto já redigido no anexo do ADR-0010; aplicação é passo de ativação.
6. **Leitura e priorização l30+/O3-C2 por funil** — UX com evidência de coorte (analytics ≠ evidência).

## 8. Anti-escopo (hard — herda a ORDEM e os ADRs)

- **NÃO ativar transporte**: nenhuma superfície de build passa a definir `VITE_ANALYTICS_ENDPOINT`; sinks default intocados (OS in-memory; literacy noop/console); configuração de ativação é passo separado pós-decisão do board.
- **Zero evento novo**: OS permanece com os 12 do vocabulário fechado; literacy instrumenta somente o piloto `lesson_completed` já autorizado; zero mudança em ADR-0009/ADR-0010.
- **Zero toque** em currículo/conteúdo/ids/contrato de lições; zero deploy; zero backend/SaaS; zero mecânica de engajamento; **analytics ≠ evidência** — nada em F2b/F3 lê ou escreve learner state/gates/mastery.
- **k≥5 imutável** (floor fail-closed já travado); NDJSON real nunca commitado; sem relatório de dados reais nesta onda (não há coleta ativa).
