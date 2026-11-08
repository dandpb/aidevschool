# AID-3531 — Preflight PRE (leitura somente) — Receipt 2026-09-30 ~21:2xZ

Escopo: AID-3453 preflight. Somente leitura (GET): `netlify status`, `api listSites`, `api getSite`, `api listSiteDeploys`, `api listAccountsForUser`, `git show`/`for-each-ref` no pin local, HEAD no alias live. Sem checkout do pai, sem carrier, sem publicação, sem copiar/expor/gerar credenciais (token do auth store nunca impresso).

## 1. Sessão — VÁLIDA
- Mecanismo: auth store do CLI `~/.config/netlify/config.json` (OAuth `netlify login`, mtime 2026-09-11). Zero vars `NETLIFY_*` no env.
- Root cause do "Not logged in": netlify-cli 27 lê auth de `$XDG_CONFIG_HOME/netlify/config.json`; harness exporta `XDG_CONFIG_HOME=/tmp/paperclip-opencode-config-*` (vazio) → sessão invisível. Fix sem tocar em credenciais: `XDG_CONFIG_HOME=/paperclip/.config` (verificado first-hand).
- Conta: Daniel Pinheiro Barreto / dandpb@gmail.com; team "Daniel Pinheiro Barreto's team" (slug `dandpb`, id `5e31c95791ca41d5d61b2b3d`, role Owner) — dona do site literacy.

## 2. Site correto
- `ba44d0c6-6ebb-44a8-8c26-477d28611294` = aidevschool-literacydojo (https://aidevschool-literacydojo.netlify.app); HEAD 200 (0,56s). account_id confere.
- netlify.toml do pin `d9dbdd5` (engines/literacyDojo): build `npm run build`, publish `dist`, functions `../../learner/gate/netlify-functions`; env pins `VITE_LITERACY_VERIFIER_URL=/.netlify/functions/literacy-verify`, `VITE_ANALYTICS_ENDPOINT=/__dojo/bridge/v1/analytics`; redirects bridge analytics 200 + SPA fallback; headers segurança com `worker-src 'self'`.
- Funções vivas no prod: dojo-analytics-collector, dojo-verification-bridge, literacy-verify (§8.5: literacy-verify ainda fora do repo — preservar no staging manual).
- Achado: `~/.netlify/state.json` siteId `5ee…` NÃO existe na conta (stale) — usar sempre `--site ba44d0c6…`.

## 3. Créditos/plan
- Plan: `Starter` (`orb-starter`, free), ciclo 2026-09-09→2026-10-09, 1 member Owner.
- Uso no ciclo: build minutes 300 incl. / 0 usados; bandwidth 100 GiB / 0 usados; builds concorrentes 1/0; credit_features=false; credit_rollover=false; auto-topup off.
- CLI `--no-build` não consome build minutes; "15 créditos" (§8.6) é preço de lista, não cobrança.

## 4. Rollback
- Prod atual: deploy `6ab814a06d8fce856886d2a9` (ready, publicado 2026-09-26T18:53:25Z) ↔ `release/a27f330` (merge PR #524, AID-2669) — branch íntegra em origin.
- Anterior: `6aa816431935372ab29c0989` (2026-09-14T15:44:03Z) ↔ `release/b6a0ea1` (merge PR #414) — íntegra.
- Candidato da onda: `release/d9dbdd5` = d9dbdd5c504ef76a42d3f7944392dccee3eb6351 (PR #616), ainda NÃO deployado.

## Arquivos
- sites.json, literacy_site.json, literacy_deploys.json, accounts.json (outputs de API, sem segredos)
- Pendências FPE (runbook): §3 build, §4 draft+precheck 2 alvos, §5 alias --prod + pós-deploy.
