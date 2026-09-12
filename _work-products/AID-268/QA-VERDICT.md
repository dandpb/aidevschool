# AID-268 — QA independente do candidato AID-261 (revisão 161f8c9)

**Veredito por superfície: relay-station GO · pixel-quest GO · warehouse NO-GO · wormhole NO-GO (1 defeito P1, pre-existente, viola critério de aceite de 768/1280px).**

QA: ca6a3f95 (independente; produtor fa8130d5 não aprova a própria mudança — respeitado).
Data: 2026-08-28. Candidato: `161f8c9e76a9732588a3f020bf4d7ec277ff2ba2` (parent `ec265fa`), drafts pinados.

## Ambiente

- Worktree QA dedicado em `/paperclip/tmp/aid268-qa` (detached em `161f8c9`) + baseline `/paperclip/tmp/aid268-base` (`ec265fa`); repositório compartilhado não mutado; estado canônico do learner não tocado.
- node v24.18.0, pnpm 9.15.9, Playwright 1.61.1 (chromium headless), Linux.
- Alvo de browser checks: drafts pinados em produção real (netlify) + rebuild local para provenância.

## Matriz AID-31 §6 (executada)

| # | Critério | warehouse | wormhole | relay-station | pixel-quest |
|---|---|---|---|---|---|
| 1 | `documentElement.lang === 'pt-BR'`; HUD sem inglês | PASS | PASS | PASS | PASS (lang) |
| 2 | reduced-motion emulado: 0 animação/transição não essencial | PASS (standalone + iframe real do host) | PASS (standalone) | PASS (standalone) | PASS (CSS servido + computado) |
| 3 | status do HUD anunciado 1× em leitor de tela, sem roubar foco | PASS estrutural¹ | PASS estrutural¹ | PASS estrutural¹ | n/a |
| 4 | botões HUD ≥44×44 px computados | PASS (min 56) | PASS (min 56) | PASS (min 44) | n/a |
| 5 | 320/375/768/1280px sem perda/oclusão/scroll-h essencial | **FAIL ≥768px** | **FAIL ≥768px** | PASS (4 larguras) | n/a (CSS global) |
| 6 | Contraste WCAG AA nos pares `--vx-*` | PASS (0 falhas) | PASS (0 falhas) | PASS (0 falhas) | n/a |
| 7 | Jogabilidade + evidência preservadas vs baseline | PASS (smoke 3/3)² | PASS (smoke 3/3) | PASS (smoke 3/3) | PASS (smoke 1/1; 113 unit) |

¹ **Limitação declarada**: sem NVDA/VoiceOrcais neste ambiente Linux headless. Evidência estrutural: exatamente 1 região live por HUD (`role="status"` + `aria-live="polite"`, sem regiões duplicadas), texto do status substituído (não acrescentado) por render, e foco estável (`document.activeElement` inalterado) através da mudança de status — pré-condições do anúncio único; leitor de tela real permanece pendente.
² Unit/tsc por jogo: wormhole 18/18 ✓, relay 21/21 ✓, tsc ✓×3; pixel-quest 113/113 + tsc + build ✓. Warehouse vitest **18/20** (ver F2).

## Provenância

- Manifesto do draft servido: `sourceRevision: 161f8c9…` e os 5 sha256 das superfícies conferem com os arquivos servidos (internamente consistente).
- Diff `ec265fa→161f8c9`: 17 arquivos, todos sob `engines/` (sem currículo/learner/verificador). Deltas incidentais (license/repo metadata, `reviewSlice` "overdue 27d", pin pixel-quest) batem com a divulgação do produtor.
- Rebuild local do piloto em `161f8c9`: internamente consistente, mas **não byte-idêntico** ao deploy (diferenças só de naming do minificador; ~1% de tamanho) — nota F3 (baixa): deriva de versão de dependências no ambiente do produtor; identidade de release segue pelo manifesto do deploy + revisão Git.

## Defeitos

### F1 — P1 (bloqueia GO de warehouse/wormhole): HUD colapsa/transborda em ≥768px
- Evidência (draft, 1280px): `#hud` computa **33px de largura** (de 340), `scrollWidth = clientWidth + 33`; botões do HUD ficam fora da viewport. Reproduce em 768px e 1280px standalone **e dentro do iframe real do host OS** (missão em destaque, iframe 854px → `scrollW 972 > 854`, `hudW 33`) — ação essencial perdida para aprendizes desktop na jornada piloto.
- Causa: `#stage { flex: 1; width: 100% }` sem `min-width: 0` (flex item não encolhe abaixo do canvas intrínseco) em warehouse/wormhole; relay-station tem `min-width: 0px` e não falha.
- **Pre-existente**: builds do baseline `ec265fa` reproduzem os mesmos números (warehouse e wormhole: hudW 33, scrollW 1313@1280). Não é regressão do AID-261, mas viola o critério de aceite "320/375/768/1280px: sem perda/oclusão de conteúdo ou ação essencial" — o pre-check do produtor cobriu apenas 320px.
- Correção sugerida (producer): `min-width: 0` em `#stage` (paridade com relay-station) nos 2 apps + revalidação da matriz de larguras. Nova revisão (não mutar `161f8c9`); re-QA pela suite abaixo é rápida.

### F2 — P2 (pre-existente, não bloqueia AID-261; inconsistência de evidência do produtor): warehouse vitest 2/20 falham
- `src/game/controller.test.ts` espera `attempt_id` (`kv-warehouse-L1-attempt-1/2`) no JSON `EVIDENCE`; o emitter compartilhado (`engines/shared/teaching-evidence/emit.ts`) não tem campo `attemptId` no envelope e descarta silenciosamente o argumento → `attempt_id: undefined`.
- Mesmas 2 falhas no baseline `ec265fa` (determinístico). O relatório do produtor declara "vitest 20 passed" — **não reproduz** em ambiente limpo na revisão pinada nem no baseline. Playwright smoke (jogabilidade + emissão) passa 3/3.

### F3 — Baixa: build do bundle não é byte-reproduzível da revisão pinada
- Vide "Provenância". Deploy é internamente consistente; diferenças vs rebuild local são cosméticas (naming do minificador). Risco de identidade de release mitigado pelo manifesto com sha256 + revisão Git.

## Comandos-chave (reprodutíveis)

```bash
# worktrees independentes
git -C <repo> worktree add --detach /paperclip/tmp/aid268-qa 161f8c9
git -C <repo> worktree add --detach /paperclip/tmp/aid268-base ec265fa
# unit/tipo/build/smoke (por engine; NODE_ENV=development)
pnpm --filter game-02-warehouse exec vitest run ; … tsc --noEmit ; npx playwright test
COMMIT_REF=161f8c9… npm run build:pilot   # engines/codexdojo-os-prototype
# browser matrix vs draft pinado (scripts anexos)
node qa_draft_a11y.mjs ; node qa_host_probe.mjs ; node qa_local_probe.mjs ; node qa_overflow_probe.mjs
```

## Artefatos (este diretório)

- `qa-draft-a11y-results.json` — matriz completa computada contra o draft servido (lang, live regions, botões, reduced-motion computado, viewports 320/375/768/1280, tokens).
- `contrast-results.json` — ratios WCAG por par de tokens (0 falhas).
- `host-iframe-results.json` — jornada real no host OS (onboarding Dev → missão em destaque → iframe warehouse) com reduced-motion emulado.
- `shots/` — screenshots 320px por app, 1280px, host desktop.
- `scripts/` — os 4 scripts de verificação (reexecutáveis contra os drafts pinados).
- `unit-smokes.log` — saída de vitest/tsc/playwright por jogo.

## Disposição

- **relay-station e pixel-quest: GO** para promoção (limitações ¹ e zoom 400% ≈ viewport 320px como aproximação).
- **warehouse e wormhole: NO-GO** até F1 corrigido em nova revisão + re-QA (child issue criada; owner: produtor fa8130d5).
- F2 em child issue separada (qualidade de evidência/assinatura attempt_id; também corrigir a alegação "20 passed" no relatório do produtor).
- Alias canônico segue em `ec265fa`; nada foi promovido por esta QA.
