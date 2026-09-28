# Spec — clean-room verify na estação Provar (P4)

Comportamento exigido (aceite AID-2730, itens 1–3):

1. **Clean-room:** `Coordinator.prove` NUNCA executa checks na worktree do
   autor. Antes dos checks, a árvore do autor é auditada:
   - `sha(author_worktree) == build_sha` do recibo de build (árvore pinada);
   - untracked significativo (excluídos artefatos gerados por tooling:
     `__pycache__/`, `.pytest_cache/`, `*.pyc/.pyo`, `.coverage`) == ∅.
   Qualquer violação ⇒ run `blocked` com recibo
   (`detail.clean_room=true`, `detail.reasons`), `CoordinatorError`,
   **sem** transição `verified` no ledger e **sem** promote (fail-closed).
2. **Checks no `build_sha`:** aprovada a auditoria, os checks do contrato
   rodam em worktree NOVA (`<home>/worktrees/<run-id>-cleanroom`) criada
   exatamente no `build_sha`; `state.json` registra `verify_worktree`,
   `verify_sha` (o SHA onde os checks rodaram) e `verify_untracked`
   (significativo; artefatos gerados vão para `verify_generated_untracked`,
   transparência sem bloqueio).
3. **TOCTOU fechado:** `capture_tree_state` re-executado APÓS os checks na
   clean-room (`gitwork.post_check_drift`): SHA movido ou untracked
   significativo novo DURANTE a execução ⇒ drift bloqueante (run `blocked`
   com recibo, sem `verified`, sem promote).
4. **Gate coerente:** `gate` sobre run bloqueada em prove (sem
   `verify_sha`) devolve `block` com os motivos de bloqueio — nunca promove
   estado não-verificado.
5. **Regressões:** S6 adaptado como negativo em
   `factory/tests/test_p4_cleanroom.py` (veneno untracked presente em build
   E verify NÃO promove — bloqueia com motivo) + caso TOCTOU mínimo +
   efeito colateral S3b (AID-2683: tracked-dirty do autor não mascara
   regressão — checks na clean-room veem o commit) + tolerância a artefatos
   gerados pelas ferramentas de check.

Invariantes preservados: fencing P1 (AID-2718/AID-2721) intacto em todas as
estações; cadeia do ledger verificável; producer ≠ verifier (P3) intacto;
baseline 27/27 verde + 5 novos testes; runtime só em
`.scratch/factory/` (home fora do Git).
