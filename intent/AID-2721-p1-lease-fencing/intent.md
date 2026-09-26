# Intent — AID-2721-p1-lease-fencing

Status: accepted
Change-Id: AID-2721-p1-lease-fencing
Origin-Issues: AID-2718 (defeito, tracking SM) / AID-2721 (execução, Platform & CI)
Base: 2d9928f2 (pós-merge PR #527)
Cluster: FACTORY-STRESS P1 — mesmo cluster de AID-2684/AID-2712 (double-claim), vetor distinto (estações downstream ignoram o lease)

## Defeito (citado de AID-2718 — não reescrito)

> **Observado:** `Coordinator.prove()` e `Coordinator.gate()` nunca consultam o lease.
> Holder obsoleto cujo lease (a) foi tomado por terceiro após expiração, ou (b) foi
> removido por completo, continua provando e **promovendo** normalmente.

> **Correção sugerida:** fencing token/epoch no lease; toda transição de estação
> revalida `lease_of(event).holder == context` + takeover incrementa época e recusa
> writers velhos; recibo de takeover no ledger.

Confirmação first-hand (SM, 2026-09-26, base `2d9928f2`): repros X3/X3b de
`/paperclip/w2710qa/stress/test_stress_qa.py` falham com
`AssertionError: P1 PIERCED: gate promove sem lease algum`.

## Missão (citada de AID-2721)

> Implementar o fencing sugerido em AID-2718: token/época no lease; **toda**
> transição de estação revalida `lease_of(event).holder == context` atuante;
> takeover incrementa a época e recusa writers velhos; recibo de takeover no ledger.

Sem hotfix fora do loop; produção (`learner/`, `curriculum/`, `.mavis/`) intacta.
