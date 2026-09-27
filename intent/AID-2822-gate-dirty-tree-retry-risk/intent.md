# Intent — AID-2822-gate-dirty-tree-retry-risk

Status: accepted
Change-Id: AID-2822-gate-dirty-tree-retry-risk
Origin-Issues: AID-2822 (F6/F2 do stress AID-2700, receipt comentário 15789dc2)
Base: e0f6a3d8 (ponta corrente de origin/main, pós PR #532/AID-2730 clean-room)
Cluster: FACTORY (AID-2676) — hardening de gate, sem chamador produto/CLI

## Defeitos (citados de AID-2822 — não reescritos)

> **F6 (grave) — prova examina árvore suja; commit promovido ≠ evidência selada**
> `factory/gitwork.py capture_tree_state` só captura linhas `??` do `status --porcelain`.
> Arquivo **rastreado modificado** entre o commit do build e o prove é invisível ao gate.
> […repro executada no stress com promote rc=0: sed flip `Status: proposed → accepted`
> SEM commit entre build e prove; `examined_sha` ancora a prova ao SHA do commit, mas os
> checks rodaram sobre árvore diferente da árvore do commit.]
> Fix sugerido: `capture_tree_state` registrar toda linha do porcelain; prove exigir
> árvore limpa (fail-closed) OU `tree_drift` bloquear modificados-rastreados entre
> build e verify. Regressão negativa em `factory/tests/`.

> **F2 — `resume()` reseta risk="low"; X5 vira bypassável no retry**
> evento de retry é criado com `risk="low"` hardcoded. Run original medium exigia
> revisão humana (X5); a retomada da MESMA decisão promoveu sem revisão.
> Fix sugerido: retry herdar o risco do evento original (e, para decisões, a exigência
> de revisão viajar junto).

## Estado da ponta (verificado first-hand na base `e0f6a3d8`)

O clean-room verify (PR #532, AID-2730/AID-2716) já fecha o vetor de execução do
repro F6: os checks rodam em worktree NOVA no `build_sha`, nunca na worktree do
autor. Restam abertos na ponta, confirmados por leitura de código:

- `capture_tree_state` continua `??`-only (`TreeState` não tem noção de rastreado
  modificado) — a auditoria da worktree do autor em `prove` não vê o sed do repro
  (SHA não move, sem untracked) e o `post_check_drift` não vê mutação rastreada
  DURANTE os checks na clean-room (TOCTOU tracked).
- `resume()` (coordinator.py) ainda cria o evento de retry com `risk="low"`
  hardcoded, enquanto o state já carrega `risk` desde AID-2719 (X5) — o retry
  rebaixa medium→low e degrava a exigência de revisão humana no gate seguinte.

## Missão

Fechar os dois buracos remanescentes na ponta: árvore suja rastreada visível e
fail-closed em prove/pós-checks/tree_drift; retry herda o risco de origem com
fail-closed quando o risco é indeterminável.
