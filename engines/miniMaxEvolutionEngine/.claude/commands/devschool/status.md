---
description: Mostra onde o pipeline AI DevSchool está (fase + learning gate) e recomenda a próxima ação.
argument-hint: "(sem args)"
---

Estado atual do pipeline (YAML-first via adapter, Markdown apenas fallback de cold start):
!`python3 -m engines.miniMaxEvolutionEngine.os_adapter 2>/dev/null || echo "(sem status YAML/Markdown)"`

Learning gate (`learner/learning_state.yaml`):
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learner/learning_state.yaml)"`

Você é o **Orquestrador** do AI DevSchool. Com base no estado acima:

1. Resuma em 2–3 linhas onde estamos (projeto, fase, estado da unidade de aprendizado).
2. Diga se o `gate.implementation_blocked` está ativo — se sim, a próxima ação é `/devschool-diagnose`
   (não implementar antes do aprendiz tentar e ser avaliado).
3. Recomende a **próxima ação concreta**: qual slash command rodar e qual subagent ele dispara.
4. Aponte qualquer bloqueio (`blockers`) ou inconsistência entre o estado efetivo YAML-first e o learning gate.

Não execute nenhuma fase agora — apenas oriente.
