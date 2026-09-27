# Erratum — AID-2762-lease-release-tombstone (update-branch bc91871e)

Data: 2026-09-26 · Motivo: countersign AID-2765 (addendum, PR #542 comment
5843247096) — a main moveu após a abertura do PR e o **PR #535 (AID-2728 S7,
merge 04:36Z)** fixou o mesmo defeito `released_at` com semântica
**fail-closed**, incompatível com o takeover pós-túmulo do spec original
(exclusão mútua provada first-hand pela countersigner: 2 failed/100 passed na
união; o teste S7 `test_exit_contract_2728.py:274` quebraria no sentido
inverso).

Supersede parcial, rastreável item a item do `spec.md`:

- Itens 1–3, 5: **mantidos** (túmulo legível; leitura tolerante; escrita
  atômica; caminho interno unlink).
- Item 4: **SUPERSEDED por AID-2728 S7 (autoritativa)** — lease liberado NÃO
  é re-claimável, nem pós-expiração (`LeaseHeldError` "re-intake required");
  heartbeat recusado; fence de estação. Takeover (época+1+recibo) só para
  lease VIVO expirado (AID-2721). O plano (`plan.md`) passo 3(b) é
  substituído pelo teste invertido
  `test_claim_after_tombstone_expiry_fails_closed_reintake`.

Delta único vivo do PR após o update-branch: `Lease.from_json` tolerante a
chaves desconhecidas (+ testes) e a seção README §AID-2762 reescrita
fail-closed. Execução: AID-2781 (QA Lead, produtor).
