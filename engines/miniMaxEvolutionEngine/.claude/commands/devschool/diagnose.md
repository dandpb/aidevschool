---
description: Roda o learning gate (Ágora Continuum) — invoca o subagent sonda para diagnosticar o aprendiz na unidade ativa antes de liberar a implementação.
argument-hint: "[unidade opcional, ex. U1-...]"
---

Learning gate atual:
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learning_state)"`

Dispare o subagent **`sonda`** (via Task) para a unidade ativa (ou `$ARGUMENTS` se informado).
Passe a ele: o `active_unit` do learning_state, o `spec.md` do projeto, e o `learner_profile.md`.

Quando o `sonda` retornar:
- Se `GATE: BLOCKED` → apresente ao usuário o **desafio de tentativa** e PARE. Não implemente.
  A implementação só é liberada quando o aprendiz tentar e a tentativa for avaliada com evidência
  executável (`unblock_condition: learner_attempt_evaluated`).
- Se `GATE: UNBLOCK_RECOMMENDED` → atualize `learner/learning_state.yaml`:
  `active_unit.state: practicing→evaluating` conforme o caso e `gate.implementation_blocked: false`,
  e diga que `/devschool-implement` está liberado.

Seja socrático: não entregue a solução. Peça a tentativa do aprendiz e o ponto exato de confusão.
