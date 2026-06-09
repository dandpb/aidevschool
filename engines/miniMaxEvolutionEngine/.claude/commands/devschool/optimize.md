---
description: Fase 5 — invoca o subagent optimizer (gargalos → UMA otimização por linguagem → re-medição → evolution_report.md), depois o verificador. Fecha o ciclo.
argument-hint: "[projeto opcional]"
---

Dispare o subagent **`optimizer`** (via Task) para a Fase 5 do projeto `$ARGUMENTS` (ou o
`current_project`). Pré-condição: `learner/pipeline_status.md` em `benchmark-done`.

Instrua-o a: identificar top 2–3 gargalos (com evidência dos números), aplicar **UMA** otimização por
linguagem (isolar impacto), garantir que os testes continuam passando, re-rodar o benchmark (mesmos
scripts, N≥3) e calcular deltas, documentar ≥1 otimização **rejeitada**, e escrever `evolution_report.md`
(Antes/Depois, ≥3 insights cross-language ancorados em números, decisão loop-de-novo vs maduro).
Disciplina: meça antes e depois; sem otimização prematura; sem metric gaming; documente trade-offs.

Quando terminar, dispare o subagent **`verifier`** (fase `optimize`): testes ainda passam, 1 claim de
otimização re-verificado (±20%), Antes/Depois completo, rejeitadas presentes. Só atualize
`learner/pipeline_status.md` → `cycle-complete` em **PASS**, acrescente ao `learner/journal.md` e sugira
`/devschool-next`.
