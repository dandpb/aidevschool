# STALE-WINDOW triage — claims gate vermelho no main (AID-2339, 2026-09-18)

Registro operacional do DEFECT AID-2339: `product readiness (claims)` vermelho no
main com assinatura exclusivamente STALE-WINDOW em 6 grupos de cenários, persistindo
pós-#483 (fix zai AID-2313 resolveu PRODUCER-REPORTS-MISSING; a staleness era causa
distinta, já apontada no pedido 3 do AID-2313 sem triage).

## Resolução

Re-grant **v92** @ main tip `3aca4d5d` — PR #489 (observação independente +
promoção escrita; supersedes a proposta da fábrica #479). Verificação fail-closed
nesta árvore: `check --require-current` rc=0; `pytest docs/product-readiness/tests`
47 passed/1 skipped. O push-run da main pós-merge é o verificador final.

## Triage por grupo (pedido 1) — hipóteses do issue vs. achado

| Hipótese do issue | Veredito |
|---|---|
| (a) re-grant PR pendente de merge | **Imprecisa.** PR #479 (v91 @ `853c2943`, 14:51Z) pendia a *fase de observação* (`regrant --propose` exit 3 — o bot nunca escreve; REGRANT-RUNBOOK.md §Fluxo automatizado). Mergear a proposta sozinha não verdeava nada: producer snapshot nunca promove. |
| (b) fingerprint de fonte realmente alterado | **Causa real da staleness** — diffs determinísticos por grupo abaixo. |
| (c) bug de janela da fábrica | **Não há bug.** Runs 21:05Z/21:18Z da fábrica (35274673628/35275877385) logaram "an open readiness-regrant PR already exists; skipping (dedupe)" por design. Lacuna estrutural real: a dedupe não re-ancora quando o anchor da proposta envelhece — registrou-se aqui; mitigação neste ciclo = re-anchor manual da tip (runbook §Regra de merge item 1). |

### Diffs determinísticos (git, first-hand 2026-09-18)

| Grupo | Último anchor promovido | Commits que giraram o fingerprint (`anchor..main`) |
|---|---|---|
| literacy-standalone-first-lesson | v88 `cabdc4a1` (2026-09-16) | `028382b4` (analytics vocabulários: `engines/literacyDojo/src/domain/analytics.ts`, `src/adapters/analyticsBatchSink.ts`; envelope v2 preservado), `a9403d38` (repair CI) — instrumentação |
| literacy-standalone-corridor-mod01-03 | v88 `cabdc4a1` | idem |
| os-literacy-guided-mission | v88 `cabdc4a1` | `dcb08e72` (vocabulário OS compartilhado: `engines/codexdojo-os-prototype/src/analytics/events.ts`) + drift literacy src (`028382b4`) |
| os-returning-learner | v88 `cabdc4a1` | `dcb08e72` |
| os-voxel-guided-missions | v88 `cabdc4a1` | `dcb08e72` |
| dojotoday-daily-guidance | v90 `15d69d50` (2026-09-16) | série judgment no learner seam: `e17d98b6`, `52996b5b`, `11668331`, `1fef38ea`, `5e1aaa9c`, `2ed9746c`, `2096a0a7`, `44ab2b66`, `02e04320`, `076cebe4` (`learner/substrate/*`) + `55f6edb2` (#487 ARIA labels em `engines/dojoToday/src/main.ts`; diff label-only) |

Método: `source_fingerprint` = sha256 de `policy.yaml` + `inventory.yaml` +
`scenarios/*.yaml` + todos os arquivos sob `sourcePaths` do use case
(`tools/fingerprint.py:51`); qualquer commit nesses paths gira o digest e o gate
fail-closed marca o promoted state como STALE (`tools/evaluate.py:78-79,143-145`).

## Por que a proposta #479 não podia simplesmente mergear

1. Exit 3 = sem observação independente: `regrant --propose` escreve apenas com
   relatório de observação no input (exit 0). Producer-only nunca promove
   (REGRANT-RUNBOOK.md §Regras da fábrica).
2. Anchor envelhecido: `55f6edb2` (#487) toca `engines/dojoToday/src/` **depois**
   de `853c2943` → os fingerprints do snapshot #479 para dojotoday não casariam
   com a main no merge (runbook §Por que acontece: PR-head-verde ≠ merge-verde).
   Fechada com §recusa + recibo `capture_drill_jobs.sh` (protocolo C+E AID-1741).

## Evidência da observação v92

Bundle `evidence/observations/2026-09-18-3aca4d5d-claims-regrant-v92/`:
guias citados inalterados desde v88/v90 (`git log cabdc4a1..HEAD --
docs/product-readiness/student-guide.md docs/product-readiness/facilitator.md`
vazio), verificação mecânica arquivo:linha (logs/first-hand-checks.log),
executável first-hand (substrate 214 passed/1 skipped; selfcheck OK), producer
receipts do CI run 35275355476 @ `3aca4d5d` (apenas o job claims vermelho).

## Follow-up sugerido (fora do escopo deste re-grant)

A fábrica poderia re-propor quando o anchor da proposta aberta envelhecer para
algum grupo coberto (diff anchor..main nos sourcePaths) — fecha e re-abre em vez
de segurar a dedupe até o stale eterno. Escalar ao dono da fábrica
(Platform & CI / FPE) como melhoria; não é bloqueio deste re-grant.

## Addendum — re-anchor v93 (AID-2396, ordem QA AID-2393 NO-GO `db5a93ce`, 2026-09-18 04:48Z)

Entre o anchor v92 (`3aca4d5d`) e o countersign QA, a main andou em path coberto:
PR #494 (merge `60ae2179`, 04:42:56Z) tocou `learner/substrate/judgments.py`
(+25/-18 — refactor `_ask`→`ask_and_record`, seam público p/
`learner/gate/metric_lint`; diff lido first-hand, sem novo caminho de escrita de
estado do aprendiz). Merge sim `60ae2179`+`6ce16467` → `check --require-current`
rc=1 exatamente `STALE-WINDOW: dojotoday-daily-guidance` (3 cenários); demais 5
grupos v92 current. Veredito QA: NO-GO para merge as-is (runbook §Regra de merge
itens 2–3); a fábrica não re-propõe sozinha (dedupe segura no PR #489 aberto —
lacuna estrutural §Follow-up acima).

Re-anchor executado na branch do PR #489 (producer: Docs & Readiness, AID-2396):
merge `7c044984` = v92 `6ce16467` + main `60ae2179` → observação independente
dos 3 cenários dojotoday re-ancorada first-hand (bundle
`evidence/observations/2026-09-18-7c044984-dojotoday-regrant-v93/`: substrate
214 passed/1 skipped, selfcheck OK, playwright 25 passed; sourceFingerprint
`fe30fdb9…` novo @ `7c044984`) → `aggregate --observations` + `regrant --propose`
exit 0 → assessment `2026-09-18-7c044984-dojotoday-regrant-v93` (apenas o grupo
dojotoday; os outros 5 seguem cobertos pelo v92, fingerprints inalterados) →
`check` e `check --require-current` rc=0; testes do cli 50 passed/2 skipped
(pin `LATEST_ASSESSMENT_ID` atualizado). Pendente: CI verde no head novo →
re-countersign QA (AID-2393) → merge single-writer FPE citando o verdict GO.
