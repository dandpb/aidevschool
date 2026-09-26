# Spike de hospedagem beta — zai-duolingo-like (AID-2673)

**Veredito:** export estático (`output: 'export'`) é **inviável sem reescrever a
arquitetura de persistência**. Prisma/SQLite é obrigatório em runtime. Caminho
recomendado: servidor Node standalone (build já verificado) atrás de reverse
proxy — runbook na seção 4.

Pedido: founder jogar o "Duolingo de IA" por URL pública (issue AID-2673,
origem AID-2660). A issue manda investigar export estático e, se Prisma for
obrigatório em runtime, **propor** hospedagem adequada sem sobrescrever a
arquitetura — é o caso deste documento.

## 1. Evidência do spike (2026-09-26 01:30–01:45Z, checkout `beta-hub-aid2669` @ `e5f6dc0c`)

- **19 route handlers** sob `src/app/api/**`, todos `force-dynamic`
  (convenção do QWEN.md). `next build` com `output: 'export'` recusa route
  handlers dinâmicos — o build nem compila.
- **O loop de jogo é server-backed:** `submitLesson` → `POST /api/lesson/[id]/complete`
  (grader server-side) → `refreshState()` (`GET /api/state`). XP/vidas/streak/
  conquistas persistem em SQLite via Prisma (`src/lib/db.ts`).
- **Sem API o jogo não abre:** `bootstrap()` fica em retry infinito no splash
  enquanto `/api/state` falhar (`src/components/game/store.ts:187-215`) — num
  bundle estático o founder nunca sairia de "Inicializando Protocolo".
- `/api/chat` exige `LLM_API_KEY` **server-side** (`src/app/api/chat/route.ts`;
  sem a chave responde 503 `{ok:false, error:"llm-not-configured"}` — degradação
  graciosa, o resto do jogo funciona).

## 2. O que foi verificado no caminho escolhido (standalone)

Comandos reais executados no checkout citado (gates do QWEN.md):

| Gate | Resultado |
| --- | --- |
| `npm run verify` (vitest + eslint + tsc) | **verde** — 25 files / 128 tests, exit 0 |
| `next build` (`output: "standalone"`) | **verde** — 19 rotas ƒ dinâmicas + página ○ |
| `prisma db push` + `node .next/standalone/server.js` | `POST /api/init` → 200; `GET /api/state` → 200 com learner real |
| Playwright Chromium contra o servidor de produção local | screenshot anexo na issue AID-2673 (asset `7b3319d8…`, sha256 `b5172281…`) |

**Armadinha documentada:** `DATABASE_URL` **relativo quebra no standalone** —
em runtime o caminho resolve pelo CWD do bundle, não pelo `prisma/` do schema
(`Error code 14: Unable to open the database file`). No runtime usar caminho
**absoluto**: `DATABASE_URL=file:/…/engines/zai-duolingo-like/db/prod.db`.

## 3. Opções de hospedagem

| Opção | Progresso persiste? | Custo/conta | Dono da execução | Veredito |
| --- | --- | --- | --- | --- |
| **A. Servidor Node standalone + reverse proxy** (VPS/infra da empresa; runbook §4) | **Sim** (SQLite em disco) | zero (infra existente) | Platform & Release Engineer | **RECOMENDADA** |
| B. Netlify + `@netlify/plugin-nextjs` | **Não** — filesystem efêmero: cold start zera o SQLite por instância; founder repetiria onboarding e perderia progresso | zero (conta Netlify existente) | Platform (criaria o site) | Só como demo descartável; experiência ruim para o beta |
| C. Export estático + persistência client-side (localStorage/Zustand persist) | Sim (no navegador) | zero | exige proposta aprovada + dono da engine — mover grader/progressão server-side para o client é mudança de arquitetura | Fora do escopo da AID-2673 (a issue proíbe sobrescrever arquitetura sem propor antes) |

Recomendação: **A** para o beta do founder (persistência real, zero custo,
mesmo padrão de op de serviço que a Platform já roda para as outras
superfícies). C pode vir depois como proposta separada se o produto quiser o
padrão "progresso local no navegador" das outras engines beta.

## 4. Runbook — Opção A (~15 min, qualquer host com Node 24 + systemd/Caddy)

```bash
# 1. provisionar (uma vez)
sudo mkdir -p /opt/aidevschool/zai-duolingo-like && cd /opt/aidevschool/zai-duolingo-like
git clone https://github.com/dandpb/aidevschool.git repo && cd repo/engines/zai-duolingo-like
npm ci

# 2. banco (schema canônico; caminho ABSOLUTO no runtime)
DATABASE_URL=file:/opt/aidevschool/zai-duolingo-like/repo/engines/zai-duolingo-like/db/prod.db \
  npx prisma db push

# 3. build de produção (gera .next/standalone e copia static/ + public/)
npm run build

# 4. serviço (systemd) — aidevschool-zai.service
[Service]
WorkingDirectory=/opt/aidevschool/zai-duolingo-like/repo/engines/zai-duolingo-like
Environment=PORT=3210
Environment=HOSTNAME=127.0.0.1
Environment=DATABASE_URL=file:/opt/aidevschool/zai-duolingo-like/repo/engines/zai-duolingo-like/db/prod.db
# opcional — sem ela o /api/chat degrada com 503 llm-not-configured:
# Environment=LLM_API_KEY=<secreto do cofre da Platform, nunca no repo>
ExecStart=/usr/bin/node .next/standalone/server.js

# 5. reverse proxy (Caddy) — subdomínio escolhido pela Platform
zai-beta.<dominio> {
  header X-Robots-Tag "noindex, nofollow"   # beta privado do founder
  reverse_proxy 127.0.0.1:3210
}

# 6. smoke de aceite
curl -fsS https://zai-beta.<dominio>/api/state      # → {"at":…,"learner":…}
curl -fsS -X POST https://zai-beta.<dominio>/api/init \
  -H 'Content-Type: application/json' -d '{"name":"Founder","path":"neon-syntax"}'
# + screenshot Playwright (evidência) e restauração do db de smoke depois, se desejado

# 7. backup (o progresso do founder é um arquivo)
# cron diário: sqlite3 db/prod.db ".backup db/prod-backup-$(date +%F).db"
```

Notas de segurança: `LLM_API_KEY` só via env do serviço; `db/*.db` já é
gitignored; X-Robots-Tag mantém o beta fora de SEO (mesma política do Beta Hub).
