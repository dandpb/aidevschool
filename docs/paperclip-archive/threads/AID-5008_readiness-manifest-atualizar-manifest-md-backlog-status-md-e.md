# AID-5008: READINESS & MANIFEST: Atualizar MANIFEST.md, BACKLOG_STATUS.md e dossiê de prontidão pós-merge da onda #657 (b08e0096)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Docs & Readiness Engineer | **Created:** 2026-10-17T16:22:01.809322+00:00 | **Updated:** 2026-11-01T14:11:58.38+00:00
- **ID:** `17a0f265-9066-4892-868f-78063d136411`

## Description

Sincronizar `engines/codexDojo/ecosystem/MANIFEST.md`, `curriculum/BACKLOG_STATUS.md` e `docs/product-readiness/` refletindo as 22 entregas recém-mergeadas na `main` (`b08e0096`), mantendo `check_readiness_claims.py` 100% verde.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-5008 — READINESS & MANIFEST: Atualizar MANIFEST.md, BACKLOG_STATUS.md e dossiê de prontidão pós-merge da onda #657 (b08e0096)
- Status: in_review
- Priority: high
- Current mode: review
- Last updated by run: 66ece32e-e8eb-4a71-b286-952379155476
- Agent: Docs & Readiness Engineer (opencode_local)

## Objective

Sincronizar `engines/codexDojo/ecosystem/MANIFEST.md`, `curriculum/BACKLOG_STATUS.md` e `docs/product-readiness/` refletindo as 22 entregas recém-mergeadas na `main` (`b08e0096`), mantendo `check_readiness_claims.py` 100% verde.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `66ece32e-e8eb-4a71-b286-952379155476` finished with status `failed` at 2026-10-18T11:09:19.470Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `66ece32e-e8eb-4a71-b286-952379155476` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (3)

**?** · 2026-10-17T19:41:16.357776+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `process_lost` - Process lost -- server may have restarted. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `af37b966-6a64-45ba-ab9b-7f5a09411ad2`
- Recovery owner: [Platform & CI Engineer](/AID/agents/1e9be0fa-c320-4309-9704-c755c53da7fd)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:51.844195+00:00

PR #704 aberto com dossiê de prontidão pós-onda #657 e sync do MANIFEST.

**Docs & Readiness Engineer** · 2026-10-31T19:24:07.662978+00:00

# Recibo de fechamento — AID-5008 (despacho do CEO, AID-5798 comentário `30244dd5`, 31/10 19:24Z)

Fechamento histórico sem retrabalho de conteúdo: a entrega já está na `main`; este recibo registra a conclusão com evidência de 1ª mão (GitHub API, consultas de 31/10 19:24Z) e fecha a issue `done` pelo estágio nativo.

## Evidência verificada em 1ª mão
| Item do despacho | Verificado | Fonte |
|---|---|---|
| PR #704 `docs(readiness): AID-5008 — dossiê pós-merge da onda #657 (b08e0096) + sync MANIFEST` | `merged=true` por `dandpb` em **2026-10-25T22:35:00Z**. Correção de evidência: o recibo do despacho citava 22:45:28Z; a hora real é **22:35:00Z** (coerente com o run de CI do merge, 40240876234, criado 22:35:03Z) | GitHub API `pulls/704` |
| Head / merge commit | head `65a004084d66a741c6cab7a014c4e8b01492cf88`; merge commit `dfe13ac3236e938fffe7f3e67d0240d6f32245a3`; contido em `main` (`compare 65a00408...main` → behind 0) | GitHub API |
| Arquivos entregues | `docs/product-readiness/POST-MERGE-DOSSIER-2026-10-17-b08e0096.md` (added, +159); `engines/codexDojo/ecosystem/MANIFEST.md` (+6/−6) | `pulls/704/files` |
| Critério "manter `check_readiness_claims.py` 100% verde" na entrega | job `product readiness (claims)` = **success** no run do merge commit `dfe13ac3` (run 40240876234, 25/10 22:35Z) | GitHub Actions |
| `curriculum/BACKLOG_STATUS.md` | presente na `main`; **auto-gerado** por `learner/substrate/catalog.py` (fonte canônica `curriculum/catalog.md` — "DO NOT EDIT BY HAND"); última sincronização pela própria onda curriculum (462fe25e 20/10; 3f6158d4/1e55fbbd 18/10, AID-5012/5013) | GitHub API `contents` |

## Lacuna reportada (fora do escopo desta issue; sem contorno)
- `main` head `12dd8bdf` (merge do PR #743 / AID-5216, 26/10 01:29Z) deixou o job `product readiness (claims)` **vermelho**: step `check claims staleness window` reporta `STALE-WINDOW` em `literacy-standalone-corridor-mod01-03`, `literacy-standalone-first-lesson` e `os-literacy-guided-mission` (fingerprints stale após bump de conteúdo literacyDojo). Run 40254450547 / job 121356089637. Domínio literacyDojo — correção pertence ao dono da engine (ver `docs/AGENTS.md`); registrada aqui como gap, não maquiada e não corrigida por aqui.

## Disposição
`done` — entrega confirmada na `main` com checks verdes no merge commit; lacuna pós-entrega (26/10) reportada ao domínio responsável. Nenhum produto alterado para arrumar docs.

Provenance: agent=docs task=AID-5008 run=8b6b21f3-bf8f-4f99-8381-b54d00301da6 dispatch=AID-5798:cmt-30244dd5

---

