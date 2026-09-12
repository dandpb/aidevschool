# Plan (retroativo): docs-reconciliation `Fix/win path` — PR #349

> **RETROSPECTIVE RECORD** (AID-1528 / countersign QA AID-1522 / auditoria
> AID-1520-F1). Plano documentado após o merge; não houve task record do
> produtor — a reconstrução abaixo deriva do diff real `69bfdd3d..845922cc`
> (verificado first-hand: 93 A / 84 D / 12 M, 189 files, +10433/−2442).

## O que mudou (diff real do merge `d92f2f90`)

**Docs-reconciliation (M, 12 arquivos):**
- `.gitignore` (+`.scratch/`, `.lavish/`, `.loops/` — este último sem
  newline final, corrigido em AID-1528)
- `AGENTS.md` (CODE MAP atualizado — conferido pelo QA: substrate
  validate:140/sync:833, codexDojo app.ts:15, state.ts:31/:47), `README.md`,
  `docs/DOCUMENTATION.md`, `docs/VISION.md`, `docs/CONSOLIDACAO_2026-08-17.md`,
  `docs/ESTADO_REAL_2026-08-17.md`, `docs/handbook/{README,02_onboarding}.md`,
  READMEs de `engines/{codexdojo-os-prototype,dojoToday,pixelDojo}`

**Conteúdo trazido ao versionamento (A, ~93 arquivos):**
- `miro-tour/` (54 — PNGs/JSON/MD do board), `wiki/` (14),
  `docs/curso-simples/` (incl. **novo** teste
  `workflow-exemplo/test_release_notes.py` — new-test-allowed),
  `docs/legal/piloto/` (privacidade/termos),
  `docs/product-readiness/evidence/` (JSONs — 9/9 parse OK pelo QA),
  `ROADMAP-Guia-do-Arquiteto.md` + `TRILHAS-DE-APRENDIZADO.md` (raiz)

**Untrack de derivados (D, 84 arquivos `.loops/**`):**
- 3 `memory.md` + `ROUTING_MANIFEST.md` + `output/` (screenshots, evidence,
  relatórios). Cleanup de caminho derivado permitido pela semântica AID-537
  (`SDLC guardrails (diff)` → success no head) — mas as `memory.md`/manifest
  não são deriváveis: **achado A** do countersign AID-1522.

**Restore pontual:** `engines/miniTown/README.md` — diff final vs base = 0
linha; `sha256 889415e1…2645` == digest promovido nos manifests regrant
r1–r4 (commit `845922cc`, conferido pelo QA).

## CI (re-verificado first-hand pelo CEO, GitHub API, 2026-09-12)

Check-runs no head `845922cc`: **zero falhas** — incl. `SDLC guardrails
(diff)` → success e `product readiness (claims)` → success; 1 skipped
esperado (pixelDojo matrix pós-discover). Merge às 19:23:06Z, depois do
verde. (Contagem absoluta de check-runs não é fixada aqui: acumula com
re-runs — lição AID-1515 r2.) 0 reviews no PR; author = merger = `dandpb`;
corpo do PR vazio.

## Verificação independente (não re-executada neste retrofit)

Countersign QA fresh-context **entregue pós-fato** (AID-1522, evidência
`aid1522-evidence/`): conteúdo APROVADO COM RESSALVA (achado A médio);
executou substrate no estado mesclado (30 projeções regeneradas), validação
dos 9 evidence JSONs, digests miniTown, CODE MAP. Processo NÃO CONFORME
itens 2 e 3 da política founder-direct — confirma F1; merge mantido.

## Follow-ups (executados/abertos em AID-1528)

- **Achado A remediado (AID-1528):** memória canônica dos loops realocada
  para `docs/loops/<loop>/` (rastreada; 4 arquivos restaurados verbatim de
  `69bfdd3d` + `docs/loops/README.md` com a política), `.loops/` permanece
  apenas output runtime não rastreado; AGENTS.md (linhas 62/181) e os 3
  SKILLs (`threejs-dojo`, `threejs-dojo-coverage`, `architecture-weed`)
  reconciliados para o novo lar da memória.
- Se surgir defeito: trilha canônica = nova issue Paperclip + intent/
  (regra global `AID-<n>-<slug>`), não edição silenciosa deste registro.
