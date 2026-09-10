# AID-1251 — Promoção única da onda W1 (mod-08 "Rotina com IA II"): registro (pin `e91272b2`)

**Data (UTC):** 2026-09-10 (merge PR #323 11:07:30Z · deploys prod publicados 11:26:19Z OS / 11:26:36Z literacy · prechecks e prova pós-deploy 11:2x–11:4xZ) · **Registro/verificador:** Founding Product Engineer (fa8130d5) · **Autorização:** issue AID-1251 (CEO, 11:08:34Z — "creds Netlify UNBLOCKED"; fluxo AID-1240 passo 6 / spec AID-1219 §3 passo 4) · **Runbook:** `docs/serving/PROMOTION-RUNBOOK.md` (canônico)

## Cadeia da onda (single-writer CEO em todos os merges)

| Etapa | PR | Conteúdo | Merge commit |
| --- | --- | --- | --- |
| T0 emenda board-gated | #321 | mod-08 + l30–l32 planned + contrato l01..l32 | `0d80a035` |
| T1–T3 autoria | #322 | l30–l32 ready + corpus + fixtures + docs | `2026e990` |
| Landing FPE | #323 | bindings ai-pratica ch 21–23 + bump único 2026-09-10.1 + missions.ts + fixtures + HOSTED_OS_MISSION_LESSONS | **`e91272b2`** (pais `2026e990` + `1182fb42`) |

## Gates verificados first-hand antes de executar (runbook §1)

- **Merge single-writer CEO:** PR #323 `merged:true` 11:07:30Z por `dandpb`; `origin/main` == `e91272b2aeb7e1a39e5e27476f02516d65c3a608` (fetch nesta run; tip confirmado via API commits). ✓
- **CI verde no pin:** check-runs de `e91272b2` aguardados até conclusão → **36/36 = 35 success + 1 skipped, 0 fail**. ✓
- **Autorização founder:** AID-1251 (creds Netlify unblocked; asignamiento FPE). QA countersign é **wave-level pós-promoção** por spec da onda (AID-1219 §3 passo 5), precedente de sequenciamento AID-935 §achados. ✓

## Pin e build

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `e91272b2aeb7e1a39e5e27476f02516d65c3a608` == `refs/heads/release/e91272b2` (criada e conferida por ls-remote nesta run) == `origin/main` |
| Build prod OS | `COMMIT_REF=e91272b2aeb7e1a39e5e27476f02516d65c3a608 VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics node scripts/build-pilot-bundle.mjs` (worktree `/tmp/opencode/promo935/wt`, detached no pin, `git status` vazio) |
| Manifest | sha256 `5ac8e23cf8533e446647a0268cebb7d2b7f5f0b26ae7c57ab9a3bad626bfd9c0`; `sourceRevision` = pin completo; superfície os `221b65636bbef3ec5ca657912b7cd1c85d9ae84ac561296db089ff2e3da2158a`; literacy embarcada `24aeaf15d86311ceda56550384dfb36a65e29ffd72e018618a9262042bbd3f2e` |
| Build literacy standalone | `npm run build` com `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` + `VITE_LITERACY_VERIFIER_URL=/.netlify/functions/literacy-verify` espelhados do `netlify.toml` do pin; staging com functions canônicas de `learner/gate/netlify-functions@e91272b2` (inclui `literacy-verify.mjs` rastreada desde AID-941) + `npm ci`; `netlify.toml` byte-idêntico exceto a linha `functions` (verificada por diff de ida-e-volta) |

## Deploys

| Superfície | Deploy produção (vigente) | Criado (UTC) | Publicado (UTC) | Drafts remanescentes |
| --- | --- | --- | --- | --- |
| OS `aidevschool-codexdojo-os.netlify.app` (site `8bec714f-22cb-4468-8e2b-e3cd38652931`) | `6aa293d0aa89759981dca2dc` | 11:26:08Z | 11:26:19Z | `6aa292647a4c847eeda9c4fc` (build superado: COMMIT_REF curto), `6aa2938eeea49677b770df21` (precheck 81/81) |
| literacy `aidevschool-literacydojo.netlify.app` (site `ba44d0c6-6ebb-44a8-8c26-477d28611294`) | `6aa293e4079babac2f6414ab` | 11:26:28Z | 11:26:36Z | `6aa292921e56ca470d4a197d` (precheck 81/81) |

## Precheck (`precheck-e91272b2.mjs`, 81 checks) — 100% verde nos drafts E nos aliases de produção

Adaptado do ancestral `_work-products/AID-935/precheck-65d64bca.mjs` (runbook §4.2). Âncoras W1 derivadas do canônico no pin (`src/data/missions.ts` regenerado, CI-verificado): **32 missões literacy (l01–l32; l30/l31/l32 presentes) + 7 jogos = 39**; `verifierRequired` 39; fallback dom 39; `trackId` ai-pratica 24/dev 17 (23+16 missões + 1 def de track cada); **`contentVersion` `2026-09-10.1` ×35 uniforme** (zero ocorrências de `2026-09-06.1`); contagens remotas == build local do pin em todas. Demais coberturas herdadas: 20 superfícies 200; env pins + endpoint de telemetria baked (OS e literacy); `/privacidade.html` estático com copy de telemetria; coletor cross-origin 403; export fail-closed 401; smoke de ingestão same-origin 202 (OS v1 + literacy v2, eventId UUID, envelope W1 `contentVersion 2026-09-10.1`, `lessonId l30`); envelope inválido 422; bridges de verificação (regressão AID-448/449 + **sonda W1: sessão `ai-literacy:l30`/`l30-a1` responde no corpus regenerado**); dist literacy 9/9 arquivos byte-idêntico local↔deploy; `literacy-verify` PASS/FAIL do contrato fixo l02-v3 + paridade comportamental com o alias.

## Prova pós-deploy (runbook §5.2) — first-hand nos aliases de produção

- **OS:** 2× POST idêntico → 202/202 com `acceptedEventIds` idêntico (marcador `facbef2a-95bc-4504-aeb1-6d43c1b6eb07`); export sem bearer → 401; export com bearer → 200 ndjson 6 linhas com **exatamente 1 linha** para o marcador (dedup Blobs). Manifesto servido no alias == build local (sha256 e `sourceRevision` completos).
- **literacy:** 2× POST idêntico → 202/202 (marcador `2003833a-744d-460c-a1c9-26c7de5572db`, envelope v2 `contentVersion 2026-09-10.1` lessonId l30); 401 sem bearer; export com bearer → 200 ndjson 2 linhas, **exatamente 1** por marcador.
- Output bruto arquivado em `/tmp/opencode/aid1251/` (verify_prod.log, precheck_draft_r3.log, precheck_prod.log).

## Achados e desvios (transparência)

1. **Worktree reutilizado tinha `node_modules` symlink absoluto para árvore velha** (`/tmp/opencode/aidevschool`, 06-09): o build do dojoToday falhou (TS2307 `@aidevschool/evidence/funnel-telemetry` — export nova do pin #323 ausente na árvore velha). Correção: `npm ci --include=dev` local no dojoToday a partir do `package-lock.json` do pin (CI-equivalente; lockfiles de OS/literacy/pixel/dojoToday **inalterados** entre `e41b9b93` e `e91272b2`, verificado por diff — risco de toolchain velha contido ao dojoToday, único consumidor de workspace-link). Recomendação de runbook: conferir `readlink node_modules` no §3 antes de buildar (worktree de onda futura).
2. **CLI Netlify não achava o login** (`XDG_CONFIG_HOME` do ambiente apontando para dir temporário): "Unauthorized: could not retrieve project". Correção: `XDG_CONFIG_HOME=/paperclip/.config` nas invocações. Credencial do founder intacta no configstore (nunca impressa em receipt).
3. **Primeiro draft OS superado:** build inicial com `COMMIT_REF` curto (`e91272b2`) produziu manifest com `sourceRevision` curto; rebuild com sha completo (padrão AID-935) → novo draft; ambos listados acima; o alias serve o build do sha completo.
4. **Env do runtime com `NODE_ENV=production`:** exigiu `npm ci --include=dev` explícito (npm omite devDeps sob NODE_ENV=production).
5. **Sequenciamento QA:** countersign wave-level é pós-promoção por spec da onda (AID-1219 §3 passo 5); readiness render segue honesto-stale (`os-*`, `literacy-standalone-*`) até o re-grant da QA — conhecido e intencional (AID-1240 item 6).

## Rollback (owner: FPE fa8130d5)

| Superfície | Deploy anterior (elegível) | Re-pin |
| --- | --- | --- |
| OS | `6a9dc9cd18b95a8728837a95` (AID-964, pin `e41b9b93`) — `ready` | rebuild em `release/e41b9b93` + alias `--prod` |
| literacy | `6a9dc9f85f1ecc33647bac75` (AID-964, pin `e41b9b93`) — `ready` | redeploy do dist anterior |

## Pendências

- **QA wave-level (ca6a3f95, producer≠verificador):** countersign da onda promovida (child issue da AID-1219) — inclui re-grant da matriz readiness e leitura do funil nas 2 superfícies live (export tokens armados; sondas com eventId UUID; propagação Blobs literacy ~1–8 min).
- **Merge deste PR de registro** (single-writer CEO, padrão AID-630/9a391c3d).
