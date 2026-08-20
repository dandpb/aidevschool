# VALIDAÇÃO — P2: deploy estático do piloto

## RED — contrato no HEAD

O verificador foi executado contra o `netlify.toml` do `HEAD`, antes da correção desta rodada:

```bash
python3 docs/prioridades/2026-08-17/caso-p2-os-pilot/verify_pilot_config.py <(git show HEAD:engines/codexdojo-os-prototype/netlify.toml)
```

Resultado real:

```text
pilot config verification: FAIL
missing: VITE_LITERACYDOJO_URL = "/apps/literacydojo/"
missing: VITE_RELAY_STATION_URL = "/apps/relay-station/"
missing: VITE_WAREHOUSE_URL = "/apps/warehouse/"
missing: VITE_WORMHOLE_URL = "/apps/wormhole/"
missing: build command = npm install && npm run build:pilot
```

Isso confirma que a configuração versionada em `HEAD` não garantia o piloto estático.

## Correção aplicada

Primeira versão desta rodada colocou as URLs no `netlify.toml`. O review posterior
(simplify-code) encontrou o problema real: o GitHub Actions não lê `netlify.toml` e o
`.env.production` nunca foi commitado — um checkout limpo cairia no fallback `127.0.0.1` do
catálogo. A correção definitiva tornou o `build:pilot` auto-contido: as quatro
`VITE_*_URL=/apps/*` vivem inline no script `build:pilot` do `package.json` (mesmo padrão de
`build:integrated`). O bloco `[build.environment]` do `netlify.toml` foi removido.

## GREEN — contrato

```bash
python3 docs/prioridades/2026-08-17/caso-p2-os-pilot/verify_pilot_config.py
```

Resultado real:

```text
pilot config verification: PASS
bundled mission runtimes: 4
build:pilot is self-contained (inline VITE_*_URL): yes
external env-file dependency: no
```

E a prova decisiva: `npm run test:smoke:pilot` foi executado com `.env.production`
temporariamente fora do caminho e passou (2 testes), confirmando que um checkout limpo de CI
produz o bundle correto.

## GREEN — smoke contra build estático

```bash
cd engines/codexdojo-os-prototype
npm run test:smoke:pilot
```

Resultado real resumido:

```text
4 mission runtimes bundled into dist/apps/.
2 passed (5.5s)
```

Os dois cenários passaram sem subir dev-servers das missões:

1. missão da trilha IA Prática montou;
2. missão Dev WAREHOUSE montou e manteve o estado honesto `Ainda não enviada`.

## Entregue de verdade

- Quatro URLs versionáveis adicionadas ao `netlify.toml`.
- Contrato executável para as quatro URLs e o comando de build.
- Smoke de build estático executado com duas missões representativas.

## Não entregue / limites

- Não publiquei uma nova versão do site.
- Não testei as seis missões individualmente; três lições IA compartilham um runtime e três
  missões Dev usam os runtimes empacotados.
- Não criei verificador remoto nem backend.
- O `build:pilot`, o bundle, a configuração Playwright e o smoke já estavam presentes como
  arquivos não rastreados quando esta rodada começou; não atribuo a criação desses arquivos a esta
  correção. A evidência aqui prova que eles funcionam em conjunto com a configuração corrigida,
  mas um clone baseado apenas no `HEAD` ainda não os possui. Portanto, **P2 não está pronta para
  release até esses arquivos serem incluídos no commit/release**.
- O warning de chunks maiores que 500 kB permanece nos bundles wormhole e relay-station; não foi
  tratado porque não bloqueou a montagem.
