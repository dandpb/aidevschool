---
description: Fase 3 — invoca o subagent reviewer (code review com severidade + comparação cross-language + learning_notes + quiz), depois o verificador.
argument-hint: "[projeto opcional]"
---

Dispare o subagent **`reviewer`** (via Task) para a Fase 3 do projeto `$ARGUMENTS` (ou o
`current_project`). Pré-condição: estado YAML-first em `impl-done` (as 3 implementações verificadas).

```yaml
phase: review
producer: reviewer
verifier_phase: review
next_status: review-done
pre_condition: impl-done
artefact: curriculum/{project}/docs/code_review.md
```

Invoque `run_phase(spec)` usando a declaração acima.

Instruções ao produtor (`reviewer`):

- Entradas: `curriculum/{project}/docs/spec.md`, o código real em `{go,rust,node}-impl/`,
  `learner/journal.md` e `learner/pitfalls.md` (para não repetir feedback já internalizado).
- **Artefatos pré-existentes são rascunhos não-verificados.** Se `docs/code_review.md`,
  `docs/learning_notes.md` ou `docs/quiz.md` já existirem de um ciclo anterior sem PASS do
  verificador, revalide cada issue contra o código atual antes de reaproveitar qualquer linha —
  nada de rubber-stamp.
- Produza `docs/code_review.md` (tabela-resumo Critical/Major/Minor/Educational por impl; issues
  `[SEVERITY-NNN]` com `Arquivo: path:linha` **real**; as 7 categorias cobertas; comparação
  cross-language de concorrência/erros/estado; `npm audit`/`cargo audit`/`govulncheck` quando
  possível), `docs/learning_notes.md` (idioms, quando usar cada linguagem, as 6 perguntas
  pedagógicas) e `docs/quiz.md` (≥5 questões de compreensão com gabarito + explicação), e
  acrescente ≥1 generalização nova ao `learner/journal.md`.
- **Evidência obrigatória:** toda issue aponta para arquivo:linha existente e cita o trecho que a
  sustenta. Sem trecho, sem claim. Postura: rigorosa mas pedagógica; elogie o que está bom.

Quando o `reviewer` terminar, dispare o subagent **`verifier`** (fase `review`) como Task novo, sem
nenhum contexto do produtor além dos artefatos no filesystem: ele confere 3 issues ao acaso
(file:line reais no código atual), consistência de severidade, as 7 categorias e a qualidade do quiz.
Só em **PASS** atualize o YAML por `save_status`: `phase: review-done`, `awaiting: benchmarker`,
`agents.reviewer: done` + nota com os artefatos produzidos. Em FAIL, devolva o feedback concreto ao
`reviewer` (respeite `retry_limit`). Próximo comando: `/devschool-benchmark`.
