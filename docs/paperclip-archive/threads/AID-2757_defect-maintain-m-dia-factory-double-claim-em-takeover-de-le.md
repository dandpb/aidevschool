# AID-2757: DEFECT (Maintain, média) — factory: double-claim em takeover de lease expirado (TOCTOU release/unlink) — pré-existente, achado do retro-countersign AID-2753

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** — | **Created:** 2026-09-26T03:54:18.984495+00:00 | **Updated:** 2026-10-18T12:02:21.673+00:00
- **ID:** `0cbe85ac-d6bb-42cf-894e-92e2c0788461`

## Description

Achado do retro-countersign QA AID-2753 (fora do escopo dos planos AID-2721/AID-2731; **pré-existente** na base `43dd3e2e`).

## Defeito
`factory/queue.py` `claim()`: dois claimers concorrentes sobre lease expirado podem **ambos** obter o lease com a **mesma época**. Janela TOCTOU no caminho de takeover:

```
except FileExistsError:
    if self.lease_expired(event_id):            # (1) lê lease velho expirado
        takeover_from = self.lease_of(event_id) # (2) lê época velha
        self.release(event_id, holder_enforcement=False)  # (3) unlink NÃO-atômico
        continue                                 # (4) O_EXCL open
```

Interleaving: P1 conclui (1)-(3) e instala o lease novo via (4); P2, que já passou (1)-(2) com o lease velho, executa (3) e **apaga o lease recém-instalado de P1**, então o (4) de P2 também sucesso. Ambos retornam época 2.

## Repro executável (primeira mão)
- Harness: `/paperclip/w2721/stress/test_stress_qa_2721.py::test_x1_expired_lease_concurrent_claims` (mirror apontando à main: `/paperclip/w2753/stress/test_stress_main.py`)
- main `82e56f2b`: **2/120 corridas com double-claim** (`AssertionError: P1 PIERCED: 2/120`)
- base pré-merge `43dd3e2e` (`/paperclip/w2753/stress/test_stress_base.py`): **1/120** → pré-existente, NÃO introduzido por PR #529/PR #531

## Impacto
- Crença duplicada de posse (2 holders vivos, mesma época) + recibo de takeover duplicado no ledger da run.
- **Mitigação estrutural**: o fencing de estações (AID-2721, `_fence`) barrará o holder que não está no disco (X3 verde), então não há dupla transição de state/ledger — por isso severidade média, não crítica.

## Sugestão de direção (sem implementar aqui)
Tornar o takeover atômico: p.ex. rename do lease velho para slot único por época (`leases/<id>.<epoch>.json` + `O_EXCL` no novo), ou lock de diretório/lockfile por event_id no caminho de takeover; manter recibo encadeado único por época. Qualquer fix passa por plan.md com regressão X1 (120 corridas, 0 double) + suíte íntegra + countersign independente ANTES do merge (convenção vigente).

## Aceite
- [ ] Repro X1 estabilizado como regressão na suíte factory (0/120 double-claim)
- [ ] Fix atômico no takeover sem quebrar os 43 testes existentes
- [ ] Veredito independente pré-merge registrado

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-2757 — DEFECT (Maintain, média) — factory: double-claim em takeover de lease expirado (TOCTOU release/unlink) — pré-existente, achado do retro-countersign AID-2753
- Status: blocked
- Priority: high
- Current mode: implementation
- Last updated by run: 935387be-f1eb-4ee3-accb-8746b59c415b
- Agent: Platform & CI Engineer (opencode_local)

## Objective

Achado do retro-countersign QA AID-2753 (fora do escopo dos planos AID-2721/AID-2731; **pré-existente** na base `43dd3e2e`).

## Defeito
`factory/queue.py` `claim()`: dois claimers concorrentes sobre lease expirado podem **ambos** obter o lease com a **mesma época**. Janela TOCTOU no caminho de takeover:

```
except FileExistsError:
    if self.lease_expired(event_id):            # (1) lê lease velho expirado
        takeover_from = self.lease_of(event_id) # (2) lê época velha
        self.release(event_id, holder_enforcement=False)  # (3) unlink NÃO-atômico
        continue                                 # (4) O_EXCL open
```

Interleaving: P1 conclui (1)-(3) e instala o lease novo via (4); P2, que já passou (1)-(2) com o lease velho, executa (3) e **apaga o lease recém-instalado de P1**, então o (4) de P2 também sucesso. Ambos retornam época 2.

## Repro executável (primeira mão)
- Harness: `/paperclip/w2721/stress/test_stress_qa_2721.py::test_x1_expired_lease_concurrent_claims` (mirror apontando à main: `/paperclip/w2753/stress/test_stress_main.py`)
- main `82e56f2b`: **2/120 corridas com double-claim** (`AssertionError: P1 PIERCED: 2/120`)
- base pré-merge
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `935387be-f1eb-4ee3-accb-8746b59c415b` finished with status `failed` at 2026-10-17T18:19:48.320Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): Failed to execute statement

## Files / Routes Touched

- `.github/workflows/ci.yml`
- `scripts/merge_pr.sh`
- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `935387be-f1eb-4ee3-accb-8746b59c415b` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Inspect the failed run, fix the cause, and resume from the most recent concrete action above.

## Comments (3)

**founder** · 2026-10-17T16:21:54.449266+00:00

🚀 Desbloqueado pelo Founder: corrigir TOCTOU `release/unlink` em takeover de lease expirado em `factory/` com teste determinístico.

**?** · 2026-10-17T17:18:23.660643+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue after its live execution disappeared, but it still has no live execution path. Latest cause: `process_lost`. Latest retry failure details were withheld from the issue thread; inspect the linked run for evidence. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `b4a199e9-03b3-4a13-9242-76c4e28cb78d`
- Recovery owner: [Platform & CI Engineer](/AID/agents/1e9be0fa-c320-4309-9704-c755c53da7fd)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:55.006396+00:00

PR #697 aberto com regressão determinística X1 de takeover de lease.

---

