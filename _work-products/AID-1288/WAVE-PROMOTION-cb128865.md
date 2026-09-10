# AID-1288 — Promoção por bump de lição O3-C2 (retrofit l08–l13): registro (pin `cb128865`)

**Data (UTC):** 2026-09-10 (merge PR #330 14:58:37Z · deploys prod publicados 15:11:42Z OS / 15:12:02Z literacy · prechecks e prova pós-deploy 15:0x–15:1xZ) · **Registro/verificador:** Founding Product Engineer (fa8130d5) · **Autorização founder:** registrada no relay CEO AID-1285 (título/corpo) e no carrier AID-1288 ("AUTORIZADA pelo founder") · **Runbook:** `docs/serving/PROMOTION-RUNBOOK.md` (canônico) §§2–5 · **Ruling de promoção por bump de lição:** AID-640

## Cadeia da onda (single-writer CEO em todos os merges)

| Etapa | Issue/PR | Conteúdo | Merge commit |
| --- | --- | --- | --- |
| Autoria BUILD B3 | AID-1220 | l08–l13 retrofit 3 atividades (6 anexos YAML byte-exatos) | — (autoria; fechada `done` com byte-identidade pós-merge 6/6) |
| Landing FPE (PR único) | AID-1279 / PR #330 | 13 arquivos +1637/−123; bump único 2026-09-10.1→2026-09-10.2 (catálogo+tracks+32 bindings); corpus + fixtures regenerados | **`cb128865`** (pais `75369654` + `6399a8ba`) |
| QA countersign | AID-1284 (`done`) | GO estruturado no head de conteúdo `eec4a9e6` | — |
| Merge single-writer + relay | AID-1285 (`done`) | merge 14:58:37Z + autorização founder + carrier AID-1288 | — |

## Gates verificados first-hand antes de executar (runbook §1)

- **§1.1 Countersign QA GO:** AID-1284 `done` sobre `eec4a9e6` (head de conteúdo do PR #330); `6399a8ba` = `eec4a9e6` + merge da base workflow-only (PR #329). ✓
- **§1.2 Merge single-writer CEO:** PR #330 `merged` 14:58:37Z por `dandpb`; `origin/main` == `cb12886572a5384d7263956291c4f7bfb2f84c21` (fetch nesta run). ✓
- **§1.3 CI verde no pin:** check-runs de `cb128865` aguardados até conclusão → **36/36 = 35 success + 1 skipped (pixelDojo matrix platform-skip), 0 fail**. ✓
- **§1.4 Autorização founder:** AID-1285 + AID-1288 ("promoção por bump de lição O3-C2 … AUTORIZADA pelo founder"). ✓

## Pin e build (runbook §§2–3)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `cb12886572a5384d7263956291c4f7bfb2f84c21` == `refs/heads/release/cb128865` (criada e conferida por ls-remote nesta run) == `origin/main` |
| Build prod OS | `COMMIT_REF=cb12886572a5384d7263956291c4f7bfb2f84c21 VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics node scripts/build-pilot-bundle.mjs` (worktree `/tmp/opencode/aid1241-wt`, detached no pin, `git status` vazio; lockfiles OS/literacy/pixel/dojoToday/functions **inalterados** vs onda `e91272b2`, verificado por diff antes de reusar as deps) |
| Manifest | sha256 `5d1b35e615f1894b93bd23ee504e72f8fcda7f9b1de0240dfbd1d705f195898f`; `sourceRevision` = pin completo; superfície os `cad0de2b6bc1437573ac14b6716c58624eb9ce8a004078a115050f6a5067771f`; literacy embarcada `6bb26ca47a34530db7587e748682e537baf2c377a7fa6953e471d0a2e1ac2c0c` |
| Build literacy standalone | `npm run build` com `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` + `VITE_LITERACY_VERIFIER_URL=/.netlify/functions/literacy-verify` espelhados do `netlify.toml` do pin; staging com functions canônicas de `learner/gate/netlify-functions@cb128865` (`npm ci` reproduzível no staging de functions, padrão AID-961) + `netlify.toml` byte-idêntico exceto a linha `functions` (verificada por diff de ida-e-volta) |
| Âncoras locais pré-deploy | OS: 32 literacy + 7 jogos = 39; `verifierRequired` 39; `kind dom` 39; `trackId` ai-pratica 24/dev 17; **`contentVersion` `2026-09-10.2` ×35 uniforme** (zero ocorrências de `2026-09-10.1`/`2026-09-06.1`); l08–l13 presentes no catálogo. Literacy: cv `2026-09-10.2` baked, l08–l13 baked, endpoints verifier+analytics baked |

## Deploys

| Superfície | Deploy produção (vigente) | Criado (UTC) | Publicado (UTC) | Drafts remanescentes |
| --- | --- | --- | --- | --- |
| OS `aidevschool-codexdojo-os.netlify.app` (site `8bec714f-22cb-4468-8e2b-e3cd38652931`) | `6aa2c8a598e7b6dd5b6580dc` | 15:11:33Z | 15:11:42Z | `6aa2c8103a81cc3513b757d3` (precheck 91/91) |
| literacy `aidevschool-literacydojo.netlify.app` (site `ba44d0c6-6ebb-44a8-8c26-477d28611294`) | `6aa2c8b866cfd01b8bf27218` | 15:11:52Z | 15:12:02Z | `6aa2c83991373403ea014b46` (precheck 91/91) |

## Precheck (`precheck-cb128865.mjs`, 91 checks) — 100% verde nos drafts E nos aliases de produção

Adaptado do ancestral da onda anterior `_work-products/AID-1251/precheck-e91272b2.mjs` (runbook §4.2). Âncoras O3-C2 derivadas do canônico no pin (`src/data/missions.ts` regenerado, CI-verificado): **contagens de missão intactas** (32 literacy + 7 jogos = 39; retrofit não adiciona missões/bindings/tracks); `verifierRequired` 39; fallback dom 39; `trackId` ai-pratica 24/dev 17; **`contentVersion` `2026-09-10.2` ×35 uniforme** (zero ocorrências de `2026-09-10.1` e `2026-09-06.1`); **sonda da onda l08–l13: 6 sessões `ai-literacy:l08`..`l13`/`lNN-a1` respondem no corpus regenerado** (bridge OS); contagens remotas == build local do pin em todas. Demais coberturas herdadas: 20 superfícies 200; env pins + endpoint de telemetria baked (OS e literacy); `/privacidade.html` estático com copy de telemetria (OS e literacy + termos); coletor cross-origin 403; export fail-closed 401; smoke de ingestão same-origin 202 (OS v1 + literacy v2 com envelope O3-C2 `contentVersion 2026-09-10.2`, `lessonId l08`, eventId UUID); envelope inválido 422; bridges de verificação (regressão AID-448/449); dist literacy 9/9 arquivos byte-idêntico local↔deploy; `literacy-verify` PASS/FAIL do contrato fixo l02-v3 + paridade comportamental com o alias.

## Prova pós-deploy (runbook §5.2) — first-hand nos aliases de produção

- **OS:** 2× POST idêntico → 202/202 com `acceptedEventIds` idêntico (marcador `5473587f-8a7f-422a-a472-0e4fd0435d00`); export sem bearer → 401; export com bearer → 200 ndjson 194 linhas com **exatamente 1 linha** para o marcador (dedup Blobs); POST cross-origin → 403 `origin-forbidden`; manifesto servido no alias com `sourceRevision` == pin completo.
- **literacy:** 2× POST idêntico → 202/202 (marcador `e7035669-f617-42f3-83c4-b7f227185a9b`, envelope v2 `contentVersion 2026-09-10.2` lessonId l08); 401 sem bearer; 403 cross-origin; export com bearer → 200 ndjson 16 linhas, **exatamente 1** por marcador.
- Output bruto arquivado em `/tmp/opencode/aid1288/` (precheck_draft2.log, precheck_prod.log, verify_prod.log, deploy_*.log).

## Achados e desvios (transparência)

1. **Worktree da onda anterior reusado com lockfiles conferidos:** `e91272b2`→`cb128865` sem mudança em nenhum lockfile (OS/literacy/pixel/dojoToday/functions) — deps reutilizadas sem reinstalação geral, exceção abaixo.
2. **`pixelDojo/pixel-quest` sem `node_modules` no worktree reusado** (workspace pnpm): primeiro build falhou `tsc: not found`; corrigido com `pnpm install` no workspace pixelDojo do pin (sem lockfile mudado — `pnpm-lock.yaml` do pin intacto). Recomendação de runbook: §3 conferir também `pixel-quest/node_modules/.bin/tsc` além do `readlink node_modules`.
3. **Staging de functions literacy precisou de `npm ci` local** (AID-961 pattern): primeiro deploy draft abortou no bundle de `@netlify/blobs` — resolvido com `npm ci` no staging de functions antes do deploy; nenhum efeito no conteúdo servido (functions byte-idênticas ao canônico, verificadas pelo deploy script do OS e por diff no staging literacy).
4. **Env do runtime com `NODE_ENV=production`:** instalações exigiram `--include=dev`/`--prod=false` explícitos (padrão das ondas).
5. **CLI Netlify:** `XDG_CONFIG_HOME=/paperclip/.config` nas invocações (gotcha conhecido da onda anterior). Credencial do founder intacta no configstore (nunca impressa em receipt).

## Rollback (owner: FPE fa8130d5)

| Superfície | Deploy anterior (elegível) | Re-pin |
| --- | --- | --- |
| OS | `6aa293d0aa89759981dca2dc` (AID-1251, pin `e91272b2`) — `ready` | rebuild em `release/e91272b2` + alias `--prod` |
| literacy | `6aa293e4079babac2f6414ab` (AID-1251, pin `e91272b2`) — `ready` | redeploy do dist anterior |

## Pendências

- **QA wave-level (producer≠verificador):** countersign independente da onda promovida (child da árvore AID-1279), incl. re-grant da matriz readiness e leitura de funil nas 2 superfícies live (export tokens armados; sondas com eventId UUID; propagação Blobs literacy ~1–8 min).
- **Merge deste PR de registro** (single-writer CEO, padrão AID-630/9a391c3d + AID-1251/#325).
