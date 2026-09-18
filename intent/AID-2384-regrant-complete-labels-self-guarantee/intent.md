# Intent: gate `readiness-regrant-complete.yml` auto-garante as labels de observação

Author: Paperclip AID-2384 (owner FPE `fa8130d5`) · Change-id:
AID-2384-regrant-complete-labels-self-guarantee · Status: proposed (countersign
QA pré-merge pendente — diff toca autoridade de processo, §PRs automatizados
`docs/sdlc/README.md`)

> One source of truth: AID-2384 (corpo + description; defeito encontrado no
> drill AID-2380 item 2, relay AID-2383). Este arquivo cita; não reescreve.

## Problem

O gate `regrant observation completeness` (AID-2203 R3) assume que as labels
`regrant-pending-observation`/`regrant-observation-complete` já existem no
repo. Elas só são criadas pelo passo "ensure proposal labels exist" da
**fábrica** (`readiness-regrant.yml`), condicionado a `needed == true &&
dedupe.skip != 'true'`. Sequência observada 2026-09-18 (AID-2384):

1. fábrica run 35299951893 → dedupe vs PR #489 → passos de labels skipped;
2. drill do gate (PR #490): run 35300417695 — gate RED correto (6 STALE-WINDOW
   no merge-ref), mas `gh pr edit --add-label regrant-pending-observation` →
   `'regrant-pending-observation' not found` → o passo aborta **antes** de
   postar o comentário "regrant observation incomplete" (o diagnóstico se perde);
3. bootstrap manual (02:44Z) + re-dispatch 35300566933 → drill concluído com
   intervenção manual — exatamente o que AID-2384 elimina.

## Proposed outcome

1. Passo idempotente **"ensure observation labels exist"** no
   `readiness-regrant-complete.yml`, antes de "record the observation state"
   (`gh label create ... || true`, cores/descrições idênticas às da fábrica).
   Autorização: `pull-requests: write` cobre label create neste repo (evidência
   first-hand: factory run 35224606938 "ensure factory labels" → 422 "already
   exists", não 403) — sem ampliar `permissions:`.
2. **Comentário antes de label**: ambos os caminhos (verde/vermelho) postam o
   comentário ANTES de qualquer mutação de label — o comentário carrega o
   output do gate e não pode se perder por falha de label (proposta 2 da
   AID-2384). Verde mantém `--add-label regrant-observation-complete` **fatal
   depois do recibo** (check vermelho = fail-closed; verde sem label reabriria
   a ambiguidade AID-2202). Vermelho faz o add do pending `|| true` **após** o
   comentário (o check nomeado vermelho é o sinal fail-closed; o exit 1 se
   mantém).
3. Runbook `docs/product-readiness/REGRANT-RUNBOOK.md` §Labels atualizado
   (uma sentença: o gate auto-garante as labels, AID-2384).

## Non-goals

- Não mexer na fábrica (`readiness-regrant.yml`), em `cli.py`/`regrant.py`, em
  gates, nem em `permissions:` do gate.
- Não mudar semântica do check (vermelho = incompleto; verde = completo) nem a
  mensagem/conteúdo dos comentários (marcadores
  `regrant-observation-receipt` / `regrant observation incomplete (AID-2203)`
  preservados verbatim).

## Aceite (da AID-2384)

Re-dispatch do gate em PR retrofit/drill com labels ausentes → check vermelho
nomeado + label aplicada + comentário postado, sem intervenção manual. Drill
pós-merge (padrão AID-1669/AID-2380): deletar as duas labels, abrir PR drill
`regrant/auto-*`, `workflow_dispatch`, verificar superfície, fechar PR +
deletar branch (protocolo AID-1741).
