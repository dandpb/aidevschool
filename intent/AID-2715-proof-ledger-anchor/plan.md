# Plan — AID-2715-proof-ledger-anchor

Status: approved

## Passos

1. `factory/model.py`
   - `proof_evidence(proof)` + `evidence_digest(evidence)`.
   - `Receipt.proof_digests` (default `[]`); `payload()` omite o campo
     quando vazio (compat com recibos pré-âncora).
2. `factory/verify.py` — inalterado (produção da prova não muda).
3. `factory/gate.py`
   - `evidence_anchor_gaps(verify, anchored)`; `evaluate(...,
     anchored_evidence=None)` — default fail-closed.
4. `factory/coordinator.py`
   - `prove` anexa `proof_digests` + `detail.proof_evidence`.
   - `_proof_anchor(run_id)` lê o último recibo `verified` (None se
     inconsistente); `gate` passa a âncora; `_write_receipt_summary`
     grava `proof_anchor`.
5. Testes: `factory/tests/test_p2_evidence_anchor.py` (ataque S5,
   selagem, compat, fail-closed).
6. Docs: tabela P2+ no `factory/README.md`.

## Riscos

- Falso positivo se `prove` e `gate` divergirem sobre ordenação — mitigado:
  comparação por `check_id`, não por ordem.
- Quebra de ledgers antigos — mitigado pela omissão do campo vazio no
  payload (teste de compat incluído).
