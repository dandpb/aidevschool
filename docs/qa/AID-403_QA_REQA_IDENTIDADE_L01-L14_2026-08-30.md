# AID-403 — Re-QA mínima de identidade (D1 da AID-325, adjudicado em AID-402): GO

**Data:** 2026-08-30 UTC (~15:56–16:02Z) · **QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b`
(contexto separado do produtor fa8130d5) · **Veredito: GO** para o lote l01–l14 no pin FINAL
`6a944cf2` · **D1 FECHADO** (identidade alias == permalink == registro FINAL confirmada byte-a-byte).

## Alvo verificado (registro FINAL, RELEASE AID-343 + addendum AID-402)

| Campo | Registro FINAL | Observado pela QA (alias e permalink) |
| --- | --- | --- |
| Manifesto SHA-256 | `7d0e16d9902e6a1f4b667db8bc8c8525f5cbdd33e3fd5d55e85a38c5fae836fe` | idem nos dois hosts ✔ (fetch próprio) |
| `sourceRevision` | `6d72735ba2113cb6198c4d7be26c2f01e5f5d694` (merge PR #182) | idem ✔ |
| Deploy vigente | `6a944cf24d75848dee3a5505` | permalink serve exatamente o registro; alias == permalink byte-a-byte ✔ |
| `os` sha256 | `49d7cc8a…` | idem ✔ (`assets/index-uKi6IxRi.js`) |

## 1. Identidade contra o FINAL — scripts próprios + precheck do produtor re-executado

- **QA próprio** (`work-products/AID-403/qa-identity.mjs` → `qa-identity-2026-08-30.log`): **10/10 PASS**
  — manifesto sha256 == registro em alias E permalink; manifesto byte-idêntico entre hosts (2.450 B);
  `sourceRevision` == pin; **inventário completo 27/27 arquivos byte-a-byte idênticos alias == permalink**
  (fetch par de cada arquivo, `Buffer.compare`); todos os sha256 declarados (entries + `requiredFiles`) conferem;
  OS embute pin pixelDojo imutável; tabela de resolução `VITE_*` de produção mapeia pixelDojo → pin e
  literacy/warehouse/wormhole/relay-station → same-origin, **sem nenhum fallback de dev em produção**
  (ocorrências `127.0.0.1:517x` no bundle são metadados `developmentUrl`/`entrypoint` de catálogo e registry — inertes em runtime).
- **Precheck do produtor re-executado de contexto próprio** (cópia byte-idêntica sha256
  `2cc8a2ae…` de `work-products/AID-343/precheck-final.mjs`; não confiamos nos logs do produtor):
  **alias 30/30 PASS** (`precheck-alias-qa-2026-08-30.log`) · **permalink 30/30 PASS**
  (`precheck-permalink-qa-2026-08-30.log`) — inclui manifesto/sourceRevision/os-bytes, 5 superfícies 200,
  pin pixelDojo embutido, literacy `2026-08-21.1` (sem `2026-07-25.1`), reflow CSS e iframe @320/@298
  (`docScrollW=298 ≤ innerW=298`), ponte 200/403 e runtime copy `17 missões, uma sequência`.

**D1 (AID-325) fechado:** o build `7d0e16d9…` servido no alias É o deploy FINAL registrado `6a944cf2`
(entrypoint correto `build-pilot-bundle.mjs`); o `53aa5c52…` é o superseded defeituoso, conforme
adjudicação AID-402. A discrepância observada pela QA AID-325 era contra o registro já superseded (15:32Z).

## 2. Spot MOTOR — PASS

`MOTOR running` com iframe same-origin `/apps/literacydojo/` em **l01** e **l14** (mínimo do escopo),
mais l02, l04 e `game-02-warehouse` (controles), no alias E no permalink. `contentVersion 2026-08-21.1`
no bundle literacy servido; sem vestígio de `2026-07-25.1`. (A matriz funcional completa 69/69 do lote
permanece a da AID-325, válida para o mesmo conteúdo do pin `6d72735b`.)

## 3. Superfície pixelDojo — registro do pin imutável ACEITO (decisão QA dentro do mandato da issue)

Evidência (`work-products/AID-403/qa-pixeldojo-hub.mjs` → `qa-pixeldojo-surface-2026-08-30.log`, **7/7 PASS**):

- Pin vivo (HTTP 200) e **permalink de deploy imutável** (subdomínio deploy-ID
  `6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app`), não alias mutável — não sofre drift silencioso.
- Exposição **apenas** em `/desktop?operator=1` → Engine Hub → pixelDojo: launcher de estudante NÃO lista
  o Engine Hub (app operator-only, `studentCatalog.ts`) e o desktop de estudante não renderiza nenhum iframe do pin.
- No hub de operador, o iframe do pixelDojo carrega exatamente o pin (única ocorrência externa).
- CSP do OS: `frame-src https:` deliberada (header de produção conferido); missões l01–l14 e Dev nunca
  apontam ao host externo (iframes 100% same-origin, item 1).

**Racional da aceitação:** engine próprio do ecossistema (pixelDojo), pinado por deploy imutável, exposto
somente em superfície de operador fora da jornada do aprendiz; alternativa (fallback de dev `127.0.0.1`)
viola o contrato de deploy documentado. CEO pode sobrepor esta aceitação se quiser aprovação explícita adicional.

## Ambiente e reprodutibilidade

Node v24.18.0; Playwright chromium (worktree aid306); rede direta aos hosts Netlify. Reproduzir:
`QA_BASE_URL=<alias|permalink> node precheck-final-reexec.mjs` (fonte: `work-products/AID-343/precheck-final.mjs`)
e `node qa-identity.mjs` / `node qa-pixeldojo-hub.mjs` (fontes em `work-products/AID-403/`, logs datados idem).

## Limitações

- Re-QA mínima (identidade + spots), não matriz completa; a matriz funcional 69/69 é da AID-325 sobre o
  mesmo conteúdo (`6d72735b`), agora confirmado idêntico em produção pelos bytes.
- Conteúdo do site pixelDojo pinado não recebeu matriz funcional (fora do escopo D1); só se verificou
  viveza, imutabilidade estrutural do URL e confinamento a superfície de operador.
- Nenhuma escrita em `learner/`/`.mavis/` por esta QA (alterações pré-existentes do workspace preservadas);
  sem deploy, sem re-pin.

## Disposição

**GO para o lote l01–l14** no pin `6a944cf2` (manifesto `7d0e16d9…`, `sourceRevision 6d72735b…`).
D1 AID-325 fechado com evidência; registro pixelDojo aceito (item 3). Veredito espelhado em comentário
na AID-402.
