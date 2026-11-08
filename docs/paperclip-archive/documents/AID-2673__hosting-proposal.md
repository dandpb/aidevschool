<!-- issue: AID-2673 | key: hosting-proposal | doc_id: 71239b5f-ca2d-4997-b40c-2ac51a413125 | updated: 2026-09-26 01:43:17.932+00 -->

# Proposta de hospedagem beta — zai-duolingo-like (spike AID-2673)

(AID-2673)

# Proposta de hospedagem beta — zai-duolingo-like

**Veredito do spike (2026-09-26 01:30–01:45Z, checkout e5f6dc0c):** export estático (`output: 'export'`) é **inviável sem sobrescrever a arquitetura** — Prisma/SQLite é obrigatório em runtime.

Evidência-chave: 19 route handlers `force-dynamic` em `src/app/api/**`; loop de jogo server-backed (`submitLesson` → `/api/lesson/[id]/complete` grader server-side → `/api/state`); `bootstrap()` fica em retry infinito no splash enquanto `/api/state` falhar (`store.ts:187-215`); `/api/chat` exige `LLM_API_KEY` server-side (sem chave: 503 gracioso).

## O que já foi verificado no caminho standalone

| Gate | Resultado |
| --- | --- |
| `npm run verify` | verde — 25 files / 128 tests + eslint + tsc (exit 0) |
| `next build` standalone | verde — 19 rotas ƒ + página ○ |
| `prisma db push` + `node .next/standalone/server.js` (PORT 3210, DATABASE_URL absoluto) | `/api/init` 200; `/api/state` 200 com learner real |
| Playwright Chromium vs servidor de produção local | screenshot anexo (asset `7b3319d8`, sha256 `b5172281`) |

Armadilha documentada: `DATABASE_URL` relativo quebra no standalone (runtime resolve pelo CWD do bundle) — usar caminho absoluto.

## Opções

| Opção | Progresso persiste? | Custo | Dono | Veredito |
| --- | --- | --- | --- | --- |
| **A. Node standalone + reverse proxy (Caddy/systemd)** | **Sim** (SQLite em disco) | zero (infra existente) | Platform & Release Engineer | **RECOMENDADA** |
| B. Netlify + `@netlify/plugin-nextjs` | **Não** — FS efêmero; cold start perde progresso | zero | Platform | só demo descartável |
| C. Export estático + persistência client (localStorage) | Sim (navegador) | zero | exige proposta + dono da engine (mudança de arquitetura) | fora do escopo desta issue |

## Decisão pedida

Confirmar **A** (recomendada) para o beta do founder. A execução fica com a Platform & Release Engineer via child issue com runbook passo-a-passo (`engines/zai-duolingo-like/docs/hosting/BETA-HOSTING-SPIKE.md` §4, PR #526). Aceite = A; rejeite indicando B ou C (C vira proposta separada à dona da engine).
