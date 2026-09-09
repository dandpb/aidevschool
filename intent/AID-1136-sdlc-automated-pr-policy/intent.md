# Intent — AID-1136: política SDLC para PRs de agentes automatizados (Bolt/Palette/Sentinel)

Author: despacho do board "ajude todos os agentes a implementar o SDLC" (Registro #7,
2026-09-09, fio AID-400) · Change-id: AID-1136-sdlc-automated-pr-policy ·
Status: accepted (issue AID-1136 in_progress; produto docs-only, fast path)

> Origem autoritativa: Paperclip issue AID-1136 (filha da âncora AID-400).
> Este arquivo linka e complementa — não reescreve — a issue.

## Problem

PRs de contas automatizadas (Bolt/Palette/Sentinel, via google-labs-jules[bot])
entram no repo sem trilha uniforme (achado recorrente M2 da AID-400):

- Merged sem review GitHub: #262 (Sentinel XSS, 09-04), #301/#302 (09-08),
  #305/#306 (09-09).
- Fechados sem merge **nem motivo registrado**: #282, #283, #293, #294,
  #299, #300 — unmerged mudos.

O precedente BOM já existe (`intent/2026-09-03-xss-dojotoday-sentinel/`,
retrofit AID-771), mas não estava ratificado como política canônica nem
cobria recusa.

## Proposed outcome

- Seção **§PRs automatizados** canônica em `docs/sdlc/README.md`, substituindo
  a subseção "External-origin PRs (bots: Sentinel, Jules)" (conteúdo histórico
  preservado e absorvido).
- Fast path ratificado: `intent/<change-id>/` (intent.md + plan.md mínimos),
  CI verde no head, e **merge somente com aceitação registrada** — founder
  no GitHub OU veredito/countersign Paperclip (producer ≠ verifier preservado).
- **Recusa também é registrada**: PR fechado sem merge leva comentário de
  fechamento com motivo + link (issue/veredito) antes do close.
- Retro-lista dos 5 PRs merged citados (#262/#301/#302/#305/#306) na própria
  seção, com datas, SHAs de merge e trilha de aceitação.

## Affected users and systems

- `docs/sdlc/README.md` (docs; nenhum runtime/engine tocado).
- Agentes CEO/FPE/QA (fluxo de countersign), founder (merges via GitHub),
  contas Bolt/Palette/Sentinel (sujeitos da política, não executores).

## Constraints

- Docs-only: nenhum código, teste ou path derivado alterado.
- Não bloqueia cadeias em andamento (critério da issue).
- Quickstart `sdlc-quickstart-por-papel` (doc AID-400) atualizado com link à
  seção nova — no fechamento da issue, não no PR (doc Paperclip, não repo).

## Open questions

- Nenhuma em aberto: a issue já traz as decisões a ratificar (aceite E recusa
  registrados; retro-lista leve).
