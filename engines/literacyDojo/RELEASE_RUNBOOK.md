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
e da [referência da API de deploy](https://open-api.netlify.com/#tag/deploy/operation/createSiteDeploy).

Este procedimento usa diretamente a
[API REST da Netlify](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/)
com `curl`, `jq` e Python da imagem de release. Isso evita executar uma CLI
Node baixada ou recuperada de cache depois que a credencial de deploy estiver
disponível. A API recebe o manifesto de arquivos e cria um deploy com
`draft: true`.

Registre dois SHAs distintos: `PROCEDURE_SHA` identifica a revisão deste
runbook; `RELEASE_SHA` identifica o código e o conteúdo que produzem o
artefato. Execute os comandos em um checkout separado e limpo de `RELEASE_SHA`,
mesmo quando o runbook já estiver em um commit documental posterior. Mudança de
código ou configuração exige novo `RELEASE_SHA` e novas revisões; uma mudança
somente documental não altera os bytes do candidato.

Para AIDE-13, o candidato aprovado é exatamente
`f4c31513b3bb4e78a087006f3757a602a19bea5b`. Outro SHA é outro candidato e
exige nova avaliação. O `PROCEDURE_SHA` é calculado do checkout que contém este
runbook, portanto não é um placeholder autorreferente.

## 1. Pré-checks

Comece com dois checkouts separados: um limpo para o procedimento em revisão e
outro limpo no SHA exato do release. Substitua somente os dois caminhos:

```bash
set -euo pipefail
export PROCEDURE_CHECKOUT="/caminho/para/checkout-limpo-do-runbook"
export RELEASE_CHECKOUT="/caminho/para/checkout-limpo-de-f4c31513"
readonly PROCEDURE_SHA="$(git -C "$PROCEDURE_CHECKOUT" rev-parse HEAD)"
readonly RELEASE_SHA=f4c31513b3bb4e78a087006f3757a602a19bea5b

test -z "$(git -C "$PROCEDURE_CHECKOUT" status --porcelain --untracked-files=all)"
test -f "$PROCEDURE_CHECKOUT/engines/literacyDojo/RELEASE_RUNBOOK.md"

cd "$RELEASE_CHECKOUT"
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
test -z "$(git status --porcelain --untracked-files=all)"
cd engines/literacyDojo
test -z "$(find . -maxdepth 1 -type f -name '.env*' -print)"

node --version
npm --version
npm ci
npm audit --omit=dev --audit-level=high
rm -rf -- dist test-results
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
test -z "$(git status --porcelain --untracked-files=all)"
test -d dist
```

Pare se qualquer comando falhar, se o build regenerar uma diferença rastreada
ou surgir arquivo não rastreado fora das saídas ignoradas,
ou se o audit encontrar vulnerabilidade de produção Critical/High. O contrato
versionado deve continuar sendo `npm run build`, publish directory `dist` e
fallback SPA para `/index.html` em `netlify.toml`.

O candidato atual não exige variável pública de runtime nem origem de iframe: o
app usa somente os flags `DEV`/`PROD` do Vite e serve assets e service worker na
mesma origem. Qualquer novo `VITE_*`, iframe, função, edge function ou header
customizado muda o contrato e exige nova revisão.

Confira `curl`, `jq` e Python antes de disponibilizar qualquer credencial e
registre suas versões e hashes no diretório de evidência. Autentique com um PAT
de uma conta que tenha permissão de deploy no projeto existente e obtenha o
Project ID (`NETLIFY_SITE_ID`) em **Project configuration → General → Project
information**. Nunca passe o token por argumento, imprima ou grave em arquivo;
a função abaixo entrega o header à entrada padrão do `curl`.

```bash
curl --version
jq --version
python3 --version
sha256sum "$(command -v curl)" "$(command -v jq)" "$(command -v python3)"

# Só depois da verificação acima, injete pelo gerenciador de segredos.
test -n "${NETLIFY_AUTH_TOKEN:-}"
test -n "${NETLIFY_SITE_ID:-}"
[[ "$NETLIFY_SITE_ID" =~ ^[A-Za-z0-9-]+$ ]]

netlify_api() {
  [[ "$NETLIFY_AUTH_TOKEN" != *$'\n'* ]]
  [[ "$NETLIFY_AUTH_TOKEN" != *$'\r'* ]]
  printf 'Authorization: Bearer %s\n' "$NETLIFY_AUTH_TOKEN" \
    | curl --fail --silent --show-error --header @- "$@"
}
```

Se a API responder 401/403, se o Project ID faltar ou se a conta não enxergar
`aidevschool-literacydojo`, pare. Não crie outro projeto nem use deploy anônimo:
isso não prova equivalência com o site-alvo.

## 2. Build e fingerprints

Crie um diretório local de evidência fora do repositório e registre horário,
os dois SHAs, ferramentas, site-alvo, deploy publicado atual e fingerprints
antes de enviar qualquer byte. O deploy publicado em `site-before.json` é
inventário, não um rollback automaticamente seguro.

```bash
set -euo pipefail
release_record="$(mktemp -d)"
date -u +%Y-%m-%dT%H:%M:%SZ | tee "$release_record/built-at.txt"
printf '%s\n' "$PROCEDURE_SHA" | tee "$release_record/procedure-sha.txt"
git rev-parse HEAD | tee "$release_record/release-sha.txt"
git -C "$PROCEDURE_CHECKOUT" show \
  "$PROCEDURE_SHA:engines/literacyDojo/RELEASE_RUNBOOK.md" \
  | sha256sum > "$release_record/procedure-runbook-sha256.txt"
{
  curl --version | head -1
  jq --version
  python3 --version
  sha256sum "$(command -v curl)" "$(command -v jq)" "$(command -v python3)"
} > "$release_record/tools.txt"

netlify_api "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID" \
  > "$release_record/site-before.json"
jq -e --arg id "$NETLIFY_SITE_ID" '
  .id == $id and
  .name == "aidevschool-literacydojo" and
  .ssl_url == "https://aidevschool-literacydojo.netlify.app" and
  (.published_deploy.id | type == "string")
' "$release_record/site-before.json"
readonly PUBLISHED_BEFORE="$(jq -er '.published_deploy.id' \
  "$release_record/site-before.json")"

(cd dist && find . -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum) \
  | tee "$release_record/dist-sha256.txt"
sha256sum "$release_record/dist-sha256.txt" \
  | tee "$release_record/dist-tree-sha256.txt"
readonly DIST_TREE_SHA256="$(cut -d' ' -f1 \
  "$release_record/dist-tree-sha256.txt")"
```

O registro precisa destacar pelo menos `dist/index.html`, o JS e o CSS com nome
fingerprinted, `dist/sw.js` e o fingerprint da árvore inteira.

## 3. Draft deploy imutável

Envie exatamente o `dist` já validado pelo método de file digest da API. A
requisição declara `draft: true`; não existe comando de build ou promoção neste
passo. O manifesto contém somente arquivos de `dist`. O SHA-1 abaixo é exigido
pelo protocolo de upload da Netlify; os fingerprints de aprovação continuam
sendo SHA-256.

```bash
set -euo pipefail
python3 - "$release_record" <<'PY'
import hashlib
import json
import re
import sys
from pathlib import Path

record = Path(sys.argv[1])
root = Path("dist")
files = {}
uploads = {}
for path in sorted(item for item in root.rglob("*") if item.is_file()):
    relative = path.relative_to(root).as_posix()
    if not re.fullmatch(r"[A-Za-z0-9._/-]+", relative):
        raise SystemExit(f"unsafe deploy path: {relative}")
    digest = hashlib.sha1(path.read_bytes()).hexdigest()
    files[f"/{relative}"] = digest
    uploads.setdefault(digest, relative)
if not files:
    raise SystemExit("dist is empty")
(record / "deploy-request.json").write_text(
    json.dumps({"files": files, "draft": True}, sort_keys=True) + "\n",
    encoding="utf-8",
)
(record / "upload-map.json").write_text(
    json.dumps(uploads, sort_keys=True) + "\n", encoding="utf-8"
)
PY

netlify_api \
  --request POST \
  --header 'Content-Type: application/json' \
  --data-binary "@$release_record/deploy-request.json" \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys" \
  > "$release_record/deploy.json"

readonly DEPLOY_ID="$(jq -er --arg site "$NETLIFY_SITE_ID" '
  select(.site_id == $site and .draft == true and (.required | type == "array"))
  | .id
' "$release_record/deploy.json")"

while IFS= read -r digest; do
  relative_path="$(jq -er --arg digest "$digest" '.[$digest]' \
    "$release_record/upload-map.json")"
  netlify_api \
    --request PUT \
    --header 'Content-Type: application/octet-stream' \
    --data-binary "@dist/$relative_path" \
    "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID/files/$relative_path" \
    > /dev/null
done < <(jq -r '.required[]?' "$release_record/deploy.json")

deploy_ready=false
for _attempt in $(seq 1 20); do
  netlify_api "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID" \
    > "$release_record/deploy-status.json"
  case "$(jq -er '.state' "$release_record/deploy-status.json")" in
    ready)
      deploy_ready=true
      break
      ;;
    error)
      jq '.' "$release_record/deploy-status.json" >&2
      exit 1
      ;;
  esac
  sleep 3
done
test "$deploy_ready" = true

preview_url="$(jq -er --arg id "$DEPLOY_ID" --arg site "$NETLIFY_SITE_ID" '
  select(.id == $id and .site_id == $site and .draft == true and .state == "ready")
  | .deploy_ssl_url
' "$release_record/deploy-status.json")"
test "$preview_url" = "https://$DEPLOY_ID--aidevschool-literacydojo.netlify.app"

netlify_api "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID" \
  > "$release_record/site-after-draft.json"
test "$(jq -er '.published_deploy.id' "$release_record/site-after-draft.json")" \
  = "$PUBLISHED_BEFORE"
jq -e --arg id "$DEPLOY_ID" --arg url "$preview_url" \
  '.id == $id and .deploy_ssl_url == $url and .draft == true and .state == "ready"' \
  "$release_record/deploy-status.json"
unset NETLIFY_AUTH_TOKEN
```

Não use alias como evidência imutável: aliases podem apontar para outro deploy.
O registro de release deve guardar o `deploy_id` e a URL baseada nesse ID.

## 4. Prova de equivalência remota

Compare todos os arquivos publicados com o build local. Como o manifesto da API
foi construído somente de `dist`, a igualdade abaixo cobre a árvore inteira e
falha no primeiro desvio:

```bash
set -euo pipefail
mkdir -p "$release_record/remote"
while IFS= read -r -d '' local_file; do
  relative_path="${local_file#dist/}"
  mkdir -p "$release_record/remote/$(dirname "$relative_path")"
  curl --fail --silent --show-error \
    "$preview_url/$relative_path" \
    -o "$release_record/remote/$relative_path"
  if ! cmp -s "$local_file" "$release_record/remote/$relative_path"; then
    printf 'Divergência remota: %s\n' "$relative_path" >&2
    exit 1
  fi
done < <(find dist -type f -print0 | sort -z)

(cd "$release_record/remote" && find . -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum) \
  > "$release_record/remote-sha256.txt"
cmp -s "$release_record/dist-sha256.txt" \
  "$release_record/remote-sha256.txt"
sha256sum "$release_record/remote-sha256.txt" \
  | tee "$release_record/remote-tree-sha256.txt"
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

1. Toda a jornada pública está em pt-BR, não oferece nem exige conta/login e não
   envia progresso a backend. Um segundo perfil limpo não herda o progresso do
   primeiro; o painel de rede não mostra escrita remota de identidade/progresso.
2. A entrada mostra 14 missões em 4 módulos; Trilha Dev aparece somente como
   **Em breve** e não pode ser selecionada.
3. O onboarding termina no Mapa Inicial e abre a primeira lição.
4. Uma resposta errada mostra feedback seguro; a dica funciona; o retry correto
   conclui a atividade.
5. A conclusão apresenta a próxima lição e a navegação abre essa lição.
6. Reload na mesma origem retoma o progresso local salvo sem repetir o
   onboarding.
7. Em 375 px não há corte, sobreposição, scroll trap ou controle inacessível.
8. A navegação por teclado mantém ordem útil e foco visível nos controles.
9. Depois da primeira visita, o service worker controla a página e um reload
   offline preserva o shell e a jornada disponível.
10. Importe backups válidos da versão pública anterior com `l15`, `l16` e `l17`
   em `in_progress`. Para cada id, import, reload, **Voltar** e novo reload devem
   convergir para uma rota pública segura, sem “Lição não encontrada” recorrente
   e sem apagar o histórico concluído.

Qualquer divergência de contagem, Trilha Dev selecionável, erro de console,
asset 404, foco invisível, perda de progresso, falha offline ou retomada legada
recorrente é NO-GO.

O executor de QA grava `smoke.json` dentro de `release_record`, com
`procedure_sha`, `release_sha`, `deploy_id`, `preview_url`, horário, viewport,
zero erros de console e exatamente estes IDs de checks: `locale-no-account`,
`local-progress-isolation`, `curriculum-scope`, `onboarding`, `retry`, `next`,
`resume`, `mobile-375`, `keyboard-focus`, `offline` e `legacy-l15-l17`. Cada
check precisa ter `status: "pass"` e uma referência de artefato não vazia.
Valide antes de pedir aprovação:

```bash
set -euo pipefail
jq -e \
  --arg procedure "$PROCEDURE_SHA" \
  --arg release "$RELEASE_SHA" \
  --arg deploy "$DEPLOY_ID" \
  --arg url "$preview_url" \
  --arg tree "$DIST_TREE_SHA256" '
  .procedure_sha == $procedure and
  .release_sha == $release and
  .deploy_id == $deploy and
  .preview_url == $url and
  .dist_tree_sha256 == $tree and
  .console_errors == 0 and
  ([.checks[].id] | sort) == ([
    "locale-no-account", "local-progress-isolation", "curriculum-scope",
    "onboarding", "retry", "next", "resume", "mobile-375",
    "keyboard-focus", "offline", "legacy-l15-l17"
  ] | sort) and
  all(.checks[]; .status == "pass" and
    (.artifact | type == "string" and length > 0))
' "$release_record/smoke.json"
```

O diretório temporário não é entrega. Anexe `smoke.json`, `deploy-status.json`,
os manifests/hashes e as capturas ao registro da issue ou ao repositório de
evidência aprovado antes de encerrar a janela.

## 6. Promoção humana e saúde pós-deploy

Antes da promoção, o responsável humano deve escolher em
`ROLLBACK_DEPLOY_ID` um deploy retido, observado e aprovado sem Critical/High.
O deploy público conhecido na avaliação de 2026-08-22 não se qualifica: ele
expunha 17 missões/Trilha Dev e foco com contraste 2,02:1. Se nenhum deploy
retido for seguro, registre `NO_SAFE_ROLLBACK` e não promova; isso não invalida
o draft já criado.

Reinjete o PAT pelo gerenciador de segredos somente para consultar o deploy
escolhido e valide um arquivo de aprovação independente:

```bash
set -euo pipefail
test -n "${ROLLBACK_DEPLOY_ID:-}"
test -f "${ROLLBACK_APPROVAL_FILE:-}"
test -n "${NETLIFY_AUTH_TOKEN:-}"
netlify_api "https://api.netlify.com/api/v1/deploys/$ROLLBACK_DEPLOY_ID" \
  > "$release_record/rollback-deploy.json"
unset NETLIFY_AUTH_TOKEN
cp "$ROLLBACK_APPROVAL_FILE" "$release_record/rollback-approval.json"
jq -e --arg id "$ROLLBACK_DEPLOY_ID" --arg site "$NETLIFY_SITE_ID" '
  .id == $id and .site_id == $site and
  (.deploy_ssl_url | type == "string" and startswith("https://"))
' "$release_record/rollback-deploy.json"
jq -e --arg id "$ROLLBACK_DEPLOY_ID" '
  .deploy_id == $id and .smoke == "pass" and
  .critical_high_open == 0 and
  (.dist_tree_sha256 | type == "string" and length == 64) and
  (.artifact | type == "string" and length > 0) and
  (.approved_by | type == "string" and length > 0) and
  (.approved_at | type == "string" and length > 0)
' "$release_record/rollback-approval.json"
```

O responsável humano só promove depois que revisões independentes aprovarem o
mesmo `PROCEDURE_SHA`, `RELEASE_SHA`, `DEPLOY_ID`, permalink, fingerprints e
`smoke.json`. Ele também deve pausar auto publishing ou estabelecer uma janela
de freeze para impedir corrida com outro deploy e registrar isso, o rollback e
zero Critical/High em `promotion-approval.json`. Valide o registro:

```bash
set -euo pipefail
jq -e \
  --arg procedure "$PROCEDURE_SHA" \
  --arg release "$RELEASE_SHA" \
  --arg deploy "$DEPLOY_ID" \
  --arg rollback "$ROLLBACK_DEPLOY_ID" \
  --arg url "$preview_url" \
  --arg tree "$DIST_TREE_SHA256" '
  .procedure_sha == $procedure and
  .release_sha == $release and
  .deploy_id == $deploy and
  .preview_url == $url and
  .dist_tree_sha256 == $tree and
  .rollback_deploy_id == $rollback and
  .smoke == "pass" and .critical_high_open == 0 and
  .publication_freeze == true and
  (.approved_by | type == "string" and length > 0) and
  (.approved_at | type == "string" and length > 0)
' "$release_record/promotion-approval.json"
```

Na página do draft, use **Publish Deploy** para promover o deploy atômico já
testado; não dispare rebuild. `site-before.json` sozinho nunca satisfaz o gate.

Nos primeiros minutos após a promoção, repita na URL pública:

- status e content type de `/`, manifest, service worker, JS, CSS e fallback;
- hashes de toda a árvore publicada contra o preview aprovado;
- entrada, primeira lição, retry, próxima lição, reload/resume, 375 px, teclado
  e offline em perfil limpo;
- console sem erro e ausência de finding Critical/High novo.

Mantenha o deploy ID publicado anterior no registro e preserve a janela de
freeze até o fim dos checks de saúde. Uma publicação automática posterior pode
sobrescrever promoção ou rollback manual.

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
