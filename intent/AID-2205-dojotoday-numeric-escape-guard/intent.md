# Intent: guarda de mutação numeric-fields dojoToday (PR #460 follow-up, AID-2205)

Author: FPE (agente fa8130d5) · Change-id: AID-2205-dojotoday-numeric-escape-guard ·
Parent: AID-2201 (triagem PR #460) · Date: 2026-09-16 · Status: producer-side complete,
countersign QA pendente (producer ≠ verifier)

## Problem

O PR #460 (merge `58098bb5`, veredito first-hand VÁLIDO em AID-2201) adicionou
`escapeHtml` aos campos numéricos de `streakCard`/`progressCard` em
`engines/dojoToday/src/main.ts`, mas **não deixou guarda automatizada**. Na
cadeia #262/#264 do mesmo engine, a guarda foi follow-up obrigatório
(`hosted-os.spec.ts`, PR #264): correção de escape sem guarda de mutação
regride em CI silenciosamente. O re-grant de readiness
`dojotoday-daily-guidance` está deliberadamente retido até esta guarda pousar
(downgrade v89 @ `58098bb5`, ver `docs/product-readiness/README.md`).

## Change

- `engines/dojoToday/playwright/numeric-fields-escape.spec.ts` — guarda e2e:
  payload hostil em campos numericamente tipados renderiza como texto literal
  escapado; zero `pageerror`; nenhum handler injetado
  (`getAttribute('onmouseover') === null` em `.streak-freezes`);
  branch-gating documentado e assertado (`current` hostil → string →
  `NaN > 0` = false → headline fallback "Quebre o gelo hoje");
  `masteredCount` hostil não executa (`window.__xssMastered` indefinido) nem
  cria elemento (`img` count 0); `longest` hostil com streak acesa vira texto
  literal, não elemento `<script>`.
- `engines/dojoToday/playwright/fixtures/today.numeric-hostile.ts` (porta 5183)
  e `.../today.numeric-hostile-record.ts` (porta 5184) — projeções hostis
  permanentes via seam `DOJOTODAY_TODAY_MODULE` (alias `./data/today`,
  `vite.config.ts`); o read model canônico `src/data/today.ts` segue intocado.
  Fixtures TRACKED (não são probes temporários de triagem).
- `engines/dojoToday/playwright.config.ts` — dois dev servers extra (5183/5184).

## Mutation criterion (obrigatório) — evidência first-hand desta sessão

Worktree dedicada (`git worktree add --detach /tmp/opencode/aid2205-mut`,
removida após os runs), base = commit desta guarda. Runs
(`npx playwright test numeric-fields-escape.spec.ts`):

| Mutação em `src/main.ts` | Resultado esperado | Resultado real |
| --- | --- | --- |
| M0 sem mutação | 2 passed | 2 passed ✅ |
| M1 revert integral do diff #460 (`git checkout fb4dbc77 -- src/main.ts`) | spec FALHA | 2 failed ✅ (onmouseover injetado no title via `freezesMax`; `<img onerror>` via `masteredCount`) |
| M2 remover só `escapeHtml(s.longest)` | spec FALHA | 1 failed ✅ (`.streak-sub` vira elemento script, texto literal some) |
| M3 remover só `escapeHtml(s.freezesMax)` | spec FALHA | 1 failed ✅ (handler `onmouseover` real no atributo title) |
| M4 remover só `escapeHtml(s.masteredCount)` | spec FALHA | 1 failed ✅ |
| M5 remover só `escapeHtml(s.totalUnits)` | spec FALHA | 1 failed ✅ (após fixture v2: payload com tag; v1 sem `<` era irobservável em posição de conteúdo) |
| M6 remover só coerções `Number(...)\|\|0` | PASS documentado | 2 passed — `String.repeat` coerje NaN→+0 (ToIntegerOrInfinity) e `NaN > 0` gateia o branch dos dois lados; sem efeito comportamental observável |
| M7 remover só `escapeHtml(s.current)` | PASS documentado | 2 passed — branch-gated: `current` hostil é string → `NaN > 0` = false → fallback; o payload nunca renderiza (assertado como branch-gating na própria spec) |
| M8 remover só `escapeHtml(pct)` | PASS documentado | 2 passed — `pct` é saída de `Math.round`, sempre numérico |

M6/M7/M8 são defesa em profundidade sem mutants observáveis individuais
(dominância comportamental do branch/typeof); a remoção **combinada** (M1) é
pega. Isto é declarado, não omitido — nenhum claim de cobertura além do
executado. Controle negativo pré-fix independente já existia first-hand
(`__xssMastered=1` @ `fb4dbc77`, sessão AID-2201, PR #463).

## Gates

`npm run selfcheck` ✅ · `npm run lint` ✅ (19 files) · `npm run build` ✅
(tsc --noEmit + vite build; prebuild substrate regenerou idêntico — sem churn
em `src/data/today.ts`) · `npm run test:readiness` ✅ **25 passed** (23
pré-existentes + 2 novos) · CI no head do PR (incl. `SDLC guardrails (diff)` e
`dojoToday (TS + substrate)`) citado no recibo da issue.

## Constraints

- Producer ≠ verifier: merge do PR só com **countersign independente**
  (QA Lead/fresh-context re-executando o critério de mutação de forma
  independente) + aceitação registrada per AID-1136; registro neste
  `intent/` + recibo AID-1516 na issue AID-2205.
- Sem mudança de boundary: dojoToday segue read-only, não escreve learner
  state, não marca mastered; fixtures violam tipos numéricos de propósito,
  confinadas a `playwright/fixtures/`.

## Links

AID-2201 (parent, triagem) · PR #460 (fix, merge `58098bb5`) · PR #463
(registro retroativo AID-2201) · PR #264 + `hosted-os.spec.ts` (precedente da
guarda na cadeia #262) · downgrade readiness v89 (re-grant retido até esta
guarda).
