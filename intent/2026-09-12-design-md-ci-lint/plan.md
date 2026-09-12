# Plan (retroativo): DESIGN.md per-engine + CI lint gate — PR #346

> **RETROSPECTIVE RECORD** (AID-1515 / auditoria AID-1514-F1). Plano
> documentado após o merge; o plano real do produtor foi o task record
> `.tasks/design-md-frontend.md`, commitado dentro do próprio PR.

## O que mudou (diff real do merge `0a85deff`; 15 files, +1182/−1)

**Adicionados (DESIGN.md, spec Stitch, derivados do CSS/cena real):**
- `engines/literacyDojo/DESIGN.md` (115) — warm friendly learning
  (violet/paper)
- `engines/dojoToday/DESIGN.md` (108) — soft cream cards (indigo, pares
  AA-tuned)
- `engines/miniTown/DESIGN.md` (79) — cozy night town (registry de paleta
  de cena)
- `engines/voxelDojo/DESIGN.md` (104) — game HUD (paleta station identity
  de `shared/palette.ts`)
- `DESIGN.md` raiz (46) — mapa dos sistemas (pointer, não style)
- `docs/design/reference/airtable.DESIGN.md` (554) — referência
  getdesign, parked
- `.tasks/design-md-frontend.md` (129) — task record tlc-plan do produtor

**Processo/autoridade:**
- `.github/workflows/ci.yml` (+40): novo job **`design-md-lint`** — coleta
  DESIGN.md changed vs base e roda `npx -y @google/design.md lint`;
  política zero-erros (warnings OK; erros fail).
- `AGENTS.md` raiz + 5 engines (+1 cada): WHERE TO LOOK aponta o DESIGN.md
  do engine como autoridade visual (critério 2 do plano).
- `docs/product-readiness/README.md` (re-render): mudança de fingerprint de
  fonte voxelDojo corretamente marca 3 cenários os-voxel como stale — o
  sistema de readiness funcionando como planejado.

**Inalterados (autoridade pré-existente preservada):**
`engines/codexDojo/DESIGN.md`, `engines/pixelDojo/pixel-quest/DESIGN.md`
(commits a0fc4ee0/b2a11b0b), `engines/codexdojo-os-prototype/DESIGN.md`.

## CI (re-verificado first-hand, GitHub API)

- Run **949** (event `pull_request`, head `cff1392a`, iniciado
  2026-09-12T17:16:18Z): **37/37 jobs verdes**, incluindo
  `SDLC guardrails (diff) → success` **e** `DESIGN.md lint → success`.
  Merge às 17:24:50Z — **depois** do verde.
- Run de push pós-merge no `0a85deff`: 38 checks verdes/skipped, incl.
  `SDLC guardrails (diff) → success`.
- Zero reviews no PR; author = merger = `dandpb`.

## Verificação alegada pelo produtor (não re-executada neste retrofit)

9 DESIGN.md: `@google/design.md lint` → 0 errors; pytest 864 passed (suite
full, readiness re-render in sync); pre-commit all-files Passed. Veredito
independente: countersign QA pós-fato (AID-1515), prioridade máxima da fila
deste retrofit (diff toca CI/gate de processo).

## Follow-ups

- Producer re-runs dos **3 cenários os-voxel stale** no readiness (fingerprint
  voxelDojo mudou; re-render correto, follow-up pendente do produtor).
- `airtable.DESIGN.md` segue parked como referência — não é autoridade de
  engine.
- Se surgir defeito: trilha canônica = nova issue Paperclip + intent/
  (regra global `AID-<n>-<slug>`), não edição silenciosa deste registro.
