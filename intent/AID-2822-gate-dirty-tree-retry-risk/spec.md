# Spec — AID-2822-gate-dirty-tree-retry-risk

## F6 — invariantes de árvore limpa (P4)

1. `capture_tree_state` fotografa TODA linha do `git status --porcelain`:
   `??` → `untracked`; qualquer outra linha (modificado/deletado/renomeado/
   staged em índice ≠ HEAD) → `dirty`. `TreeState.to_dict()` expõe `dirty`.
2. Auditoria da worktree do autor em `prove` (política clean-room) exige árvore
   LIMPA: além de SHA pinado no recibo de build e sem untracked significativo,
   qualquer rastreado modificado → blocker `P4 clean-room` → estação
   `blocked` + recibo (ator verifier, `clean_room: true`) + `CoordinatorError`.
   Fail-closed antes de qualquer transição `verified`.
3. `post_check_drift`: rastreado modificado APÓS os checks na clean-room
   (mutação durante a execução) é drift bloqueante — as provas seladas
   carregam `examined_sha` do snapshot ANTERIOR; prova sobre árvore que mudou
   no intervalo não é evidência do commit.
4. `tree_drift`: snapshot verify com `dirty` não-vazio é motivo P4 (defesa em
   profundidade no gate; a janela principal já fecha em 2 e 3).

Compatibilidade: `dirty` tem default `[]` — snapshots/estados legados continuam
líveis; nenhuma chave nova é obrigatória em `state.json`.

## F2 — retry herda risco

1. O evento de retry gerado por `resume()` em run `blocked` herda o risco da
   decisão de origem: `state["risk"]` (congelado no freeze a partir do evento,
   AID-2719 X5); se ausente (run legada pré-X5), relê o evento da fila.
2. Risco indeterminável (sem state e sem evento na fila) → `CoordinatorError`
   fail-closed SEM spawnar retry e SEM persistir o incremento de `attempts`:
   spawnar `low` por default é exatamente o bypass F2.
3. História não é reescrita: retries já criados como `low` por código antigo
   permanecem (fila é append-only por ID); a correção vale para novos retries.

## Fora de escopo

- Reescrever eventos antigos da fila ou migarção de state legado.
- Exigir árvore limpa na estação build (a auditoria de prove é o chokepoint;
  dirty que não sobrevive até prove não afeta evidência — a clean-room examina
  o commit, não a worktree do autor).
- Exenção de artefatos gerados para `dirty` (artefatos gerados são untracked;
  rastreado modificado é sempre semântico).
