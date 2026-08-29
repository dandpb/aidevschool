# AID-305 — Re-pin com a ponte de verificação Dev in-repo (restauração F1)

**Data (UTC):** 2026-08-29 · **Produtor:** Founding Product Engineer (fa8130d5) · **Decisão executiva:** CEO (heartbeat AID-300, F1 = restaurar a ponte) · **Verificação independente pendente:** QA Lead (ca6a3f95)

> **Correção de corrida (race) de release:** este re-pin foi executado duas vezes porque a
> produção moveu em paralelo durante o trabalho — `7426d384` (AID-306, 01:40 UTC) e
> `bbf27bb5` (AID-298 contrast fix, 01:52 UTC) foram promovidos pelo CEO enquanto o primeiro
> merge deste roteiro (`cd49f22d`, promovido 01:50 UTC, superseded 01:52) estava em voo.
> O pin final abaixo **converge as duas linhas**: desce de `bbf27bb5` (produção vigente ao
> final) e retém o bridge commit. Deploys `6a923ad1` (cd49f22d) e `6a923b59` (bbf27bb5)
> são superseded.

## Motivo

A pré-verificação QA AID-301 (achado F1) constatou que o pin `29b59a92` não servia a ponte
de verificação da jornada Dev: as funções Netlify nunca foram rastreadas no git e o re-pin
AID-290 removeu a config `functions` do `netlify.toml` (o caminho `../../learner/gate/...`
vivia fora do site root e a CLI rejeita). O endpoint caía no fallback SPA — degradação
honesta, mas sem paridade com o estado GO (AID-219/AID-254: recibo PASS 403 JSON
origin-forbidden no permalink).

## Novo pin (final)

| Campo | Valor |
| --- | --- |
| Revisão (`sourceRevision`) | `3f6419063e1dad923317c911227a8b21fcf50ad7` |
| Branch | `aid-305/repin-dev-bridge` |
| Ref pinada | `refs/heads/release/3f641906` |
| Bridge commit | `7cd393d99a5af5032162a1517bf2298baf44513c` (PR #181, branch `aid-305/dev-bridge-in-repo`) |
| sha256 `pilot-bundle-manifest.json` | `fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658` |
| sha256 `os` (`index.html`) | `4658412b9d3c8a3a4f5623178b7be03dbd43eaf10c85da062d9b1febcc966541` |
| sha256 função staged (== canônica) | `ce72a04f800607794a403d4123f76f313ffc6599661844934000d30639816533` |
| Deploy draft (verificado) | `6a923bdfc8c5e87a938e05c8` |
| **Deploy produção (vigente)** | `6a923bf25bc97ecfacfd3fed` → alias `aidevschool-codexdojo-os.netlify.app` |

## Linhagem (retém tudo)

- `git merge-base --is-ancestor bbf27bb5 3f641906` = **verdadeiro** (produção vigente:
  AID-306 reflow AID-271 + AID-298 contraste 9fae8c60, retidos).
- `git merge-base --is-ancestor 7426d384 3f641906` = **verdadeiro** (re-pin AID-306).
- `git merge-base --is-ancestor 29b59a92 3f641906` = **verdadeiro** (linha AID-290/AID-297 GO).
- `git merge-base --is-ancestor 7cd393d9 3f641906` = **verdadeiro** (ponte in-repo).
- Composição: merge `bbf27bb5` (produção vigente) + `7cd393d9` (ponte in-repo).

## O que mudou (e o que não)

- **Estático: nada.** As 5 superfícies do manifesto (`os`, `literacydojo`, `warehouse`,
  `wormhole`, `relay-station`) são byte-idênticas às do deploy anterior `6a923b59`
  (bbf27bb5) — conferido por sha256 superfície a superfície no build local antes do deploy.
  A única mudança no bundle estático é o campo `sourceRevision` do manifesto.
- **Funções: ponte restaurada.** `dojo-verification-bridge.mjs` (bytes idênticos ao canônico
  `learner/gate/netlify-functions/`, sha256 `ce72a04f…`, agora rastreado no git) implantado a
  partir de `netlify/functions/` dentro do site root; redirects
  `/__dojo/bridge/v1/{session,verification}` à frente do fallback SPA (paridade `ec265fab`).
- A função `literacy-verify` NÃO faz parte deste restore (segue com o trabalho em voo do
  PR #178); nenhuma rota a referencia neste site.

## Evidência executável (produtor)

1. **Guardas de tooling** — `node --test scripts/pilot-bundle-lib.test.mjs` = **20/20**
   (17 pré-existentes + 3 novos: ordem de rota da ponte, staging canônico, rejeição de drift
   + `--functions`). `node --test learner/gate/tests/dojo_verification_bridge_netlify.test.mjs`
   = 2/2. `npm run lint` paridade com a linha base. `vitest client.test.ts
   localBridgeGateway.test.ts` = 10/10 (contrato cliente inalterado).
2. **Sonda da ponte (draft, alias e permalink de produção)**:
   - `GET /__dojo/bridge/v1/session` com `Sec-Fetch-Site: same-origin` → **200 JSON**,
     token opaco de 43 chars (mesmo formato do GO AID-219);
   - sem o cabeçalho → **403 JSON `{"error":"origin-forbidden"}`** (assinatura exata do
     charter AID-301);
   - `POST /verification` sem token → **401**; com token + evidência sintética de sonda
     (`attempt_id=aid305-draft-probe`, contra o draft `6a923a58` do primeiro merge) → recibo
     **PASS** com `canonical_gate_status: not-submitted`, `producer_writes_mastered: false`,
     digest vinculado.
3. **Pre-check re-executável (`_work-products/AID-305/precheck-bridge.mjs`, constantes
   deste pin) contra alias e permalink = 21/21 PASS**: identidade de manifesto
   (`fc694824…`), `sourceRevision` `3f641906…`, bytes `os` == manifesto (`4658412b…`),
   superfícies 200, pin same-origin literacy (contentVersion `2026-08-21.1`), MOTOR
   l01/l02/warehouse, predicado reflow @320 e @298 (`docScrollW=298 ≤ innerW=298`).
4. **CLI-deployável** — o deploy usou `deploy-pilot-bundle.mjs` com `--functions
   netlify/functions`; a guarda de drift bloqueia deploys com função staged ≠ canônica.

## Deploys superseded (não usar)

| Deploy | srcRev | Estado |
| --- | --- | --- |
| `6a9227f6e75f977a7af03a87` | 29b59a92 | superseded (AID-290) — elegível rollback histórico |
| `6a92389cee6f574405a2047d` | 7426d384 | superseded (AID-306) — sem ponte Dev |
| `6a923ad13b8c71697d64bf0a` | cd49f22d | superseded (1º merge AID-305, perdido na corrida de release) |
| `6a923b592ecfe6a333cf722e` | bbf27bb5 | superseded (AID-298 contrast fix) — sem ponte Dev |
| `6a923bdfc8c5e87a938e05c8` | 3f641906 | draft verificado deste re-pin |
| **`6a923bf25bc97ecfacfd3fed`** | **3f641906** | **produção vigente** — pendente GO de QA independente |

## Pendência (QA — fechamento de AID-305)

Produtor ≠ verificador: o fechamento exige re-verificação independente da QA (ca6a3f95) —
charters de identidade/linhagem/superfícies + **jornada Dev em browser com recibo**
(FAIL→retry→PASS correlacionado, `canonical_gate_status=not-submitted`, learner canônico
intocado) + smoke 6/6 contra alias/permalink (padrão AID-297/AID-301). As verificações
AID-307 (reflow, permalink 6a92389c) e AID-308 (contraste, contra bbf27bb5) permanecem
válidas como evidência datada dos fixes; a identidade final para a coorte é controlada por
esta revisão + GO da QA.
