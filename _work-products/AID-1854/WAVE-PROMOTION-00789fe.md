# AID-1854 — Redeploy literacy QW0 (superfície única): registro (pin `00789fe6`)

**Data (UTC):** 2026-09-14 (gates 14:1x–14:3xZ · draft `6aa802b8` ~14:5xZ · **prod publicado `6aa805f5` 15:0xZ** · provas 15:0xZ) · **Registro/execução:** Platform & Release Engineer (8c58cf6e) · **Autorização:** despacho CEO AID-1853 (recibo `f8089757`) → issue AID-1854 · **Countersign QA GO:** AID-1861 (veredito citando `00789fe6…`, verificação independente com rebuild byte-idêntico 11/11 + jornada headless 0 erros console) · **Runbook:** `docs/serving/PROMOTION-RUNBOOK.md` §§1–5 · **1º release governado R1** (branch protection + CODEOWNERS ativos desde 09-14 07:15Z).

## Gates §1 (verificados first-hand)

| Gate | Evidência |
| --- | --- |
| §1.1 QA GO citando o sha | AID-1861 **done** — GO `00789fe6b35668481bfbe01f8a7ece63bfaf4c6e` (rebuild independente, retenções F1/AID-1150/AID-1755, QW curls, jornada Chromium 0 erros) |
| §1.2 Merge via PR | #352/#362 (`35a757f2`) /#363 (`c1b7b5b8`) /#364 (`2c5f77dd`) merged; countersign CEO QW1–QW3 (AID-1584 `d70e7ee7`) |
| §1.3 CI verde no pin | PRE: 39 = 37 success + 2 skip; QA re-meçao: 40 = 37 success + 3 skip (1 check adicional "propose readiness re-grant PR") — 0 fail nas duas leituras |
| §1.4 Autorização | CEO AID-1853 → AID-1854 (ordem explícita: redeploy + evidência curl pós-deploy) |

## Delta promovido (`5bf86b97..00789fe6`, bundle literacy)

**Changelog do release (literacyDojo, usuário final):**
- `robots.txt` + `sitemap.xml` **reais** (antes: fallback SPA servindo HTML) — #362/AID-1593 QW1
- **Headers de segurança**: CSP (`worker-src 'self'`), Referrer-Policy strict-origin, X-Content-Type-Options, Permissions-Policy — #363/AID-1593 QW2 (paridade OS)
- **Canonical** `<link rel=canonical>` + icons + og-social-preview — #364/AID-1593 QW3 + #352
- a11y: refocus/anúncio em Progress/Checkpoint/ErrorRecovery — AID-1755 T3
- `noopener` em links externos (Sentinel)
- **Retenções provadas:** F1 first-touch (AID-1452), AID-1150 onboarding-title/tabIndex, 32 lições (23 IA Prática + 9 Dev), `contentVersion 2026-09-10.2` ×35 uniforme (zero bump — conteúdo intocado)

## Pin, build e deploys

| Campo | Valor |
| --- | --- |
| Pin | `00789fe6b35668481bfbe01f8a7ece63bfaf4c6e` == `origin/main` == `refs/heads/release/00789fe` (ls-remote) |
| Build | worktree limpo detached no pin; env pins espelhados do `netlify.toml` do pin; bundle `assets/index-oa9RfDx_.js` sha256 `e1e311b3…f9bdbb`; dist 9→11 arquivos (+robots.txt +sitemap.xml) |
| Staging | functions canônicas do pin (50 pkgs) + `netlify.toml` byte-idêntico exceto linha `functions` (round-trip diff vazio) |
| Deploy draft | `6aa802b8703403ba985921db` (~14:5xZ) — precheck **72/72**, byte-equivalence **11/11** |
| **Deploy produção (vigente)** | **`6aa805f5c03cb755ea9fbd96`** (15:0xZ) → `aidevschool-literacydojo.netlify.app`; permalink `6aa805f5--aidevschool-literacydojo.netlify.app` |
| Deploy anterior (rollback elegível) | `6aa4bf8ad8321ba00c1145c5` (AID-1452, pin `5bf86b97`) — re-pin `release/5bf86b97` + redeploy §6 |

## Precheck (âncora `waves/AID-1854-00789fe.json`, PR #413)

- **Draft: 72/72 PASS** (baseline AID-1556; osBase = alias live OS `5bf86b97` — superfície OS inalterada nesta onda); self-test **27/27**; dry-run registro ≡ `anchorCheckIds` (72 ids idênticos à âncora AID-935 — zero mudança de predicado).
- **Alias pós-promoção: 65/65 PASS** (subset `both`+`alias`).
- Byte-equivalence **11/11 local↔draft e local↔alias prod** (conjunto sha256 idêntico).

## Prova pós-deploy §5.2 (first-hand, 15:0xZ)

- **QW em prod (curl):** CSP+worker-src / Permissions-Policy / Referrer-Policy / nosniff / HSTS; `robots.txt` real (`User-agent: *`, `Disallow: /__dojo/`, `Sitemap:`); `sitemap.xml` real (3 `<loc>`); `<link rel="canonical" href="https://aidevschool-literacydojo.netlify.app/" />`; bundle antigo `index-CuSADLOW.js` → fallback SPA (`content-type: text/html`), não servido.
- **Ingestão/dedup:** 2× POST idêntico (marcador `d1854005-…-1855`) → **202/202 com `acceptedEventIds` idêntico**; export bearer → **200 ndjson 7 linhas**, marcador com **exatamente 1 linha** (dedup Blobs); sonda do draft `d1854004-…-1854` = 1 linha (propagação imediata).
- **Fail-closed:** export sem bearer → **401 `unauthorized`**; POST cross-origin → **403 `origin-forbidden`**; envelope inválido 422 (precheck).
- Output bruto arquivado em `/tmp/opencode/promo1854/` (deploy_lit_prod.log, precheck_prod.log, export_prod.ndjson, dist-sha256.txt, logs).

## Desvios e transparência

1. **Deploy PAT `.tok_lit` da onda AID-1452 expirou** (401 no site API) — draft/prod usaram token de sessão CLI do pipeline (`.nfl_token`); o **mesmo** `.tok_lit` segue válido como **bearer de export** (usado na prova dedup, padrão verify_prod da AID-1452). Sem exposição de valores.
2. **Config de onda ausente no checkout compartilhado durante o run do alias** (branch do PR #413 não mergeada) — extraído do branch `origin/aid-1854/precheck-wave-anchor` (sha do config idêntico ao do dry-run/CI).
3. Issue "probe" vazio criado sem querer na descoberta de rota da API (14:5xZ) — pendente de limpeza pelo sweep CEO.
4. **Créditos:** 2 deploys nesta onda (1 draft + 1 prod) — dentro do envelope §8.6.

## Pendências

- **Merge R1 §2 (FPE ou CEO):** PR #413 (âncora de precheck; CI verde) e o PR deste registro.
- **Onda OS separada:** superfície OS também está stale p/ #362/#364 (`robots.txt` do OS = fallback SPA verificado 14:12Z) — mesma causa; propor issue própria (fora do escopo AID-1854).
- **QA wave-level pós-promo** (padrão AID-1452): leitura de funil live + âncoras de retenção no alias prod.
- Drafts remanescentes no site (`6aa802b8` + anteriores) — inofensivos (§8.4).

## Rollback (owner: PRE)

Critério §6: defeito de integridade/serviço no alias. Alvo: deploy `6aa4bf8ad8321ba00c1145c5` (pin `5bf86b97`, branch `release/5bf86b97` intacta) — rebuild no pin + `--prod` + precheck mínimo contra alias re-pinado; registrar como receipt de rollback. Nota: rollback reverte também headers/robots/canonical (era o estado GO anterior — aceitável como último recurso; preferir fix-forward por PR se viável).
