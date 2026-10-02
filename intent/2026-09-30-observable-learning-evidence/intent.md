# Intent — AID-3515: evidências de aprendizagem observáveis

- **Change-id:** `2026-09-30-observable-learning-evidence`
- **Issue:** AID-3515 (Definir evidências de aprendizagem observáveis)
- **Tipo:** docs + tooling offline (dicionário versionado + cálculo reproduzível sobre fixtures sintéticas + testes de controle negativo). **Zero mudança em coletor/emissores/produção.**
- **Data:** 2026-09-30 · **Dono:** Learner Analytics Engineer

## Problema

A escola precisa de um plano de medição útil derivado do contrato atual de
analytics/evidência (ADR-0009, ADR-0010, schemas `learner/analytics_events/`)
e das duas práticas de transferência (AID-3506 / PR #619 @ `7259dbc5`),
diferenciando visita, tentativa, erro, feedback, retry, conclusão,
retenção/retomada e transferência — com conclusão/simulação ≠ mastery —
sem instrumentar produção.

## Mudança

1. `learner/analytics_metrics/dictionary.yaml` — dicionário de métricas
   **versionado (v1)**: observáveis, métricas (definição + fonte + fórmula),
   riscos de dupla contagem, limites de inferência, público (dev/cotidiano),
   status honesto (`measurable_now` | `not_measured`).
2. `learner/analytics_metrics/compute.py` — cálculo reproduzível sobre
   fixtures: dedup por `eventId`, funil por sessão, retry, erro, retomada,
   transferência (canal de evidência), supressão k≥5, saída JSON+MD.
3. `learner/analytics_metrics/fixtures/synthetic/` — fixtures 100% sintéticas
   rotuladas (nenhum dado de aluno real; exemplos autorais de calibração).
4. `learner/analytics_metrics/tests/` — controles negativos contra dupla
   contagem (evento duplicado, reload, retry, k-supressão, proibição de
   `mastered`, transferência insuficiente ≠ conclusão, ausência = não medido).
5. `docs/metrics/AID-3515-evidencias-observaveis.md` — mapa
   eventos→observáveis, lacunas, limites de inferência (dev × cotidiano),
   exemplo de relatório (sintético rotulado), baseline real honesto
   (última leitura 2026-09-06; demais = não medido), próxima instrumentação
   mínima + dependências.

## Não-metas

- Não muda coletor/retention/consentimento/segurança (ADR-0009/0010 intactos).
- Sem dashboard/serviço/monitor pago; sem publicar resultados de alunos
  fictícios como reais; sem merge/deploy; PRs #610–#616 intocados.

## Verificação

`python3 -m pytest learner/analytics_metrics/tests/ -q` (controles negativos)
+ `python3 learner/analytics_metrics/compute.py --fixtures … --emit-md …`
(reprodutibilidade: saída commitada é regenerável byte-a-byte).
