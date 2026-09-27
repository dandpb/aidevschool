# Spec — AID-2715-proof-ledger-anchor

## Comportamento exigido

1. **Âncora no recibo `verified`** (estação prove): para cada check, o
   payload selado no ledger carrega `proof_evidence = {check_id,
   cmd_sha256, exit_code, output_sha256}` e `proof_digests` (digest
   canônico de cada evidência). O hash da cadeia cobre esses campos.
2. **Gate compara runtime ↔ âncora**: recomputa a evidência de cada prova
   carregada de `proofs.json` e compara com a âncora do último recibo
   `verified`. Motivos de bloqueio:
   - sem recibo `verified` (ou detalhe/digests inconsistentes):
     `no ledger anchor (self-attested proofs refused)`;
   - digest divergente: `proof evidence diverges from ledger anchor`;
   - check na âncora ausente do runtime (ou vice-versa).
3. **Summary leva a âncora**: `receipt.summary.json` ganha `proof_anchor`.
4. **Compat**: recibos sem `proof_digests` (pré-AID-2715) mantêm o payload
   original — `verify_chain` de ledgers antigos continua `true`.

## Casos negativos (parte do aceite)

- Ataque S5 (output reescrito + `output_sha256` re-assinado no
  `proofs.json`) ⇒ `block` com motivo de divergência; cadeia do ledger
  intacta.
- Ledger sem recibo `verified` ⇒ `block` (self-attestation refused).
- Tamper na própria âncora do ledger ⇒ `verify_chain` = false.
- Pipeline honesto continua promovendo (sem falso positivo).

## Fora de escopo

- Âncora externa ao host (publicação do digest da cadeia) — follow-up.
- Reexecução de checks no gate (re-run) — outro mecanismo, outro intent.
