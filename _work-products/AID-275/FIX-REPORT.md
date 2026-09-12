# AID-275 — Correção F1 (P1): HUD de warehouse/wormhole colapsa a >=768px

**Status: correção produzida, nova revisão imutável publicada como draft; re-QA independente pendente (AID-268).**

Produtor: fa8130d5 (AID-261/AID-275). Veredito de origem: `_work-products/AID-268/QA-VERDICT.md` (F1).

## Identidade do novo candidato

- Revisão Git imutável: `3f56acf5917773b72ac207c9f3cd13636ab1a190` (parent `161f8c9e76a9732588a3f020bf4d7ec277ff2ba2`; candidato anterior **não mutado**)
- Diff: exatamente 2 arquivos, 2 linhas (`engines/voxelDojo/game-02-warehouse/index.html`, `engines/voxelDojo/game-03-wormhole/index.html`)
- Fix: `#stage { flex: 1; width: 100% }` → `#stage { flex: 1 1 0; min-width: 0; width: 100% }` — paridade exata com `game-05-relay-station` (linha `#stage` idêntica ao relay)
- Draft OS (piloto): <https://6a92048e07e78c64703b806e--aidevschool-codexdojo-os.netlify.app> (deploy `6a92048e07e78c64703b806e`, **sem --prod**)
- Manifesto servido: `sourceRevision: 3f56acf…`; sha256 das 5 superfícies (os/literacydojo/warehouse/wormhole/relay-station) conferem com os arquivos servidos (verificação executada — `served-manifest.json`)
- Alias canônico e produção (`6a9141bc…` / `ec265fa`) **intactos**. Pin pixel-quest inalterado (`6a91faf…`, superfície com GO).

## Evidência executada (produtor; pré-check — não substitui re-QA)

```text
# unidade/tipo (por jogo, worktree dedicado /paperclip/tmp/aid275/wt @ 3f56acf)
game-02-warehouse: vitest 18 passed | 2 failed  ← F2 pré-existente (attempt_id no envelope compartilhado;
                     idêntico a 161f8c9 e ec265fa conforme QA-VERDICT §F2; CSS-only change não toca emitter)
game-03-wormhole:  vitest 18/18 passed; tsc --noEmit clean (ambos os jogos)

# smokes de browser (jogabilidade + emissão de evidência)
playwright warehouse: 3 passed · playwright wormhole: 3 passed

# build + provenância
COMMIT_REF=3f56acf… npm run build:pilot → manifest sourceRevision=3f56acf…
bundle servido contém `#stage { flex: 1 1 0; min-width: 0; … }` em warehouse e wormhole

# matriz de larguras no draft pinado (scripts da própria QA, adaptados só para o novo draft)
scripts/qa_draft_a11y_draft6a92048e.mjs → qa-draft-a11y-results.json:
  warehouse     320/375/768/1280: PASS ×4 (hudW 320/375/340/340, overflow 0 ×4)
  wormhole      320/375/768/1280: PASS ×4 (hudW 320/375/360/360, overflow 0 ×4)
  relay-station 320/375/768/1280: PASS ×4 (hudW 320/375/340/340, overflow 0 ×4)
  demais critérios da matriz (lang, live region 1×, botões ≥44, reduced-motion, foco) inalterados: PASS

# iframe real do host OS (missão em destaque, 1280 desktop, reduced-motion)
scripts/qa_host_probe_draft6a92048e.mjs → host-iframe-results.json:
  warehouse embutido (iframe 854px): hudW 340 (antes 33), scrollW 854 = clientW 854
  (antes scrollW 972 > 854) — F1 resolvido no cenário exato do defeito
```

Antes/depois (números do veredito AID-268 vs este draft): hudW 33 → 340; overflow +33 (standalone 1280) e +118 (iframe 854) → 0.

## Artefatos (este diretório)

- `qa-draft-a11y-results.json` — matriz completa computada contra o draft `6a92048e`
- `host-iframe-results.json` — jornada real no host (Dev track → escola → missão em destaque → iframe warehouse)
- `local-probe-results.json` — pré-check local do bundle construído (12/12 células + iframe) antes do deploy
- `served-manifest.json` — manifesto do draft pinado (sourceRevision 3f56acf)
- `shots/` — screenshots por viewport/app do run no draft
- `scripts/` — os 2 scripts de QA reutilizados (adaptados apenas para URL do novo draft e diretório de saída)

## Pendência

- Re-QA independente pela suite `_work-products/AID-268/scripts/` (qa_draft_a11y.mjs + qa_host_probe.mjs, ~2 min) apontando o draft `6a92048e07e78c64703b806e` — veredito GO/NO-GO de warehouse/wormhole pertence ao verificador (ca6a3f95), producer ≠ verifier.
- F2 (attempt_id no envelope; 2 falhas warehouse) permanece escopo de issue própria, não tratado aqui.
