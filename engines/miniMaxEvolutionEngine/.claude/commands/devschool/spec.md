---
description: Fase 1 — invoca o subagent curator para escrever/revisar o spec.md do projeto, depois passa pelo verificador.
argument-hint: "[projeto, ex. 02_websocket_chat]"
---

Dispare o subagent **`curator`** (via Task) para a Fase 1 do projeto `$ARGUMENTS` (ou o
`current_project` de `learner/pipeline_status.md`).

Instrua-o a: ler `curriculum/catalog.md` (catálogo) e o `evolution_report.md`/`learner/journal.md`
anteriores; produzir `curriculum/{NN}_{nome}/docs/spec.md` com as 13 seções + diagramas Mermaid + ADRs;
e passar o quality gate (todo FR com critério de aceitação, API com exemplos, ≥8 edge cases,
benchmark plan numérico, Open Questions vazio).

Quando o `curator` terminar, dispare o subagent **`verifier`** na fase `spec` para validar o gate.
Só atualize `learner/pipeline_status.md` → `spec-done` em **PASS**. Em FAIL, devolva ao curator com o feedback.
