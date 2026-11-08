# AID-2775: DEFECT (baixa, factory): plan_is_approved fail-open — prosa com `· Status: approved` no bloco de header aprova plano draft (achado QA na adjudicação #534 vs #538)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** — | **Created:** 2026-09-26T04:31:27.872513+00:00 | **Updated:** 2026-10-18T12:09:25.456+00:00
- **ID:** `23f6e851-c4f0-49e1-8850-6ece832a6671`

## Description

## Defeito (primeira mão QA Lead, AID-2767)

Ao adjudicar o PR #534 vs #538 (mandado AID-2767/AID-2763), reexecutei a suíte de testes do PR #534 contra a main atual (`4d9a6a50`, pós-#538): **9/10 cenários passam; 1 negativo falha** — e a falha é um fail-open real, não um falso positivo do teste.

### Repro executável (main @ 4d9a6a50, Python 3.13.5)
```python
from factory.contract import Contract, plan_is_approved
plan = (
    "# Plano X

"
    "Change-id: X · From: spec.md · Status: draft

"
    "Nota: o documento anterior dizia · Status: approved, mas foi revogado.
"
)
plan_is_approved(plan)  # → True (esperado: False)
# Contract(...) com esse plan.md NÃO levanta ContractError → freeze liberado com status real=draft
```
Controle: a mesma prosa ABAIXO de uma seção `## ` é corretamente rejeitada (a restrição de bloco de header funciona); o buraco é prosa contendo `· Status: approved` ANTES da primeira seção `## ` (ou documento sem seções).

### Causa
`PLAN_APPROVED = re.compile(r"(?:^|·)[ \t]*Status:[ \t]*approved\b", re.MULTILINE)` (PR #538, `factory/contract.py`) aceita qualquer `Status: approved` precedido de `·`, inclusive em prosa do bloco de header — o separador `·` não discrimina campo de header de menção incidental em texto corrido. O PR #534 (supersedido) tinha exatamente este negativo no `test_plan_status_canonical.py::test_prose_mention_off_changeid_line_rejected`.

### Impacto
Gate de freeze (HTML §02) pode liberar build de plano não-aprovado se o header block citar `· Status: approved` em prosa. Probabilidade baixa (exige substring exata em posição específica), severidade de governança — fail-open em gate P3.

### Correção sugerida (para a estação produtora; QA não implementa)
Restringir o match a campos de header reais: ou (a) âncora em início de linha para campo próprio E âncora `·` apenas quando a LINHA inteira tem forma de campo de header (ex.: `^[A-Za-z-]+:.*(·[ \t]*Status:[ \t]*approved\b)` com validação de que a linha não é prosa — ex. exigir que a linha comece com `Campo:`), ou (b) parsear o header em campos estruturados (split por ` · ` na linha `Change-id:`/demais linhas de campo) e ler o campo `Status`. Preservar: os 10 testes do #534 (cenários reais de main), os 12+ de `test_b5_canonical_registry.py`, e o CI smoke `test_registry_smoke.py`.

### Evidência
- Log da reexecução: 1 failed (test_prose_mention_off_changeid_line_rejected), 9 passed em `factory/tests/test_plan_status_canonical_534.py` (espelho do arquivo do PR #534) contra main 4d9a6a50.
- Repro inline acima (executado 2026-09-26T04:3xZ).

Provenance: agent=qa-lead (ca6a3f95) task=AID-2767 run=37853e77-7bfa-4f2b-b33d-997c1fa4d6b8. Dono sugerido: estação produtora factory (merge pelo merge-writer nomeado AID-2763 — não self-merge).

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-2775 — DEFECT (baixa, factory): plan_is_approved fail-open — prosa com `· Status: approved` no bloco de header aprova plano draft (achado QA na adjudicação #534 vs #538)
- Status: blocked
- Priority: high
- Current mode: implementation
- Last updated by run: 2232817a-9f4c-4a54-8ed6-29b9045ca296
- Agent: Learning Engine Engineer (opencode_local)

## Objective

## Defeito (primeira mão QA Lead, AID-2767)

Ao adjudicar o PR #534 vs #538 (mandado AID-2767/AID-2763), reexecutei a suíte de testes do PR #534 contra a main atual (`4d9a6a50`, pós-#538): **9/10 cenários passam; 1 negativo falha** — e a falha é um fail-open real, não um falso positivo do teste.

### Repro executável (main @ 4d9a6a50, Python 3.13.5)
```python
from factory.contract import Contract, plan_is_approved
plan = (
    "# Plano X

"
    "Change-id: X · From: spec.md · Status: draft

"
    "Nota: o documento anterior dizia · Status: approved, mas foi revogado.
"
)
plan_is_approved(plan)  # → True (esperado: False)
# Contract(...) com esse plan.md NÃO levanta ContractError → freeze liberado com status real=draft
```
Controle: a mesma prosa ABAIXO de uma seção `## ` é corretamente rejeitada (a restrição de bloco de header funciona); o buraco é prosa contendo `· Status: approved` ANTES da primeira seção `## ` (ou documento sem seções).

### Causa
`PLAN_APPROVED = re.compile(r"(?:^|·)[ \t]*Status:[ \t]*approved\b", re.MULTILINE)` (PR #538, `factory/contract.py`) aceita qualquer `Status: approved` precedido de `·`, inclusive em prosa do bloco de header — o sep
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `2232817a-9f4c-4a54-8ed6-29b9045ca296` finished with status `failed` at 2026-10-18T07:48:28.583Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `.github/workflows/countersign-gate.yml`
- `scripts/merge_pr.sh`
- `scripts/countersign_gate_check.py`
- `scripts/receipt_canon_check.py`

## Commands Run

- Heartbeat run `2232817a-9f4c-4a54-8ed6-29b9045ca296` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Inspect the failed run, fix the cause, and resume from the most recent concrete action above.

## Comments (5)

**CEO** · 2026-09-26T07:06:10.23659+00:00

**[CEO — despacho AID-2825]** Defect real de severidade baixa (fail-open de `plan_is_approved` com prosa `· Status: approved` em bloco de header). Fica seu na fila de hardening: endurecer o parser para exigir bloco estruturado (não substring solta) + teste negativo.

**Engine Hardening Engineer** · 2026-10-17T16:20:34.525004+00:00

**[Engine Hardening] Execução do fix iniciada na lane — filha AID-5003 criada (plano aprovado).**

Autorização: founder, comentário `fc0c4e3a-b176-4e1e-a5a4-b75b2ae45c63` na AID-3522 (2026-10-17T16:15Z): "PLANO APROVADO PELO FOUNDER (...) Execução liberada em AID-2775".

AID-5003 (`in_progress`, assignee Engine Hardening, parent desta issue): implementar o parser estruturado de header em `plan_is_approved` conforme o plano r1 da AID-3522 (doc `plano-header-estruturado`, revisão `f93356d7`) — fecha o fail-open do repro desta issue (prosa `· Status: approved` no bloco de header aprovando plano draft; reproduzido 2026-09-30 contra main `d9dbdd5c`). Suíte de aceite: 10 casos canônicos com o negativo EM PROSA; preserva f0/b5/smoke; rollback por revert único.

Sem mudança de status desta issue por enquanto — fecha quando o fix mergar (PR com countersign, merge pelo FPE) e o repro desta issue devolver `False` na main.

**founder** · 2026-10-17T16:21:54.407895+00:00

🚀 PLANO AID-3522 APROVADO PELO FOUNDER: Implementar o fix de `plan_is_approved` fail-closed em `factory/` conforme o plano aprovado.

**?** · 2026-10-18T00:37:53.337384+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - `opencode models` timed out after 20s.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `e144b8ed-1141-4bf0-ad16-d69275686562`
- Recovery owner: [Learning Engine Engineer](/AID/agents/98ed5775-4ae8-442e-81d0-e4c50c435205)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:50.212246+00:00

PR #699 aberto com fix fail-closed de plan_is_approved.

---

