# Plan — AID-2687-review-reschedule

Status: approved

Aprovação: AID-2687 (programa FACTORY-STRESS, GO do CEO publicado no thread;
dono do motor de progressão é o autor). O congelamento exige `Status:
approved` no plan.md antes do build (HTML §02); a revisão de merge humana
(QA countersign) permanece como gate de promoção final.

## Passos

1. Editar `engines/aiDevschoolMvp/aidevschool/scripts/_state_transitions.py`
   (ramos review de pass/fail limpam `next_review_ts`).
2. Espelhar a limpeza no fold de `replay.py` (state_transition a partir de
   REVIEW_DUE).
3. Acrescentar INV-5 (transição) e INV-6 (e2e schedule → gate_check → schedule
   → replay) em `tests/acceptance/test_review_ladder.py`.
4. Rodar a suíte do engine + suite completa do repo (make test-core
   equivalente: pytest com os testpaths do pyproject).

## Riscos & mitigação

- Paridade de replay: espelhada no mesmo PR; INV-6 etapa 4 fecha o ciclo.
- Regressão de determinismo: nenhum relógio/ULID novo; fixtures fixas.

## Verificação (checks congelados em checks.md)

C1 suíte de revisão; C2 suíte completa do engine (standard, verificador);
C3 replay/determinismo alvo.
