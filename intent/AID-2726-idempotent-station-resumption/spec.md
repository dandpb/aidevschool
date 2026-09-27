# Spec — AID-2726-idempotent-station-resumption

## Comportamento exigido (aceite de AID-2735, citado)

1. Kill na janela do freeze → retry `freeze`/`resume` converge sem intervenção
   manual (state antes dos efeitos OU recuperação de contract dir órfão sem
   state).
2. Kill durante o build → retry `build` converge: worktree reutilizado ou
   removido/recriado (sem `GitError`, sem worktree órfão permanente;
   `git worktree prune` não é passo manual do operador).
3. Run `promoted` sem `receipt.summary.json` → re-chamada do gate (ou caminho
   equivalente) regenera o resumo de forma idempotente (ou write-order garante
   resumo antes de promoted).
4. Regressões S1a/S1b/S1d em `factory/tests/` simulando as janelas de kill —
   passing; baseline vigente (27/27) permanece verde.

## Invariantes preservados

- Fail-closed: nenhuma estação transiciona sem `_fence` (AID-2721); a retomada
  nunca contorna fencing, lease ou validade de digest (P4).
- Ledger append-only encadeado: retomada nunca reescreve; recibos de backfill
  são acréscimos marcados (`detail.backfill`), jamais reescritas.
- Producer ≠ verifier; contrato congelado continua imutável pós-freeze
  (reclaim só ocorre em estação `freezing`/órfã sem state — nunca em run
  `contracted`+ com digest válido).

## Fronteiras

- Runtime state somente em `.scratch/factory/` (gitignored).
- Sem mudança de CLI além de tolerância a reentrada (`freeze`/`gate`); sem
  toque em `learner/`, `curriculum/`, `.mavis/`, engines.
