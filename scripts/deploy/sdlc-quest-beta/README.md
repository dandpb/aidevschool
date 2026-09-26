# SDLC Quest — beta surface runbook (AID-2674)

URL pública (beta, `noindex`): **https://aidevschool-sdlcquest.netlify.app**
(variante single-file offline: `/sdlc-quest.html`)

| | |
|---|---|
| Site Netlify (free tier, conta founder) | `aidevschool-sdlcquest` · id `caa23a84-68dc-4c8d-87fe-e0e21566fa4f` |
| Deploy inicial | `6ab723bfcd6907b88fe9a6cb` (2026-09-26) · main `4461841f` |
| Re-publicação canônica (via `publish.sh`) | `6ab72452cdaaa08bd1c5f621` (2026-09-26) · main `4461841f` · pins SHA256SUMS verificados |
| Superfície publicada | `index.html`, `sdlc-quest.html`, `src/*.{js,css}` — idêntica ao que `tools/serve.cjs` expõe localmente |
| Registro/intent | `intent/AID-2674-sdlc-quest-beta-url/` · task record AID-2674 |

## Por que estático

`tools/serve.cjs` é um servidor estático read-only; o jogo não faz rede
(fetch/XHR/imagens externas: zero — só `localStorage`). O `npm start` local
continua sendo a forma offline canônica do pacote; a URL pública é a mesma
superfície sob HTTPS com headers de produção (nosniff, no-referrer,
`X-Robots-Tag: noindex, follow`, CSP estrita em `/` e `/index.html`).

## Publicar (sempre a partir do main)

```bash
NETLIFY_AUTH_TOKEN=... scripts/deploy/sdlc-quest-beta/publish.sh        # REV=origin/main
REV=<sha> NETLIFY_AUTH_TOKEN=... scripts/deploy/sdlc-quest-beta/publish.sh  # revisão específica
```

O script **aborta** se qualquer arquivo divergir do `SHA256SUMS.txt` do
engine na revisão de origem — nunca publique conteúdo sem pin. O pacote
`engines/sdlc-quest/` não é alterado pela publicação (manifesto intocado).

## Reverter

`npx netlify api listSiteDeploys --data '{"site_id":"caa23a84-68dc-4c8d-87fe-e0e21566fa4f"}'`
→ restaurar o deploy anterior (id na lista) via dashboard ou
`npx netlify api restoreSiteDeploy --data '{"site_id":"...","deploy_id":"<anterior>"}'`.
Não existe estado de dados: reversão é só conteúdo estático.

## Smoke de revalidação

```bash
cd scripts/deploy/sdlc-quest-beta/smoke
npx --yes @playwright/test@1.63.0 test   # QUEST_URL opcional; default = URL pública
```

Joga a campanha inteira até o gate de produção (missões 1–5, 15/18) e falha
com qualquer erro de console. Respostas são derivadas de `src/data.js` em
runtime. Evidência do deploy inicial (screenshots + log) no task record
AID-2674.

## Regras

- Free tier apenas; nenhuma conta/serviço novo sem ordem explícita do founder.
- Superfície de beta: `noindex`, sem promise de produção; promoção a alias
  oficial seria decisão separada (precedente AID-987).
- Se o conteúdo do engine mudar (nova versão do jogo), publicar é rodar o
  script de novo a partir do main mergeado — CI do engine deve estar verde.
