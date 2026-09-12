# Intent: registro retroativo do DESIGN.md per-engine + CI lint gate (PR #346, origem founder-direct)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-12 pelo CEO
> sob AID-1515 (ordem da auditoria SM AID-1514, achado **F1**): o PR foi
> merged **sem registro do produtor em `intent/`** nem veredito
> independente. Atenuante parcial: o próprio PR commitou o task record
> `.tasks/design-md-frontend.md` (plano tlc-plan, 6 critérios, 9 dimensões,
> 2 one-way doors, Unresolved: none) junto com a implementação — trilha
> parcial in-repo, pré-merge, mas fora do lar canônico `intent/` e sem
> verificador independente. Fatos de merge/CI re-verificados first-hand pelo
> CEO (GitHub API, 2026-09-12). Veredito independente pós-fato: exigido por
> AID-1515 — countersign QA fresh-context contra o diff (este PR é a
> prioridade da fila: toca gate de processo/CI).

Author: founder (conta `dandpb`) · registro retroativo: CEO (AID-1515) ·
Change-id: `2026-09-12-design-md-ci-lint` · Status: accepted (founder merge
GitHub; retrofit docs-only)

## Problem (claim do produtor)

Os frontends têm identidades visuais deliberadas (codexDojo brass-terminal,
literacyDojo warm/friendly, dojoToday soft-cream, miniTown night-town,
pixelDojo arcade, voxelDojo space-HUD), mas nada no repo diz a um agent qual
é a identidade de cada engine antes de ele escrever UI: tokens espalhados em
`:root` CSS e código de cena, valores AA auditados (AID-914/1023/1027) só
como comentários, sem registry para conferir. Cada mudança de UI pode driftar
identidade ou quebrar contraste auditado sem que nada aponte.

## Outcome pretendido (claim do produtor)

Um `DESIGN.md` (spec Google Stitch) por engine frontend, **derivado do
CSS/cena real — nunca inventado** —, registrado no `AGENTS.md` de cada
engine como autoridade visual, e verificado no CI com o linter oficial
`@google/design.md` (política zero-erros), tratando token visual como código.

## Nota do retrofit (CEO)

Classe do PR: **founder-direct engineering** — author = merger = `dandpb`,
0 reviews. Diferente dos bot PRs (Bolt/Palette/Sentinel via
`google-labs-jules[bot]`), o produtor é o dono humano; a aceitação da época é
válido aceite de dono. Os elos faltantes eram o registro canônico do produtor
e o verificador independente — este retrofit supre o primeiro; o segundo é o
countersign QA pós-fato (AID-1515). Este PR também **alterou o próprio
gate de CI** (novo job `design-md-lint`) — mudança de autoridade de
processo; ver decisão de gate em `docs/sdlc/README.md`
§Founder-direct engineering PRs: essa subclasse passa a exigir countersign
**pré-merge**.

## Merge

PR #346 (`feature/design-md` → `main`) merged por founder merge GitHub em
2026-09-12T17:24:50Z, merge commit
`0a85deff0617d329409f87c0b4f8e884b0d7a20a`, head `cff1392a`.
