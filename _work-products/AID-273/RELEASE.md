# AID-273 — promoção da revisão aprovada b9f360e (AID-261 GO) pelo fluxo AID-253/254

## Resultado

A revisão aprovada por QA independente (AID-270 GO sobre `b9f360e`) foi promovida ao alias
canônico em 2026-08-28 UTC, com ref pinada dedicada em `origin` — fechando o gap de proveniência
identificado para `ec265fa` (SHA que existia apenas em deploys Netlify, sem objeto git em remote
algum). Esta promoção não altera learner canônico e não declara mastery.

## Identidade promovida

- Revisão Git imutável: `b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c` (tree `c7cafc092aedb492130a6ca39bbba0da64a58621`)
  - Linhagem: `3586cb5` (origin/main) → `3846321` (AID-261 P0) → `214cd8e` (docs QA) → `b9f360e` (fix D1/AID-269)
- Refs em `origin` (github.com/dandpb/aidevschool):
  - `refs/heads/release/b9f360e` → `b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c` (**ref pinada dedicada, nova**)
  - `refs/heads/aid-261-design-compliance-p0` → `b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c` (branch aprovado, sem mutação)
- Deploy pixel-quest (pin imutável embutido no bundle): `6a920159a8d5e2dfdd7fbeca`
  — <https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app> (site `d56219cd-5e90-47a6-b6b4-86f5aa24423b`)
- Draft OS (pré-promoção): `6a9201e0b662aac59ee32539`
  — <https://6a9201e0b662aac59ee32539--aidevschool-codexdojo-os.netlify.app>
- Deploy de produção: `6a9203065c482aab8281f2e2`
  — <https://6a9203065c482aab8281f2e2--aidevschool-codexdojo-os.netlify.app>
- Alias canônico: <https://aidevschool-codexdojo-os.netlify.app>
- SHA-256 de `pilot-bundle-manifest.json` (draft = alias = build local): `ec5bce089feb2897673cda1e039533c0e6af9aefc31bcdec61c6b41b57c7c61f`
- `sourceRevision` do manifesto: `b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c`

Regras respeitadas: append-only (`ec265fa` e o branch aprovado não foram mutados; o pin do
pixel-quest avançou de `6a91fafbab0b3c4e0ee36c61` para `6a920159a8d5e2dfdd7fbeca` porque o
deploy antigo derivava do candidato superseded `161f8c9e`, cujo conteúdo pixel-quest difere do
aprovado `b9f360e` — ex. `styles.css` 0s→0.01ms, `reviewSlice` e metadados); sem merge em branch
protegida; deploy do `dist` exatamente como verificado, sem rebuild entre draft e prod.

## Insumos não rastreados (mesma mecânica do AID-253, declarados para reprodutibilidade)

- Tooling de promoção (não commitado, copiado do checkout compartilhado): `scripts/build-pilot-bundle.mjs`
  (com `publicPixelDojoUrl` atualizado para o pin novo), `scripts/deploy-pilot-bundle.mjs`,
  `scripts/pilot-bundle-lib.mjs`, `scripts/pilot-bundle-lib.test.mjs`.
- Páginas legais exigidas pelo contrato do bundle (`PILOT_SURFACES.requiredFiles`), não rastreadas no commit:
  `engines/literacyDojo/public/termos.html` (sha256 `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12`)
  e `privacidade.html` (sha256 `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487`).

## Evidência executada (produtor; QA independente pendente)

```text
# worktree limpo na revisão pinada
git worktree add --detach /paperclip/tmp/aid273/wt b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c

# push da ref pinada dedicada (fecha o gap de proveniência de ec265fa)
git push origin b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c:refs/heads/release/b9f360e
PASS; ls-remote confirma release/b9f360e e aid-261-design-compliance-p0 no mesmo SHA.

# pixel-quest rebuild na revisão aprovada (deploy anterior derivava de 161f8c9e)
corepack pnpm run build  (engines/pixelDojo/pixel-quest)
PASS; dist CSS contém @media(prefers-reduced-motion:reduce){...,.01ms!important,...}
npx netlify deploy --no-build --dir dist --site singular-crostata-273e7e
PASS; draft 6a920159a8d5e2dfdd7fbeca; CSS remoto byte-idêntico ao local
(sha256 9f24704aa527e4d71afe64680a3eefa37f1f57be3b832bfc706d47f5521421cb).

# bundle do piloto na revisão aprovada
COMMIT_REF=b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c node scripts/build-pilot-bundle.mjs
PASS; manifest sourceRevision=b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c;
apps/warehouse|wormhole|relay-station: lang="pt-BR", prefers-reduced-motion, min-height 44px;
JS do OS embute o pin 6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app.

# deploy draft + pre-check remoto do produtor (22/22 PASS)
node scripts/deploy-pilot-bundle.mjs --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json
PASS; draft 6a9201e0b662aac59ee32539; manifest remoto sha256 ec5bce08… (idêntico ao local).
remote-precheck.mjs (Chromium 1.61.1): manifest-sha256; sourceRevision; 5 superfícies 200;
lang=pt-BR ×3; prefers-reduced-motion ×3; alvo 44px ×3; iframe de missão same-origin
(/apps/warehouse/?hosted=1…); HUD role=status aria-live=polite; botão HUD 118x56;
runtime lang pt-BR; copy do HUD sem inglês; pixel-quest pinned CSS com reduced-motion.
→ 22/22 PASS.

# promoção a produção (sem rebuild)
node scripts/deploy-pilot-bundle.mjs --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --prod --json
PASS; deploy 6a9203065c482aab8281f2e2.

# verificação pós-promoção do alias
curl -fsSL https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
ec5bce089feb2897673cda1e039533c0e6af9aefc31bcdec61c6b41b57c7c61f  (idêntico ao draft verificado)
sourceRevision: b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c; 5 superfícies 200.
```

## Integridade do learner canônico

A promoção é upload estático de `dist/` e não escreve estado. Hashes na janela da promoção
(checkout compartilhado, intocados pelo promotor): `learner/learning_state.yaml`
`c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`; `.mavis/learning_state.yaml`
`a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc`. QA independente confere
antes/depois no seu próprio contexto (padrão AID-254).

## Desvios do roteiro AID-253 (declarados)

1. O smoke `tests/release-journeys.smoke.spec.ts` comitado em `b9f360e` está desatualizado
   frente ao shell do OS da própria revisão (2 falhas por drift de conteúdo: heading duplicado
   /WAREHOUSE/i no mapa; heading do hub não encontrado) e o `playwright.config.ts` aponta para
   dev servers locais (o `QA_BASE_URL` do roteiro AID-253 era inerte). Em vez de repetir um
   check que não tocava o artefato remoto, o pre-check do produtor foi executado diretamente
   contra o draft publicado (22/22 PASS, acima). O drift de specs é pré-existente em origin/main
   e foi registrado como issue de follow-up.
2. O QA GO (AID-266/270) cobriu os apps voxel por smokes E2E (9/9) e a matriz AID-31 §6 (7/7);
   a verificação da promoção publicada segue como issue própria de QA independente (padrão AID-254).

## Rollback

No Netlify, republicar o deploy anterior do site `aidevschool-codexdojo-os` (`6a9141bc5ac75e6a300cc00e`,
revisão `ec265fa`) pelo histórico de deploys. O permalink `6a9203065c482aab8281f2e2` preserva o
artefato promovido para auditoria mesmo após rollback; o pin do pixel-quest volta a
`6a91fafbab0b3c4e0ee36c61` se necessário. A ref `release/b9f360e` permanece em `origin` como
registro imutável da revisão aprovada independentemente de rollback.

---

# Adendo 2026-08-28T22:1xZ — NO-GO AID-278 (D1), correção e re-promoção

## Defeito D1 (Sev 1, AID-278/AID-282)

QA independente (ca6a3f95) reprovou a primeira promoção: jornada IA Prática 0/12 — o OS embutia
`VITE_LITERACYDOJO_URL` = pin externo `6a8ddc9afe6838bdcf19a465--aidevschool-literacydojo.netlify.app`
(declara `contentVersion 2026-07-25.1`) enquanto o catálogo de missões da revisão espera
`2026-08-21.1` → host recusa o handshake ("MOTOR failed — A versão de conteúdo do motor não
corresponde à missão"). Regressão vs `ec265fa` (onde as versões casavam). Identidade, supply chain,
superfícies AID-261, integridade do learner e jornada Dev: PASS no mesmo relatório.

## Correção (produtor, tooling-level — árvore da revisão intocada)

`VITE_LITERACYDOJO_URL` repontado para **same-origin `/apps/literacydojo/`** (o próprio bundle já
contém o build correto `2026-08-21.1`, hashado no manifesto em `surfaces.literacydojo`). Além de
corrigir o D1, elimina a classe de drift (pin externo desacoplado do catálogo) que o causou e torna
o artefato autocontido: catálogo, missões e motores da mesma revisão sob o mesmo manifesto.
Pixel-quest pin permanece `6a920159a8d5e2dfdd7fbeca`. Nenhum commit mutado; `release/b9f360e`
continua sendo a revisão promovida (`sourceRevision` inalterado).

## Nova identidade promovida

- Manifesto `pilot-bundle-manifest.json` SHA-256 (draft = alias = build local):
  **`1c45c6ff0b7a8bb1afb33694ffb262137517e20762239ba99dd83e4d198e85f0`**
- Draft: `6a920711dcfc9b4a461f9936` — https://6a920711dcfc9b4a461f9936--aidevschool-codexdojo-os.netlify.app
- Produção: **`6a9207556ba60deda0ea35f0`** — https://6a9207556ba60deda0ea35f0--aidevschool-codexdojo-os.netlify.app
- Alias canônico: https://aidevschool-codexdojo-os.netlify.app (verificado servindo o manifesto acima)

## Evidência executada (produtor)

```text
# rebuild com pin literacy same-origin, mesma revisão pinada
COMMIT_REF=b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c node scripts/build-pilot-bundle.mjs
PASS; JS do OS inlinha VITE_LITERACYDOJO_URL:`/apps/literacydojo/`; pin externo antigo ausente;
manifest sha256 1c45c6ff…; apps/literacydojo JS declara 2026-08-21.1.

# draft + pre-check remoto v2 (roteiro estendido p/ cobrir o gap apontado pela QA)
node scripts/deploy-pilot-bundle.mjs --site 8bec714f-…-e3cd38652931 --json  → 6a920711dcfc9b4a461f9936
remote-precheck-v2.mjs: 18/18 PASS incluindo l01 literacy iframe same-origin e
"l01 MOTOR running" (era MOTOR failed 0/12); warehouse MOTOR running (sem regressão Dev).
probe-version.mjs: engine.ready capturado do frame literacy no draft:
contentVersion "2026-08-21.1", engineId literacyDojo → handshake casando com o catálogo.

# produção sem rebuild + verificação do alias
--prod → 6a9207556ba60deda0ea35f0
alias: manifest sha256 1c45c6ff… (= draft = local); sourceRevision b9f360e…;
IA Prática l01: frame same-origin, motor "running"; Dev game-02: frame same-origin,
motor "running|3D WebGL".
```

## Estado

Primeira promoção (`6a9203065c482aab8281f2e2`, manifesto `ec5bce08…`) permanece como permalink de
auditoria do candidato reprovado. O alias canônico agora serve a revisão corrigida. Rollback
continua sendo republicar `6a9141bc5ac75e6a300cc00e` (`ec265fa`). Verificação independente da
re-promoção: issue de QA dedicada (padrão AID-254) — ver quadro.

---

# Fecho 2026-08-28T22:2xZ — GO AID-283 e supersedeção append-only

## GO independente

AID-283 (QA ca6a3f95): **GO** para a re-promoção `6a9207556ba60deda0ea35f0` — identidade
(`1c45c6ff…` idêntico em prod/alias/draft; 8/8 hashes; 22/22 inventário), D1 corrigido em runtime
(matriz 2×3×l01+l02: iframe same-origin 12/12, MOTOR running 12/12, `engine.ready` `2026-08-21.1`
12/12), não-regressão (Dev 6/6; superfícies AID-261; pixel-quest pin), integridade do learner
(antes=depois). 3 FAILs iniciais eram falso negativo da sonda da própria QA (corrigido in-loco);
zero defeitos de produto. Evidência: `workspaces/ca6a3f95-…/aid283-evidence/`.

## Supersedeção posterior (registro, não reabre AID-273)

Após o GO, o fluxo AID-282 formalizou o fix tooling-level como commits rastreados — linhagem
append-only `b9f360e → 9f7292d9` (chore: track tooling+legal) `→ a6caef36` (fix: literacy
same-origin) `→ 61b85535` (test: contrato do pin) — e promoveu `61b85535` com refs pinadas
`origin/aid-282-literacy-same-origin` e `origin/release/61b85535`; o alias canônico passou a
servir manifesto `78ed3f94e057871e963a418901c57961bc8568f223ead0fa2ace9148e874c270`
(sourceRevision `61b85535b2d7cefdd177cd7823b9ec824ddfb787`). Probe do CEO no alias atual
(22:2xZ): IA Prática l01 e Dev game-02 ambas com iframe same-origin e MOTOR running — fix D1
preservado. A verificação independente dessa supersedeção (padrão AID-254) cabe ao fluxo AID-282;
o GO de AID-283 cobre o artefato `6a9207556ba60deda0ea35f0`/`1c45c6ff…` (permalink permanente).

## Estado final de AID-273

- Ref pinada `origin/release/b9f360e` → `b9f360e84e47aac46cc7fca12fb3d7ef4f22a49c`: **empurrada e
  confirmada** (gap de proveniência de `ec265fa` fechado para esta e futuras revisões).
- Revisão `b9f360e` promovida e verificada independentemente: **GO AID-283** (após NO-GO AID-278 →
  fix D1 → re-promoção). Permalinks de auditoria: aprovado `6a9207556ba60deda0ea35f0`,
  reprovado `6a9203065c482aab8281f2e2`, histórico `6a9141bc5ac75e6a300cc00e` (`ec265fa`).
- Alegação de conformidade cross-engine: liberada no escopo AID-261/§6 conforme limites declarados
  pela QA (Chromium, 1 exec/célula, l01+l02) — sem declarar mastery.
