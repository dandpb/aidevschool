# Spec — fencing de lease nas estações (P1)

Comportamento exigido (aceite AID-2721, itens 1–3):

1. `Lease` carrega `epoch` (fencing token; default 1). Takeover pós-expiração
   (`EventQueue.claim` sobre lease expirado) cria novo lease com
   `epoch = epoch_antigo + 1` e persiste recibo de takeover no ledger encadeado
   do run (`ledger/run-<event-id>.jsonl`), com `detail.takeover=true`.
2. Toda estação que transiciona a run (`freeze`, `build`, `prove`, `gate`)
   revalida o lease antes de agir: lease ausente, expirado, holder divergente
   do holder registrado no congelamento, ou época divergente ⇒
   `CoordinatorError` (fail-closed), **sem** transição no ledger e **sem**
   promote.
3. `state.json` registra `lease_holder` e `lease_epoch` no congelamento;
   escritores com época velha são recusados nas estações seguintes.
4. Regressões X3/X3b adaptadas em `factory/tests/test_p1_fencing.py`;
   baseline 18/18 permanece verde.

Invariantes preservados: takeover legítimo continua possível (lease expirado);
claim concorrente sobre lease vivo continua `LeaseHeldError`; cadeia do ledger
continua verificável (`verify_chain`); runtime só em home fora do Git
(`.scratch/factory/` ou tmp em testes).
