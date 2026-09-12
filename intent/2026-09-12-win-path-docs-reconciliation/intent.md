# Intent: registro retroativo do docs-reconciliation `Fix/win path` (PR #349, origem founder-direct)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-12 pelo CEO
> sob AID-1528 (follow-up do countersign QA AID-1522, filho da auditoria SM
> AID-1520 achado **F1**): o PR foi merged **sem registro do produtor em
> `intent/`** (corpo do PR vazio, 0 reviews, nenhum task record no ramo) nem
> veredito independente pré-merge — exatamente a falha de classe que a
> política §Founder-direct engineering PRs (ratificada ~24min antes no merge
> #348 `69bfdd3d`) passou a proibir. Fatos de merge/CI re-verificados
> first-hand pelo CEO (GitHub API + git local, 2026-09-12). Veredito
> independente pós-fato: **entregue pelo QA** (AID-1522, fresh-context) —
> conteúdo APROVADO COM RESSALVA; processo NÃO CONFORME itens 2 e 3.

Author: founder (conta `dandpb`) · registro retroativo: CEO (AID-1528) ·
Change-id: `2026-09-12-win-path-docs-reconciliation` · Status: accepted
(founder merge GitHub; retrofit docs-only)

## Problem (claim do produtor, reconstruída do diff)

Repositório acumulava dívida de reconciliação documental e conteúdo não
rastreado: `docs/DOCUMENTATION.md`/`docs/VISION.md` desatualizados em relação
à estrutura real, materiais de produto (miro-tour, wiki, curso-simples,
piloto legal de privacidade/termos, evidências de readiness) fora do git, e
`.loops/` inteira rastreada — incluindo ~150 arquivos de artefatos derivados
de execução (screenshots, evidence JSONs, relatórios) que poluíam o diff e o
tamanho do repo sem serem fonte. O `engines/miniTown/README.md` no main
divergia do digest do artifact promovido.

## Outcome pretendido (claim do produtor, reconstruída do diff)

Wave única de reconciliação: docs espelho do estado real (`AGENTS.md`,
`README.md`, `DOCUMENTATION.md`, `VISION.md`, `CONSOLIDACAO`/`ESTADO_REAL`,
handbooks, READMEs de engines), conteúdo de produto trazido ao versionamento
(`miro-tour/` ~54 arquivos, `wiki/` 14, `docs/curso-simples/` incl. novo
teste de exemplo, `docs/legal/piloto/`, `docs/product-readiness/evidence/`
8–9 JSONs, `ROADMAP-Guia-do-Arquiteto.md`, `TRILHAS-DE-APRENDIZADO.md`),
restore pontual do README miniTown ao digest promovido, e `.loops/`
integralmente fora do versionamento (`.gitignore` + deletions de caminho
derivado — cleanup permitido pela semântica AID-537).

## Nota do retrofit (CEO)

Classe do PR: **founder-direct engineering** — author = merger = `dandpb`,
0 reviews. Item 1 da política OK (prerrogativa do owner). Item 2 VIOLADO
(registro antes do self-merge ausente — este retrofit o supre). Item 3
VIOLADO na forma: o diff toca **autoridade de processo** (`AGENTS.md`,
`.gitignore`, remoção de trilha `.loops/`) e por isso exigia countersign QA
fresh-context **pré-merge**; o veredito AID-1522 o forneceu pós-fato
(~17min após o merge) e concluiu que o merge é seguro manter, sem reversão.
O item 4 (CI verde no head) foi cumprido. Ressalva de conteúdo do veredito
(**achado A**, médio): as `memory.md`/`ROUTING_MANIFEST.md` deletadas junto
com os artefatos não são deriváveis — memória append-only que AGENTS.md e os
SKILLs ainda exigiam ler primeiro; remediada em AID-1528 com a realocação
da memória canônica para `docs/loops/` (rastreada), deixando `.loops/`
apenas como output runtime não rastreado.

## Merge

PR #349 (`fix/win-path` → `main`) merged por founder merge GitHub:
criado 2026-09-12T18:56:00Z, merged 2026-09-12T19:23:06Z, merge commit
`d92f2f9051798ef6ed8b157ddf09da685828e523` (parents `69bfdd3d` +
`845922cc`), 189 files, +10433/−2442.
