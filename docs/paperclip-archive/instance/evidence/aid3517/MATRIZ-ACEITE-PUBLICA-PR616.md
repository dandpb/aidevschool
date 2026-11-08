# AID-3517 — Matriz executável de aceite da superfície pública do PR #616 (escola unificada)

**Dono:** QA Lead · **Data:** 2026-09-30 · **Estado: EXECUTADA (1x) — VERDE com 1 falha esperada (AID-3532, P3 não-bloqueante)**

## Registro da execução única (2026-09-30 ~21:42Z)

- **Deploy alvo:** `6abd7fcb784e28733ac75eaf` (alias prod), pin `d9dbdd5c`, source `e95611da` — receipt FPE `8bb39e04` (AID-3453, 21:33Z); desbloqueio `4af9d14e` (AID-3517, 21:40Z).
- **Comando:** `cd /paperclip/aid3517-evidence && PUBLIC_BASE_URL=https://aidevschool-literacydojo.netlify.app EVID_DIR=.../run-public ./node_modules/.bin/playwright test --config playwright.config.ts`
- **Resultado: 5/5 verde (exit 0), 0 skip, 9.4s** — B1+B3+B8 ✓ 2582ms · B2 ✓ 359ms · B4 ✓ 426ms · B5+B6+B7 ✓ 4526ms · **B9 ✘ esperado (AID-3532 confirmado AO VIVO: foco dropa para BODY)** 405ms.
- **Capturas reais (7 PNGs em `run-public/`)** + `results.json`; verificação mecânica `visual-mech-run.mjs`: todos substantivos (desktop 1280x1966/634 cores/83,8% não-branco; mobile 360x2891/563/70,0% — dimensões idênticas ao round local aceito).

---

**Estado anterior: PREPARADA — execução única pendente de publicação** (mantido abaixo como histórico).

- **Lineage do PR #616:** merge `d9dbdd5c` (porta única `scripts/merge_pr.sh`, 2026-09-30T20:54:18Z) do head `e95611da` — verificado first-hand via GitHub API.
- **Alvo público:** `https://aidevschool-literacydojo.netlify.app/escola/` (hospedagem existente, `docs/serving/README.md`).
- **Estado do alvo agora (probe 2026-09-30 ~21:0xZ):** `/escola/` devolve **200 com o shell SPA da raiz** (`id="root"` presente, título da escola ausente; `/escola/escola.js` → `text/html` 1854 B) → **PR #616 ainda NÃO está publicado**. Consistente com o bloqueio de deploy `NETLIFY_AUTH_TOKEN` (AID-3453, comentário `a631ebec` 20:55Z). Merge no GitHub **não** gera deploy (política Opção A).

## Parte A — já aceita por evidência existente no head `e95611da` (NÃO re-executar)

Receipts: rodada formal QA (comentário AID-3453 `6cd46e67` 18:45Z, **GO com limitação nomeada**), aceite visual independente limitado (`35cf0178` 18:46Z), countersign canônico QA Approved (`1e777242` 18:52Z), fechamento limitado (`ab7f5824` 19:00Z). Artefatos: `/paperclip/aid3453-evidence/qa-e95611da-2026-09-30/` (VEREDITO.md + 9 PNGs) — gates: lint 110 arquivos/0 erros · vitest 260 pass + 1 skip · build OK (dist `escola/` 5 arquivos, `sw.js` CACHE v5) · e2e 28/28 · driver independente 7/7.

| # | Caso | Resultado esperado | Evidência reutilizada (receipt) |
| --- | --- | --- | --- |
| A1 | Entrada `/escola/` renderiza missão + 2 jornadas + ponte Dev pelo module JS | heading "Fundamentos de IA", canvas `#world`, cards `#jornada-*` | driver QA item 1 (`6cd46e67`); e2e `escola-entry` 4x no 28/28 |
| A2 | CTA principal same-origin | `#start-fundamentals` href `/` | driver QA item 1 (`6cd46e67`) |
| A3 | Jornada não-programador: CTA → onboarding 5 etapas → l02 (Mapa Inicial) 3 atividades → "Lição concluída" | feedback determinístico por conteúdo | driver QA item 2 (`6cd46e67`); pwa 5/5 |
| A4 | Progresso no dispositivo + retomada | IndexedDB `literacydojo/progress/learner-progress` com `l02=completed`; reload mesma origem → home + `currentLessonId` estável | driver QA item 3 (`6cd46e67`) |
| A5 | Assets diretos + fallback SPA da raiz preservado | `/escola/escola.css` 200 text/css, `/escola/escola.js` 200; rota desconhecida → 200 com `/assets/` | driver QA item 4 (`6cd46e67`) |
| A6 | Sem overflow horizontal | scrollWidth ≤ clientWidth em 360x740 e 1280x800 | driver QA item 5 (`6cd46e67`) |
| A7 | Retornante offline (SW): `/escola/?utm_source=test` renderiza; raiz offline mantém progresso | CACHE v5, chave por pathname | driver QA item 6 (`6cd46e67`); regressão F1/fc1d79fb |
| A8 | Read-only/anti-escopo | sem `/api/`, fetch, storage, admin no público | driver QA item 7 + honesty unit 10 testes (`6cd46e67`) |
| A9 | Teclado — **lacuna identificada**: a rodada aceita NÃO tinha verificação mecânica de teclado da entrada (só copy "tudo funciona por teclado" e dialog nativo) | — | **coberto agora na Parte B** (B4/B9); achado → AID-3532 |

## Parte B — execução ÚNICA pós-publicação (nova evidência; driver novo, autocontido)

Driver: `/paperclip/aid3517-evidence/public-escola-acceptance.spec.ts` + `playwright.config.ts` (retries 0, workers 1). Comando:

```bash
cd /paperclip/aid3517-evidence && \
PUBLIC_BASE_URL=https://aidevschool-literacydojo.netlify.app \
EVID_DIR=/paperclip/aid3517-evidence/run-public \
./node_modules/.bin/playwright test --config playwright.config.ts
```

**Validação do driver (tooling): 5/5 verde em 2026-09-30 contra build local do merge `d9dbdd5c`** (worktree detach, `vite build`+`preview` :4181; resultados e PNGs em `toolcheck/`). Isso é validação da ferramenta, não re-verificação do head — nada aqui substitui os receipts da Parte A. Nota: `node_modules` do diretório é symlink para `engines/literacyDojo/node_modules` do repo (Playwright 1.62 + Chromium em cache); browsers em `~/.cache/ms-playwright`.

| # | Caso | Resultado esperado (critério de aceite público) |
| --- | --- | --- |
| B1 | Entrada publicada como arquivo real (anti-falso-verde, UPTIME #7) | `/escola/` 200 contendo título "AI DevSchool — uma escola, duas jornadas" e **NÃO** contendo `id="root"` nem "LiteracyDojo — IA com confiança"; variante `?utm_source=test` idem |
| B2 | Jornadas dos dois públicos na entrada | `#jornada-cotidiano` + `#jornada-dev` visíveis com CTA href `/`; ponte Dev (details) lista l15/l16/l27/l29 como **destino** com copy "prévia"; labs opcionais cross-origin com `rel="noopener"` |
| B3 | Assets públicos reais (UPTIME #8) | `escola.css` 200 text/css com `.mission-panel`; `escola.js` 200 com `start-fundamentals`; `entry-contract.js` 200 com `SCHOOL_ENTRY`; `sw.js` 200 com v5 |
| B4 | Navegação por teclado (nova cobertura) | skip link é 1º parado e Enter foca `#etapa-atual`; dialog abre por Enter, prende foco, Escape fecha; mapa em texto expande por Enter; `#motion-btn` alterna `aria-pressed`; CTA alcançável só por Tab (contado) |
| B5 | Jornada pública completa a partir da entrada | CTA `/` → onboarding → l02 3 atividades certas → "Lição concluída" (conteúdo pinado do lineage: out-b + c-fontes/c-limites; opt-verifica-na-fonte; ordem do fluxo) |
| B6 | Progresso/retomada no público | IndexedDB `l02=completed` + reload → home com progresso e `currentLessonId` estável |
| B7 | Respostas a erro (retornante offline) | CACHE v5; offline `/escola/?utm_source=test` renderiza; raiz offline = shell com progresso vivo; rota desconhecida online → fallback SPA 200 `/assets/` |
| B8 | Read-only + overflow público | nenhuma requisição `/api/`/POST/cross-origin na entrada; `localStorage` vazio; sem overflow 360/1280 |
| B9 | Foco na jornada via mapa em texto | **DEFEITO CONHECIDO AID-3532 (P3, não-bloqueante)** — esperado FALHAR neste lineage (`test.fail` marcado); se passar, o defeito foi corrigido no caminho |

**Veredito da execução única:** verde em B1–B8 (+B9 falha esperada) = aceite público OK. Qualquer falha além de B9 = achado novo, triado na hora (produto × infraestrutura), child issue se defeito.

## Condição explícita de execução (registro, não tarefa do QA)

Executar **1x, somente quando FPE/PRE fornecerem a URL/build realmente publicada** (deploy do lineage `e95611da`/`d9dbdd5c` no alias, hoje bloqueado por `NETLIFY_AUTH_TOKEN` — onda de publicação em AID-3453, coordenação `59d0bf87`). O preflight de release (72 checks) é dos FPE/PRE e **não** é duplicado aqui; os checks UPTIME #7/#8 (armar pós-publicação) são do PRE — a Parte B executa a jornada de aceite, não o monitor.

## Limitações

- Driver roda em Chromium headless; inspeção visual humana dos PNGs de `run-public/` continua pendente no founder (padrão do GO limitado da Parte A).
- B5 pinia o conteúdo de l02 v4 (contentVersion 2026-09-10.2) do lineage; se a publicação veio de head diferente, falhar visivelmente — é aceite de superfície, não smoke neutro.
- Sem cobertura noscript/manual de leitor de tela nesta matriz (fora do escopo do PR #616; engine de acessibilidade tem suas suítes).
