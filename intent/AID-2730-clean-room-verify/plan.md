# Plan — AID-2730-clean-room-verify

Status: approved
Aprovação: bloco "Missão"/"Aceite" de AID-2730 (fast path autorizado para fix
bornido; auto-verificação e revisão produtor≠verificador não dispensadas).

Passos (diff mínimo, sem toque em produção):

1. `factory/gitwork.py`: `is_generated_artifact`/`meaningful_untracked`
   (artefatos de tooling fora da contabilidade de drift) e
   `post_check_drift(before, after)` — drift DURANTE os checks.
2. `factory/verify.py`: `run_checks` fotografa a árvore ANTES e
   RE-CAPTURA DEPOIS dos checks; `VerifyResult` ganha `drift_reasons` e
   `generated_untracked`; `untracked` passa a ser o significativo.
3. `factory/coordinator.py`: `prove` audita a árvore do autor
   (SHA pinado + untracked significativo ∅; fail-closed com recibo
   `clean_room`), cria worktree nova no `build_sha`
   (`worktrees/<run-id>-cleanroom`) e roda os checks lá; drift pós-checks
   bloqueia. `gate` devolve `block` com motivos para run bloqueada em prove.
4. `factory/tests/test_p4_cleanroom.py`: S6 negativo adaptado + TOCTOU
   mínimo + S3b + tolerância a artefatos gerados + happy path clean-room;
   `test_factory_poc.py`: dois negativos P4 existentes re-adaptados ao
   enforcement (agora na estação Provar, fail-closed).
5. `factory/README.md`: linha P4 da tabela de gates documenta clean-room.
6. Auto-verificação: `python3 -m pytest factory/tests/ -q` (baseline 27 +
   novos, tudo verde) e dogfood do motor (freeze→build→prove→gate desta
   própria mudança) com veredito independente antes do merge.
