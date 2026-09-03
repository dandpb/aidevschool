# Leitura do funil OP-B — procedimento (executar somente após ativação pelo board)

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

- O relatório F2b lê o NDJSON do **coletor do OS** (vocabulário de 12 eventos
  do `codexdojo-os-prototype`). A entrada do piloto P6 é o **LiteracyDojo
  avulso**, cujo sink (`VITE_ANALYTICS_ENDPOINT`, ADR-0009) emite
  `source:"literacydojo"` — envelope que o coletor do OS **rejeita com 422**
  (`unsupported-schema`). Recepção literacy é decisão futura de ativação; até
  lá, o funil abaixo só produz números para a superfície **OS**.
- **k-anonimato n≥5 é imutável.** Com 1–3 instalações do piloto, **toda célula
  agregada fica suprimida** (só o `n` aparece). Nessa escala o valor desta
  leitura é o **dry-run do pipeline** (coleta → sem drift → agregação roda →
  nenhum identificador publicado), não métricas de funil. A evidência do P6
  em si é a [ficha manual](FICHA_P6.md); células publicáveis só passam a
  existir com ≥5 instalações distintas por célula.
- O funil mede **retorno à experiência**, nunca aprendizagem ou competência
  (`mastered` é proibido em analytics).

## 1. Exportar o NDJSON coletado

Copie do backing definido na ativação os arquivos diários
`events-<AAAA-MM-DD>.ndjson` (dia UTC) para um diretório **fora do repo**
(ex.: `/tmp/p6-funil/`). NDJSON real nunca é commitado; relatórios finais são
work products datados (`_work-products/`).

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

## 4. Como ler o relatório (reportVersion 2)

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

Regras de leitura: célula `suppressed (n<k)` **não é** zero nem baixo — é
não-publicável; use o `n` apenas para saber que houve tráfego. Em recortes
pequenos, cite denominadores (`6/17`), nunca só percentuais. Não conecte
taxas do funil a afirmações de aprendizagem ou domínio.

## 5. Registrar a leitura

Anexe `relatorio-p6.json`/`.md` como work product datado (ex.:
`_work-products/AID-<execucao>/funil-<data>.md`) e cite no comentário da issue
de execução: janela UTC coberta, `totalEvents`/`duplicateEvents`, seções
suprimidas e conclusão em uma frase por seção. Nunca anexe NDJSON bruto.
