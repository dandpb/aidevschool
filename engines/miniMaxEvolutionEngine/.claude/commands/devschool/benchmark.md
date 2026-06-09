---
description: Fase 4 — invoca o subagent benchmarker (k6: 4 cenários × 3 impls, N≥3, métricas comparativas), depois o verificador.
argument-hint: "[projeto opcional]"
---

Dispare o subagent **`benchmarker`** (via Task) para a Fase 4 do projeto `$ARGUMENTS` (ou o
`current_project`). Pré-condição: `learner/pipeline_status.md` em `review-done`.

Confirme que isto roda em **ambiente isolado** (Docker). Instrua-o a: buildar as 3 imagens, escrever
os 4 cenários (baseline/stress/spike/endurance, lendo `TARGET_PORT` de `__ENV`), rodar N≥3 por
cenário × impl, salvar JSONs brutos em `benchmarks/results/{lang}/`, e escrever `benchmark_results.md`
(ambiente+metodologia, tabela-resumo, análise por cenário, gargalos, recomendações, limitações).

Regras de honestidade: mediana+desvio; nada de vencedor em diferença < 10% E p > 0.05; registre o
throttling de CPU do Docker Desktop no macOS como caveat.

Quando terminar, dispare o subagent **`verifier`** (fase `benchmark`): ele re-roda o menor cenário
(±20%), confere a tabela completa (sem TBD), os JSONs (N≥3) e a seção de limitações. Só atualize
`learner/pipeline_status.md` → `benchmark-done` em **PASS**.
