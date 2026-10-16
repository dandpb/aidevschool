# Push-run receipt (por run/evento/PR/SHA) — template

Merge commit: `<M 40-hex>` · PR mergeado: `#<n>` · Receipt emitido em: `<YYYY-MM-DD HH:MMZ>` · Emissor: `<agent/run>`

> Recibo de push-run pós-merge com **escopo de run/evento/PR/SHA** (AID-3521
> Fase1 v2.1 docs-only; achado de origem AID-3278: runs `issue_comment` do
> `countersign-gate` rodam na cópia de main e anexam o check-run ao HEAD de
> main, pintando commits de merge não relacionados). **Nenhum descarte
> global:** toda linha de check-run de `<M>` aparece aqui, classificada por
> proveniência. Vermelho real de push permanece visível; vermelho cross-PR
> permanece visível, rotulado.

## Como montar (reproduzível por qualquer revisor)

1. Enumerar TODOS os check-runs de `<M>`:
   `gh api repos/dandpb/aidevschool/commits/<M>/check-runs --paginate`
2. Resolver CADA linha pela run de origem:
   `gh api repos/dandpb/aidevschool/actions/runs/<run_id>`
   → `event`, `name` (workflow), `head_sha`, `head_commit`.
   Para `countersign-gate`, o PR avaliado e o motivo vêm do log do job
   (`gh api .../actions/jobs/<job_id>/logs` → `PR=<n>`, linha `##[error]`).
3. Classificar por proveniência (tabela abaixo) — nunca descartar.
4. Falha de transporte em qualquer lookup = linha `unresolved` (fail-closed),
   nunca omissão silenciosa.

## Classificação por proveniência

| Escopo | Condição (observável na run de origem) | Vale para o CI de `<M>`? |
| --- | --- | --- |
| `push @ M` | `event=push` **e** `head_sha == M` | **SIM** — vermelho é REAL e permanece visível |
| `cross-PR (PR P @ H)` | `event=issue_comment\|workflow_dispatch` avaliando PR P com head H ≠ M (countersign-gate: PR extraído do log) | NÃO — veredito sobre (P, H), anexado a M só porque o tier roda na cópia de main |
| `derived @ M` | `event=workflow_run` cuja run disparadora está em `push @ M` (encadeamento citado) | SIM — derivado do push do próprio M |
| `unresolved` | lookup da run falhou (transporte/API) | pendente — fail-closed, emitir de novo |

## Linhas do receipt (uma por check-run; agrupar jobs verdes do mesmo run é OK se toda falha ganhar linha própria)

| check-run | conclusão | started_at | run (event) | escopo | proveniência extra |
| --- | --- | --- | --- | --- | --- |
| `<name>` | `<success/failure/...>` | `<ts>` | `<id>` (`<event>`) | `push @ M` \| `cross-PR (PR P @ H)` \| `derived @ M` \| `unresolved` | `<PR=<n>, motivo §, workflow, head H>` |

## Veredito do CI de `<M>` (só escopos `push @ M` / `derived @ M`)

- Falhas (todas nominadas, nenhuma ocultável): `<lista>`
- Não é este receipt que autoriza/blockeia merge (isso é papel do
  `countersign-gate` no head do PR + re-run live da porta `scripts/merge_pr.sh`).

## Critérios de validade do receipt (negativos)

- [ ] TODO check-run enumerado no passo 1 aparece (contagem bate; agrupamento
      só para success/skipped, falhas sempre individuais).
- [ ] Nenhuma linha `push @ M` vermelha ausente ou rebaixada a nota.
- [ ] Nenhuma linha cross-PR descartada "por ser ruído" — rotulada, no máximo.
- [ ] Cada linha citável: endpoint + id de run reproduzíveis.
