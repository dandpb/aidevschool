# AID-261 — Candidato de release: P0 de design/a11y nos apps voxel do piloto + reduced-motion no pixel-quest

## Resultado

Implementados os gaps P0 do contrato de design AID-31 §4 (reconciliação 2026-08-28) para as quatro
superfícies do bundle do piloto. Nova revisão imutável `161f8c9e76a9732588a3f020bf4d7ec277ff2ba2`
(parent `ec265fab13ac98700e9de58b5d719d55d979178d`), bundle construído e publicado como **draft**
para verificação independente da QA. **Nenhuma promoção a produção foi feita** — promoção segue o
gate de QA (producer ≠ verifier).

## Identidade do candidato

- Revisão Git imutável: `161f8c9e76a9732588a3f020bf4d7ec277ff2ba2` (tree `077a797e06aaf1293d6abad74443e7500263f198`)
- Draft OS (piloto): <https://6a91fb4dc2e2cd5f4dc00b6c--aidevschool-codexdojo-os.netlify.app>
- Draft pixel-quest: <https://6a91fafbab0b3c4e0ee36c61--singular-crostata-273e7e.netlify.app>
- `pilot-bundle-manifest.json` do draft: `sourceRevision: 161f8c9e76a9732588a3f020bf4d7ec277ff2ba2`
- Alias canônico permanece no deploy anterior (`ec265fa` / deploy `6a9141bc5ac75e6a300cc00e`) até o GO da QA.

## Mudanças (17 arquivos na revisão)

Por jogo (game-02-warehouse, game-03-wormhole, game-05-relay-station):

- `index.html`: `lang="pt-BR"`; tokens locais com papéis semânticos (`--vx-bg/surface/raised/text/muted/border/action/focus/status/success/error`, valores engine-local, mesmas cores renderizadas); `@media (prefers-reduced-motion: reduce)` zerando animação/transição não essencial; botões do HUD com `min-height/min-width: 44px`; refinamento `@media (max-width: 400px)` (HUD empilha já no breakpoint 720px; padding/métricas ajustados no piso de 320px); `<title>` PT-BR.
- `src/scene/hud.ts`: `.status` agora `role="status" aria-live="polite"`; copy do HUD 100% PT-BR (status, botões, legends, placeholder). No wormhole, rótulos PT-BR para as estratégias L4 (`RESOLUTION_LABELS`) mantendo os valores canônicos `salted`/`increment` na evidência (`resolution_chosen` intocado).
- `src/sim/levels.ts`: `title`/`lesson`/`passRule` localizados (conteúdo pedagógico inalterado; seeds/métricas idênticos).
- `playwright/*.spec.ts`: asserções de texto atualizadas `cleared` → `concluída` (testids inalterados).

Pixel-quest:

- `src/styles.css`: bloco `@media (prefers-reduced-motion: reduce)` (duração 0s p/ animação/transição, scroll-behavior auto).
- `engines/codexdojo-os-prototype/scripts/build-pilot-bundle.mjs`: pin imutável do PixelDojo atualizado para o novo deploy `6a91fafbab0b3c4e0ee36c61--singular-crostata-273e7e.netlify.app` (o pin anterior `6a8e1f4c591b550b69173c71` não continha reduced-motion).

Deltas incidentais absorvidos na revisão (já presentes no checkout compartilhado, pré-existentes ao
AID-261, afetam só o deploy pixel-quest): `engines/pixelDojo/package.json` e `pixel-quest/package.json`
(metadados license/repository Apache-2.0) e `pixel-quest/src/content/reviewSlice.ts` (string de
projeção "overdue 16d" → "overdue 27d"). Incluídos para que a revisão Git represente exatamente o
artefato publicado; nenhuma mudança de comportamento além do escopo.

## Evidência executada (produtor; QA independente pendente)

```text
# unit + tipo (por jogo voxel)
game-02-warehouse: vitest 18 passed / 2 failed (ver RETRATAÇÃO 2026-08-28 abaixo); tsc --noEmit clean
game-03-wormhole:  vitest 18 passed; tsc --noEmit clean
game-05-relay-station: vitest 21 passed; tsc --noEmit clean
pixel-quest: vitest 113 passed; tsc --noEmit clean; vite build ok (CSS contém prefers-reduced-motion)

# browser smokes (jogabilidade + emissão de evidência, asserções PT-BR)
playwright test (warehouse): 3 passed
playwright test (wormhole): 3 passed
playwright test (relay-station): 3 passed

# build do bundle
COMMIT_REF=161f8c9e76a9732588a3f020bf4d7ec277ff2ba2 npm run build:pilot
PASS; manifest sourceRevision=161f8c9e76a9732588a3f020bf4d7ec277ff2ba2;
apps/warehouse|wormhole|relay-station index.html: lang="pt-BR", prefers-reduced-motion, min-height 44px;
JS bundles: role="status", aria-live="polite", "Onda concluída".

# deploy draft
npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json
draft 6a91fb4dc2e2cd5f4dc00b6c (sem --prod)
npx netlify deploy --no-build --dir dist --site singular-crostata-273e7e (pixel-quest)
draft 6a91fafbab0b3c4e0ee36c61

# pre-check remoto do produtor sobre o draft (18/18 PASS)
lang=pt-BR ×3; sem overflow horizontal a 320px ×3; media query reduced-motion ×3;
hud-status role=status aria-live=polite ×3; botões do HUD ≥44px ×3; copy do HUD sem inglês ×3.
Script: draft_precheck_aid261.mjs (heartbeat AID-261, 2026-08-28).
```

## Pendências para a QA (critérios AID-261 §aceite)

> **RETRATAÇÃO 2026-08-28 (AID-276, F2 da QA AID-268):** a alegação original
> "game-02-warehouse: vitest 20 passed" **não reproduz** na revisão pinada `161f8c9` nem no baseline
> `ec265fa` — resultado determinístico em ambiente limpo: **18 passed / 2 failed (20)**
> (`_work-products/AID-268/unit-smokes.log`, QA independente 2026-08-28T21:47:24Z). As 2 falhas estão
> em `engines/voxelDojo/game-02-warehouse/src/game/controller.test.ts`: asserções de
> `attempt_id` (`kv-warehouse-L1-attempt-1/2`) no JSON `EVIDENCE`. Causa-raiz (pre-existente do pin
> `ec265fa`, não uma regressão do AID-261): `engines/shared/teaching-evidence/emit.ts` não tinha
> `attemptId` em `EmitOptions` e descartava silenciosamente o argumento passado por
> `voxelDojo/shared/createEmitForGame.ts`. Correção do produtor: branch
> `aid-274/voxel-attempt-id` @ `5818bb3` (AID-274/AID-276) serializa `attempt_id` (snake_case) no
> envelope — game-02 20/20 e voxel catalog-wide verde nessa revisão, **verificação independente
> pendente**. A alegação original do produtor era inexata e fica retirada do registro.

1. Anúncio único em leitor de tela (NVDA/VoiceOver) da mudança de status do HUD, sem roubar foco, nos 3 jogos.
2. Emulação `prefers-reduced-motion` no iframe real do host (não só standalone).
3. 320/375/768/1280px + 400% zoom no percurso embutido (host ⇄ voxel ⇄ literacyDojo).
4. Contraste AA nos pares de cor dos tokens (valores computados por tema/estado).
5. Após GO: promover o draft a produção pelo fluxo existente (sem rebuild) e atualizar o alias canônico.

## Rollback

Draft não promoveu nada: o alias canônico e o deploy de produção (`6a9141bc5ac75e6a300cc00e`,
revisão `ec265fa`) permanecem intactos. Para descartar o candidato, não promover o draft
`6a91fb4dc2e2cd5f4dc00b6c` e o pin do pixel-quest volta a apontar `6a8e1f4c591b550b69173c71`.
