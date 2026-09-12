# AID-288 — QA independente do candidato reconciliado `afd6789` (AID-263) e GO/NO-GO de promoção

**Veredito: GO para as 4 superfícies do piloto (warehouse, wormhole, relay-station, pixel-quest) na revisão `afd6789e` — F1 (P1, AID-268) e F2 (P2, AID-268) não reproduzem; design P0 (AID-263) verificado; zero regressões de jogabilidade/evidência.**

QA: ca6a3f95 (independente; produtor fa8130d5 não aprova a própria mudança — respeitado).
Data: 2026-08-28. Candidato: branch `aid-275/hud-min-width-reconciled` @ `afd6789e` = `ec265fa → 345d2bf (design P0) → 687df55 (aria-atomic) → 5818bb3 (F2 attempt_id, GO AID-277) → afd6789 (F1: min-width:0 em #stage)`. Cadeia conferida por `git log` (5818bb3 é ancestral).

## Ambiente

- Worktree QA dedicado e detached em `/paperclip/tmp/aid288/wt` (`git worktree add --detach afd6789e`); repositório compartilhado não mutado (apenas este diretório não-rastreado adicionado); estado canônico do learner não tocado.
- node v24.18.0, pnpm 9.15.9, vitest 2.1.9 / 4.1.10, Playwright 1.61.1 (chromium headless), Linux.
- Portas de servidor dedicadas (62xx/63xx) porque outro run ocupa 520x; configs playwright próprias fora do repo (sem editar fonte).

## Provenância (C1)

- Diff `ec265fa → afd6789e`: 22 arquivos — 21 sob `engines/` (voxelDojo 02/03/05, pixelDojo styles, shared/teaching-evidence) + `docs/design/teaching-game-contract.md`. Zero toques em `curriculum/`, `learner/`, `.mavis/`.
- `min-width: 0` presente em `#stage` (warehouse/wormhole index.html); envelope `attempt_id` opcional com validação non-empty string (`evidenceEnvelope.ts`).

## Matriz AID-31 §6 no `afd6789` (executada)

| # | Critério | warehouse | wormhole | relay-station | pixel-quest |
|---|---|---|---|---|---|
| 1 | `lang=pt-BR`; HUD sem inglês | PASS | PASS | PASS | PASS (lang, AID-268) |
| 2 | reduced-motion: animação/transição desligadas | PASS (none/0s) | PASS | PASS | PASS (CSS, AID-268 + suite) |
| 3 | status anunciável 1×, sem roubar foco | PASS estrutural¹ (role=status, live=polite, **aria-atomic=true** — novo em 687df55) | PASS estrutural¹ | PASS estrutural¹ | n/a |
| 4 | botões HUD ≥44×44 computados | PASS (0 violações) | PASS | PASS | n/a |
| 5 | 320/768/854/1280 sem overflow/perda | **PASS (F1 fechado)** | **PASS (F1 fechado)** | PASS | n/a |
| 6 | Contraste WCAG AA nos tokens `--vd-*` | PASS (10/10) | PASS (10/10) | PASS (10/10) | n/a |
| 7 | Jogabilidade + evidência preservadas | PASS (smoke 3/3; vitest 20/20; `attempt_id` runtime ✓) | PASS (smoke 3/3; 18/18) | PASS (smoke 3/3; 21/21) | PASS (smoke 1/1; 113/113; lint/tsc/build) |

### F1 (P1, bloqueava warehouse/wormhole no AID-268) — NÃO REPRODUZ

- Standalone (vite dev, build do candidato): HUD 340px (warehouse/relay) e 360px (wormhole) estáveis em 768/854/1280; `scrollWidth == innerWidth` em todas; 320px empilhado (`flex-direction: column`) sem scroll horizontal. Baseline AID-268: `hudW 33`, `scrollW 1313@1280`.
- **Geometria de host**: iframe 854×600 (mesma geometria da missão do OS onde F1 foi reproduzido) embutindo os `dist` construídos — `scrollW == 854`, botões do HUD integralmente dentro da viewport (`btnRight ≤ 802 < 854`) nos 3 jogos (`qa/iframe-854-results.txt`).
- Evidência: `qa/results.json` + screenshots 320/1280 por jogo; scripts reexecutáveis.

### F2 (P2, warehouse vitest 2/20) — NÃO REPRODUZ (fechado por AID-274/277, re-verificado aqui)

- `pnpm --filter game-02-warehouse exec vitest run`: **20/20** (era 18/20 no baseline `ec265fa`).
- Catalog-wide: `pnpm -r --filter './game-*' exec vitest run` → **exit 0, 16/16 pacotes, 319 testes, 0 falhas** (`catalog-vitest.log`).
- **Runtime em browser** (além do unit): drive real do warehouse (cliques nos shelves via hook público) → linha `EVIDENCE` do console contém `attempt_id: "kv-warehouse-L1-attempt-1"` e `window.__voxelDojoEvidence.length == 1`; HUD em PT-BR ("Missão concluída; evidência emitida.") (`qa/f2-runtime-warehouse.json`).

## Regressão (C5)

- voxelDojo: `pnpm run lint` ✓ (205 arquivos), `typecheck` ✓ (16/16 jogos), `build` ✓ exit 0; smoke Playwright **3/3 em cada um dos 3 jogos do piloto** (9/9 specs, `smokes.log`).
- pixelDojo: `test` 113/113 ✓, `lint` ✓ (59 arquivos), `typecheck` ✓, `build` ✓, `smoke` 1/1 ✓.

## Limitações declaradas

1. Leitor de tela real (NVDA/VoiceOver) indisponível no Linux headless — item 3 é evidência estrutural (1 região live por HUD, texto substituído por render, foco estável), igual ao AID-268; AID-264 permanece a fatia de verificação independente pendente.
2. Prova de host usou iframe local 854px com os dist construídos (candidato não está deployado); o host OS real deve ser verificado pós-promoção no fluxo AID-253/254 (padrão AID-270).
3. Zoom 400% aproximado por viewport 320px.
4. Build não conferido byte-a-byte contra artefato de deploy (inexistente ainda); identidade de release segue pelo pin da revisão + manifesto do deploy, a verificar na promoção.

## Comandos-chave (reprodutíveis)

```bash
git -C <repo> worktree add --detach /paperclip/tmp/aid288/wt afd6789e
cd /paperclip/tmp/aid288/wt/engines/voxelDojo && pnpm install
pnpm --filter game-02-warehouse exec vitest run            # 20/20
pnpm -r --filter './game-*' exec vitest run                # exit 0, 319 testes
pnpm run lint && pnpm run typecheck && pnpm run build      # 205 / 16 / exit 0
node /paperclip/tmp/aid288/qa-proof.mjs                    # F1+design 3/3 PASS
node /paperclip/tmp/aid288/f2-runtime-proof.mjs            # attempt_id runtime PASS
node /paperclip/tmp/aid288/contrast-proof.mjs              # AA 30/30 PASS
node /paperclip/tmp/aid288/iframe-proof.mjs                # iframe 854 ok
cd ../pixelDojo && pnpm run test && pnpm run lint && pnpm run typecheck && pnpm run build && pnpm run smoke
```

## Artefatos (este diretório)

`qa/` (results.json, contrast-results.json, f2-runtime-warehouse.json, iframe-854-results.txt, screenshots 320/1280), `scripts/` (os 4 probes + 3 configs playwright com portas 62xx), `catalog-vitest.log`, `smokes.log`.

## Disposição

- **GO à promoção das 4 superfícies na revisão `afd6789e`** (warehouse e wormhole desbloqueados; relay/pixel-quest re-confirmados), condicionado ao fluxo padrão AID-253/254: pin → deploy → verificação independente do artefato promovido (padrão AID-270) — promoção em si não foi executada por esta QA.
- Recomendação ao board: resolver a interação `8c3391f0` como `adopt-aid263` (a cadeia de defeitos convergiu na linha AID-263; a escolha tornou-se moot).
- Nota operacional (sem impacto nesta QA): checkout de AID-275 segue travado no run `39f4e30f` (sem disposição registrada) — dono do unblock: harness/CEO.
