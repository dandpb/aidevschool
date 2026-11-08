# QA AID-3453 — Rodada formal no head congelado `e95611da` (2026-09-30)

Veredito: **GO com limitação nomeada** (signoff visual mecânico; inspeção humana/visão pendente).

## Ambiente

- Worktree QA independente: `git worktree add --detach /tmp/opencode/qa3453 e95611da`
  (branch `aid3453/escola-static-entry`; árvore rastreada intocada; worktree do produtor não usado).
- node_modules symlink do checkout principal (package-lock.json idêntico verificado por diff).
- Chromium Playwright local; screenshots e driver fora da árvore revisada (`/tmp/opencode/qa-driver`).
- Head confirmado first-hand: `e95611da670e586dd9597edd3f50cf15d0163c81` (rev-parse).

## Gates (worktree /tmp/opencode/qa3453/engines/literacyDojo)

| Gate | Resultado |
| --- | --- |
| `npm run lint` (biome) | 110 arquivos, 0 erros |
| `npm test` (vitest, pretest gen:content) | 260 pass + 1 skip (34 files) |
| `npm run build` (tsc -b && vite build) | OK; dist com `escola/` (5 arquivos), `sw.js` (CACHE v5), `manifest.webmanifest`; warning chunk >500kB (não-bloqueante) |
| `npm run test:e2e` (playwright, dev 4173 + build/preview 4174) | **28/28** (incl. 4x `escola-entry` e 1x `pwa`) |

## Rodada independente (driver próprio `qa-independent.spec.ts`, preview do dist :4180)

1. `/escola/` renderiza missão+jornadas; `#start-fundamentals` href `/` (same-origin).
2. CTA → raiz `/` → onboarding 5 etapas → Mapa Inicial (`l02`) → 3 atividades → feedback **"Lição concluída"**.
3. Progresso IndexedDB (leitura própria, DB `literacydojo`/`learner-progress`): `lessonStatus.l02=completed`; reload mesma origem → `home-screen` + progresso intacto (`currentLessonId` igual).
4. Assets diretos: `/escola/escola.css` 200 (text/css), `/escola/escola.js` 200 (>1KB). Fallback SPA: `/rota-qa-inexistente` → 200 contendo `/assets/`.
5. Overflow horizontal: nenhum a 360x740 e 1280x800 (scrollWidth<=clientWidth).
6. Offline (retornante SW-controlado): `caches.keys()` contém **v5**; offline `/escola/?utm_source=test` renderiza (chave pathname); raiz offline = shell do app com progresso preservado (F1).
7. Anti-escopo: nenhum link admin//engines no `/escola/` público (grep no dist; único hit é comentário HTML documentando a remoção).

Resultado: **1/1 passou (3.7s)**.

## Signoff visual — MECÂNICO (limitação explícita)

9 screenshots em `/paperclip/aid3453-evidence/qa-e95611da-2026-09-30/`:

| # | arquivo | px | cores amostradas | não-branco |
| --- | --- | --- | --- | --- |
| 01 | escola-desktop | 1280x1966 | 636 | 83,8% |
| 02 | escola-mobile | 360x2891 | 566 | 70,0% |
| 03 | onboarding-desktop | 1280x800 | 687 | 86,6% |
| 04 | atividade-1-desktop | 1280x800 | 415 | 79,9% |
| 05 | resultado-feedback-desktop | 1280x800 | 633 | 66,9% |
| 06 | resultado-feedback-mobile | 360x740 | 510 | 76,9% |
| 07 | home-pos-reload-mobile | 360x740 | 503 | 83,5% |
| 08 | escola-query-offline-mobile | 360x740 | 220 | 100% |
| 09 | raiz-offline-progresso-mobile | 360x740 | 503 | 83,5% |

Todos substantivos (multi-cor, não-blank, dimensões de viewport corretas). **Limitação**: este agente
está sem input de imagem neste ambiente — inspeção visual humana/visão dos PNGs NÃO foi executada;
o founder deve inspecioná-los antes do merge. Nenhum claim de signoff visual além do mecânico.

## Comandos-chave

```bash
git -C /paperclip/repo worktree add --detach /tmp/opencode/qa3453 e95611da
cd /tmp/opencode/qa3453/engines/literacyDojo && npm run lint && npm test && npm run build && npm run test:e2e
npx playwright test --config /tmp/opencode/qa-driver/playwright.config.ts   # driver QA independente
node /tmp/opencode/qa-driver/visual-mech.mjs                                # análise mecânica dos PNGs
```
