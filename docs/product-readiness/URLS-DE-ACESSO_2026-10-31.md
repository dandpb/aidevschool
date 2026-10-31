# URLs de acesso das engines — diretório verificado (2026-10-31)

> **Proveniência:** AID-5954 (Docs & Readiness Engineer), pergunta do founder: "Me traga as urls
> de acessos de todas as engines … qual são os fluxos jah prontos pra uso?".
> **Verificado em:** 2026-10-31 ~17:00–17:05 UTC (checagens ao vivo `curl` + inspeção do bundle
> público + matriz de readiness gerada). Cada claim cita fonte. Este doc **não** concede tier de
> readiness — tiers vivem só na matriz gerada (`README.md`, fontes canônicas `inventory.yaml` +
> `assessments/`); URL viva ≠ fluxo pronto.

---

## 1. URLs públicas (verificadas ao vivo em 2026-10-31, todas HTTP 200)

| # | Superfície (engine) | URL | Título observado (2026-10-31) | Claim de readiness? |
|---|---|---|---|---|
| 1 | LiteracyDojo (app de lições) | `https://aidevschool-literacydojo.netlify.app/` | "LiteracyDojo — IA com confiança no trabalho" | Sim — 2 use cases `pass` customer-ready (matriz 2026-10-20) |
| 2 | Escola (entrada estática) | `https://aidevschool-literacydojo.netlify.app/escola/` | "AI DevSchool — uma escola, duas jornadas" | Coberta pelos guias (`ESCOLA-GUIA-OPERACIONAL_2026-09-30.md` §7); monitors #7–8 seguem desarmados (`docs/serving/UPTIME-MONITOR-SETUP.md:32-33`) |
| 3 | codexDojo OS (host de missões) | `https://aidevschool-codexdojo-os.netlify.app/` | "codexDojo OS" | Sim — 3 use cases `pass` customer-ready (matriz 2026-10-20) |
| 4 | dojoToday | `https://aidevschool-dojotoday.netlify.app/` | "dojoToday — sua lição de hoje" | Sim — `pass` customer-ready (matriz 2026-10-20) |
| 5 | voxelDojo — jogo 02 "Armazém KV" | `https://aidevschool-voxel-warehouse.netlify.app/` | "Armazém KV — voxelDojo jogo 02" | Sim — `voxel-standalone-learning-loop` `pass` customer-ready (matriz 2026-10-20); URL também em `inventory.yaml` (route de `voxel-standalone-learning-loop`) |
| 6 | miniTown | `https://aidevschool-minitown.netlify.app/` | "MiniTown — Engine Skeleton" | **Sem claim para esta URL**: matriz tem `minitown-explore-only` `pass` **experimental**, mas a route canônica do use case é "miniTown local route" (`inventory.yaml`) — a evidência promovida foi local, não neste deploy |
| 7 | pixelDojo (PixelQuest) | `https://aidevschool-pixelquest.netlify.app/` | (200; app PixelQuest) | **Sem claim para esta URL**: `pixelquest-evidence-encounter` é `pass` customer-ready, mas a route canônica é "PixelQuest local app" (`inventory.yaml`) — evidência promovida local |
| 8 | codexDojo (engine contribuidor) | `https://aidevschool-codexdojo.netlify.app/` | "codexDojo" | **Nenhum use case** no `inventory.yaml` cobre esta superfície — URL viva sem claim |
| 9 | SDLC Quest (beta) | `https://aidevschool-sdlcquest.netlify.app/` | "SDLC Quest v1.3 — Laboratório de execução" | **Nenhum use case** no `inventory.yaml`; beta documentado como referência em `scripts/deploy/sdlc-quest-beta/README.md:3` (beta, `noindex`) |

Não publicadas (sem URL pública): school-entry (superfície Node de operador, local
`127.0.0.1:5185`, `engines/school-entry/README.md:40`), zai-duolingo-like (local `next dev -p
3000`), aiDevschoolMvp (chat-tutor via `SKILL.md`, sem web), minimaxDojo e
miniMaxEvolutionEngine (orchestration de agentes, sem web), openclaw (checklist runner, sem web),
shared (biblioteca). Engines com dev local além das publicadas: codexDojo/pixelDojo/voxelDojo/
miniTown (`127.0.0.1:5173`), dojoToday (`localhost:5180`), sdlc-quest (`127.0.0.1:8080`/`8081`).

## 2. Fluxos prontos pra uso (matriz de readiness — decisão por evidência, não por URL)

Fonte: matriz gerada em `README.md` (regenerada 2026-10-20; todas com revalidação até
**2026-11-19**). **9/9 use cases `pass`**, sendo **8 customer-ready + 1 experimental**:

| Fluxo (use case) | Superfície | Tier concedido | Verificado em |
|---|---|---|---|
| `literacy-standalone-first-lesson` | LiteracyDojo | customer-ready | 2026-10-20T16:26:36Z |
| `literacy-standalone-corridor-mod01-03` (módulos 1–3, 11 lições) | LiteracyDojo | customer-ready | 2026-10-20T16:26:36Z |
| `os-literacy-guided-mission` | codexDojo OS | customer-ready | 2026-10-20T16:26:36Z |
| `os-voxel-guided-missions` | codexDojo OS | customer-ready | 2026-10-20T15:45:31Z |
| `os-returning-learner` | codexDojo OS | customer-ready | 2026-10-20T15:45:31Z |
| `dojotoday-daily-guidance` | dojoToday | customer-ready | 2026-10-20T15:45:31Z |
| `pixelquest-evidence-encounter` | PixelQuest | customer-ready | 2026-10-20T04:31:24Z |
| `voxel-standalone-learning-loop` | voxelDojo | customer-ready | 2026-10-20T04:31:24Z |
| `minitown-explore-only` (só exploração) | miniTown | **experimental** | 2026-10-20T04:31:24Z |

Jornada Dev (opt-in, dentro do LiteracyDojo público): o bundle publicado **contém** as lições
`l15`–`l29` do módulo 05 (ex.: `l15` "Quando usar IA e quando não usar", version 3 — grep no
`/assets/index-Bwc9mvgZ.js` em 2026-10-31: `"l15"`×4, `l21/l22/l27/l28/l29` presentes), mas
**não contém** `l33`–`l35` (grep: 0 ocorrências) — a W2 dev landing (AID-5046, `37ed8717`) está
no `main` (`curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l33…l35.yaml` existem) e
**ainda não está no deploy público**. Estado: **Dev journey pública = 9 de 12 lições**; prod
atrás do main.

## 3. Lacunas reportadas (docs não maquiam produto)

1. **`docs/serving/README.md` desatualizado:** declara "Superfícies em produção (2)" (§Superfícies)
   mas há **9 URLs públicas vivas** verificadas em 2026-10-31 — single source of truth em drift.
   Dono do documento: FPE (serving/promoção).
2. **URLs vivas sem rastreio no repo:** `aidevschool-minitown`, `aidevschool-pixelquest` e
   `aidevschool-codexdojo` não aparecem em nenhum doc/yaml do repo (grep 2026-10-31: 0 arquivos).
3. **Routes canônicas stale no `inventory.yaml`:** os use cases de OS ("static pilot"),
   PixelQuest ("local app") e miniTown ("local route") não apontam as URLs públicas que já
   existem; os claims promovidos desses 3 use cases foram verificados em build local — **não há
   evidence binding entre o deploy público e o pin verificado** (mudança de route/inventory é
   decisão do dono da engine + QA, não do docs).
4. **Monitoramento cobre só 2 superfícies:** `UPTIME-MONITOR-SETUP.md` arma checks apenas para
   literacy + codexdojo-os (+`/escola/`); as demais 6 URLs públicas não têm monitor (owner FPE).
5. **Prod atrás do main no LiteracyDojo:** `l33`–`l35` (W2 dev landing) mergeadas ao `main`
   (`37ed8717`, AID-5046) mas ausentes do bundle público — promoção é papel do FPE pelo
   `docs/serving/PROMOTION-RUNBOOK.md`.

## Fontes (data + caminho)

- Checagens ao vivo (curl, 2026-10-31 ~17:00–17:05 UTC): HTTP 200 + `<title>` de cada URL da §1;
  bundle LiteracyDojo `/assets/index-Bwc9mvgZ.js` (presença `l15`–`l29`, ausência `l33`–`l35`).
- Matriz de readiness: `docs/product-readiness/README.md` (gerada; `verified at` 2026-10-20,
  `revalidate by` 2026-11-19) a partir de `inventory.yaml` + `assessments/2026-10-19…2026-10-20-*.yaml`.
- Rotas canônicas: `docs/product-readiness/inventory.yaml` (9 use cases).
- Local/portas: `engines/codexDojo/README.md` (5173), `engines/dojoToday/README.md` (5180),
  `engines/sdlc-quest/README.md` (8080/8081), `engines/school-entry/README.md` (5185),
  `engines/zai-duolingo-like/package.json` (`next dev -p 3000`).
- Serving/produção: `docs/serving/README.md` (§Superfícies), `docs/serving/UPTIME-MONITOR-SETUP.md:26-33`,
  `scripts/deploy/sdlc-quest-beta/README.md:3`.
- Dev journey: `docs/product-readiness/JORNADA-DEV-QUICKSTART_2026-10-01.md` (histórico: PR #638
  era não-publicado em 2026-10-01 — **superado**: merge `5646dde7` e bundle público atual contêm
  `l15`–`l29`); W2 `37ed8717` (l33–l35) só no `main`.

*Docs reportam lacuna, não maquiam. Publicação/promoção de URL é papel do FPE; claims de
readiness são do fluxo `inventory.yaml`→assessments→matriz, nunca deste diretório.*
