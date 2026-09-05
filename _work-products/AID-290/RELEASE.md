# AID-290 — Re-pin do piloto com gating de cena reduced-motion (linha GO afd6789)

**Data (UTC):** 2026-08-29 · **Produtor:** Founding Product Engineer (fa8130d5) · **Estratégia:** re-pin (decisão CEO `work-products/AID-293/AID-290-DECISION.md`) · **Verificação independente pendente:** QA Lead (ca6a3f95)

## Novo pin

| Campo | Valor |
| --- | --- |
| Revisão (`sourceRevision`) | `29b59a9239f5f3d86cbc1e3a27eff290c6e8bcbf` |
| Branch | `aid-290/repin-reduced-motion` |
| Ref pinada | `refs/heads/release/29b59a92` |
| sha256 `pilot-bundle-manifest.json` | `48714a7f568faf32df5147d4e497e871efff9dd309306756c1a023700d491e45` |
| sha256 superfície os | `4170ad5626e14654018d26873c8f3a82228c9d4a854700d4a3cc687d2012dfd3` |
| Deploy draft (verificado 17/17) | `6a922797cdc8b15e63799cdc` |
| **Deploy produção (vigente)** | `6a9227f6e75f977a7af03a87` → alias `aidevschool-codexdojo-os.netlify.app` |

## Linhagem

- `git merge-base --is-ancestor afd6789 29b59a92` = **verdadeiro** (desce da linha com GO independente AID-288).
- `git merge-base --is-ancestor 61b85535 29b59a92` = **verdadeiro** (retém integralmente a linha do pin anterior, incl. contrato same-origin AID-282).
- Composição: merge `afd6789` + `61b85535` + 2 commits de reconciliação (`0ed7f459` catálogo de superfícies, `29b59a92` netlify.toml deployável).

## Critérios de aceite (evidência executável)

1. **`grep -c matchMedia` > 0 nos JS voxel publicados** — `warehouseScene-Da4zdjpP.js`, `wormholeScene-CIDxsI77.js`, `relayScene-ClItgmF3.js` = **1 cada**, verificado no build local, no draft **e no alias de produção** (gating de cena: `prefersReducedMotion()` em `engines/voxelDojo/shared/reducedMotion.ts` integrado às 3 cenas).
2. **Ancestralidade re-pin** — verdadeiro (acima).
3. **P0 "Movimento" (AID-31 §6) no artefato publicado** — scene gating presente no publicado (item 1) + reduced-motion CSS (linha AID-261/263 retida). Sonda de cena em emulação `prefers-reduced-motion` permanece com a QA (produtor ≠ verificador).
4. **Jornadas íntegras** — pre-check 17/17 (adaptado de AID-282 com constantes deste pin: `_work-products/AID-290/precheck-draft.mjs`): identidade de manifesto (sha256 remoto = local), pin same-origin literacy (contentVersion `2026-08-21.1`), MOTOR l01/l02, warehouse, superfícies 200. Executado contra draft, **alias** e **permalink** de produção — sem divergência (critério AID-285).
5. **Tooling** — `node scripts/pilot-bundle-lib.test.mjs` 17/17 (contrato same-origin `61b85535` intacto).

## Verificação de regressão da reconciliação (local, Node 24 — ambiente com falhas ambientais pré-existentes)

- Voxel 02/03/05: 22+18+21 testes verdes.
- `src/verification` (os): 29/29 verdes (mecanismo evidenceId/attempt_id F2 preservado).
- Suite completa os/literacy: zero falhas novas em relação a **ambos** os pais (afd6789 e 61b85535) — comparadas por lista de testes falhando (falhas ambientais `React.act`/`node:` pré-existentes nos pais também).
- `tsc -b` verde (os + literacy).

## Regras de resolução do merge (registro)

- Voxel apps + `shared/*` + pixel-quest styles: lado `afd6789` (reconciliação AID-263 ⊇ AID-261 + F1 + scene gating).
- Tooling de release + netlify.toml (rotas /sw.js 404 + CSP) + build same-origin: lado `61b85535`/ec265fab, exceto `functions`/redirects `__dojo/bridge` removidos (fora do repo root — CLI rejeita; produção 61b85535 nunca os shipou).
- Cadeia de verificação (evidenceIntake/fixtures/repos/tests): lado `afd6789` (F2 attempt_id, GO AID-288).
- literacyDojo `ports.ts`: união (VerificationClient + AnalyticsSink/ADR-0009); `sw.js`: lado afd (scope-aware para embed same-origin); toolchain/lockfile: lado 61b85535.
- `learner.ts` (projeção): lado 61b85535 (paridade com pin anterior; não editada à mão).
- Catálogo de superfícies: engine-lab embeds (5) fora do catálogo desktop (corte de superfície estudantil da linha 61b preservado: `studentCatalog.test.ts` verde; Engine Hub continua com registro completo).

## Deploys superseded (não usar)

| Deploy | srcRev | Estado |
| --- | --- | --- |
| `6a92098c07e78c7edb3b806e` (ex-produção) | 61b85535 | **superseded** — sem gating de cena reduced-motion (AID-264/AID-290); não contém o P0 Movimento |
| `6a922797cdc8b15e63799cdc` (draft) | 29b59a92 | verificado 17/17 pelo produtor |
| `6a9227f6e75f977a7af03a87` (produção vigente) | 29b59a92 | autoridade atual, **pendente GO de QA independente** |
| `6a9141bc5ac75e6a300cc00e` (rollback, ec265fa) | ec265fa | rollback elegível (verde histórico) |

## Pendência (QA — fechamento de AID-290)

Produtor ≠ verificador: o fechamento exige re-execução independente pela QA (ca6a3f95) da sonda de reduced-motion (AID-31 §6 "Movimento") contra o artefato publicado (alias/permalink), além da conferência de identidade. Se o GO sair, alegações de conformidade cross-engine de design podem ser retomadas; até lá, ficam retidas.
