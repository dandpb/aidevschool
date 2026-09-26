# Spec: amarrar state.json ⇄ ledger ⇄ proofs no gate da fábrica (X4/X5/X6)

Change-id: AID-2719-gate-evidence-binding · From: intent/AID-2719-gate-evidence-binding/intent.md · Status: accepted (critérios 1–4 aceitos pelo dono do gate em AID-2783 2026-09-26T04:51Z; implementação despachada ao FPE na ORDEM AID-2784)

Escrita contra a main corrente (`bc91871e`, pós-#529/#530/#535/#538), conforme
nota de base evolutiva do intent. Reprodução first-hand nesta branch (FPE,
probe `/tmp/opencode/w2784/probe/`): **X4 fura** (promote de head não examinado
com ledger divergente, `reasons=[]`), **X6 fura** (truncagem 4→2 entradas mantém
`verify_chain()==True`), **X5 na forma literal do repro** já bloqueia pela
âncora de evidência do #530 (AID-2715) — mas o critério 3 (perfil mínimo sem
revisão explícita) segue **não implementado**: contrato all-cheap com risco
≥ medium e provas âncoradas produzidas por um "verifier" conivente promoveria
(P3 reduz-se a comparação de strings).

## Requirements

1. **(X4) Binding state ⇄ ledger.** O gate cruza `state.json` com o último
   recibo verificável de cada estação do ledger: `verify_sha` ⇄ último recibo
   `verified` (campo `sha`), `build_sha` ⇄ último recibo `built`,
   `contract_digest` ⇄ `contract_digest` do recibo `verified`. Divergência
   qualquer → `block`. Sem recibos ou sem state → `block` (fail-closed):
   tarja de SHAs em `state.json` não re-liga provas.
2. **(X6) Âncora externa do head do ledger.** O hash do head do ledger é
   persistido FORA do ledger: em `state.json` (`ledger_head`/`ledger_seq`,
   atualizados a cada append pelo coordenador) e em
   `receipt.summary.json` (`ledger_head`), que reflui ao registro versionado
   via `copy_receipt_into_registry`. O gate compara `state.ledger_head` com o
   hash do último recibo; `ledger --verify` (CLI) recebe a âncora do state e
   reprova cadeia cujo head não bata (truncagem/rewrite de sufixo vira
   `chain_ok=false` + exit 2).
3. **(X5) Perfil mínimo com revisão explícita.** Contrato sem NENHUM check
   `profile=standard` não promove sozinho quando o risco do evento é
   ≥ `medium`: exige revisão humana explícita registrada
   (`Coordinator.record_review` + recibo `actor_role=human` no ledger +
   `state.human_review`), com revisor distinto do autor e do verificador.
   Risco ausente (run legada) conta como desconhecido → fail-closed.
4. **(Provas carregam o SHA examinado.)** `Proof` ganha campo
   `examined_sha`; `run_checks` preenche com o SHA da árvore examinada;
   `proof_evidence` (âncora selada no recibo `verified`) passa a incluí-lo;
   o gate bloqueia prova sem `examined_sha` (run legada → re-provar) ou com
   `examined_sha != verify.sha`.

Respostas às open questions do intent: (1) a âncora do head vive em
`state.json` + `receipt.summary.json` + registro versionado — nunca só no
arquivo tarjável; (2) all-cheap ≥ medium exige revisão humana registrada
(decisão do dono, AID-2783); (3) runs em voo no `.scratch/` com provas sem
`examined_sha` bloqueiam no gate e precisam re-provar — runtime state é
descartável por contrato (constraints do intent).

## Design

- `factory/gate.py` — novas funções puras de gaps, todas fail-closed:
  `state_ledger_binding_gaps` (R1), `ledger_head_anchor_gaps` (R2),
  `minimum_profile_gaps` (R3), `proof_sha_binding_gaps` (R4);
  `evaluate(...)` ganha params opcionais `state`, `ledger_receipts`,
  `event_risk`, `human_review` (default `None` → motivo de bloqueio; chamadas
  unitárias legadas continuam bloqueando, só acumulam motivos).
- `factory/coordinator.py` — `_append` persiste `ledger_head`/`ledger_seq`
  no state após cada append (após o `_save_state` da estação; read-modify-write
  do disco); `freeze` persiste `state["risk"]` do evento da fila; `gate`
  passa state/recibos/risco/revisão ao `evaluate`; novo método
  `record_review(run_id, reviewer_context)` (recibo `actor_role=human`);
  `_write_receipt_summary` inclui `ledger_head` do momento pré-transição.
- `factory/ledger.py` — `verify_report(expected_head=None)` /
  `verify_chain(expected_head=None)`: veredito estruturado ganha campos
  `head`/`anchored_head`; head divergente da âncora → `chain_ok=false` com
  motivo de truncagem/rewrite (sem quebrar os vereditos de linha
  malformada — AID-2728 S5b).
- `factory/__main__.py` — `ledger --verify` carrega a âncora de
  `runs/run-<id>/state.json` quando existir; novo subcomando
  `review <event-id> --context <revisor>` para revisão explícita (R3).
- `factory/model.py` — `Proof.examined_sha: Optional[str]`; `proof_evidence`
  inclui `examined_sha` (digests de recibos NOVOS mudam; recibos antigos
  carregam payload próprio e a cadeia não quebra).
- `factory/verify.py` — `run_checks` preenche `examined_sha`.
- `factory/tests/test_gate_evidence_binding.py` (novo) — repros X4/X5/X6
  portados do stress como negativos verdes + caminhos honestos + revisão
  explícita + âncora no CLI + compat legada.
- `factory/README.md` — tabela de critérios ganha as amarrações (R1–R4).

Estado de learner/produção: intocado. Runtime `.scratch/factory/` segue fora
do Git. Nenhuma view derivada regenera (não há mudança de substrate).

## Policy applied

- AGENTS.md: producer ≠ verifier (FPE implementa; verificação fresh-context
  contra o plan.md antes do merge — ORDEM AID-2784); stdlib only; sem
  enfraquecer testes; falha e retry não apagam o histórico (append-only
  preservado; âncoras são acréscimos de campo, jamais rewrite).
- Gate P1–P5 do AID-2676 permanece a régua; R1–R4 endurecem P2/P3/P4.
- Base: `bc91871e` (merge `194303b1` na branch do intent).

## Flagged concerns

- **Ledger totalmente reescrito com rehash** (hashes sem chave): detectável
  apenas pela âncora do registro versionado pós-promoção
  (`verification.md.run-receipt.json`); notarização/assinatura do head fica
  como trabalho futuro — fora dos critérios 1–4. Owner: dono do gate.
- **Takeover de lease entre estações** appenda recibo (`station_to=leased`)
  sem passar pelo `_append` do coordenador: o state da run fica com head
  defasado até a próxima estação — o holder antigo já é fenceado (P1); o novo
  holder re-appenda e re-ancora. Comportamento fail-closed aceito. Owner: FPE.
- **Compat de runs em voo**: provas sem `examined_sha` e states sem
  `ledger_head`/`risk` bloqueiam até re-drive/re-prove (runtime é scratch).
  Owner: FPE.

## Out of scope

- Notarização/assinatura criptográfica do head do ledger (rewrite completo).
- X1/X2/X3/X8 (fencing/intake/crash — já tratados em #529/#531/#526/#535).
- Mudança em engines, learner, curriculum ou estado de produção.
