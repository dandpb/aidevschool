<!-- issue: AID-6009 | key: runbook-teardown | doc_id: 11f83e00-8c0f-427a-9a5d-5693e6be4d1e | updated: 2026-11-01 10:43:10.015+00 -->

# runbook-teardown

(AID-6009)

# AID-6009 — Runbook de teardown Netlify (4 URLs) + verificação pós-teardown

**Autor:** Founding Product Engineer (`fpe-fa8130d5`) · **Data:** 2026-11-01 · **Status:** pronto para execução pelo founder
**Papel:** o founder executa no Netlify (credenciais são dele); este runbook foi preparado e verificado pelo FPE sem tocar nos sites. O teardown **não foi executado** (decisão AID-6005/Opção A, aceite 2026-11-01T10:28:05Z).
**Método:** varredura repo-side 1ª mão no checkout `_default` (branch `aid3704/escola-dev-deeplink` @ `ff62e5f5`, árvore restaurada) + probes HTTP ao vivo em 2026-11-01 ~05:35Z + precedentes `engines/literacyDojo/RELEASE_RUNBOOK.md` (fluxo REST/preview/promoção) e adjudicação AID-402 (auto-publish).

---

## 0. Baseline ao vivo (evidência 1ª mão, 2026-11-01 ~05:35Z)

| URL | Status hoje | `<title>` hoje | Disposição |
| --- | --- | --- | --- |
| https://aidevschool-voxel-warehouse.netlify.app/ | 200 | `Armazém KV — voxelDojo jogo 02` | **RETIRAR** (redirect 301→OS) |
| https://aidevschool-pixelquest.netlify.app/ | 200 | `PixelDojo Quest` | **RETIRAR** (redirect 301→OS) |
| https://aidevschool-minitown.netlify.app/ | 200 | `MiniTown — Engine Skeleton` | **RETIRAR** (redirect 301→OS) |
| https://aidevschool-codexdojo.netlify.app/ | 200 | `codexDojo` | **RETIRAR** (redirect 301→OS) |
| https://aidevschool-codexdojo-os.netlify.app/ | 200 | `codexDojo OS` | MANTER (lançamento) |
| https://aidevschool-literacydojo.netlify.app/ | 200 | `LiteracyDojo — IA com confiança no trabalho` | MANTER (lançamento) |
| https://aidevschool-dojotoday.netlify.app/ | 200 | `dojoToday — sua lição de hoje` | MANTER (secundária, fora do marketing) |

**Independência comprovada:** o bundle de produção do OS (`https://aidevschool-codexdojo-os.netlify.app/assets/index-tOxxBvoM.js`, baixado 2026-11-01) resolve todas as engines same-origin — `VITE_PIXELDOJO_URL: /apps/pixelquest/`, `/apps/warehouse/`, `/apps/dojotoday/`, `/apps/literacydojo/` — com **zero referências** às 4 URLs retiradas. Derrubar as 4 não quebra o OS em produção.

**Identidade de sites — atenção (PixelQuest):** o alvo é o site **nome** `aidevschool-pixelquest`. NÃO confundir com o site `singular-crostata-273e7e` (siteId `d56219cd-5e90-47a6-b6b4-86f5aa24423b`, host dos pins imutáveis históricos do pixel-quest; raiz 404, permalink `6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app` ainda 200). Esse site **não** está no escopo e **não** deve ser apagado. Confirme sempre pelo campo `.name` antes de agir.

---

## 1. Pré-checks (obrigatórios, ~2 min)

```bash
# 1.1 Autenticação (conta do founder — a que possui os sites)
netlify login            # abre browser; ou export NETLIFY_AUTH_TOKEN=<PAT>

# 1.2 Inventário dos 4 alvos: capturar siteId + deploy publicado (âncora de rollback)
netlify sites:list --json | jq '.[] | select(.name | test("^aidevschool-(voxel-warehouse|pixelquest|minitown|codexdojo)$")) | {id, name, ssl_url}'
# ESPERADO: exatamente 4 linhas, uma por nome. Se faltar nome, PARE (site renomeado/apagado).

# 1.3 Por site (repetir para os 4, substituindo <NAME>=aidevschool-voxel-warehouse etc.):
netlify api getSite --data '{"siteId":"<NAME>"}' \
  | jq '{id, name, ssl_url, published_deploy: .published_deploy.id, repo_url: .build_settings.repo_url, stop_builds: .build_settings.stop_builds, branch: .build_settings.branch}'
# ANOTE o published_deploy.id de cada site = âncora de rollback (§5).
```

**Verificações e gates antes de prosseguir:**

- `netlify status` dentro de um diretório de engine só mostra o site se houver link local (`.netlify/state.json`); nenhum dos 4 alvos tem link no repo (§4.4) — por isso o inventário confiável é `sites:list` (1.2), não `status`.
- **Se `repo_url` não-nulo em algum site** → o site é Git-connected e um `git push` pode re-publicar o app por cima do redirect. Desabilite ANTES do teardown:
  - Dashboard: *Site configuration → Build & deploy → Stop builds* (ou *Repository settings → unlink*);
  - API/comando: `netlify api updateSite --data '{"siteId":"<NAME>","body":{"build_settings":{"stop_builds":true}}}'` e confirme re-executando 1.3 (`stop_builds: true`). Padrão de prova igual ao §6 do `engines/literacyDojo/RELEASE_RUNBOOK.md`.
- Evidência repo-side (FPE, 2026-11-01): **nenhum** workflow do repo referencia Netlify (grep em `.github/workflows/*.yml` = 0 hits; única ocorrência de "deploy" em `ci.yml` é o comentário "sem deploy externo"); webhooks do repo = 0 (`gh api repos/dandpb/aidevschool/hooks` → `[]`); precedente AID-402: OS site "sem build hooks / git integration ativa". O risco residual Git-connected é provider-side e coberto pelo passo acima.

---

## 2. Teardown — Opção A (RECOMENDADA): redirect 301 → codexDojo OS

Prepara uma vez; depois **1 comando por site**. Mantém o nome do site sob nosso controle (sem link-rot, sem risco de terceiro registrar o subdomínio), rollback trivial (§5).

```bash
# 2.1 Preparação (uma vez)
mkdir -p /tmp/teardown-redirect && cd /tmp/teardown-redirect
printf '/*  https://aidevschool-codexdojo-os.netlify.app/:splat  301!
' > _redirects
cat _redirects   # confira: /*  https://aidevschool-codexdojo-os.netlify.app/:splat  301!
```

Notas da regra: `/*` + `:splat` preserva caminhos profundos no OS; `301!` (force) garante precedência sobre qualquer fallback SPA herdado. Deploy por `--dir` publica **apenas** `_redirects` (o `netlify.toml` da engine não vai junto — é isso que desmonta o app público).

```bash
# 2.2 CAMINHO SEGURO (padrão casa: preview antes de prod) — repetir por site <NAME>:
netlify deploy --dir=. --site=<NAME>                       # draft: imprime <deploy-id>--<NAME>.netlify.app
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}
" "https://<deploy-id>--<NAME>.netlify.app/"
#   ESPERADO: 301 -> https://aidevschool-codexdojo-os.netlify.app/
netlify deploy --prod --dir=. --site=<NAME> --message "teardown AID-6009: 301 -> OS"

# 2.3 CAMINHO DIRETO (1 comando por site, sem preview) — se preferir:
for NAME in aidevschool-voxel-warehouse aidevschool-pixelquest aidevschool-minitown aidevschool-codexdojo; do
  netlify deploy --prod --dir=. --site="$NAME" --message "teardown AID-6009: 301 -> OS"
done
```

Alternativas equivalentes:
- **Dashboard:** *Deploys do site → arrastar a pasta* `/tmp/teardown-redirect` na zona de drag-and-drop (publica deploy com só `_redirects`).
- **REST (padrão do `RELEASE_RUNBOOK.md` §3):** `POST /api/v1/sites/<NAME>/deploys` com digest `{"files":{"/_redirects":"<sha1>"}}` (aceita nome do site no path), upload via `PUT /api/v1/deploys/<id>/files/_redirects`, depois promote (draft→prod conforme runbook). Disponível se o founder preferir o fluxo curl/jq já avaliado.

---

## 3. Teardown — Opção B (alternativa): unpublish (serve 404)

Usar somente se o redirect for indesejado. O nome continua nosso, mas links antigos quebram (404) em vez de serem resgatados.

```bash
mkdir -p /tmp/teardown-404 && cd /tmp/teardown-404
cat > 404.html <<'EOF'
<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Mudamos de endereço</title>
<meta name="robots" content="noindex"><p>Esta experiência saiu do ar. Entre por
<a href="https://aidevschool-codexdojo-os.netlify.app/">codexDojo OS</a> ou
<a href="https://aidevschool-literacydojo.netlify.app/">LiteracyDojo</a>.</p>
EOF
# 1 comando por site:
netlify deploy --prod --dir=. --site=<NAME> --message "teardown AID-6009: unpublish (404)"
# Efeito: toda rota responde 404 com a página acima (o bundle antigo deixa de ser servido).
```

## 3b. Opção C (NÃO recomendada agora): delete

`netlify sites:delete --site=<NAME>` (= `DELETE /api/v1/sites/<NAME>`). Irreversível e **libera o subdomínio `*.netlify.app` globalmente** — terceiros podem registrar o nome. Só considerar após uma janela longa de redirect (Opção A) e por decisão explícita do founder.

---

## 4. Varredura repo-side de re-publicação (revisão de risco — evidência 1ª mão FPE, 2026-11-01)

| # | Vetor | Estado | Como desabilitar (se aplicável) |
| --- | --- | --- | --- |
| 4.1 | GitHub Actions | **Nenhum deploy**: 0 referências a netlify em `.github/workflows/*.yml`; `ci.yml` declara "sem deploy externo" | n/a (não existe gatilho) |
| 4.2 | Webhooks do repo GitHub | **0 hooks** (`gh api repos/dandpb/aidevschool/hooks` → `[]`) | n/a |
| 4.3 | Netlify Git-integration (provider-side) | Invisível do repo; precedente AID-402 = inativa no OS site | Pré-check §1.3 (`repo_url`) + `stop_builds:true` / unlink no dashboard |
| 4.4 | Link CLI local (`.netlify/state.json`, gitignored) | Raiz do repo → `d56219cd` (singular-crostata, **fora de escopo, não apagar**); `engines/literacyDojo` → `ba44d0c6` (KEEP); `engines/codexdojo-os-prototype` → `6d816ca0` (KEEP); `~` (`/paperclip`, container de release) → `5eed18e8` (**não identificado — higiene: conferir antes de qualquer `netlify deploy` disparado do HOME**). **Nenhum dos 4 alvos tem link** → `netlify deploy` bare dentro de `engines/codexDojo`, `engines/miniTown`, `engines/voxelDojo/game-02-warehouse` falha sem `--site` (ação deliberada) | Higiene opcional: `rm .netlify/state.json` na raiz e no HOME (só afeta de onde deploys CLI partem) |
| 4.5 | `netlify.toml` das engines (tracked) | Presentes em `engines/codexDojo`, `engines/miniTown`, `engines/voxelDojo/game-02-warehouse` (+ pixelquest: **nenhum config no repo** — deploy manual histórico, coerente com binding nunca promovido na triagem AID-6005) | **Mantê-los**: são inertes sem credencial+site, e a engine continua executável localmente. O gate real é a política de publicação AID-6005 (use case + binding + copy + dono) e a credencial do founder |
| 4.6 | Docs apontando as URLs | `docs/product-readiness/inventory.yaml:149` (rota `voxel-standalone-learning-loop`) é a única referência tracked às 4 URLs (além do registro histórico `intent/AID-987-t1-customer-ready-elevation/spec.md`, append-only por convenção) | **Lane AID-6008** (em andamento): sincronizar `inventory.yaml`/guias ao novo portfólio 2 URLs |
| 4.7 | Dependência de produção | OS bundle prod resolve engines same-origin `/apps/*` (§0) — zero acoplamento às 4 URLs | n/a |

**Conclusão da revisão:** nada no repo re-publica automaticamente as 4 URLs. Os únicos vetores são (a) Git-integration provider-side — coberto pelo gate §1.3 — e (b) execução manual deliberada com credencial do founder — governada pela política de publicação.

---

## 5. Rollback (se precisar reverter um site)

```bash
# Restaurar o deploy publicado ANTES do teardown (id anotado no pré-check §1.3):
netlify api restoreSiteDeploy --data '{"siteId":"<NAME>","deployId":"<PUBLISHED_BEFORE_ID>"}'
#   (= POST /api/v1/sites/<NAME>/deploys/<PUBLISHED_BEFORE_ID>/restore; retorna state:"current")
```
O deploy antigo volta a ser o publicado; o deploy de redirect permanece no histórico. Reexecutar o teardown depois é só repetir o comando da Opção A.

---

## 6. Checklist de verificação pós-teardown (executável por qualquer pessoa, sem credenciais)

**6.1 As 4 URLs não servem mais o app velho** (esperado na Opção A: `301 -> https://aidevschool-codexdojo-os.netlify.app/` em todas; Opção B: `404`; deep-paths idem):

```bash
for s in voxel-warehouse pixelquest minitown codexdojo; do
  printf "%-18s " "$s"
  curl -s -o /dev/null -m 20 -w "%{http_code} -> %{redirect_url}
" "https://aidevschool-$s.netlify.app/"
done
# FAIL se qualquer uma responder 200. Prova anti-app-velho (títulos do baseline §0 não podem aparecer):
for s in voxel-warehouse pixelquest minitown codexdojo; do
  curl -s -m 20 "https://aidevschool-$s.netlify.app/" | grep -o '<title>[^<]*</title>' || echo "$s: sem title (ok p/ 301)"
done
# Spot-check de caminho profundo (redirect preservando path):
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}
" "https://aidevschool-voxel-warehouse.netlify.app/qualquer/rota"
```

**6.2 As 2 URLs de lançamento continuam 200 e com título correto:**

```bash
curl -s -o /dev/null -m 20 -w "OS: %{http_code}
"     https://aidevschool-codexdojo-os.netlify.app/
curl -s -o /dev/null -m 20 -w "LIT: %{http_code}
"    https://aidevschool-literacydojo.netlify.app/
curl -s -m 20 https://aidevschool-codexdojo-os.netlify.app/  | grep -o '<title>[^<]*</title>'
curl -s -m 20 https://aidevschool-literacydojo.netlify.app/  | grep -o '<title>[^<]*</title>'
# ESPERADO hoje: OS 200 + `codexDojo OS` · LIT 200 + `LiteracyDojo — IA com confiança no trabalho`
# (título voltado ao aluno é critério do gate AID-6005 item 3 — revisão de copy é lane AID-6008; registrar expected-vs-actual)
```

**6.3 Sem dano colateral** (superfícies que ficam):

```bash
curl -s -o /dev/null -m 20 -w "dojoToday(secundária): %{http_code}
" https://aidevschool-dojotoday.netlify.app/   # 200
curl -s -o /dev/null -m 20 -w "OS /apps/pixelquest/: %{http_code}
"   https://aidevschool-codexdojo-os.netlify.app/apps/pixelquest/  # 200
curl -s -o /dev/null -m 20 -w "OS /apps/warehouse/: %{http_code}
"    https://aidevschool-codexdojo-os.netlify.app/apps/warehouse/   # 200
```

Critério de aceite da verificação: **todas** as linhas acima com o resultado ESPERADO anotado; qualquer desvio = abrir incidente com o output bruto (não reexecutar teardown às cegas).

---

## 7. Handoff e dependências

- **Execução:** founder, Opção A (§2), ~5 min (4 comandos + preview opcional). Credenciais: conta Netlify do founder (agentes não têm token — regra AID-402).
- **Verificação:** §6 é credential-free — pode ser reexecutada por qualquer agente/humano; resultado deve ser anexado na AID-6005 (parent) para o registro da Fase 0B.
- **Docs:** AID-6008 sincroniza `inventory.yaml` (rota voxel §4.6), guias e policy gate de publicação ao portfólio 2 URLs.
- **Pós:** AID-6005 coordena a sequência (children AID-6008 + AID-6009) e o follow-up de execução pelo founder.
