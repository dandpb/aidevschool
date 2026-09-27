# Intent — AID-2726-idempotent-station-resumption

Status: accepted
Change-Id: AID-2726-idempotent-station-resumption
Origin-Issues: AID-2726 (defeito FACTORY-STRESS, tracking SM) / AID-2735 (execução, Platform & CI)
Base: 43dd3e2e (origin/main vigente; pós-merge PR #529 — já contém o fencing AID-2721)
Cluster: FACTORY-STRESS S1 (retomada) — proposta 3 da umbrella AID-2681

## Defeito (citado de AID-2726 — não reescrito)

> **S1a BROKEN** — kill físico (rc=9) na janela do freeze: `contract_dir=True`,
> `state_json=False`; retry freeze → `ContractError: contract already frozen`;
> status/resume → `CoordinatorError: no run state`. Run irreversível sem
> `rm -rf` manual.
>
> **S1b BROKEN** — SIGKILL real (rc=-9) com autor em execução: worktree órfão em
> `<home>/worktrees/run-K2`; retry build → `GitError: git worktree add ... failed`
> (path já existe).
>
> **S1d LIMITATION (BAIXA)** — run chega a `promoted` SEM `receipt.summary.json`;
> re-chamada do gate recusa: `CoordinatorError: run is at promoted, not verified`
> (não idempotente p/ regenerar).

Confirmação first-hand (SM, 2026-09-26 ~03:2xZ, base `43dd3e2e`): repros S1a/S1b/S1d
do QA reexecutados em worktree nova → mesmos vereditos da base `2d9928f2`.

## Missão (citada de AID-2735)

> Implementar a **proposta 3 da umbrella AID-2681** (retomada idempotente por
> estação): gravar o state ANTES dos efeitos de cada estação (write-ahead,
> estação intermediária `freezing`); no build, reutilizar ou remover worktree
> existente antes de recriar; no gate, regenerar `receipt.summary.json` quando a
> run está promoted sem resumo.

**Escopo delimitado (não conflate):** NÃO inclui fencing de lease (executado —
AID-2721/PR #529), intake TOCTOU (AID-2727), exceções fora do contrato de saída
(AID-2728) nem âncora externa do ledger (proposta 2).

Sem hotfix fora do loop; produção (`learner/`, `curriculum/`, `.mavis/`) intacta;
runtime somente em `.scratch/factory/`.
