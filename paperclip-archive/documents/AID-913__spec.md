<!-- issue: AID-913 | key: spec | doc_id: ff70762a-4cec-44c6-a3c1-80465eabf8cd | updated: 2026-09-06 13:12:40.208+00 -->

# Spec AID-913 — telemetria mínima + funil anonimizado nas 2 journeys live

(AID-913)

# Spec AID-913 — Telemetria mínima de uso real + funil anonimizado nas 2 journeys live

**Ordem:** AID-910/D (CEO, 2026-09-06) · **Autor:** FPE · **Countersign:** QA Lead (child) · **Merge:** single-writer CEO
**Meta:** as 5–8 sessões O1 (janela fecha ~2026-09-23) geram dado de funil anônimo nas 2 superfícies live; nenhuma decisão pós-O1 sem dado de uso. Data alvo de deploy: **~09-09** (merge + promoção antes da 1ª sessão).

## 1. O que esta ordem destrava (decisão de ativação)

ADR-0010 §4 manteve o coletor construído/testado com transporte desligado, pendente de decisão do board. **Esta ordem CEO é a decisão de ativação** para as 2 superfícies live, no desenho mínimo abaixo. Fronteiras invioláveis mantidas: vocabulário fechado; zero PII/texto livre; `mastered` proibido; analytics ≠ evidência; same-origin; sem cookies/CORS/trackers; k-anonimato **n≥5** em qualquer leitura publicável (ADR-463 §3.0). `progressSemantics: local-completion` intocado — telemetria nunca é progresso.

## 2. Funil mínimo por superfície

### 2.1 literacyDojo (`literacy-standalone-first-lesson`) — emenda ADR-0009
- **Eventos novos** (vocabulário fechado + construtores fechados): `lesson_started` (props: `lessonId`, `lessonVersion`), `activity_attempted` (props: `lessonId`, `activityType`, `passed`). **Instrumentar** `entry_viewed` (já no vocabulário, nunca instrumentado). `lesson_completed` já instrumentado. Retry/hint ficam como já existem (retry = tentativas repetidas visíveis por contagem de `activity_attempted`; hint do literacy permanece fora — sem evento novo).
- **Identidade anônima por sessão:** `sessionId` **efêmero** (`crypto.randomUUID()` por page load, só em memória, nunca persistido — exatamente a forma pré-autorizada pelo ADR-0009 §2 via emenda) + `eventId` (UUID por evento; dedup na recepção). `ANALYTICS_SCHEMA_VERSION: 1 → 2` com campos novos obrigatórios; validação estrita nos dois lados. Sem `installationId` no literacy (estrito à sessão anônima).
- **Funil resultante:** `entry_viewed` → `lesson_started` → `activity_attempted` → `lesson_completed`, agregável por `sessionId`.

### 2.2 codexdojo OS (`os-literacy-guided-mission`) — zero mudança de emissão
- Vocabulário de 12 eventos intocado: funil já emitido (`onboarding.started`/`journey.returned` → `mission.started` → `structured_attempt.submitted`/`passed` → `mission.completed`; `hint.requested`/`retry.requested` como marcadores, host + missão hospedada via `engineId:"literacyDojo"`). Só falta **recepção ativa** (§3–4).

## 3. Sink único same-origin (sem backend novo)

- Coletor existente `learner/gate/netlify-functions/dojo-analytics-collector.mjs` **estendido** para aceitar 2 envelopes: batch OS v1 (como hoje) e batch literacy `{schemaVersion:2, source:"literacydojo", events:[…]}`; validação de paridade espelhada de `engines/literacyDojo/src/domain/analytics.ts` + **teste de paridade novo** (coletor rejeita exatamente o que o emissor considera inválido, inclusive PII/texto livre).
- **Roteamento:** `engines/literacyDojo/netlify.toml` ganha redirect `/__dojo/bridge/v1/analytics` → `/.netlify/functions/dojo-analytics-collector` (função já deployada via `functions = ../../learner/gate/netlify-functions`; o OS já tem a rota).
- **Ativação do transporte:** `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` em `[build.environment]` dos **2** netlify.toml. Invariante de teste muda de "nenhuma superfície define o env" para "**somente** os 2 netlify.toml, valor same-origin idêntico ao redirect" (fail-closed contra cross-origin/env divergente).
- **Batch para literacy:** novo batch sink (buffer em memória; flush por 20 eventos / 15s / `pagehide` via `sendBeacon` quando disponível; degradação silenciosa mantida — analytics nunca bloqueia a lição). Substitui o fetch-por-evento do ADR-0009. OS batcher existente intocado.

## 4. Backing durável mínimo (decisão de ativação pendente do ADR-0010)

- NDJSON em `/tmp` da function é efêmero entre instâncias lambda — insuficiente até para a janela O1. **Escolha: Netlify Blobs** (nativo da plataforma dos 2 sites; sem vendor novo; sem config de binding no repo). Evento aceito → `set("<dia-utc>/<eventId>", json)` — **idempotente**: dedup de `eventId` de graça (resolve também a corrida beacon+fetch). Retenção 90d: prune por prefixo de dia na exportação.
- **Exportação:** `GET /__dojo/bridge/v1/analytics?from=&to=` no mesmo coletor, protegido por `Authorization: Bearer $ANALYTICS_EXPORT_TOKEN` (**segredo de deploy** setado pelo operador no Netlify UI; nunca no repo; 401 sem token, 403 não-same-origin-policy não se aplica ao GET operador). Resposta NDJSON. Fallback: sem Blobs (local/teste) mantém o sink NDJSON `/tmp` atual — é o caminho dos testes.
- Tradeoffs declarados: Blobs é eventualmente consistente e cobrado por GB — irrelevante na escala O1 (dezenas de KB/dia); perda de janela entre flush e export é aceitável (export diário no runbook).

## 5. Leitura do funil (F2b estendido)

- `learner/gate/analytics/aggregate_funnel.mjs`: nova seção **`literacyFunnel`** (entry→start→attempt→complete por `sessionId`; attempts>1 = retry), discriminando envelopes por `source`; `schema_drift_monitor.mjs` aceita os 2 envelopes; fixtures sintéticas novas em `learner/gate/tests/fixtures/analytics/`. k≥5 imutável.
- `docs/piloto/LEITURA_FUNIL_OPB.md` atualizado: passo 1 agora é export via endpoint com token (não copiar arquivos do backing).
- Expectativa honesta com 5–8 sessões: células agregadas majoritariamente suprimidas (n<k); o valor O1 é o **dry-run real do pipeline** (coleta→sem drift→agregação→zero identificadores publicados) + denominadores internos para a decisão.

## 6. Copy de privacidade (anexo ADR-0010 aplicado — obrigatório na ativação)

- `engines/literacyDojo/public/privacidade.html` + `termos.html`: seção "Telemetria opcional do produto" conforme anexo, ajustada ao literacy (**só sessionId efêmero**, sem identificador de instalação), com aviso de coleta ativa.
- OS emite `installationId` persistido → o OS ganha **página mínima `/privacidade`** (copy do anexo, estática, linkada do onboarding), mesma disciplina.

## 7. Verificação (evidência do countersign)

1. Unit/parity: construtores v2 + auditoria no-PII; batch sink (flush/beacon/degrade); pontos de emissão (4 eventos literacy); invariantes de env (netlify.toml-only); paridade coletor v1+v2; export 401-sem-token; store Blobs mockado.
2. **Probe executável** (script novo no repo): handler do coletor em Node → POST batches sintéticos OS v1 + literacy v2 → GET export com token → `schema_drift_monitor` + `aggregate_funnel` → assert `literacyFunnel` presente + supressão k. Este probe é a evidência central do countersign QA.
3. Engines: `npm run lint && npm run test && npm run build` nos 2 engines; literacy `test:e2e`; OS `test:smoke`. Repo: suites existentes do coletor (`learner/gate/tests/`).
4. Pós-deploy (operator, runbook): smoke = 1 evento de teste visível na exportação antes da 1ª sessão O1.

## 8. Fora de escopo

Novos eventos OS; autocapture; backend multiusuário; métricas de competência/mastery; PII; cross-origin; mudar `progressSemantics`; corredor C2 (AID-915/916 intocado).

## 9. Entrega (fecha AID-913 `done`)

PR único: emenda ADR-0009 + nota de ativação ADR-0010 + eventos/instrumentação/batch literacy + coletor v2 + export + netlify.toml ×2 + copy ×2 + `literacyFunnel` + fixtures + runbook/LEITURA + testes + probe. CI verde → countersign QA GO → merge CEO → promoção (operator) → smoke pós-deploy → QA countersign final do funnel live (gate de `done`).
