# AID-278 — QA independente da promoção AID-273 (revisão b9f360e no alias canônico)

**Verificador:** QA ca6a3f95 (independente do produtor CEO 501cb456)
**Data:** 2026-08-28 UTC · **Veredicto: NO-GO** (1 bloqueio Sev 1; identidade, supply chain e AID-261 aprovados)

## Resultado por roteiro (padrão AID-254)

| # | Verificação | Resultado |
|---|---|---|
| 1 | Identidade (manifesto permalink + alias) | **PASS** |
| 2 | Supply chain (refs pinadas, tree, superfícies) | **PASS** |
| 3 | Smoke remoto 2 jornadas (prod + alias × desktop/tablet/mobile) | **FAIL** — IA Prática 0/12; Dev 24/24 |
| 4 | Superfícies AID-261 no artefato servido | **PASS** (30/30 + pixel-quest) |
| 5 | Integridade learner canônico (antes/depois) | **PASS** (inalterado) |
| 6 | GO/NO-GO | **NO-GO** — Defeito D1 (filha **AID-282**) |

## 1. Identidade — PASS

- `pilot-bundle-manifest.json` SHA-256 **idêntico** nos 3 endpoints (permalink prod
  `6a9203065c482aab8281f2e2`, alias canônico, draft `6a9201e0b662aac59ee32539`):
  `ec5bce089feb2897673cda1e039533c0e6af9aefc31bcdec61c6b41b57c7c61f` (= declarado).
- `sourceRevision: b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c` (= declarado).
- 8/8 hashes de entry+requiredFiles conferem no alias **e** no permalink (os, literacydojo ×4,
  warehouse, wormhole, relay-station); 22/22 arquivos do inventário respondem 200.

## 2. Supply chain — PASS

- `git ls-remote origin` (github.com/dandpb/aidevschool):
  `refs/heads/release/b9f360e` → `b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c`;
  `refs/heads/aid-261-design-compliance-p0` → mesmo SHA; `refs/heads/main` → `3586cb5` (linhagem ok).
- Objeto commit: tree `c7cafc092aedb492130a6ca39bbba0da64a58621` (= declarado);
  parents `b9f360e`→`214cd8e`→`3846321`→`3586cb5` (= linhagem declarada).
- Pin pixel-quest embutido no JS do OS (`VITE_PIXELDOJO_URL`):
  `6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app` (= declarado);
  CSS servido sha256 `9f24704aa527e4d71afe64680a3eefa37f1f57be3b832bfc706d47f5521421cb` (= build local
  declarado) contém `prefers-reduced-motion:reduce` + `animation-duration:.01ms!important`.

## 3. Smoke remoto das jornadas — FAIL (Sev 1, apenas jornada IA Prática)

Matriz 2 bases (permalink prod + alias) × 3 viewports (desktop 1280×800, tablet 820×1180,
mobile 390×844), Chromium 1.61.1 (Playwright), onboarding → jornada:

- **Dev (game-02-warehouse): 24/24 PASS.** Iframe same-origin `/apps/warehouse/?hosted=1…`,
  MOTOR running, HUD `role=status`/`aria-live=polite`, botão HUD 118×56 (mobile 138×44) ≥44px,
  `lang=pt-BR` no runtime em todas as combinações.
- **IA Prática (l01 e l02): 0/12 — MOTOR failed em 100% da matriz.**

### Defeito D1 (Sev 1) — pin de literacydojo desatualizado na revisão promovida

- Missões IA Prática do OS (l01–l05) esperam `contentVersion 2026-08-21.1` (catálogo do bundle).
- O OS embute `VITE_LITERACYDOJO_URL = https://6a8ddc9afe6838bdcf19a465--aidevschool-literacydojo.netlify.app/`
  que declara `engine.ready contentVersion 2026-07-25.1` (capturado por listener postMessage).
- O host recusa o handshake por design: “MOTOR failed — A versão de conteúdo do motor não
  corresponde à missão.” Nenhuma missão de IA Prática inicia.
- Ironia verificável: o próprio bundle **contém** o build correto em `/apps/literacydojo/`
  (JS `index-DFSOA5dz.js` declara `2026-08-21.1`), mas o runtime aponta para o pin externo antigo.
- **Regressão** (controle histórico): produção anterior `ec265fa` (deploy `6a9141bc5ac75e6a300cc00e`)
  esperava `2026-07-25.1` ×6 = versão do pin → l01 **MOTOR running** (verificado agora).
  A promoção b9f360e atualizou o catálogo sem atualizar/reapontar o pin do motor literacy.
- Presente em draft/prod/alias (manifesto byte-idêntico). O pre-check do produtor (22/22) não
  cobria a jornada IA Prática (sem handshake de missão literacy) — gap de roteiro, não de execução.

Evidências: `defect-ai-pratica-l01-motor-failed.png`, `ok-dev-warehouse-running.png`
(esta pasta); script reproduzível `qa-formal.mjs` em `/paperclip/tmp/aid278-qa/`.

## 4. Superfícies AID-261 no artefato servido — PASS

- Estático (bytes servidos, 3 apps voxel × 2 bases): `lang="pt-BR"`, `prefers-reduced-motion`,
  `min-height:44px` — 18/18.
- Runtime (2 bases): HUD `role=status`/`aria-live=polite` em warehouse, wormhole (botão 89×56),
  relay-station (botão 157×44) — 12/12.
- pixel-quest pinado: reduced-motion no CSS (ítem 2).

## 5. Integridade do learner canônico — PASS

Antes = depois (janela desta QA), idênticos ao baseline do RELEASE.md:

- `learner/learning_state.yaml` `c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`
- `.mavis/learning_state.yaml` `a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc`

## 6. Veredicto e limites

**NO-GO para a promoção b9f360e como revisão de produção.** Bloqueio único e delimitado (D1);
identidade/supply chain/AID-261/Dev não apresentam ressalvas nesta verificação.

Limites declarados: smoke de jornadas cobre_boot→hub→1 missão literacy + 1 missão warehouse_
(+ wormhole/relay-station diretos); não executei E2E completo dos jogos nem a matriz AID-31 §6
(já coberta em AID-270 por identidade de runtime — manifesto/artefatos idênticos aos do GO);
não testei offline/PWA, navegadores além de Chromium, nem o fix em si (não implementado aqui).

Desbloqueio (produtor): reapontar `VITE_LITERACYDOJO_URL` para `/apps/literacydojo/` (same-origin,
build correto já embutido) **ou** publicar deploy literacydojo `2026-08-21.1` e repinar; nova
revisão → novo deploy → re-QA desta verificação (menor: matriz do item 3). Alternativa: rollback
documentado no RELEASE.md (república `6a9141bc5ac75e6a300cc00e`).
