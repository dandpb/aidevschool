# Plan (fast-path, retro): registro produtor fix XSS dojoToday numeric fields

> **RETROSPECTIVE RECORD** — bloco fast-path retroativo (AID-2201), no formato
> small-fix fast path (`docs/sdlc/README.md` §Mapping). O plano que a casa
> deveria ter registrado antes do merge do PR #460; a execução do fix já
> ocorreu (merge CEO `58098bb5`, 2026-09-16T20:35:27Z) e as evidências estão
> citadas no `intent.md` deste change. Este change em si é docs-only.

Change-id: AID-2201-dojoToday-xss-sentinel · From: PR #460 (Sentinel/Jules) + AID-2201 · Status: approved (retro; fix vereditado VÁLIDO first-hand)

## Files that change

- **Pelo PR #460 (já mesclado; +9/−6):** `engines/dojoToday/src/main.ts` —
  `streakCard`: `escapeHtml` em `s.current`/`s.longest`/`s.freezesMax` (attr
  `title`) + coerção `Number(...)||0` em `freezesEquipped`/`freezesMax` para
  `.repeat()`; `progressCard`: `escapeHtml` em `s.masteredCount`/`s.totalUnits`
  e `pct` (style width) + coerção `Number()` na razão do percentual.
- **Por este change (AID-2201, docs-only, novo):**
  `intent/AID-2201-dojoToday-xss-sentinel/intent.md` e este `plan.md`.

## Order of work

1. Veredito first-hand (executado): controle negativo @ `fb4dbc77` (worktree
   dedicada, fixture hostil via seam `DOJOTODAY_TODAY_MODULE`) → execução
   confirmada; probe pós-fix @ `58098bb5` → inert/escapado; checks estáticos
   (selfcheck/biome/tsc/vite build) verdes; CI head/merge conferidos via API.
2. Registro retroativo do produtor (este change): `intent/` + downgrade de
   readiness NÃO feito à mão (README é gerado) — roteado a issue filha.
3. Follow-ups como issues filhas de AID-2201: (a) guarda de mutação
   numeric-fields em `engines/dojoToday/playwright/` (critério: remover
   `escapeHtml` quebra a guarda; precedente `hosted-os.spec.ts` do PR #264;
   fixture hostil pela seam; countersign QA/fresh-context obrigatório);
   (b) downgrade+re-grant `dojotoday-daily-guidance` via pipeline canônico com
   avaliação independente (precedente v28
   `2026-09-04-289cdbd-dojotoday-xsschain-regrant-v28.yaml`), bloqueada por (a).
4. Merge deste change docs-only: aceitação registrada (founder merge OU
   countersign QA + merge single-writer CEO citando o countersign).

## Risks

- Fix incompleto para a classe? Não encontrado: varredura first-hand das
  interpolações restantes em `main.ts` (só literais/índice de loop); risco
  residual = sinks análogos em outras engines (fora do escopo, não alegado).
- Veredito pós-merge enfraquecer o gate? Mitigado: desvio registrado como
  recorrência AID-767/F1, não normalizado; roteiro §External-origin PRs segue
  exigindo registro pré-merge para os próximos.
- Readiness stale sem downgrade deixar claims desonestos? Mitigado: issue
  filha (b) com pipeline canônico; README gerado não é editado à mão.

## Proof

- Pré-fix @ `fb4dbc77` (worktree `/tmp`, FPE 2026-09-16):
  `DOJOTODAY_TODAY_MODULE=./playwright/fixtures/today.hostile-xss-probe.ts
  npx playwright test hostile-xss-probe.temp.spec.ts` →
  `XSS FLAGS: {"mastered":1}`, `INJECTED onmouseover: "window.__xssTitle=1)"`
  (execução XSS confirmada).
- Pós-fix @ `58098bb5` (`_default`): mesmo comando → `XSS FLAGS: {}`,
  `PAGEERRORS: []`, `INJECTED onmouseover: null`, payloads visíveis como texto
  literal — `1 passed`.
- Estáticos @ `58098bb5`: `npm run selfcheck` → OK; `npx biome check src tools
  playwright playwright.config.ts` → 16 files, 0 erros; `npx tsc --noEmit` →
  limpo; `npx vite build` → built em 167ms.
- CI (GitHub API): head `39f283be` 38 success + 1 skipped (incl.
  `SDLC guardrails (diff)`); merge `58098bb5` idem exceto
  `product readiness (claims)` failure (dojotoday stale = decorrência do
  diff; pixelquest stale pré-existente @ `fb4dbc77`).
- Probes temporários (fixture+spec) deletados do `_default` pós-veredito;
  worktree `/tmp` removida — versão durável da guarda = issue filha (a).

## Verification split

Verificador independente: CEO/founder para o merge deste change docs-only
(aceitação registrada); issues filhas (a) exige countersign QA/fresh-context
para a guarda de mutação (produtor FPE ≠ verificador), (b) exige assessor
independente de readiness (pipeline canônico).
