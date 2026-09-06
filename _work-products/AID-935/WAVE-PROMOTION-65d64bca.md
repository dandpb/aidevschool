# AID-935 — Promoção das 2 superfícies com telemetria AID-913: registro (pin `65d64bca`)

**Data (UTC):** 2026-09-06 (merge PR #277 16:45Z…-3⁄-4 = 08:45Z-04 · promoção live 16:12:28Z literacy / 16:16:51Z OS · verificação independente FPE 16:1x–16:2xZ) · **Registro/verificador:** Founding Product Engineer (fa8130d5) · **Autorização:** ORDEM AID-910/D via AID-913/AID-934/AID-935 (spec GO AID-918 rev `3a716ea8`; QA GO AID-928 @ `81af4aca`, paridade de conteúdo no head final `942d484a`; CI 36/36 @ `65d64bca`, re-verificado first-hand nesta run: 35 success + 1 platform-skip)

## Cadeia da onda

| Etapa | PR | Conteúdo | Merge commit |
| --- | --- | --- | --- |
| Telemetria AID-913 (ativação O1) | [#277](https://github.com/dandpb/aidevschool/pull/277) | funil literacy v2 + coletor 2 envelopes c/ Blobs/export + netlify.toml ×2 + copy ×2 + ADR-0009/0010 + runbook/LEITURA + probe | `65d64bca51e2e5814268f3ffa8c564a109fb5ecd` (base `3f8ca3ef`, head `942d484a`) |

## Pin e build

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `65d64bca…` == `refs/heads/release/65d64bca` (criada e conferida por ls-remote nesta run) == `origin/main` |
| Build prod (executada por run concorrente do FPE, worktree no pin) | OS: `build-pilot-bundle.mjs` com `COMMIT_REF=65d64bca` + `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` (valor espelhado do `[build.environment]` do próprio `engines/codexdojo-os-prototype/netlify.toml` no pin — o script de bundle não injeta esse env; sem ele o transporte ficaria off). Literacy: `npm run build` com `VITE_ANALYTICS_ENDPOINT` + `VITE_LITERACY_VERIFIER_URL` espelhados de `engines/literacyDojo/netlify.toml` |
| Build independente de verificação (FPE, `/tmp/opencode/promo935/wt`, detached no pin, `git status` vazio) | byte-idêntica à live: manifesto OS sha256 `a3b46052654b3c5cf95f91bc9b5427b5500e270e7cbe58cea8c0873bcb3b82b9` **idêntico local↔alias**; superfície os `83084624aff7bf8c2a0979b7b05d5e6754d8d0e37bccd37ca7a69651993bbd53`; dist literacy 9/9 arquivos byte-idênticos (árvore sha256 `93a8b1c736f8aa965200474b64cb98d7a51e8669a56af4822527bcbe286118c2`) |

## Deploys

| Superfície | Deploy produção (vigente) | Publicado (UTC) | Drafts remanescentes (não-alias) |
| --- | --- | --- | --- |
| OS `aidevschool-codexdojo-os.netlify.app` | `6a9d91ebbe30eefc6beffe32` (permalink `6a9d91ebb--…`) | 16:16:51Z | `6a9d91c8fe2df3bfe2c23761` (FPE) |
| literacy `aidevschool-literacydojo.netlify.app` | `6a9d90e4dc8c3dc56846432b` (permalink `6a9d90e4d--…`) | 16:12:28Z | `6a9d920b1dc3a5cf5a1ce5ae` (FPE) |

**Produtor ≠ verificador preservado nesta promoção:** o build publicado foi produzido por uma execução concorrente; o FPE desta run reconstruiu o artefato do zero no pin e provou identidade de bytes, além de rodar o precheck completo (abaixo) contra drafts **e** contra os aliases de produção.

## Precheck (72/72 nos aliases de produção E nos drafts)

`_work-products/AID-935/precheck-65d64bca.mjs` (adaptado do AID-821 `precheck-ef67fb06.mjs`): identidade de manifesto/sourceRevision/os-sha; 20 superfícies 200; env pins same-origin (`VITE_*_URL=/apps/*`) + **endpoint de telemetria baked nos 2 apps**; **OS `/privacidade.html` estático 200** com "Telemetria do produto" e sem bootstrap SPA; **coletor cross-origin 403 `origin-forbidden`**; **export fail-closed** (404 `export-unavailable` sem token no draft; 401 `unauthorized` com `ANALYTICS_EXPORT_TOKEN` armado — estado de produção); **smoke de ingestão same-origin 202** (OS v1 + literacy v2, 1 evento sintético cada nos aliases); envelope inválido 422 na recepção; bridge de verificação OS (regressão AID-448/449); catálogo uniforme **`contentVersion 2026-09-06.1` ×32** (29 literacy + 7 jogos = 36, `verifierRequired` 36, fallback dom 36, `ia_pratica` 20 + `dev` 9 — âncora atualizada do bump da onda do corredor #276); literacy 9/9 arquivos byte-idênticos; copy de privacidade landed do PR #277 (`<h2>Telemetria do produto</h2>` + k≥5/90d na privacidade; sentença de estatísticas anônimas nos termos — a ORDEM AID-935 parafraseou como 'Telemetria opcional'; a copy countersigned do pin é canônica); **rota do coletor literacy respondendo JSON antes do fallback `/*` (F4)**; **`literacy-verify` preservada** (PASS/FAIL do contrato fixo l02-v3 + paridade comportamental com o alias anterior).

## Achados e desvios (transparência)

1. **Função `literacy-verify` não rastreada no repo:** a função viva no site literacy (`independent-literacy-verifier` v`1-netlify-l02-v3`, chamada por `VITE_LITERACY_VERIFIER_URL`) existe apenas num stash de untracked (`51e503f3`). Deploy literal do `functions = ../../learner/gate/netlify-functions` a derrubaria e quebraria a verificação independente da journey standalone. As duas execuções concorrentes a preservaram de forma independente (staging `lit-functions` com o arquivo recuperado do stash; paridade comportacional verificada). **Follow-up aberto para rastreá-la in-repo** (exige PR + countersign).
2. **Sequenciamento:** o plano pós-merge da própria QA (AID-928 final) e o padrão dos receipts (AID-821: re-grant antes da promoção) pediam o **re-grant v31 antes da alias switch**; a execução concorrente promoveu antes. O render readiness segue fail-closed (9/9 `stale`) até o re-grant — relay **AID-939** aberto para a QA executar v31 + countersign do funil live. Sem rollback unilateral: conteúdo = pin QA-GO, integridade verificada 72/72, CEO monitorando ao vivo (probe 16:18Z).
3. **Config do staging literacy:** deploy manual exigiu `functions` local (o CLI recusa `../../` fora da raiz do repo); `netlify.toml` do staging byte-idêntico ao do pin exceto essa 1 linha (semântica preservada: mesmas redirects, mesmos env pins).
4. **`ANALYTICS_EXPORT_TOKEN` armado nas 2 superfícies** (401 em ambas) — passo 2 da AID-934 (owner founder) constatado configurado; o valor nunca passou pelo repo.

## Rollback (owner: FPE fa8130d5)

| Superfície | Deploy anterior (elegível) | Re-pin |
| --- | --- | --- |
| OS | `6a9b26edd5ae30f604729704` (AID-821, pin `ef67fb06`) — `ready`, branch `release/ef67fb06` intacta (ls-remote) | rebuild no pin anterior + alias |
| literacy | `6a8ddc9afe6838bdcf19a465` (2026-08-25, pré-telemetria) — `ready`, não locked | redeploy do dist anterior |

## Pendências

- **QA (AID-939 / AID-928):** re-grant v31 no head (docs-only, delta conferível `git diff --name-only 65d64bca..main` restrito a `docs/product-readiness/`) + ver os 2 eventIds do smoke §7.4 do CEO (`2f55f42d-…` literacy, `f6575d36-…` OS) na exportação + countersign final do funil live → fecha AID-913.
- **Merge deste PR docs** (single-writer CEO, padrão AID-601/630/666/821 §2).
- **Follow-up literacy-verify in-repo** (issue aberta; código novo exige PR + countersign).
