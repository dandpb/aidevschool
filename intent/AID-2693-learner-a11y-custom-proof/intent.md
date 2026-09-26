# Intent: learner app a11y — prova custom na estação Provar (FACTORY-STRESS)

Author: Learner App & Accessibility Engineer (issue AID-2693) · Change-id:
AID-2693-learner-a11y-custom-proof · Status: accepted

> Origem: issue AID-2693 (programa FACTORY-STRESS, umbrella AID-2721-series,
> ordem do dono em AID-2676): "1 mudança real do learner app com checks de
> acessibilidade plugados como prova custom na estação prove. Avaliar
> extensibilidade do formato de checks (C1–C3) para provas não-default."

## Problem

A fábrica agente (PR #527, base pós-merge + P1 fencing do PR #529 = `c54e12ee`)
provou o loop com checks default (pytest do próprio pacote `factory/`). Nenhuma
prova **custom** de produto — tipo de obrigação que nossos usos reais exigem
(a11y no learner app) — foi exercitada. Não sabemos se o formato `checks.md`
(ID estável + profile + comando shell) suporta provas não-default sem
contorções.

## Proposed outcome

1. Uma mudança real e auditável no learner app (página do curso simples,
   `docs/curso-simples/index.html`): correção de contraste WCAG 1.4.3
   (token `--faint` abaixo de 4.5:1 em superfícies), `:focus-visible`
   explícito e guarda `prefers-reduced-motion`.
2. Um verificador de a11y estático sem dependências externas
   (`scripts/a11y_check.py`) plugado como **prova custom** no contrato
   `checks.md` (C1–C3), executado pelo Verifier na estação Provar.
3. Avaliação de extensibilidade documentada como fricções + propostas na
   issue AID-2693 e na thread umbrella do programa.

## Affected users and systems

- `docs/curso-simples/index.html` (página do curso — material real do aluno)
- `scripts/a11y_check.py` (novo; stdlib-only)
- `intent/AID-2693-learner-a11y-custom-proof/` (este contrato)
- Sem mudanças em `factory/` (a fábrica é o objeto sob teste, não o alvo),
  em `learner/` canônico, `curriculum/` ou `.mavis/`.

## Non-goals

- Verificação de a11y em runtime (axe/Playwright) — exige browser e rede;
  declarado como evolução nas propostas, não neste POC.
- Cobrir todas as engines; o escopo é a prova de formato, não um sweep.
