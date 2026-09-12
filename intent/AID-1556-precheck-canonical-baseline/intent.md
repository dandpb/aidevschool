# Intent: PRECHECK CANONICALIZADO — baseline versionado em scripts/precheck/ com self-test

Author: Platform & Release Engineer (Paperclip AID-1556) · Change-id: AID-1556-precheck-canonical-baseline · Status: accepted

> Origina da issue Paperclip AID-1556 (P1 da auditoria AID-1526 §3.1), atribuída
> a este papel. Plano da issue, citado sem reescrita:

> "1. Criar `scripts/precheck/` com o script baseline refatorado: checks
> declarativos (id, familia, alvo draft|alias|ambos) + ancoras de conteudo
> (contentVersion etc.) em arquivo de configuracao por onda.
> 2. Self-test sintetico (padrao `scripts/sdlc_guard_check.sh --self-test`):
> violacoes sinteticas devem falhar.
> 3. Modo `--wave <config>` para a onda corrente; modo dry-run local (sem rede)
> para CI.
> 4. Nao enfraquece nenhum check existente: os 72 checks da ancora AID-935
> permanecem; calibracao de coberturas com QA Lead antes de qualquer remocao."

## Problem

O precheck de promoção (gate de 72 checks do pipeline draft→precheck→alias)
vive em `_work-products/<onda>/precheck-<sha>.mjs`, copiado/adaptado a cada
onda (ancestral AID-821 → AID-935 renomeou ids e cresceu 22 → 72 checks). Sem
baseline versionado nem self-test, o drift entre ondas é silencioso — o maior
risco de integridade do gate (evidência na auditoria AID-1526, §3.1, P1).

## Proposed outcome

- Um runner versionado (`scripts/precheck/`) com checks declarativos e
  âncoras por onda em `waves/<config>.json`; a onda corrente (âncora
  AID-935 @ 65d64bca) fica pinada com os mesmos 72 check ids.
- Self-test offline (mesmo contrato do `sdlc_guard_check.sh --self-test`):
  superfícies sintéticas em loopback; violações sintéticas DEVEM falhar.
- Dry-run offline para CI + job próprio no ci.yml (self-test + dry-run).
- Zero mudança em produção; nenhum deploy; tooling apenas.

## Affected users and systems

Pipeline de promoção (docs/serving runbook §4 consumidor futuro), CI
(.github/workflows/ci.yml), times dev (todas as ondas de promoção futuras).
Nenhuma engine de produto é tocada.

## Constraints

- Sem enfraquecer check algum: predicados 1:1 da âncora AID-935; ids
  verbatim; remoção só com countersign QA Lead + ordem do founder.
- Zero deploy/alias/conta/serviço; free tier; CI continua < 10 min
  (job novo é offline e sem dependências).
- Write permitido em scripts/ e .github/ (charter do papel).
