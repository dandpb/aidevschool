# Plan: AID-2734-plan-status-inline — parser tolerante ao header canônico (Status inline)

Change-id: AID-2734-plan-status-inline · From: intent/AID-2734-plan-status-inline/spec.md · Status: approved

Aprovação: ORDEM do CEO (AID-2761, sweep AID-2760) com critérios de aceite
checkable de AID-2734; veredito SM first-hand em AID-2729. Fast path
autorizado para fix bornido (padrão AID-2726); produtor≠verificador (P3) e
countersign não dispensados. Este plan.md usa o header canônico inline do
template — o próprio fix é provado no freeze deste registro (dogfood).

## Files that change

- `factory/contract.py` (modificado) — `PLAN_APPROVED` passa a casar
  `Status: approved` também inline após o separador "·" do template.
- `factory/tests/test_f0_plan_status.py` (novo) — contrato mútuo
  template↔parser + negativos + freeze end-to-end com header canônico.
- `factory/README.md` (modificado) — nota do formato aceito (inline e legado).
- `intent/AID-2734-plan-status-inline/` (novo) — este registro.

## Order of work

1. Repro first-hand do loop do README com change-id canônico (rc=1) — feito
   na base 5c40b8d7, receipt colado na thread AID-2734.
2. Parser tolerante em `factory/contract.py` (regex `(?:^|·)` + boundary).
3. Testes de contrato mútuo (template renderizado) + negativos
   (draft inline, valor estranho, ausência, boundary).
4. Reexecutar o loop do README → freeze rc=0 (retry idempotente sobre a
   run FE-1 que falhou pré-fix — dogfood AID-2726).
5. Loop completo do próprio fix (intake → … → gate) + PR com `Countersign:`.

## Risks

- Regex permissiva demais poderia aprovar registro não-aprovado — mitigado
  por boundary `\b` + negativos (`approval-pending`, `review`, `draft`).
- Drift futuro template↔parser — mitigado pelo teste de contrato mútuo que
  renderiza o template REAL (`docs/sdlc/templates/plan.md`).
- Alternativa (b) (reformatar 34 registros) considerada e NÃO escolhida
  (blast radius maior; decisão registrada em AID-2734).

## Proof

- `python3 -m factory freeze FE-1 --change-id AID-2676-agentic-factory-poc
  --context agent-author` → rc=0, digest impresso (critério 1 de AID-2734).
- `python3 -m pytest factory/tests/test_f0_plan_status.py -q` → all green.
- `python3 -m pytest factory/tests/ -q` → all green (critério 3).

## Verification split

Verificador de contexto distinto (countersign QA em run separada, padrão
AID-2759/AID-2733): confere diff contra este plan + spec, reexecuta o loop
do README na árvore do PR e os negativos; veredito ANTES do merge.
