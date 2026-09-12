# AID-402 — Adjudicação do defeito D1 (S1): identidade da promoção l01–l14 e canal de publish

**Data (UTC):** 2026-08-30 ~16:0x–16:2xZ · **Owner:** Founding Product Engineer (fa8130d5) ·
**Origem:** QA AID-325 NO-GO (D1), evidência `docs/qa/AID-325_QA_PROMOCAO_L01-L14_2026-08-30.md` ·
**Registro canônico da promoção:** `work-products/AID-343/RELEASE.md` (correção de corrida).

## Resultado em uma linha

**D1 está sanado na produção vigente:** o alias serve hoje, byte-a-byte, o build REGISTRADO como
FINAL (`6a944cf2`, manifesto `7d0e16d9…`) — o mesmo que a QA flaggou. A leitura "build CI não
registrado tomou o alias" foi **superseded pela correção de corrida** documentada em AID-343
(comentários 15:40:32Z e 15:43:10Z + RELEASE.md): o build `7d0e16d9` no alias é o deploy CLI do
próprio FPE (2º run paralelo da mesma ordem AID-393), que **corrigiu** o 1º deploy `6a944c43`
(`53aa5c52…`, construído pela entrada de preview `npm run build:pilot` SEM `VITE_PIXELDOJO_URL` —
OS com fallback de desenvolvimento `http://127.0.0.1:5…`, violação do contrato de deploy).
A QA verificou contra o registro de 15:32Z (already-superseded) na janela 15:35–15:48Z.

## 1. Identidade restaurada — evidência executável datada (re-executável, 30 checks)

`work-products/AID-343/precheck-final.mjs` (constantes do pin FINAL; sem mudança neste run):

| Alvo | Resultado | Log datado |
| --- | --- | --- |
| alias `https://aidevschool-codexdojo-os.netlify.app` | **30/30 PASS** | `precheck-alias-2026-08-30.log` (run 2026-08-30 ~16:1xZ) |
| permalink `https://6a944cf24d75848dee3a5505--aidevschool-codexdojo-os.netlify.app` | **30/30 PASS** | `precheck-permalink-2026-08-30.log` |

Checks-chave (ambos os alvos): manifesto sha256 `7d0e16d9902e6a1f4b667db8bc8c8525…` (confere com o
registro FINAL) · `sourceRevision 6d72735ba2113cb6198c4d7be26c2f01e5f5d694` · `os` `49d7cc8a…` ·
superfícies 200 (5/5) · OS embute pin pixelDojo imutável `https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/`
(**não** fallback de dev; pin vivo HTTP 200) · literacy `2026-08-21.1` · MOTOR running l01/l02/l04/l14
+ warehouse, iframes same-origin · reflow @320/@298 retido · ponte 200/403/401 · mapa "17 missões,
uma sequência".

Âncoras imutáveis re-verificadas neste run: `refs/heads/release/6d72735b` → `6d72735b…` ==
head de `main` (`git ls-remote`); permalink `6a944cf2` serve bytes idênticos ao alias.

**Conclusão:** alias == permalink == registro (manifesto + inventário), byte-a-byte. O critério de
identidade do aceite (ramo 1) está satisfatório no lado do produtor; falta a **re-QA mínima
independente** (produtor != verificador — child issue aberta para a QA, matriz item 1 + spot MOTOR
l01/l14 contra o FINAL `6a944cf2`).

## 2. Adjudicação do mecanismo (teoria "CI build" da QA vs. corrida de runs do FPE)

A hipótese da QA ("build CI do provedor publicado depois do deploy CLI") é **incompatível com a
linha do tempo observada pela própria QA**:

- merge do PR #182 em `main`: ~14:5xZ (AID-390). Um auto-publish CI conectado ao branch de
  produção teria disparado NA HORA do push.
- alias ainda no pin da coorte `3f641906` às **15:26:48–15:28:18Z** (janela observada pela QA) —
  ~30+ min após o merge, **nenhum** deploy CI ocorreu.
- alias mudou somente após os deploys CLI do FPE: `6a944c43` (15:31–15:32Z) → `6a944cf2`
  (~15:33–15:35Z, run paralelo legítimo `d4a4c956` da mesma ordem, ver AID-343 15:40Z/15:43Z).
- o delta semântico `env-diff.txt` da QA (`VITE_PIXELDOJO_URL=…singular-crostata…`) é exatamente o
  **pin imutável exigido** pelo contrato de `scripts/build-pilot-bundle.mjs` e registrado como FINAL —
  não é env arbitrária de provedor.

**Mecanismo real:** corrida de dois runs do próprio FPE sobre a mesma ordem (wake
`issue_blockers_resolved` + AID-393 Parte 2), já convergida, documentada e ratificada nos
comentários da AID-343. O deploy "não registrado" da QA (`7d0e16d9`) É o registro FINAL; o build que
a QA esperava (`53aa5c52`) é o **defeituoso superseded** (fallback de dev no lugar do pin).

## 3. Canal de publish único — decisão registrada (item 2 do escopo)

**Decisão:** o canal único de publish de produção do OS é o **deploy CLI do FPE** via
`npm run deploy:pilot` (`engines/codexdojo-os-prototype/scripts/deploy-pilot-bundle.mjs`), cujo
entrypoint de build `scripts/build-pilot-bundle.mjs` define as `VITE_*_URL` same-origin e o pin
imutável do pixelDojo, gera e verifica o manifesto (`createPilotManifest`/`verifyPilotBundle`) e
só roda dentro de uma issue de promoção com registro RELEASE (padrão AID-253/254/343).

- **Auto-publish CI: não conectado.** Evidência comportamental acima (merge 14:5xZ → alias
  intocado até 15:28:18Z; mudanças somente nos timestamps dos deploys CLI). O `netlify.toml` do
  site define o build de consistência/preview (`npm run build:pilot`), mas **nenhum trigger de
  publish do branch de produção existe**; nenhum deploy CI aparece na linha do tempo.
- A opção "alinhar env do provedor" fica **moot**: não há canal CI ativo para alinhar. Se o board
  um dia conectar o repo ao site no provedor, a regra a aplicar é: env do provedor == contrato do
  `build-pilot-bundle.mjs` (pins imutáveis), nunca alias mutável — registrado aqui e no RELEASE.
- **Guarda estrutural existente:** `npm run build:pilot` é entrada de PREVIEW (sem
  `VITE_PIXELDOJO_URL`); o contrato de deploy vive em `scripts/build-pilot-bundle.mjs`
  ("A Dev-cohort candidate must not resolve PixelDojo through a mutable alias or a development
  fallback"). O incidente de 15:32Z não foi de canal concorrente, e sim de entrypoint errado no
  1º run — corrigido pelo 2º run e consolidado no registro.
- **Resíduo board-only (opcional, belt-and-suspenders):** confirmar no console do Netlify que o
  site `6d816ca0-9939-4a3d-8468-1c978762e8ae` segue sem build hooks / git integration ativa.
  Agentes não têm token de API Netlify (secrets são board-only); a evidência comportamental é a
  prova disponível ao FPE.

## 4. Superfície externa pixelDojo (ponto levantado pela QA)

O pin `https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/` é **deploy
imutável do nosso próprio engine pixelDojo** (site `singular-crostata-273e7e.netlify.app`), não
site de terceiros: arquitetura "one learner, one curriculum, many engines" com CSP deliberada
(`frame-src https:`). A exposição é o app `engines` do OS (`/desktop` → engines), fora da jornada
hub→missão→mapa (confirmado pela QA: "exposição requer navegação deliberada"). O valor do pin está
registrado no RELEASE FINAL e é objeto da re-QA (child issue): a QA valida a identidade contra o
FINAL; se entender que o valor da env precisa de aprovação explícita adicional do CEO, este é o
fórum correto para escalar (ramo 2 do critério de aceite).

## 5. Estado e encaminhamento

| Item | Estado |
| --- | --- |
| 1. Identidade alias == permalink == registro (FINAL `6a944cf2`/`7d0e16d9`) | **PROVADA pelo produtor (30/30 + 30/30)**; re-QA independente pendente (child issue QA) |
| 2. Canal concorrente neutralizado + decisão registrada | **SIM** (§3; addendum no RELEASE AID-343) |
| 3. Re-registro com evidência datada | **SIM** (este documento + logs; RELEASE addendum) |
| Rollback elegível | `6a923bf25bc97ecfacfd3fed` (`3f641906`, pin da coorte) · superseded `6a944c43` (permalink retido, NÃO usar) |

## Artefatos deste run

`precheck-alias-2026-08-30.log` · `precheck-permalink-2026-08-30.log` ·
`run-{alias,permalink}-timestamp.txt` · este `ADJUDICATION.md`. Canônico intocado: nenhum commit,
escrita em `learner/` ou `.mavis/` por esta adjudicação.
