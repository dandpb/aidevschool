# AID-343 — Promoção do lote l01–l14 (merge do PR #182) para produção

**Data (UTC):** 2026-08-30T15:32Z (1ª promoção) · **Correção de corrida:** 2026-08-30T16:1xZ · **Produtor:** Founding Product Engineer (fa8130d5) · **Ordem executiva:** CEO AID-393 (sweep AID-392) · **Verificação independente pendente:** QA Lead (ca6a3f95, AID-325)

> **CORREÇÃO DE CORRIDA DE RELEASE (padrão AID-305):** dois runs do FPE executaram a
> promoção em paralelo sobre o MESMO pin `6d72735b` (wake `issue_blockers_resolved`
> + run AID-393 Parte 2). A 1ª promoção (`6a944c43`, 15:32Z, manifesto `53aa5c52…`) foi construída
> por `npm run build:pilot` — entrada de preview/local que NÃO define `VITE_PIXELDOJO_URL`, deixando
> o bundle OS com o fallback de desenvolvimento (`http://127.0.0.1:5…`) no lugar do pin imutável
> do pixelDojo (viola o contrato de deploy documentado em `scripts/build-pilot-bundle.mjs`:
> "A Dev-cohort candidate must not resolve PixelDojo through a mutable alias or a development
> fallback"). A 2ª execução (16:0xZ) rebuildou pelo entrypoint correto `scripts/build-pilot-bundle.mjs`
> e re-pinou a produção como `6a944cf2` (manifesto `7d0e16d9…`), com o pin imutável
> `https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/` embutido e verificado.
> `6a944c43` fica superseded (permalink retido); **o pin FINAL é `6a944cf2`** — QA AID-325
> deve verificar EXCLUSIVAMENTE contra ele (`precheck-final.mjs`).

## Gatilho verificado

- AID-180 `done` (ratificação executiva CEO, comentário `567b3381`, 2026-08-30) — sessões 2/2 + revisão independente AID-366 com recomendação `continuar`.
- Item 1 do escopo (rebase/CI/merge) já satisfeito pelo merge AID-390: PR #182 `closed/merged`, head de `main` = merge commit (verificado ao vivo por `git ls-remote` neste run). **Nada foi reaberto/remergeado.**

## Novo pin (FINAL — produção vigente após a correção de corrida)

| Campo | Valor |
| --- | --- |
| Revisão (`sourceRevision`) | `6d72735ba2113cb6198c4d7be26c2f01e5f5d694` |
| Origem | merge PR #182 (`aid-323/os-missions-l01-l14`), pais `576d4a57` + `5ee8b27b` |
| Ref pinada | `refs/heads/release/6d72735b` → `6d72735ba2113cb6198c4d7be26c2f01e5f5d694` (verificada por `git ls-remote`) |
| sha256 `pilot-bundle-manifest.json` | `7d0e16d9902e6a1f4b667db8bc8c8525f5cbdd33e3fd5d55e85a38c5fae836fe` |
| sha256 superfícies (manifesto) | `os` `49d7cc8a…` · `literacydojo` `f7598612…` · `warehouse` `d348c274…` · `wormhole` `eef9a3b1…` · `relay-station` `535ee057…` |
| sha256 função staged (== canônica) | `ce72a04f800607794a403d4123f76f313ffc6599661844934000d30639816533` (`dojo-verification-bridge.mjs`, guarda de drift PASS) |
| Build entrypoint (FINAL) | `COMMIT_REF=6d72735ba2113cb6198c4d7be26c2f01e5f5d694 node scripts/build-pilot-bundle.mjs` (OS vite 8.1.4 + literacy gen:content + warehouse/wormhole/relay-station vite 6.4.3 + funções staged + **pin pixelDojo imutável**) |
| Deploy draft (verificado) | `6a944c64b8459d23d276d492` — precheck 27/28 (1 asserção errada do check), corrigida 28/28 |
| **Deploy produção (vigente)** | **`6a944cf24d75848dee3a5505`** → alias `https://aidevschool-codexdojo-os.netlify.app` · permalink `https://6a944cf24d75848dee3a5505--aidevschool-codexdojo-os.netlify.app` |
| Superseded (corrida) | `6a944c43b551c9d76593a978` (manifesto `53aa5c52…` — build por `npm run build:pilot` SEM `VITE_PIXELDOJO_URL`; permalink retido; NÃO é o pin) · draft `6a944b82b662aa9321e324f0` |
| Superseded (elegível rollback) | `6a923bf25bc97ecfacfd3fed` (`3f641906`, pin da coorte) e demais deploys da tabela AID-305 |

> **Correção de SHA da ordem:** AID-393 cita `6d72735ba211cb61…` (transposição de dígitos; objeto inválido). O objeto válido e verificado como head de `main` e ref pinada é `6d72735b`**`a2113cb6`**`198c4d7be26c2f01e5f5d694` — merge real do PR #182 com head de branch `5ee8b27b`, exatamente o par citado na ordem.

## Identidade final provada (2ª execução — `precheck-final.mjs`, 30 checks)

- **alias = 30/30 PASS** · **permalink `6a944cf2` = 30/30 PASS** (logs `precheck-{alias,permalink}-30of30-2026-08-30.txt`).
- Identidade: manifesto sha256 `7d0e16d9…` + `sourceRevision` `6d72735ba2113cb6198c4d7be26c2f01e5f5d694` idênticos em alias == permalink == build local (sha256 conferido).
- **Pin pixelDojo imutável embutido no OS** — `https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/` (verificado no bundle JS servido; é o diferencial vs. o deploy superseded, cujo OS embutia fallback `http://127.0.0.1:5…`).
- Ponte same-origin: 200 token 43ch com `Sec-Fetch-Site: same-origin`; 403 `{"error":"origin-forbidden"}` sem header.
- MOTOR ao vivo (browser): `l01`, `l02` (controles) + novas `l04`, `l14` + `warehouse` (controle Dev) — `MOTOR running`, iframes same-origin.
- Copy runtime do mapa: **"17 missões, uma sequência"** (14 IA Prática + 3 Dev, derivada de `catalog.listLaunchable()`, conferida em browser).
- Reflow AID-271 preservado: predicado `docScrollW=298 ≤ innerW=298` no iframe @320 e @298; sem piso `min-width` no `body`; `.voxel-world` com `min-width: 0`. AID-298 (contraste 4.5:1) presente no candidato via PR #179 (patch-equivalente, `git cherry`).
- literacy `contentVersion 2026-08-21.1` (canônico), sem vestígio de `2026-07-25.1`.
- Canônico antes/depois idêntico (e igual ao baseline AID-254): `learner/learning_state.yaml` `c3cae54c…`, `.mavis/learning_state.yaml` `a900918a…`.

## Build (determinístico, worktree limpo do merge)

Worktree git limpo e dedicado em `6d72735b` (`/tmp/opencode/aid343/wt`, fora do workspace compartilhado; node_modules por link do cache do lockfile — deps idênticas entre `3f641906` e o merge: só `scripts` mudou no package.json). Entrypoint de deploy `COMMIT_REF=… node scripts/build-pilot-bundle.mjs`: OS `tsc -b` + vite 8.1.4 com `VITE_{LITERACYDOJO,WAREHOUSE,WORMHOLE,RELAY_STATION}_URL` same-origin e `VITE_PIXELDOJO_URL` pinada ao deploy imutável; literacydojo com `gen:content` a partir do YAML canônico + builds vite 6.4.3; manifesto `createPilotManifest(dist, COMMIT_REF)` + `verifyPilotBundle` verdes; função staged = projeção byte-idêntica do canônico `learner/gate/netlify-functions/` (nunca editada à mão).

A 1ª execução (15:32Z) usou `npm run build:pilot` — entrada de preview que não define `VITE_PIXELDOJO_URL` — produzindo o deploy `6a944c43` superseded (ver §Correção de corrida no topo).

## Evidência executável (produtor)

1. **Guardas de tooling** — `node --test scripts/pilot-bundle-lib.test.mjs` = **20/20**; `node --test learner/gate/tests/dojo_verification_bridge_netlify.test.mjs` = **2/2**.
2. **Pre-check re-executável** (`work-products/AID-343/precheck-draft.mjs`, constantes deste pin; padrão AID-305/306):
   - draft `6a944b82` **27/27 PASS**; alias de produção **27/27 PASS**; permalink `6a944c43` **27/27 PASS**;
   - identidade: manifesto sha256 `53aa5c52…` e `sourceRevision` `6d72735b…` idênticos em alias == permalink == draft == build local (bytes conferidos por sha256);
   - superfícies 200: `/`, `/apps/literacydojo/`, `/apps/warehouse/`, `/apps/wormhole/`, `/apps/relay-station/`;
   - ponte same-origin: `GET /__dojo/bridge/v1/session` com `Sec-Fetch-Site: same-origin` → 200 JSON token 43 chars; sem header → 403 JSON `{"error":"origin-forbidden"}`; `POST /verification` sem token → 401;
   - MOTOR ao vivo (browser): `l01`, `l02` (controles de continuidade) + amostra novas `l05`, `l10`, `l14` + `warehouse` (controle Dev) — todos `MOTOR running` com iframe same-origin `/apps/literacydojo/` (ou `/apps/warehouse/`);
   - OS embute pin same-origin literacy; literacy `contentVersion 2026-08-21.1`.
   - Transparency: a 1ª execução do precheck no draft deu 26/27 — o único FAIL foi uma asserção errada DO PRÓPRIO CHECK (exigia que o manifesto listasse a si mesmo no inventário; o contrato de `pilot-bundle-lib` exclui o manifesto do próprio inventário). Asserção corrigida para o contrato; re-execução 27/27. Nenhum artefato do bundle mudou entre as execuções (manifest sha idêntico).
3. **Catálogo publicado** — `config/mission-bindings.yaml` do bundle: **17 bindings** = `l01`–`l14` + `game-02-warehouse` + `game-03-wormhole` + `game-05-relay-station` ("17 missões, uma sequência").
4. **Canônico intocado** — nenhum commit/escrita em `learner/` ou `.mavis/` por esta promoção: blob git de `learner/learning_state.yaml` idêntico em `29b59a92` → `576d4a57` → `6d72735b` (o merge não toca o arquivo); worktree de promoção limpo (só artefatos de build scratch).

## Achado para QA/CEO (não bloqueia a promoção; pré-existente em `main`)

`python3 -m learner.substrate --check` no merge reporta DRIFT em 4 projeções (`engines/minimaxDojo/whiteboard/{profile.yaml,learner_profile.md,trail.md}`, `engines/voxelDojo/shared/content.ts`). **Conjunto idêntico no pai `576d4a57`** (pré-merge) e parcial (`3 arquivos`) já em `29b59a92` — dívida de sincronização de projeções pré-existente em `main`, NÃO introduzida pelo merge promovido nem pela promoção. Follow-up registrado para o FPE (re-sync de projeções pelo fluxo canônico) sem escrita nesta tarefa.

## Incidente de workspace (transparência, sem impacto no promovido)

No início do heartbeat, um `git checkout origin/main -- .` acidental no clone compartilhado (atrasado, HEAD local `19cf3a67` + WIP não commitado) sobrescreveu a árvore de trabalho. Estado restaurado do snapshot autostash dangling `c340d70f` ("WIP on main: 19cf3a67"): index limpo, 129 modificações unstaged restauradas, untracked preservadas. A promoção inteira rodou em worktree separado do merge; zero contato com o workspace compartilhado além da restauração e dos documentos de evidência.

## Pendência (QA — AID-325)

Produtor ≠ verificador: a QA pós-coorte AID-325 (QA Lead `ca6a3f95`) foi liberada formalmente sobre ESTE pin — matriz de regressão AID-278/284 + amostragem l04–l14 + controles l01–l03 sobre alias/permalink acima. GO/NO-GO permanece com a QA. Rollback owner: FPE (república `6a923bf25bc97ecfacfd3fed` se necessário; nunca deploy não verificado).

## Addendum AID-402 (2026-08-30 ~16:2xZ): adjudicação do D1 da QA AID-325 + canal de publish único

O NO-GO D1 da QA AID-325 (alias `7d0e16d9…` ≠ registro `53aa5c52…`) foi **adjudicado**: a QA
verificou contra o registro de 15:32Z (1ª promoção), já superseded pela correção de corrida acima
(comentários AID-343 15:40:32Z/15:43:10Z). O build `7d0e16d9…` no alias É o deploy FINAL registrado
`6a944cf2` (entrypoint correto `scripts/build-pilot-bundle.mjs`, pin pixelDojo imutável embutido);
o build `53aa5c52…` que a QA esperava é o superseded defeituoso (fallback de dev `http://127.0.0.1:5…`
no OS, contrato violado pela entrada de preview `npm run build:pilot`). A teoria "build CI do
provedor" é incompatível com a linha do tempo (merge 14:5xZ → alias intocado em `3f641906` até
15:28:18Z; mudanças somente nos deploys CLI do FPE) — evidência completa em
`work-products/AID-402/ADJUDICATION.md`.

**Identidade re-provada pelo produtor (datada):** `precheck-final.mjs` 30/30 PASS no alias E no
permalink `6a944cf2` (`work-products/AID-402/precheck-{alias,permalink}-2026-08-30.log`); ref
`release/6d72735b` == head `main` re-verificada por `git ls-remote`; pin pixelDojo vivo (HTTP 200).
Re-QA mínima independente (matriz item 1 + spot MOTOR l01/l14 contra o FINAL) delegada à QA em
child issue de AID-402.

**Canal de publish único (decisão registrada, item 2 do escopo AID-402):** produção do OS publica
EXCLUSIVAMENTE por deploy CLI do FPE (`npm run deploy:pilot`) dentro de issue de promoção, com
build pelo entrypoint `scripts/build-pilot-bundle.mjs` (envs `VITE_*_URL` same-origin + pin
imutável pixelDojo, manifesto verificado antes do publish). Auto-publish CI **não conectado**
(evidência comportamental; sem token de API Netlify para agentes — secrets board-only). Regra para
futuro: se o board conectar git ao site no provedor, as env do provedor devem igualar o contrato
do `build-pilot-bundle.mjs` (pins imutáveis, nunca alias mutável). Rollbacks elegíveis: `6a923bf2`
(`3f641906`) · superseded `6a944c43` (permalink retido, não promover).
