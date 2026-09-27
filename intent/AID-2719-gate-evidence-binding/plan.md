# Plan: amarrar state.json ⇄ ledger ⇄ proofs no gate da fábrica (X4/X5/X6)

Change-id: AID-2719-gate-evidence-binding · From: intent/AID-2719-gate-evidence-binding/spec.md · Status: approved (critérios 1–4 aprovados pelo dono do gate em AID-2783; ORDEM AID-2784; fresh-context QA contra este plan é condição de merge)

Base: `bc91871e` (main) via merge `194303b1` na branch `aid-2719/gate-evidence-binding`.

## Files that change

- `factory/gate.py` — `state_ledger_binding_gaps`, `ledger_head_anchor_gaps`,
  `minimum_profile_gaps`, `proof_sha_binding_gaps` (puras, fail-closed) +
  params novos em `evaluate`.
- `factory/coordinator.py` — `_append` ancora `ledger_head`/`ledger_seq` no
  state; `freeze` persiste `risk`; `gate` passa state/recibos/risco/revisão;
  `record_review` (novo); `_write_receipt_summary` inclui `ledger_head`.
- `factory/ledger.py` — `verify_report/verify_chain(expected_head=None)` +
  campos `head`/`anchored_head` no veredito.
- `factory/__main__.py` — `ledger --verify` usa âncora do state; subcomando
  `review`.
- `factory/model.py` — `Proof.examined_sha`; `proof_evidence` inclui o campo.
- `factory/verify.py` — `run_checks` preenche `examined_sha`.
- `factory/tests/test_gate_evidence_binding.py` (novo) — X4/X5/X6 portados
  como negativos verdes + honestos + revisão + CLI/âncora + compat.
- `factory/README.md` — linhas de critério R1–R4 (AID-2719).
- `intent/AID-2719-gate-evidence-binding/spec.md`, `plan.md` (estes).

## Order of work

1. spec.md + plan.md commitados na branch do intent (aceite AID-2783/2784).
2. model/verify: `Proof.examined_sha` + `proof_evidence` + `run_checks`.
3. gate: as quatro funções de gaps + `evaluate` (unit-check rápido via suite).
4. coordinator: âncora no `_append`, `risk` no freeze, params no gate,
   `record_review`, summary com `ledger_head`.
5. ledger + CLI: `expected_head` no verify e no `ledger --verify`; `review`.
6. Testes portados (X4/X5/X6 → `factory/tests/test_gate_evidence_binding.py`)
   + README.
7. Suíte completa `factory/tests/` + repros do stress reexecutados contra a
   branch (verde = bloqueio pela razão certa).
8. PR único → fresh-context QA contra este plan → countersign → merge
   (§ordenamento AID-2219).

## Risks

- `evaluate` fica mais estrita e pode bloquear chamadas unitárias legadas —
  mitigação: params opcionais; motivos novos só acumulam (tests legados
  afirmam block + motivo específico, não lista exata).
- Ancorar head no `_append` conflitar com write-order S1d — mitigação:
  `_append` roda SEMPRE depois do `_save_state` da estação (auditado em
  todos os callers) e faz read-modify-write próprio; kill no meio deixa
  ledger/head consistentes (append não aconteceu) ou re-ancorado no retry.
- Takeover (`station_to=leased`) desancorar o state temporariamente —
  aceito fail-closed (holder antigo já fenceado; novo holder re-ancora).
- Digerir recibos antigos: `proof_evidence` muda → só recibos novos; payload
  legado preservado (compat AID-2715 mantida).

## Proof

- `python3 -m pytest factory/tests/ -q` → all green (94 legados + novos).
- Repros X4/X5/X6 do stress (`/paperclip/w2710qa/stress/test_stress_qa.py`,
  `/paperclip/w2719sm/stress/test_stress_sm.py`) reexecutados contra a
  branch: X4/X5/X6 bloqueiam (negativos verdes), sem enfraquecer os demais.
- `python3 -m factory ledger <id> --verify` em ledger truncado → exit 2 com
  `chain_ok=false` e motivo de âncora.

## Verification split

- Produtor: FPE (esta branch, PR único).
- Verificador fresh-context: QA Lead (ou verifier distindo designado),
  contra este plan.md + spec.md — veredito + countersign SM antes do merge
  (§ordenamento AID-2219; ORDEM AID-2784).
