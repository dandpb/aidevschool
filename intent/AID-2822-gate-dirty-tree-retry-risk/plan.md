# Plan — AID-2822-gate-dirty-tree-retry-risk

Status: approved
Aprovação: blocos "Fix sugerido" da própria AID-2822 (fast path para fix bornido,
mesmo regime de AID-2731/AID-2762). Auto-verificação produtora + countersign de
run distinta (AID-2754) ANTES do merge — produtor desta run é Platform & CI
Engineer, o veredito independente vem de outra run/agente.

Passos:

1. `factory/gitwork.py` — `TreeState` ganha `dirty: list[str]` (default `[]`);
   `capture_tree_state` classifica toda linha do porcelain (`??` → untracked,
   resto → dirty); `to_dict` expõe `dirty`; `tree_drift` bloqueia snapshot
   verify com dirty; `post_check_drift` bloqueia dirty pós-checks.
2. `factory/coordinator.py` — auditoria de prove acrescenta blocker para
   rastreado modificado na worktree do autor; `resume()` herda risco
   (`state["risk"]` → fallback evento da fila → fail-closed `CoordinatorError`
   sem spawn e sem persistir attempts).
3. `factory/tests/test_p4_cleanroom.py` — teste S3b existente passa a esperar
   o block fail-closed em prove (semântica fortalecida, não relaxada).
4. `factory/tests/test_p4_tree_integrity_2822.py` — regressões F6/F2:
   (a) repro do stress (sed rastreado entre build e prove → prove bloqueia
   fail-closed, sem `verified`, gate block); (b) unidade `capture_tree_state`
   (modificado/staged/limpo); (c) unidade `tree_drift`/`post_check_drift`
   (dirty verify / dirty pós-checks); (d) check que muta rastreado na
   clean-room → drift bloqueante; (e) retry herda `medium` (e segunda geração
   mantém); (f) risco indeterminável → fail-closed sem spawn.
5. `factory/README.md` — seção "Árvore limpa fail-closed + retry com risco
   herdado (AID-2822)"; linha P4 da tabela de critérios atualizada.
6. Auto-verificação: `python3 -m pytest factory/tests/ -q` verde na íntegra
   na ponta `e0f6a3d8` + `py_compile` dos módulos tocados.
7. PR para main; veredito de run distinta antes do merge (AID-2754); receipt
   (comandos + saídas-chave) na AID-2822.

Aceite checkável = fix + testes + README + pytest verde + PR com countersign
de run distinta.
