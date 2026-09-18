# Intent: registrar sdlc-quest + re-entrada de zai-duolingo-like nos mapas AGENTS.md (harden R2 do retrofit-accept PR #471)

Author: CEO ruling AID-2282 (execução `0bb23385`, 2026-09-17T14:04Z) · Change-id: `AID-2288-engine-maps-retrofit-record` · Status: accepted

> Origem: issue Paperclip **AID-2288** (child de AID-2282, prioridade medium,
> assignada ao Docs & Readiness Engineer). Citação da entrega:
> "Atualizar AGENTS.md root e engines/AGENTS.md (STRUCTURE/NOTES): sdlc-quest
> nova engine (node tools/test.cjs), zai-duolingo-like re-adicionada com
> conteudo real (…, commit 9f2f487e - condicao da nota c604d2ec satisfeita
> segundo veredito AID-2281 item 5) + Append linha #88 no sdlc-audit-index".
> A linha #88 do índice vive no doc Paperclip `sdlc-audit-index` (AID-1610),
> fora do repo — seu append é registrado no receipt da issue, não aqui.

## Problem

Ressalva **R2** do veredito QA CONFORME COM RESSALVA (AID-2281, comentário
`1835c128`, 2026-09-17T14:00Z): o merge `3c5629c0` (PR #471) aterrissou
conteúdo real de duas engines — `engines/sdlc-quest/` (nova) e
`engines/zai-duolingo-like/` (re-adicionada; commit `9f2f487e`, 209 + 220 =
429 arquivos) — mas os mapas de navegação (**AGENTS.md root e
engines/AGENTS.md**) não as registram: STRUCTURE/NOTES ainda descrevem a
remoção c604d2ec (2026-09-07) com a proibição "não re-adicionar exceto com
conteúdo real". Quem segue os mapas hoje não encontra as engines nem sabe
como validá-las; a nota vigente contradiz a árvore real.

## Proposed outcome

Ambos os mapas refletem a árvore @ `3c5629c0`: as duas engines aparecem em
STRUCTURE e em WHERE TO LOOK com comandos verificáveis (sdlc-quest:
`npm test` = `node tools/test.cjs`; zai: `npm run verify`), e a nota
histórica de zai-duolingo-like registra a cadeia completa
(remoção → limpeza AID-2117 → re-entrada com conteúdo real 9f2f487e →
condição satisfeita segundo veredito AID-2281 → ratificação CEO AID-2282),
preservando o histórico datado contra restores ingênuos (precedente
polyglotEvolutionArena).

## Affected users and systems

Docs de navegação raiz (`AGENTS.md`, `engines/AGENTS.md`) — sem mudança de
produto, código ou engine-local docs. Leitores finais: aprendizes,
facilitadores e agentes que navegam pelo repo.

## Constraints

- Docs-only: nenhum arquivo sob `engines/sdlc-quest/` ou
  `engines/zai-duolingo-like/` é editado (docs de domínio de engine são do
  dono da engine).
- Claims com evidência: contagem de arquivos e commits citados verificados
  first-hand (`git ls-tree -r 9f2f487e` → 209 zai / 220 sdlc-quest).
- Merge single-writer FPE até R1; PR pequeno e autocontido.

## Open questions

Nenhuna — escopo fechado pelo ruling CEO (hardens R1–R4 já distribuídos:
AID-2286 CI by-name, AID-2287 overlay floor, AID-2288 este).
