<!-- issue: AID-3521 | key: aid3521-fase1-v21-docs-patch | doc_id: ea44dd4d-6237-458b-ad47-d60c92a84d28 | updated: 2026-09-30 21:04:39.747+00 -->

# AID-3521 Fase1 v2.1 — draft docs-only (patch)

(AID-3521)

# Draft docs-only Fase1 v2.1 — patch (97 linhas)

Aplicar em `main` de `dandpb/aidevschool` SOMENTE após revisão independente aceita. Nenhuma alteração de workflow/script/permissão/required check/proteção.

```diff
--- a/docs/sdlc/README.md
+++ b/docs/sdlc/README.md
@@ -389,13 +389,31 @@
        do papel que executa o merge (espírito AID-2493; identidade herdada
        por clonação é achado de atribuição — F-C da AID-3432).
 
-    O escape hatch canônico NÃO é esta via e permanece inalterado: editar a
-    branch protection/rulesets é a única saída MECÂNICA da garantia
-    (admin-only, fora do merge path, auditável — §GATE pré-merge, Modelo de
-    ameaça). O fallback CLI não dispensa nenhum gate: é a MESMA cadeia de
-    verificação com o último passo executado localmente. A porta imprime
-    este protocolo no stderr quando o merge via API falha
-    (`scripts/merge_pr.sh` §5, AID-3433/E2).
+     O escape hatch canônico NÃO é esta via e permanece inalterado: editar a
+     branch protection/rulesets é a única saída MECÂNICA da garantia
+     (admin-only, fora do merge path, auditável — §GATE pré-merge, Modelo de
+     ameaça). O fallback CLI não dispensa nenhum gate: é a MESMA cadeia de
+     verificação com o último passo executado localmente. A porta imprime
+     este protocolo no stderr quando o merge via API falha
+     (`scripts/merge_pr.sh` §5, AID-3433/E2).
+8. **Recibo de push-run com escopo de run/evento/PR/SHA (AID-3521 Fase1
+     v2.1 docs-only; achado AID-3278).** O tier `issue_comment` do
+     `countersign-gate` roda na cópia de main e o check-run resultante é
+     anexado ao HEAD de main — runs de PRs alheios pintam de vermelho
+     commits de merge não relacionados (18 falhas cross-PR em 7 HEADs só em
+     2026-09-28; matriz no thread AID-3278). A partir daqui, todo recibo de
+     push-run pós-merge que cite checks de um commit de merge M **enumera os
+     check-runs de M e resolve cada linha pela run de origem** (event,
+     workflow, head), classificando por proveniência — `push @ M` (pertence
+     a M; vermelho é real e permanece visível, ex.: `product readiness
+     (claims)` failed no run 36491949848 do M=a02b1833), `cross-PR (PR P @
+     H)` (veredito sobre outro PR/HEAD, rotulado com run/PR/SHA — mantido,
+     nunca descartado) ou `derived @ M` (workflow_run encadeado ao push de
+     M). **Proibido descarte global** de checks de main, ocultação de
+     vermelho real de push ou classificação sem endpoint citado; template:
+     `docs/sdlc/templates/push-run-receipt.md`. Sem mudança mecânica: o
+     gate do merge continua sendo o `countersign-gate` no head do PR + o
+     re-run live da porta (`scripts/merge_pr.sh`).
 
 ## GATE pré-merge mecânico `countersign-gate` (AID-2768 — fim da classe F)
 
--- /dev/null
+++ b/docs/sdlc/templates/push-run-receipt.md
@@ -0,0 +1,53 @@
+# Push-run receipt (por run/evento/PR/SHA) — template
+
+Merge commit: `<M 40-hex>` · PR mergeado: `#<n>` · Receipt emitido em: `<YYYY-MM-DD HH:MMZ>` · Emissor: `<agent/run>`
+
+> Recibo de push-run pós-merge com **escopo de run/evento/PR/SHA** (AID-3521
+> Fase1 v2.1 docs-only; achado de origem AID-3278: runs `issue_comment` do
+> `countersign-gate` rodam na cópia de main e anexam o check-run ao HEAD de
+> main, pintando commits de merge não relacionados). **Nenhum descarte
+> global:** toda linha de check-run de `<M>` aparece aqui, classificada por
+> proveniência. Vermelho real de push permanece visível; vermelho cross-PR
+> permanece visível, rotulado.
+
+## Como montar (reproduzível por qualquer revisor)
+
+1. Enumerar TODOS os check-runs de `<M>`:
+   `gh api repos/dandpb/aidevschool/commits/<M>/check-runs --paginate`
+2. Resolver CADA linha pela run de origem:
+   `gh api repos/dandpb/aidevschool/actions/runs/<run_id>`
+   → `event`, `name` (workflow), `head_sha`, `head_commit`.
+   Para `countersign-gate`, o PR avaliado e o motivo vêm do log do job
+   (`gh api .../actions/jobs/<job_id>/logs` → `PR=<n>`, linha `##[error]`).
+3. Classificar por proveniência (tabela abaixo) — nunca descartar.
+4. Falha de transporte em qualquer lookup = linha `unresolved` (fail-closed),
+   nunca omissão silenciosa.
+
+## Classificação por proveniência
+
+| Escopo | Condição (observável na run de origem) | Vale para o CI de `<M>`? |
+| --- | --- | --- |
+| `push @ M` | `event=push` **e** `head_sha == M` | **SIM** — vermelho é REAL e permanece visível |
+| `cross-PR (PR P @ H)` | `event=issue_comment\|workflow_dispatch` avaliando PR P com head H ≠ M (countersign-gate: PR extraído do log) | NÃO — veredito sobre (P, H), anexado a M só porque o tier roda na cópia de main |
+| `derived @ M` | `event=workflow_run` cuja run disparadora está em `push @ M` (encadeamento citado) | SIM — derivado do push do próprio M |
+| `unresolved` | lookup da run falhou (transporte/API) | pendente — fail-closed, emitir de novo |
+
+## Linhas do receipt (uma por check-run; agrupar jobs verdes do mesmo run é OK se toda falha ganhar linha própria)
+
+| check-run | conclusão | started_at | run (event) | escopo | proveniência extra |
+| --- | --- | --- | --- | --- | --- |
+| `<name>` | `<success/failure/...>` | `<ts>` | `<id>` (`<event>`) | `push @ M` \| `cross-PR (PR P @ H)` \| `derived @ M` \| `unresolved` | `<PR=<n>, motivo §, workflow, head H>` |
+
+## Veredito do CI de `<M>` (só escopos `push @ M` / `derived @ M`)
+
+- Falhas (todas nominadas, nenhuma ocultável): `<lista>`
+- Não é este receipt que autoriza/blockeia merge (isso é papel do
+  `countersign-gate` no head do PR + re-run live da porta `scripts/merge_pr.sh`).
+
+## Critérios de validade do receipt (negativos)
+
+- [ ] TODO check-run enumerado no passo 1 aparece (contagem bate; agrupamento
+      só para success/skipped, falhas sempre individuais).
+- [ ] Nenhuma linha `push @ M` vermelha ausente ou rebaixada a nota.
+- [ ] Nenhuma linha cross-PR descartada "por ser ruído" — rotulada, no máximo.
+- [ ] Cada linha citável: endpoint + id de run reproduzíveis.

```
