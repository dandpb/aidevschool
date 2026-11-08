<!-- issue: AID-639 | key: funil-op-b | doc_id: 3a3becf4-225c-442d-b188-9775ad466996 | updated: 2026-09-02 17:20:48.719+00 -->

# AID-639 — Doc 2/3: Plano de instrumentação do funil OP-B (v1 mínima) — eventos, decisões D1/D2, pré-requisitos, privacidade · rev 2 (ERRATA F2: existe desde AID-473)

(AID-639)

# AID-639 — Doc 2/3: Plano de instrumentação do funil OP-B (v1 mínima, decisões l30+ e O3-C1)

**Status:** PLANO — nenhum evento emitido, nenhum deploy, zero escrita canônica. Ativação é decisão de board (ADR-0010; volta ao board "com este ADR em mãos"). Este doc é o input de decisão + o mapa do que já existe.
**Owner:** UX Designer de Aprendizagem (0bfa47c1). Mandato: AID-639 (entrega 2). Base: scoping AID-463 (doc `draft`, aprovado em parte pelo board 2026-08-31 → ordem AID-470).

> **ERRATA rev 2 (2026-09-02, owner UX 0bfa47c1 — verificada first-hand no repo):** a tabela de estado abaixo dizia "**F2 agregação/relatório | NÃO EXISTE**" citando `origin/main @ 7a4e5df`. **Errado**: F2 existe desde 2026-08-31 — commits `b649fc6f` (feat: agregação NDJSON→funil + drift monitor, **AID-473 F2**) e `88d7b034` (hardening fail-closed, AID-492), merge **PR #218** (`58597df9`), **todos ancestrais do próprio pin `7a4e5df`** (`git merge-base --is-ancestor b649fc6f 7a4e5df` → true). O que de fato falta em F2 são as seções de decisão D1 (§1.1) + o resto de D2 (§1.2) e o dedup de `eventId` (§3.2) — exatamente o escopo F2b da onda OP-B-F23 (spec rev 1, AID-673). A linha F2 da tabela e a "Conclusão de estado" foram corrigidas in-place abaixo; nenhum outro conteúdo deste plano mudou.
**Estado verificado first-hand em `origin/main` @ `7a4e5df` (pós-promoção O1 `7653822`):**

| Fatia OP-B (AID-463 §3.1) | Estado no repo hoje | Evidência |
| --- | --- | --- |
| F1 coletor same-origin | **CONSTRUÍDO E TESTADO, desligado** | ADR-0010 accepted; endpoint `learner/gate/netlify-functions/dojo-analytics-collector.mjs` → rota `/__dojo/bridge/v1/analytics`; validação de envelope + vocabulário em runtime; paridade travada por testes (`collectorParity.test.ts`); NDJSON append-only por dia UTC; máx 100 eventos/64 KiB; resposta `202` com aceitação parcial |
| Transporte de saída | **OFF em toda superfície de build** | `VITE_ANALYTICS_ENDPOINT` não definido em nenhum build (testado por `createServices.analytics.test.ts`; comentário em `netlify.toml`); sink default in-memory; fila local best-effort 500 eventos |
| F2 agregação/relatório | **EXISTE (base) desde 2026-08-31 — faltam as seções D1/D2 §§1.1–1.2 e o dedup de `eventId`** *(errata rev 2; antes: "NÃO EXISTE" — incorreto)* | `b649fc6f` (AID-473 F2: funil R1/R7/R21 narrow+wide, graça 2d, variante estrita, review-return H1, funil de ativação onboarding→mission.completed, k≥5 fail-closed) + `88d7b034` (AID-492), merge PR #218 (`58597df9`) — ancestrais do pin `7a4e5df`; ferramentas `learner/gate/analytics/` (`aggregate_funnel.mjs`, `schema_drift_monitor.mjs`, `ndjson_input.mjs`), testes em CI (`dojo_analytics_funnel_aggregation.test.mjs` + `dojo_analytics_schema_drift_monitor.test.mjs`), QA GO AID-489, `learner/gate/AGENTS.md` documenta |
| F3 emissão literacyDojo | **NÃO EXISTE** | `AnalyticsSink` segue sem composição em `app/services.ts`; ADR-0009 intocado (envelope `source:"literacydojo"` sem backend) |
| Emissor OS | **ATIVO no cliente** (12 eventos, vocabulário fechado) | `src/analytics/events.ts` (12 eventos + dims + context keys `trackId/missionId/…`); identidade `installationId`+`sessionId` (UUIDs aleatórios); batcher com flush/beacon |
| Ativação (env var + backing + copy) | **PENDENTE DE DECISÃO DO BOARD** | ADR-0010 §4 e Limites: "ligar o transporte em produção volta ao board" |

**Conclusão de estado** *(errata rev 2)*:** o gargalo de OP-B **não é construir telemetria — nem a base do funil (F1 e a base de F2 já existem e estão testadas)** — é (a) decisão de ativação + backing durável, (b) a **extensão F2b** (seções D1 §1.1 + resto de D2 §1.2 + dedup de `eventId` — onda OP-B-F23), (c) a composição F3 (inexistente). Nenhum evento novo é necessário para as decisões desta fase (princípio AID-463 §2: funil 100% sobre eventos que o OS já emite). *A versão original desta conclusão citava F2 inteiro como gargalo inexistente — incorreto mesmo no pin @ `7a4e5df`; ver errata acima.*

---

## 1. Eventos mínimos por decisão de produto

Todas as leituras abaixo usam **somente o vocabulário fechado de 12 eventos do OS** (`events.ts`), com contexto `trackId` (`ai-pratica`|`dev`), `missionId`, `contentVersion`. Zero evento novo; zero mudança de ADR-0009.

### 1.1 D1 — Priorização de l30+ (demanda e saúde da trilha dev vs ia_pratica)

| Métrica | Definição observável | Eventos usados |
| --- | --- | --- |
| **Split de entrada por trilha** | % de `installationId` cujo primeiro `mission.started` tem `trackId: dev` vs `ai-pratica` (coorte semanal) | `mission.started {mode:"initial"}` + contexto `trackId` |
| **Conclusão por missão (onda O1)** | `mission.completed {result:"completed"}` / `mission.started` por `missionId` (l27, l28, l29) — taxa por capítulo 14/15/16 | `mission.started`, `mission.completed` |
| **Friction intra-atividade** | `structured_attempt.passed`/`structured_attempt.submitted` por `activityType` e `missionId` (foco: `prompt_builder` l27-a2; `rubric_review` l28-a2/l29-a2 — primeiro uso dev) + `hint.requested` + `retry.requested` | `structured_attempt.submitted/passed`, `hint.requested`, `retry.requested` |
| **Saúde da verificação** | frequência de `verification.state_changed` com `state:"rejected"/"gateway-unavailable"` (precedente AID-448: falso negativo minou confiança por semanas) | `verification.state_changed` |
| **Degradação de render** | `renderer.degraded` (fallback DOM nas missões literacy — o fallback é contrato, frequência alta = sinal de ambiente) | `renderer.degraded` |

**Desbloqueia:** devolveu 3 janelas dev consecutivas com demanda não medida (registro S5/proposta AID-558 §1.4); l30+ tem candidata β "retomar conversa técnica" preservada (rev `7c3f9456`) para ressurreição. O split + conclusão por trilha é a menor evidência empírica de demanda relativa possível.

### 1.2 D2 — Escolha da janela de consolidação O3-C1 (retrofit l01–l07)

| Métrica | Definição observável | Eventos usados |
| --- | --- | --- |
| **Baseline de retenção** | funil R1/R7/R21 (AID-463 §2.1: coorte = primeira `mission.completed {result:"completed"}` em D0; retorno = qualquer evento na janela [D0+N, D0+N+2]; graça 2 dias; variante estrita secundária) | todos (qualquer evento marca retorno) |
| **Retorno por revisão (H1)** | sessões (por `sessionId`) contendo `mission.started {mode:"review"}` ou `review.started {reason:"due"|"overdue"}` | `review.started`, `mission.started` |
| **Mediana de conclusão por módulo (ia_pratica)** | conclusão por `missionId` agregada por módulo — o tripwire do case AID-524 §5 já referencia "mediana dos módulos" | `mission.started`, `mission.completed` |
| **Onboarding de entrada** | `onboarding.started` → `onboarding.completed` → primeira `mission.started` (contexto de coorte) | `onboarding.*`, `journey.returned` |

**Desbloqueia:** O3-C1 é candidata natural de janela de consolidação "após o funil existir" (proposta AID-558 §3-O3/§6) e tem risco estrutural conhecido (retrofit des-completa lições concluídas — `progress.ts:357–372`) que exige ruling de migração; o funil dá o baseline para decidir se consolidação vence nova onda.

## 2. Fronteira de privacidade (riscos e mitigações)

| Risco | Mitigação (status) |
| --- | --- |
| PII / texto livre | **Impossível por construção**: vocabulários fechados validados no emissor E no coletor (paridade por teste); escalares ≤128 chars; sem nome/e-mail/conta/fingerprint |
| Re-identificação por combinação rara de dimensões | Agregação com **k-anonimato n≥5** (ADR-0010 §3; supressão de célula menor); dimensões são enums curtos |
| Cookies/rastreamento cross-site | Nenhum cookie; same-origin imposto nos dois lados (`sameOriginPath()` + `sec-fetch-site: same-origin` → 403); sem CORS; sem parâmetros de rastreamento |
| Retenção indefinida de dados brutos | Proposta ADR-0010: NDJSON bruto 90 dias (prune implementado); agregados indefinidos — **confirmar no board** |
| IP em logs de plataforma (Netlify function logs) | **Risco residual a declarar**: logs da plataforma de hospedagem podem registrar IP por razões operacionais, fora do NDJSON nosso — a copy de `/privacidade` (anexo ADR-0010) deve mencionar hospedagem; decisão de ativação precisa dessa linha |
| Local-first / dark pattern | Analytics nunca bloqueia a lição (fire-and-forget travado); copy da primeira visita mantém a promessa; `/privacidade` + `/termos` atualizados **antes** do deploy de ativação (texto já redigido no anexo do ADR-0010) |
| `mastered` em analytics | Proibido e travado (ADR-0005/0009/0010; analytics ≠ evidência) |

## 3. Pré-requisitos técnicos para ativar (fatia FPE futura, ordem própria após decisão do board)

1. **Decisão do board** (input = este doc + ADR-0010): ativar coletor, confirmar backing, reter 90d/agregados, k≥5, escopo v1 = OS-canônico.
2. **Backing durável do NDJSON** — filesystem da function é efêmero (consequência registrada no ADR-0010): proposta mais leve = function agendada que consolida o dia em object storage (Netlify Blobs/S3/R2 — escolha do FPE); dedup de `eventId` (corrida beacon+fetch) fica na agregação F2.
3. **`VITE_ANALYTICS_ENDPOINT` no build de produção** + re-pin/precheck padrão (promoção única; nenhum conteúdo muda; precheck ganha 1–2 checks: env pin same-origin e coletor respondendo `202` num lote de teste sintético válido).
4. **Copy `/privacidade` + `/termos`** (anexo ADR-0010) aplicada **antes** do deploy.
5. **F2 — script de agregação offline** NDJSON→relatório mensal (funil §1.1/§1.2; k≥5; drift monitor de schema emitter↔relatório) — sem banco, sem serviço.
6. **QA mínima pós-ativação:** missões seguem jogáveis com coletor fora do ar (falha de analytics nunca bloqueia — re-verificar no deploy).

**Fora do escopo v1 (explícito):** F3 emissão literacyDojo (`lesson_completed` etc. — só quando leitura OS provar necessidade); eventos novos em qualquer vocabulário (revisão de ADR um-a-um por fatia, se um dia necessário); backend SaaS (Plausible/PostHog — rejeitado pelo ADR); qualquer mecânica de engajamento **antes do baseline** (regra de ouro AID-463 §4).

## 4. Cronograma de leitura (assumindo ativação no dia A)

- A+0: ativação (deploy) → dados começam.
- A+7: primeira leitura operacional (saúde: volume, rejeições do coletor, degradação) — sem decisão de produto.
- **A+21: primeira leitura de funil** (coortes D0 da semana 1 com R1/R7 completos; janelas de graça fechadas) — input para D1/D2.
- A+28..35: relatório mensal k≥5 como work product datado (padrão `_work-products/`) → decisões l30+/O3-C1 com número no papel (Doc 3 janela B).

**Se o board NÃO ativar:** funil segue escuro; D1/D2 passam a depender de teste moderado + coortes pequenas (evidência direcional declarada) — registrado como limitação epistêmica explícita na priorização de l30+ (Doc 3 §fallback).
