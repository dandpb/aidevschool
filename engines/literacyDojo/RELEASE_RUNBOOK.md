# Runbook de preview, promoção e rollback

Este runbook cobre somente o LiteracyDojo standalone, publicado na raiz do
projeto Netlify `aidevschool-literacydojo`. Um preview é obrigatório antes de
qualquer mudança na URL pública. Agentes podem preparar e testar um draft
deploy; somente o responsável humano pode promovê-lo ou executar rollback.

## Papéis e gates

- O release engineer fixa o SHA, produz o build, cria o draft deploy e registra
  fingerprints e smoke.
- A revisão independente de código e a avaliação independente da jornada devem
  aprovar o mesmo SHA e o mesmo permalink, sem finding Critical/High aberto.
- O responsável humano decide promoção e rollback. Nunca use `--prod` durante a
  preparação do preview.

Um permalink Netlify identifica um deploy atômico, mas não é retenção eterna:
deploys antigos podem ser removidos pela política da conta. Registre o deploy ID
e a janela de retenção junto da evidência. Consulte a documentação de
[deploys e rollback](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)
e de [draft deploys pela CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/#draft-deploys).

Registre dois SHAs distintos: `PROCEDURE_SHA` identifica a revisão deste
runbook; `RELEASE_SHA` identifica o código e o conteúdo que produzem o
artefato. Execute os comandos em um checkout separado e limpo de `RELEASE_SHA`,
mesmo quando o runbook já estiver em um commit documental posterior. Mudança de
código ou configuração exige novo `RELEASE_SHA` e novas revisões; uma mudança
somente documental não altera os bytes do candidato.

## 1. Pré-checks

Comece em um checkout limpo do SHA aprovado e no diretório deste engine:

```bash
set -euo pipefail
export PROCEDURE_SHA=<sha-completo-do-runbook>
export RELEASE_SHA=<sha-completo-aprovado>
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
git diff --exit-code
git diff --cached --exit-code
cd engines/literacyDojo

node --version
npm --version
npm ci
npm audit --omit=dev --audit-level=high
npm run gen:content
npm run lint
npm run test
npm run build
npm run test:e2e

cd ../..
python3 -m pytest docs/product-readiness/tests -q
python3 docs/product-readiness/tools/cli.py check \
  --reports engines/literacyDojo/test-results/readiness
cd engines/literacyDojo

test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
git diff --exit-code
git diff --cached --exit-code
```

Pare se qualquer comando falhar, se o build regenerar uma diferença rastreada
ou se o audit encontrar vulnerabilidade de produção Critical/High. O contrato
versionado deve continuar sendo `npm run build`, publish directory `dist` e
fallback SPA para `/index.html` em `netlify.toml`.

O candidato atual não exige variável pública de runtime nem origem de iframe: o
app usa somente os flags `DEV`/`PROD` do Vite e serve assets e service worker na
mesma origem. Qualquer novo `VITE_*`, iframe, função, edge function ou header
customizado muda o contrato e exige nova revisão.

Resolva e confira a CLI 27.1.2 antes de disponibilizar qualquer credencial. A
partir daí, use `npx --offline` para impedir nova resolução de pacotes durante a
operação autenticada. Autentique com uma conta que tenha permissão de deploy no
projeto existente e obtenha o Project ID (`NETLIFY_SITE_ID`) em **Project
configuration → General → Project information**. A CLI lê um PAT diretamente
de `NETLIFY_AUTH_TOKEN`; nunca o passe por argumento, imprima ou grave no
repositório.

```bash
npx --yes netlify-cli@27.1.2 --version

# Só depois da verificação acima: faça login ou injete NETLIFY_AUTH_TOKEN pelo
# gerenciador de segredos do ambiente.
npx --yes --offline netlify-cli@27.1.2 status
test -n "${NETLIFY_SITE_ID:-}"
```

Se a CLI responder `Not logged in`, se o Project ID faltar ou se a conta não
enxergar `aidevschool-literacydojo`, pare. Não use `--allow-anonymous`: esse
modo cria outro projeto temporário, removido após uma hora se não for
reivindicado, e não prova equivalência com o site-alvo.

## 2. Build e fingerprints

Crie um diretório local de evidência fora do repositório e registre horário,
os dois SHAs, deploy publicado atual e fingerprints antes de enviar qualquer
byte. O deploy publicado em `site-before.json` é inventário, não um rollback
automaticamente seguro.

Antes da promoção, o responsável humano deve escolher em
`ROLLBACK_DEPLOY_ID` um deploy retido, observado e aprovado sem Critical/High.
Registre seus findings abertos e repita o smoke mínimo na URL dele. O deploy
publicado anterior conhecido na avaliação de 2026-08-22 não se qualifica: ele
expunha 17 missões/Trilha Dev e foco com contraste 2,02:1. Se nenhum deploy
retido for seguro, registre `NO_SAFE_ROLLBACK` e não promova.

```bash
set -euo pipefail
release_record="$(mktemp -d)"
date -u +%Y-%m-%dT%H:%M:%SZ | tee "$release_record/built-at.txt"
printf '%s\n' "$PROCEDURE_SHA" | tee "$release_record/procedure-sha.txt"
git rev-parse HEAD | tee "$release_record/release-sha.txt"

npx --yes --offline netlify-cli@27.1.2 api getSite \
  --data "{\"site_id\":\"$NETLIFY_SITE_ID\"}" \
  > "$release_record/site-before.json"
jq -er '.published_deploy | {id, deploy_ssl_url, published_at}' \
  "$release_record/site-before.json"

test -n "${ROLLBACK_DEPLOY_ID:-}"
npx --yes --offline netlify-cli@27.1.2 api getSiteDeploy \
  --data "{\"site_id\":\"$NETLIFY_SITE_ID\",\"deploy_id\":\"$ROLLBACK_DEPLOY_ID\"}" \
  > "$release_record/rollback-deploy.json"
jq -er '{id, deploy_ssl_url, state, published_at}' \
  "$release_record/rollback-deploy.json"

find dist -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | tee "$release_record/dist-sha256.txt"
sha256sum "$release_record/dist-sha256.txt" \
  | tee "$release_record/dist-tree-sha256.txt"
```

O registro precisa destacar pelo menos `dist/index.html`, o JS e o CSS com nome
fingerprinted, `dist/sw.js` e o fingerprint da árvore inteira.

## 3. Draft deploy imutável

Envie exatamente o `dist` já validado. `--no-build` impede que a plataforma
produza outro artefato; a ausência de `--prod` mantém a URL pública intocada.

```bash
set -euo pipefail
npx --yes --offline netlify-cli@27.1.2 deploy \
  --site "$NETLIFY_SITE_ID" \
  --dir dist \
  --no-build \
  --context deploy-preview \
  --message "LiteracyDojo RC $RELEASE_SHA" \
  --json \
  > "$release_record/deploy.json"

preview_url="$(jq -er '.deploy_url' "$release_record/deploy.json")"
jq -er '{deploy_id, deploy_url, logs}' "$release_record/deploy.json"
```

Não use alias como evidência imutável: aliases podem apontar para outro deploy.
O registro de release deve guardar o `deploy_id` e a URL baseada nesse ID.

## 4. Prova de equivalência remota

Compare os bytes publicados com o build local. O loop abaixo cobre HTML, JS,
CSS e service worker e falha no primeiro desvio:

```bash
set -euo pipefail
mkdir -p "$release_record/remote/assets"
find dist -type f \
  \( -name index.html -o -name '*.js' -o -name '*.css' -o -name sw.js \) \
  -print0 \
  | while IFS= read -r -d '' local_file; do
      relative_path="${local_file#dist/}"
      curl -fsS "$preview_url/$relative_path" \
        -o "$release_record/remote/$relative_path"
      if ! cmp -s "$local_file" "$release_record/remote/$relative_path"; then
        printf 'Divergência remota: %s\n' "$relative_path" >&2
        exit 1
      fi
    done

sha256sum "$release_record"/remote/index.html \
  "$release_record"/remote/assets/*.js \
  "$release_record"/remote/assets/*.css \
  "$release_record"/remote/sw.js
```

Também confirme:

- `/`, `/manifest.webmanifest`, `/sw.js`, JS e CSS respondem 200 com o tipo de
  conteúdo esperado;
- uma rota inexistente retorna o mesmo shell HTML por causa do fallback SPA;
- o draft envia `X-Robots-Tag: noindex`, conforme o comportamento de previews
  da Netlify;
- não há erro de asset, CSP, mixed content, iframe ou console.

`noindex` não é controle de acesso. Não inclua segredo, PII ou outra informação
confidencial no app, no permalink ou nas evidências do preview.

## 5. Smoke pela URL do preview

Use um perfil de navegador limpo, primeiro em 375 px e depois em desktop.
Registre URL, horário UTC, viewport, console e evidência visual de cada estado:

1. A entrada mostra 14 missões em 4 módulos; Trilha Dev aparece somente como
   **Em breve** e não pode ser selecionada.
2. O onboarding termina no Mapa Inicial e abre a primeira lição.
3. Uma resposta errada mostra feedback seguro; a dica funciona; o retry correto
   conclui a atividade.
4. A conclusão apresenta a próxima lição e a navegação abre essa lição.
5. Reload na mesma origem retoma o progresso salvo sem repetir o onboarding.
6. Em 375 px não há corte, sobreposição, scroll trap ou controle inacessível.
7. A navegação por teclado mantém ordem útil e foco visível nos controles.
8. Depois da primeira visita, o service worker controla a página e um reload
   offline preserva o shell e a jornada disponível.
9. Importe backups válidos da versão pública anterior com `l15`, `l16` e `l17`
   em `in_progress`. Para cada id, import, reload, **Voltar** e novo reload devem
   convergir para uma rota pública segura, sem “Lição não encontrada” recorrente
   e sem apagar o histórico concluído.

Qualquer divergência de contagem, Trilha Dev selecionável, erro de console,
asset 404, foco invisível, perda de progresso, falha offline ou retomada legada
recorrente é NO-GO.

## 6. Promoção humana e saúde pós-deploy

O responsável humano só promove depois que as revisões independentes aprovarem
o mesmo `RELEASE_SHA`, `deploy_id`, permalink e fingerprints. Na página do draft
deploy, use **Publish Deploy** para promover o deploy atômico já testado; não
dispare um rebuild. O `rollback-deploy.json` também precisa apontar para um
deploy retido e aprovado; `site-before.json` sozinho não satisfaz esse gate.
Registre quem aprovou e o horário UTC.

Nos primeiros minutos após a promoção, repita na URL pública:

- status e content type de `/`, manifest, service worker, JS, CSS e fallback;
- hashes de HTML, JS, CSS e service worker contra o preview aprovado;
- entrada, primeira lição, retry, próxima lição, reload/resume, 375 px, teclado
  e offline em perfil limpo;
- console sem erro e ausência de finding Critical/High novo.

Mantenha o deploy ID publicado anterior no registro. Se auto publishing estiver
ativo, uma publicação automática posterior pode sobrescrever uma promoção ou
rollback manual; o responsável humano deve decidir se bloqueia temporariamente
o deploy publicado.

## 7. Rollback

Se a URL pública divergir do preview aprovado, quebrar um fluxo ou apresentar
um finding Critical/High, pare divulgação e faça rollback pelo Netlify UI:

1. Abra **Deploys** e o deploy seguro registrado em `rollback-deploy.json`.
2. Confirme o deploy ID, o permalink e a aprovação independente registrada.
3. Selecione **Publish Deploy**. A Netlify republica o deploy atômico anterior
   sem novo build.
4. Repita os checks de saúde e confirme os fingerprints do artefato anterior.
5. Registre incidente, horário UTC, sinal que acionou rollback e novo estado.

Nunca trate o deploy meramente anterior como saudável: se o alvo seguro deixou
de ser retido ou não existe, declare `NO_SAFE_ROLLBACK` e escale ao responsável
humano em vez de publicar um artefato com Critical/High conhecido. Não apague o
deploy falho durante a investigação. Rollback recupera o artefato, mas o
progresso é local ao navegador; não limpe IndexedDB dos usuários.
