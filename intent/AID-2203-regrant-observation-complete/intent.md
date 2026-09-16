# Intent: fábrica de re-grant emite proposta observation-complete (AID-2202, Opção 2)

Author: Paperclip AID-2203 (dispatch DRE AID-2202; auditoria AID-2200 instância #70; owner FPE
fa8130d5 — owner da fábrica AID-1357) · Change-id: AID-2203-regrant-observation-complete ·
Status: draft (aguardando plan gate)

> One source of truth: AID-2202 (corpo + description), comentário #70 da AID-2200 e recibo
> AID-2192. Este arquivo cita; não reescreve.

## Problem

A fábrica de re-grant (AID-1357, `readiness-regrant.yml` + `cli.py regrant --propose`) propõe
PRs que carregam **apenas o snapshot de producer** quando a observação independente ainda não
existe (`regrant --propose` exit 3, "REGRANT PENDING"). Esse estado **pendente** é
**indistinguível de um re-grant completo no nível de PR/CI**:

- AID-1890 tornou o `check` da PR-lane determinístico (compara views geradas vs decisões
  promovidas gravadas) e o `check --require-current` na PR-lane é **non-blocking**
  (`.github/workflows/ci.yml` "surface claims staleness window (PR lanes, non-blocking)");
- `enforce` com candidate fresco filtra as razões producer-only
  (`enforcement.py unsupported_candidate_reasons`) — candidate só-automático **não** derruba a
  PR-lane.

Resultado: o head do PR de proposta fica **verde** (ex.: #458 head `2cc20ba3`, 38 ok/1 skip,
verificado first-hand na auditoria #70) e nada na superfície do PR sinaliza "este re-grant está
incompleto". O fast path single-writer mergeia o PR achando que cura a main — mas o merge de um
snapshot producer-only **não completa o re-grant** (sem observação independente → sem
assessment escrito → claims permanecem stale). É a causa raiz da métrica degradada
**repeat-incident `product readiness (claims)` vermelho pela 5ª janela consecutiva**
(push-runs `4b87d5b2`/`50d31811`/`fb4dbc77`; AID-2202, AID-2140, AID-2199).

Causa agravante: o despacho da observação (watchdog QA) é cadenciado, não emparceirado ao lote
— os rounds #458/#459 ficaram pendentes até intervenção manual (AID-2199, v88 em curso).

## Proposed outcome

1. **Estado da proposta legível por máquina**: `regrant --propose` passa a emitir (opcional)
   um manifest JSON (`regrant-proposal.json`) com o estado da proposta
   (`pending-observation` | `written`), assessment id, SHA e checklist por use case —
   commitado na branch de proposta ao lado do snapshot de producer.
2. **Sinal de mergeabilidade na superfície do PR**: PRs de proposta nascem com label
   `regrant-pending-observation` (exit 3) ou `regrant-observation-complete` (exit 0), e um
   check required nomeado `regrant observation completeness` fica **vermelho enquanto a
   observação não completa** e verde quando o re-grant está completo na árvore do PR
   (`cli.py check --require-current` — mesma semântica fail-closed da lane main).
3. **Fechamento verificável**: quando a fase QA empurra observação + re-grant completo
   (exit 0) na branch, o check fica verde e o label troca para `regrant-observation-complete`
   com recibo idempotente no PR — o fast path passa a ter um sinal máquina explícito de "não
   mergeie enquanto pendente" (regra de mesmo lote: emenda runbook do PR #462 / AID-2204).

O bot continua **nunca** escrevendo assessment quando pendente e **nunca** mergeando;
producer ≠ verificador intacto (a observação continua sendo de contexto independente; nada de
novo é auto-concedido); nenhum gate é relaxado — apenas um sinal bloqueante novo é adicionado.

## Affected users and systems

- `docs/product-readiness/tools/` (cli.py, regrant.py) + `docs/product-readiness/tests/`
- `.github/workflows/readiness-regrant.yml` (edit) + `.github/workflows/readiness-regrant-complete.yml` (novo)
- `docs/product-readiness/REGRANT-RUNBOOK.md` (§Fluxo automatizado — coordenar com PR #462)
- Consumidores: single-writer CEO (decisão de merge), QA/DRE (fase de observação), watchdog
  Paperclip (lifecycle do PR bot), auditoria SDLC (verificação da métrica repeat-incident)

## Constraints

- Sem novos secrets (B1b: novo secret só com aprovação CEO explícita).
- Sem mudança nos exits 0/1/2/3 do `regrant` nem no contrato R1
  (`test_regrant.py::test_every_use_case_keeps_a_non_playwright_assertion`).
- Sem editar `ci.yml` (superfície compartilhada) nem arquivos de teste existentes
  (hook `protect-tests.sh`; teste novo vai em arquivo novo).
- Bot não mergeia; single-writer CEO permanece; PR-lane principal não pode regredir.
- Merge protegido: `main` é single-writer; este change entra por PR com countersign QA
  pré-merge (classe "autoridade de processo" — `docs/sdlc/README.md` §PRs automatizados).

## Open questions

1. O check de completude deve rodar no merge-ref (árvore pós-merge prevista) ou no head do
   PR? (Spec: merge-ref — é o que aterrará na main; coerente com a regra 3 do runbook.)
2. O label-swap automatizado pelo workflow de completude é aceitável como estado de confiança
   para o fast path, ou o countersign QA permanece o único arbítrio? (Spec: label é sinal
   necessário, não suficiente — countersign permanece.)
3. Emparceiramento do DESPACHO da observação no mesmo lote (Paperclip-side) fica fora do
   escopo deste change (ver Flagged concerns) — confirmar com owner.
