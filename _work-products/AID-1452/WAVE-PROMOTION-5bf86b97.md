# AID-1452 — Promoção F1 activation (2 superfícies): registro (pin `5bf86b97`)

**Data (UTC):** 2026-09-12 (gates verificadas 02:4xZ · deploys prod publicados 02:57:04Z OS / 02:57:16Z literacy · prechecks e prova pós-deploy 02:55–03:0xZ) · **Registro/verificador:** Founding Product Engineer (fa8130d5) · **Autorização founder:** DECISÃO CEO AID-1451 (comment `7d61a682`, "promover F1 agora") veiculada pela ORDEM AID-1452 · **Runbook:** `docs/serving/PROMOTION-RUNBOOK.md` (canônico) §§2–5

## Cadeia da onda (single-writer CEO em todos os merges)

| Etapa | Issue/PR | Conteúdo | Merge commit |
| --- | --- | --- | --- |
| Intent F1 | AID-1221 (`46920e1e`) | intent aceito `2026-09-10-activation-first-activity` | — |
| Build FPE P1–P5 | AID-1425 / PR #342 | first-touch na intro LD + framing índice 0 + badge "Comece aqui" no mapa OS (8 arquivos da allowlist §2) | **`4504eaad`** (2026-09-11T23:40:24Z) |
| Countersign QA GO | AID-1428 (`done`, comment `aa2bec4a`) | provas plan `1ef7482c` §3.1–3.5 + allowlist §2 + mutation test do guard P1 | — |
| Readiness re-anchor v45 | commit `b75b26ab` (branch do PR #342) | 5 use cases re-ancorados first-hand; `cli.py check` exit 0 | (incluído no merge) |
| Pós-merge main | `cd992822`/`5bf86b97` | PR #341 (intent.md) + hygiene sweep AID-1442 (recibos untracked) | `5bf86b97` == `origin/main` |

## Gates verificadas first-hand antes de executar (runbook §1)

- **§1.1 Countersign QA GO:** AID-1428 comment `aa2bec4a` (2026-09-11T22:53Z) sobre o head `b75b26ab` do PR #342. ✓
- **§1.2 Merge single-writer CEO:** PR #342 `merged:true` → `4504eaad470588d98cf581815ef8e7b123875471` (API GitHub nesta run); `origin/main` == `5bf86b97dbb4456d90557eb823b84f9e21162438` (fetch nesta run); `4504eaad` ⊆ `5bf86b97` (log). ✓
- **§1.3 CI verde no pin:** check-runs de `5bf86b97` = **37 = 35 success + 2 skipped, 0 fail** (API GitHub nesta run). ✓
- **§1.4 Autorização founder:** DECISÃO CEO AID-1451 (`7d61a682`) — "promover F1 agora … Runbook PROMOTION §§2–5, 2 superfícies, com prova LIVE do first-touch e retenção do fix AID-1150 no literacy. Sem racional para adiar." ✓

## Pin e build (runbook §§2–3)

| Campo | Valor |
| --- | --- |
| Pin (`sourceRevision`) | `5bf86b97dbb4456d90557eb823b84f9e21162438` == `refs/heads/release/5bf86b97` (criada e conferida por ls-remote nesta run) == `origin/main` |
| Build prod OS | `COMMIT_REF=5bf86b97… VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics node scripts/build-pilot-bundle.mjs` (worktree dedicado `/tmp/opencode/promo1452/wt`, detached no pin, `git status` vazio; installs fresh `npm ci --include=dev` OS/literacy/dojoToday + `pnpm install --prod=false` voxelDojo/pixelDojo — zero mudanças de lockfile `cb128865..5bf86b97`) |
| Manifest | sha256 `a3ac015c5df24fa09e7df91f89a5591b499c7234838712b8ac67fb87603159b3`; `sourceRevision` = pin completo; superfície os `a4ed3138020817b8dcf3440728a6e159695662b4350dfe3de17a25ed5c78bc57`; literacy embarcada `c10f63c02f1e0759ad78176a82a1e875db503da389fcba491e302b3baef08bce` |
| Functions staged | byte-idênticas ao canônico `learner/gate/netlify-functions@pin` (diff vazio; deploy script verifica e aborta em drift; corpus `_shared/literacy-corpus.mjs` == pin) |
| Build literacy standalone | `npm run build` com `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` + `VITE_LITERACY_VERIFIER_URL=/.netlify/functions/literacy-verify` espelhados do `netlify.toml` do pin; staging com functions canônicas (`npm ci` reproduzível, 50 packages) + `netlify.toml` byte-idêntico exceto a linha `functions` (ida-e-volta verificada por diff) |
| Bundle literacy | `assets/index-CuSADLOW.js` sha256 `91474f0f4ba8858505137daddb6a48c59bc5ef3e494cc41b8015ff20de668118`; `index.html` sha256 `f081993cc49a7fad17ca5838b098b7cae1e758d5be8e0d4bae412de67b090a44`; 9 arquivos no dist |

**Delta de conteúdo `cb128865..5bf86b97`** (curriculum/learner intocados — zero bump de contentVersion): F1 activation LD (`firstTouch.ts` +37 novo, `LessonScreen.tsx` +19, `styles.css` +18, `firstTouchIntro.test.tsx` +340) + OS (`MapScreen.tsx` +35/-3, `.test.tsx` +179) + dojoToday a11y (`main.ts`, `styles.css` — fix AID-1334) + docs/readiness/work-products (sem efeito de bundle).

## Deploys

| Superfície | Deploy produção (vigente) | Criado (UTC) | Publicado (UTC) | Drafts remanescentes |
| --- | --- | --- | --- | --- |
| OS `aidevschool-codexdojo-os.netlify.app` (site `8bec714f-22cb-4468-8e2b-e3cd38652931`) | `6aa4bf7cf9199072e11a00f8` | 02:57:00Z | **02:57:03.959Z** | `6aa4bed3d68ee88353175335` (precheck 98/98) |
| literacy `aidevschool-literacydojo.netlify.app` (site `ba44d0c6-6ebb-44a8-8c26-477d28611294`) | `6aa4bf8ad8321ba00c1145c5` | 02:57:14Z | **02:57:15.592Z** | `6aa4bedcf919906f021a015d` (precheck 98/98) |

## Precheck (`precheck-5bf86b97.mjs`, 98 checks) — 100% verde nos 2 alvos (drafts E aliases de produção)

Adaptado do ancestral `_work-products/AID-1288/precheck-cb128865.mjs` (runbook §4.2). Âncoras F1 derivadas do pin: **first-touch completo baked** no bundle literacy (lead-in `Primeiro passo:` + 7 frases do Anexo A VERBATIM + framing índice 0 `first-activity-framing`); **badge "Comece aqui"** (`map-start-here-`) + **trilha ativa** (`map-active-chapter`/`Trilha ativa: `) no mapa OS; **retenção do fix AID-1150** (`id:"onboarding-title"` + `tabIndex:-1` + contador sr-only `Etapa`); **retenção do fix AID-1334** dojoToday (`aria-expanded` + guard CSS `.socrates-config[hidden]`); contagens de missão intactas (32 literacy + 7 jogos = 39; `verifierRequired` 39; dom 39; ai-pratica 24/dev 17; `contentVersion` `2026-09-10.2` ×35 uniforme, zero ocorrências de `2026-09-10.1`/`2026-09-06.1`); sondas de corpus l01/l02/l15/l30; dist literacy 9/9 byte-idêntico local↔deploy; `literacy-verify` PASS/FAIL do contrato fixo l02-v3 + paridade com o alias. Demais coberturas herdadas: 20 superfícies 200; env pins + endpoint baked; privacidade/termos; coletor 403; export fail-closed; smoke ingestão OS v1 + literacy v2 (eventId UUID); envelope inválido 422; bridges AID-448/449.

## Prova pós-deploy (runbook §5.2) — first-hand nos aliases de produção (13/13)

- **OS:** 2× POST idêntico → 202/202 com `acceptedEventIds` idêntico (marcador `c1452003-0000-4000-8000-000000001452`); export sem bearer → 401 `unauthorized`; export com bearer → 200 ndjson **256 linhas** com **exatamente 1 linha** para o marcador (dedup Blobs); POST cross-origin → 403 `origin-forbidden`; manifesto servido no alias `sourceRevision` == pin completo.
- **literacy:** 2× POST idêntico → 202/202 (marcador `d1452004-0000-4000-8000-000000001452`, envelope v2 `contentVersion 2026-09-10.2` lessonId l02); 401 sem bearer; 403 cross-origin; export com bearer → 200 ndjson 34 linhas, **exatamente 1** por marcador (propagação imediata nesta onda — sem espera de réplica).
- **Prova LIVE first-touch (exigência da ORDEM):** bundle SERVIDO no alias literacy (`assets/index-CuSADLOW.js`) contém a frase l02 `Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar.` + lead-in + framing índice 0; bundle SERVIDO no alias OS (`assets/index-C8ZxuCba.js`) contém `Comece aqui` + `map-start-here-` + `map-active-chapter`; dojoToday servido contém o guard CSS. **Retenção AID-1150 confirmada** (`id:"onboarding-title"` + `tabIndex:-1` no bundle servido).
- Output bruto arquivado em `/tmp/opencode/promo1452/` (build_os.log, build_lit.log, deploy_*_{draft,prod}.log, precheck_draft.log, precheck_prod.log, verify_prod.log) e logs-chave commitados neste diretório.

## Achados e desvios (transparência)

1. **Créditos:** 4 deploys nesta onda (2 draft + 2 prod) — dentro do envelope ~60–90 créditos/onda do §8.6.
2. **Sem surpresas de build:** delta sem lockfiles permitiu installs fresh sem desvios; nenhuma reincidência dos gotchas §8 (site-ID pinado na literacy; eventId UUID nos smokes; literacy-verify rastreada in-repo e preservada via staging canonical).
3. **Drafts remanescentes** nos 2 sites (não-alias) — inofensivos (§8.4), listados acima.
4. **Produção agora == main == `release/5bf86b97`** nas 2 superfícies; o delta literacy-vs-prod descoberto no redeploy AID-1450 está fechado.

## Rollback (owner: FPE fa8130d5)

| Superfície | Deploy anterior (elegível) | Re-pin |
| --- | --- | --- |
| OS | `6aa2c8a598e7b6dd5b6580dc` (AID-1288, pin `cb128865`) — `ready` | rebuild em `release/cb128865` + alias `--prod` |
| literacy | `6aa4bbc32ef6307040973b7a` (AID-1450, pin `cb128865`) — `ready` | redeploy do dist anterior |

## Pendências

- **QA wave-level (producer≠verificador):** countersign independente da onda promovida — leitura de funil + âncoras F1/AID-1150/AID-1334 nas 2 superfícies live (child issue aberta na árvore AID-1452; export tokens armados no provedor; sondas com eventId UUID).
- **Merge deste PR de registro** (single-writer CEO, padrão AID-1288/#PR-de-registro).
