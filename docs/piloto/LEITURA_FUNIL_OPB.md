# Leitura do funil OP-B — procedimento (ativação aprovada 2026-09-06, ordem AID-910/D; reportVersion 4 desde F2 `2026-09-10-entry-brief-instrumentation`)

Dono da execução: founder/operador humano. Este procedimento **não** ativa
nada; ele lê o NDJSON depois que o board ligar o transporte. Fronteiras
canônicas: [ADR-0009](../design/adr/0009-product-analytics.md) (analytics ≠
evidência; vocabulário fechado) e [ADR-0010](../design/adr/0010-os-analytics-collector.md)
(coletor same-origin; ativação é gate do board, §4). Ferramentas:
[`learner/gate/analytics/`](../../learner/gate/analytics/README.md).

## 0. Pré-condições (decisões do board, não deste procedimento)

1. **Ativação** aprovada pelo board com o ADR-0010 em mãos (pergunta pendente
   na AID-718): definir `VITE_ANALYTICS_ENDPOINT` no build do OS apontando à
   rota same-origin `/__dojo/bridge/v1/analytics`.
2. **Backing durável** do NDJSON definido na ativação (o filesystem da função
   é efêmero; retenção proposta: 90 dias).
3. **Copy de privacidade** publicada (`/privacidade` e `/termos`, anexo do
   ADR-0010).

## Escopo honesto — o que este funil mede e o que não mede

- O relatório F2b (reportVersion 4) lê o NDJSON do coletor com os **dois
  envelopes**: OS v1 (14 eventos do `codexdojo-os-prototype` — 12 originais +
  `mission.brief_viewed`/`activity.presented` da F2) e literacy v2
  (`source:"literacydojo"` — eventos `entry_viewed`/`lesson_started`/
  `activity_attempted`/`lesson_completed` + `lesson_brief_viewed`/
  `activity_presented` e a prop opcional `entry`, seção `literacyFunnel`).
  Desde a ativação (AID-913, 2026-09-06), o coletor aceita os dois envelopes
  na mesma rota same-origin e o agregador discrimina por `source`. O v4 é
  **aditivo**: todas as seções v3 mantêm definição e números idênticos para o
  mesmo input (travado por replay da janela 09-06→10 no PR da F2); as
  informações novas vivem em seções novas (`activationDetail`,
  `briefExposure`, `probeClassification`, `glossary`).
- **Sessão do literacy = page load** (sessionId efêmero em memória, sem
  identificador persistente). Um reload durante a sessão aparece como **duas
  sessões** — o facilitador não deve ler isso como drop-off; com 5–8 sessões
  moderadas, cruze `entry_viewed` por dia com as notas da moderação antes de
  qualquer conclusão.
- **k-anonimato n≥5 é imutável.** Com 1–3 instalações do piloto, **toda célula
  agregada fica suprimida** (só o `n` aparece). Nessa escala o valor desta
  leitura é o **dry-run do pipeline** (coleta → sem drift → agregação roda →
  nenhum identificador publicado), não métricas de funil. A evidência do P6
  em si é a [ficha manual](FICHA_P6.md); células publicáveis só passam a
  existir com ≥5 instalações distintas por célula.
- O funil mede **retorno à experiência**, nunca aprendizagem ou competência
  (`mastered` é proibido em analytics).

## 1. Exportar o NDJSON coletado (ativação AID-913)

Com a ativação (ordem AID-910/D), o export é via endpoint same-origin do
próprio site, autenticado por Bearer token (`ANALYTICS_EXPORT_TOKEN`, segredo
de deploy — nunca no repo):

```bash
curl -H "Authorization: Bearer $ANALYTICS_EXPORT_TOKEN" \
  "https://<site>/__dojo/bridge/v1/analytics?from=AAAA-MM-DD&to=AAAA-MM-DD" \
  -o /tmp/p6-funil/events-export.ndjson
```

Exporte para um diretório **fora do repo** (ex.: `/tmp/p6-funil/`). NDJSON
real nunca é commitado; relatórios finais são work products datados
(`_work-products/`). O NDJSON contém os dois envelopes (OS v1 **e** literacy
v2 — ativação AID-913); o agregador discrimina por `source` e o funil literacy
aparece na seção `literacyFunnel` (reportVersion 3; v4 desde a F2 `2026-09-10`).

## 2. Checar drift do vocabulário (obrigatório antes de agregar)

```bash
node learner/gate/analytics/schema_drift_monitor.mjs --input /tmp/p6-funil
# exit 0 = limpo · 1 = drift (pare e reporte; não agregue) · 2 = erro de uso/IO
```

## 3. Agregar o funil

```bash
node learner/gate/analytics/aggregate_funnel.mjs --input /tmp/p6-funil \
  --output relatorio-p6.json --markdown relatorio-p6.md \
  --k 5 --windows 1,7,21 --grace-days 2 --now <ISO8601 do fechamento>
# exit 0 = ok · 2 = uso/IO; --k < 5 é rejeitado (ADR-463 §3.0)
```

Comandos verificados contra a fixture sintética
(`learner/gate/tests/fixtures/analytics/synthetic`; exemplo completo commitado
em `example-funnel-report.json`/`.md` no mesmo diretório).

## 4. Como ler o relatório (reportVersion 4)

Cabeçalho: `totalEvents` **pós-dedup** de `eventId` (a corrida beacon+fetch do
ADR-0010 é resolvida aqui; `duplicateEvents` conta as linhas removidas) e
`rejectedEvents`/`parseErrors` excluídas.

| Seção | Pergunta que responde | Como interpretar |
| --- | --- | --- |
| `activationFunnel` | onboarding started→completed→mission started→completed, por semana ISO | Queda entre estágios = atrito da primeira jornada |
| `trackEntrySplit` | **split de trilha** na entrada (primeira `mission.started` por `trackId`: `ai-pratica` vs `dev`) | Proporção de entrada por semana; sem contexto ⇒ `unknown` |
| `missionCompletion` | **conclusão por lição** (`missionId`): instalações que iniciaram vs concluíram | **Abandono por lição = started − completed**; sem `missionId` ⇒ bucket `unattributed` |
| `activityFriction` | **retry**: `retry.requested`/`hint.requested` por missão; `structured_attempt.passed/submitted` por tipo de atividade | Pass-rate baixo com muitos retries = conteúdo/atividade gerando giro sem recuperação |
| `verificationHealth` | **saúde do gate**: `verification.state_changed` por estado (verified/rejected/pending/gateway-unavailable) | Muito `gateway-unavailable` no deploy estático é esperado; `rejected` alto pede investigação do verificador |
| `rendererDegraded` | degradação de render (fallback, reasons, engineId) | Sinal de acessibilidade/compatibilidade por engine |
| `moduleCompletionMedian` | mediana de conclusão por módulo `ia_pratica` (catálogo lido em runtime; ilegível ⇒ `unavailable`, fail-closed) | Visão agregada por módulo, não por lição |
| `retention` / `wideCohortRetention` | **retorno**: R1/R7/R21 acumulado vs estrito, coorte estreita (1ª missão concluída) vs larga (onboarding concluído); `reviewReturn` = sessão de retorno com revisão | Sinal de ritmo diário/semanal; coorte estreita é a primária |
| `activationDetail` (v4) | sessões OS por **tipo de entrada** (`onboarding.started`=first-visit × `journey.returned`=returning × `unclassified` canário) com alcance in-sessão; + split literacy da prop `entry` (`home`/`lesson-resume`/`onboarding`/`not-instrumented-pre-v4`/`no-entry-event`) | Responde R7a: 100% das sessões com evento de entrada; `lesson-resume` = retomada pós-reload (o "deep-link" do 1º relatório — termo aposentado) |
| `briefExposure` (v4) | segmentos R3 por sessão: **saiu no brief** (started∧brief∧¬1ª atividade) × **saiu na 1ª atividade** (viu e não submeteu) × submeteu × **resíduo sem brief** (canário de emissão, não segmento de aprendiz); dwell em bins `<15s`/`15-60s`/`1-5min`/`>5min`; medianas contínuas (b)/(c) | Rótulos medem **comportamento observado (exposição)**, nunca leitura ou compreensão — ver o glossário binding do próprio report; bloco `hostedMissions` cobre só `engineId=literacyDojo` (voxelDojo não emite nesta onda — adoção é follow-up) |
| `probeClassification` (v4) | classificação **determinística** de tráfego sintético por marcador (`probe.` novo + legados `aid###-`/`qa-`/UUID sequencial) — diagnóstico | Não altera as outras seções (semântica v3 preservada); use-a para excluir sondas DA SUA LEITURA com os números em mãos |

Regras de leitura: célula `suppressed (n<k)` **não é** zero nem baixo — é
não-publicável; use o `n` apenas para saber que houve tráfego. Em recortes
pequenos, cite denominadores (`6/17`), nunca só percentuais. Não conecte
taxas do funil a afirmações de aprendizagem ou domínio.

## 5. Registrar a leitura

Anexe `relatorio-p6.json`/`.md` como work product datado (ex.:
`_work-products/AID-<execucao>/funil-<data>.md`) e cite no comentário da issue
de execução: janela UTC coberta, `totalEvents`/`duplicateEvents`, seções
suprimidas e conclusão em uma frase por seção. Nunca anexe NDJSON bruto.
