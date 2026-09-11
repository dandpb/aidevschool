# AID-956 — Runbook: redeploy 2 superfícies pós-merge PR #280 (backing Blobs) + recibo AID-947

**Status:** STAGED (aguardando gates: QA GO na AID-947 + merge single-writer CEO do PR #280).
**Autor:** FPE (fa8130d5). **Fonte:** ORDEM AID-954/B (AID-956) + fluxo padrão AID-935 (`_work-products/AID-935/WAVE-PROMOTION-65d64bca.md`).
**Baseline verificado 2026-09-06 ~18:2xZ (read-only):** export 401 `unauthorized` nas 2 superfícies (token armado, coletor v2 no ar); `origin/main` = `f54847dc` (base do PR #280).

## Passo 0 — Confirmar gates (não pular)
1. GitHub API `pulls/280`: `merged=true`, anotar `merge_commit_sha` (= `MERGE_SHA`), `merged_at`.
2. AID-947: comentário GO da QA presente (veredito com evidências).
3. `git fetch origin main` → `origin/main` == `MERGE_SHA`.

## Passo 1 — Pin do merge commit
- `git checkout -d MERGE_SHA` em worktree limpa; `release/MERGE_SHA` criada e conferida por `ls-remote`.
- Projeções regeneradas conforme AGENTS (nunca hand-edit).

## Passo 2 — Builds
- **OS** (`engines/codexdojo-os-prototype`): `build-pilot-bundle.mjs` com `COMMIT_REF=MERGE_SHA` + `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics` (espelhado do `[build.environment]` do `netlify.toml` do próprio pin). O script stages wrapper `netlify-blobs-runtime.mjs` + manifest em `engines/codexdojo-os-prototype/netlify/functions` (projeção gitignored — regenerada, não editada).
- **Literacy** (`engines/literacyDojo`): `npm run build` com `VITE_ANALYTICS_ENDPOINT` + `VITE_LITERACY_VERIFIER_URL` espelhados do `netlify.toml`. Functions: dir canônico `learner/gate/netlify-functions` — no pin do merge contém `package.json`+lock (`@netlify/blobs` 10.7.13) e `literacy-verify.mjs` (in-repo desde PR #279; hazard do stash AID-935 não se aplica). Staging `lit-functions` local se o CLI recusar `../../` (netlify.toml de staging byte-idêntico exceto a linha `functions`).

## Passo 3 — Deploy draft → precheck → alias (por superfície)
1. Deploy draft (Netlify CLI, site da superfície).
2. Precheck adaptado de `_work-products/AID-935/precheck-65d64bca.mjs` (72 checks), incluindo: identidade de manifesto/sourceRevision; `/privacidade.html` OS estático; coletor cross-origin 403; export fail-closed; smoke ingestão same-origin 202; bridge OS; `literacy-verify` PASS/FAIL preservada.
3. Alias de produção só com precheck verde no draft.

## Passo 4 — `ANALYTICS_EXPORT_TOKEN` (escopo item 2)
- Re-verificar 401 `unauthorized` no export de cada alias pós-deploy. Já armado nas 2 (baseline 18:2xZ). Se alguma superfície nova/ausente: owner do valor é o founder/CEO (nunca no repo — AID-934 passo 2).

## Passo 5 — Verificação pós-fix first-hand (escopo item 3; produtor ≠ verifier: QA refaz LIVE na fase 2 da AID-955)
**Dependência:** leitura do export exige grant temporário do token (padrão AID-928 — QA emite re-grant aplicável no GO; sem ele, degradar para 2× POST 202 + export pela QA e registrar a limitação).
Por superfície (literacy e OS):
1. **Idempotência:** POST byte-idêntico do MESMO eventId sintético (marcador `contentVersion:"fpe-a956-persist"`, `lessonId:"persistence-probe-a956"`) 2× → 202 nas 2; export imediato com **exatamente 1 linha** por eventId (0 duplicatas).
2. **`readRange` recursivo:** export não-vazio contém o evento sintético (prova do `directories:true` + paginação — pré-fix devolvia ZERO linhas).
3. **Fallback NDJSON ausente:** em produção com Blobs ativo, nenhuma linha vinda do file sink — sinal: eventos de ANTES do redeploy não reaparecem após reciclagem de instância (pré-fix sumiam); export só contém eventos pós-deploy + sintéticos.
4. Anotar timestamps UTC de cada POST/export.

## Passo 6 — Recibo (escopo item 4)
- Comentário na **AID-947** com: URLs dos 2 aliases, deploy IDs/permalinks + timestamps, `MERGE_SHA`, shas de manifesto/dist, resultado das verificações do Passo 5, estado do token (Passo 4). Insumo para a re-verificação LIVE da QA (fase 2 ORDEM AID-955, gate `done` da AID-947).
- Este runbook + receipt final entram no work product (commit docs-only via PR + countersign, padrão AID-601/630/666/821 §2 — sem push direto em protegida).

## Se o deploy revelar novo defeito
- Child issue da AID-947 com blocker nomeado + rollback: re-pin do deploy anterior (OS `6a9d91ebbe30eefc6beffe32` @ `65d64bca`, branch `release/65d64bca` intacta; literacy redeploy do dist anterior). Rollback owner: FPE.
