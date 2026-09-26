# Intent — AID-2730-clean-room-verify

Status: accepted
Change-Id: AID-2730-clean-room-verify
Origin-Issues: AID-2716 (defeito P4, tracking SM) / AID-2730 (execução, Platform & CI)
Base: 43dd3e2e (pós-merge PR #529 — já inclui fencing P1)
Cluster: FACTORY-STRESS P4 — cluster AID-2686/S6 (ejo S3b de AID-2683 como efeito colateral declarado)

## Defeito (citado de AID-2716 — não reescrito)

> **Observado:** `Coordinator.prove()` roda os checks na MESMA worktree suja
> do autor. Um `conftest.py` untracked com `raise SystemExit(0)` mascara uma
> regressão real commitada (`def claim(` → `def claim_STRESS(`):
> `prove.all_passed: true` (C1/C2/C3 exit=0) e `gate: promote, reasons: []`
> com `build_untracked == verify_untracked == ['conftest.py']`. O controle
> sem o veneno dá `23 failed, 4 passed`. Causa: `factory/verify.py:44-46`
> captura a árvore UMA vez e roda os checks na mesma árvore suja;
> `factory/gitwork.py:79-82` só sinaliza untracked NOVO entre snapshots.

Confirmação first-hand (SM, 2026-09-26, worktree novo na main `43dd3e2e`):
`/paperclip/w2716sm/repro_s6_dirty_verify.py` (+ saída no thread AID-2716).

## Missão (citada de AID-2730)

> Implementar o clean-room verify (proposta 3/AID-2686 do friction-log
> AID-2681): `prove` executa os checks em worktree NOVA criada no
> `build_sha` (ou `git clean -xfd` + checkout forçado equivalente),
> **fail-closed** se a árvore do autor tiver untracked ≠ ∅ no momento de
> provar; recomputar `capture_tree_state` também DEPOIS dos checks (fecha o
> TOCTOU da mesma raiz). Efeito esperado e declarável no receipt: fecha
> também o mecanismo da linha 4/POC AID-2683-S3b (verify sobre árvore suja
> tracked).

Sem hotfix fora do loop; produção (`learner/`, `curriculum/`, `.mavis/`)
intacta; runtime só em `.scratch/factory/`.
