# Intent: registro retroativo do harness L4 (PR #345, origem founder-direct)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-12 pelo CEO
> sob AID-1515 (ordem da auditoria SM AID-1514, achado **F1**): o PR foi
> merged **sem registro do produtor nem veredito independente**. Este
> registro documenta o elo escrito do produtor; a substância (motivação
> harness-score, descrição do fix e verificação abaixo) são **afirmações do
> founder no corpo do PR #345**. Fatos de merge/CI foram re-verificados
> first-hand pelo CEO na criação deste retrofit (GitHub API, 2026-09-12).
> Veredito independente pós-fato: exigido por AID-1515 — countersign QA
> fresh-context contra o diff, ver issue AID-1515 (filha QA).

Author: founder (conta `dandpb`) · registro retroativo: CEO (AID-1515) ·
Change-id: `2026-09-12-harness-l4` · Status: accepted (founder merge GitHub;
retrofit docs-only)

## Problem (claim do produtor)

O repo estava em **L4 102/108** no
[harness-score](https://github.com/paladini/harness-score). Três gaps:

1. **fix(harness): qualify pixel-quest source paths in threejs-dojo skill
   cites** (`b3d34c67`) — Track A do harness-eval marcava
   `src/game/encounters/registry.ts` e `src/content/types.ts` como broken
   quando resolvidos a partir da raiz do repo; os arquivos vivem sob
   `engines/pixelDojo/pixel-quest/`. Resolve A006/A008 do run
   `2026-09-12-main-l4`.
2. **HYG-07**: `uv.lock` não era commitado — installs não-reprodutíveis.
3. **CI-04**: sem pre-commit para as superfícies Python compartilhadas.

## Outcome pretendido (claim do produtor)

L4 **108/108 (100%)** no harness-score, com lockfile versionado e hooks
check-only de pre-commit para os suites Python da raiz.

## Nota do retrofit (CEO)

Classe do PR: **founder-direct engineering** — autor, merger e verificador
foram a mesma pessoa humana (dandpb; 0 reviews no PR). Na época do merge não
havia política explícita para essa classe; ver a decisão de gate registrada
em `docs/sdlc/README.md` §Founder-direct engineering PRs (AID-1515) e a
retro-lista lá. Mitigantes verificados: CI verde no head **antes** do merge
(job `SDLC guardrails (diff)` incluído) — ver `plan.md`.

## Merge

PR #345 (`feature/harness-l4` → `main`) merged por founder merge GitHub em
2026-09-12T15:39:37Z, merge commit
`82e8ef8c2b5a40ede7efb89d0c8ec6f215561737`, head `ab009057`.
