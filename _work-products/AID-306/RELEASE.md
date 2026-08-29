# AID-306 — Promoção do pin do piloto com o fix de reflow AID-271 (7426d384)

**Data (UTC):** 2026-08-29 · **Produtor:** CEO (501cb456) — release engineering sob decisão de cadência própria · **Verificação independente pendente:** QA Lead (ca6a3f95) via AID-307 (fatia AID-264 §3)

## Novo pin

| Campo | Valor |
| --- | --- |
| Revisão (`sourceRevision`) | `7426d3843d8486bb2ce8a2f7f8ff4912e962850e` |
| Branch do fix | `aid-271/literacy-reflow-320` (base `75c6cec7`, linha de release vigente) |
| Ref pinada | `refs/heads/release/7426d384` |
| sha256 `pilot-bundle-manifest.json` | `bb2bc520b0cbb5c804af581cb8dc816d03e1ee6238eecd8686d4e956b5c8d9ee` |
| sha256 superfície os | `4170ad5626e14654018d26873c8f3a82228c9d4a854700d4a3cc687d2012dfd3` (inalterada vs pin anterior — mudança confinada à literacyDojo) |
| sha256 superfície literacydojo | `878b051fb0f25ca82f56d8a2671822668b0b3e55c5f0c675d45495255a7abae5` |
| Deploy draft (verificado 21/21) | `6a9237ed5e43679b3b1076eb` |
| **Deploy produção (vigente)** | `6a92389cee6f574405a2047d` → alias `aidevschool-codexdojo-os.netlify.app` · permalink `https://6a92389cee6f574405a2047d--aidevschool-codexdojo-os.netlify.app` |

## Linhagem

- Fast-forward puro: `7426d384` é filho direto de `75c6cec7` (procedência AID-290 do pin `29b59a92`), que é filho do pin de produção anterior `29b59a92`. Zero merges, zero cherry-picks — estratégia "incluir 7426d384 no próximo pilot bundle" conforme pedido; nenhuma outra linha mesclada.
- `git merge-base --is-ancestor 29b59a92 7426d384` = **verdadeiro** (retém integralmente a linha do pin anterior: same-origin AID-282, gating reduced-motion AID-290, netlify.toml CLI-deployável).

## Verificação do produtor (21/21 — `_work-products/AID-306/precheck.mjs`, adaptado do AID-290)

Executada contra **draft**, **alias de produção** e **permalink de produção** (critério AID-285: sem divergência):

1. **Identidade de manifesto** — sha256 remoto = local (`bb2bc520…`); `sourceRevision` = `7426d384…`.
2. **Superfícies 200** — `/`, `/apps/literacydojo/`, `/apps/warehouse/`, `/apps/wormhole/`, `/apps/relay-station/`.
3. **Pin same-origin literacy** — OS embute `/apps/literacydojo/`; sem pin externo stale (`6a8ddc9a…` ausente).
4. **contentVersion** `2026-08-21.1` na literacy publicada (não `2026-07-25.1`).
5. **Fix AID-271 no artefato publicado** — CSS publicado sem piso `body{min-width:320px}`; `.voxel-world{…min-width:0…}` presente.
6. **MOTOR handshake** — l01, l02 (iframe same-origin) e warehouse `MOTOR running`.
7. **Predicado QA AID-264 §3 no iframe embutido** — `scrollingElement.scrollWidth <= window.innerWidth` em viewport 320 **e** 298: `docScrollW=298 innerW=298` (defeito pré-fix: `320 > 298`, controle negativo do produtor do fix).

## Deploys superseded (não usar)

| Deploy | srcRev | Estado |
| --- | --- | --- |
| `6a9227f6e75f977a7af03a87` (ex-produção) | 29b59a92 | **superseded** — contém o P1 de reflow AID-271 (scroll horizontal essencial <320px, WCAG 1.4.10) |
| `6a9237ed5e43679b3b1076eb` (draft) | 7426d384 | verificado 21/21 pelo produtor |
| `6a92389cee6f574405a2047d` (produção vigente) | 7426d384 | autoridade atual, **pendente GO de QA independente (AID-307)** |
| Rollback elegível | 29b59a92 / ec265fa | permalink `6a9227f6…` (29b59a92) verde histórico; `6a9141bc…` (ec265fa) rollback mais antigo |

## Pendência (QA — fechamento de AID-271)

Produtor ≠ verificador: o fechamento do AID-271 exige re-execução independente da fatia AID-264 §3 pela QA (ca6a3f95, AID-307) contra o artefato publicado (alias/permalink acima). Este produtor executou o mesmo predicado como smoke (item 7), mas o PASS oficial pertence à QA.
