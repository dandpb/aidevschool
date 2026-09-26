# Intent — AID-2732 · header canônico de plan.md aceito pelo freeze

Problema (B5/F0, 3 fontes independentes no FACTORY-STRESS): o freeze da
fábrica rejeita o registro canônico do repositório porque o regex
`PLAN_APPROVED` exige `Status:` em início de linha; o template SDLC
canônico carrega o status inline na linha `Change-id:`
(`... · Status: approved`).

Impacto: bloqueante para qualquer POC de estresse que congele contrato
no formato canônico de `main` (execução AID-2729 → F0; AID-2734;
AID-2732 com repro de 3 fontes).

Valor: desbloqueia o programa FACTORY-STRESS e reduz a fricção de
entrada da fábrica — o contrato passa a aceitar o formato de plan.md
que o repo já usa, sem duplicar template.
