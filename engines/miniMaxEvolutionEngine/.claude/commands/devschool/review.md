---
description: Fase 3 — invoca o subagent reviewer (code review com severidade + comparação cross-language + learning_notes + quiz), depois o verificador.
argument-hint: "[projeto opcional]"
---

Dispare o subagent **`reviewer`** (via Task) para a Fase 3 do projeto `$ARGUMENTS` (ou o
`current_project`). Pré-condição: `learner/pipeline_status.md` em `impl-done` (as 3 implementações verificadas).

Instrua-o a produzir `code_review.md` (severidades Critical/Major/Minor/Educational, 7 categorias,
comparação cross-language, audits de dependência), `learning_notes.md` (idioms + quando usar cada
linguagem + as 6 perguntas pedagógicas) e `quiz.md` (testa compreensão), e acrescentar ≥1
generalização ao `learner/journal.md`. Postura: rigoroso mas pedagógico; elogie o que está bom.

Quando terminar, dispare o subagent **`verifier`** (fase `review`): ele confere 3 issues ao acaso
(file:line reais), consistência de severidade, as 7 categorias e a qualidade do quiz. Só atualize
`learner/pipeline_status.md` → `review-done` em **PASS**.
