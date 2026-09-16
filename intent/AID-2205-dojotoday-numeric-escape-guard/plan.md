# Plan (fast-path): guarda de mutação numeric-fields dojoToday (AID-2205)

Change-id: AID-2205-dojotoday-numeric-escape-guard · From: AID-2201 follow-up
(a) · Status: executed (producer-side); countersign QA pendente

## Files that change

- `engines/dojoToday/playwright/numeric-fields-escape.spec.ts` (novo) — guarda
  e2e dos escapes/coerções do PR #460.
- `engines/dojoToday/playwright/fixtures/today.numeric-hostile.ts` (novo,
  porta 5183) — current/freezesMax/masteredCount/totalUnits hostis.
- `engines/dojoToday/playwright/fixtures/today.numeric-hostile-record.ts`
  (novo, porta 5184) — streak acesa (current=3) com `longest` hostil, para
  cobrir isoladamente o `escapeHtml(s.longest)` no branch aceso.
- `engines/dojoToday/playwright.config.ts` — webServers 5183/5184 via seam
  `DOJOTODAY_TODAY_MODULE`.
- `intent/AID-2205-dojotoday-numeric-escape-guard/` — este registro.

Sem mudanças em `src/` (o fix do #460 fica intocado; a guarda apenas o
protege), sem readiness à mão, sem segredos.

## Order of work (executado)

1. Spec + fixtures + config; gates engine verdes (`selfcheck`, `lint`,
   `build`, `test:readiness` 25 passed).
2. Critério de mutação em worktree dedicada `--detach` (M0–M8, tabela no
   `intent.md`): revert integral + remoções isoladas observáveis quebram a
   spec; M6/M7/M8 documentados como sem mutant observável (dominância de
   branch/typeof — declarado, não omitido).
3. Registro `intent/` + commit único + PR; CI no head (incl. `SDLC guardrails
   (diff)` + `dojoToday (TS + substrate)`) citado no recibo AID-1516.
4. Countersign independente (QA Lead/fresh-context): re-executar
   independentemente o critério de mutação sobre o PR; aceitação registrada
   per AID-1136; merge single-writer CEO citando o countersign.

## Risks

- Falso-positivo de flake em CI? Mitigado: workers=1, dev servers
  `strictPort` + `reuseExistingServer:false`, assertions auto-wait; política
  de retry AID-571 segue no workspace (não elevamos retries).
- Fixtures hostis vazarem para builds normais? Não: o alias só existe com
  `DOJOTODAY_TODAY_MODULE` setado; builds/deploy ficam inalterados.
- Mutação não observável (M6/M7/M8) ser confundida com cobertura? Mitigado:
  tabela explícita no `intent.md` com resultado real de cada run; nenhum
  claim além do executado.

## Proof

- Gates na árvore do PR: `npm run selfcheck` ✅; `npm run lint` ✅ (19
  files); `npm run build` ✅; `npm run test:readiness` ✅ 25 passed.
- Mutação (worktree `/tmp/opencode/aid2205-mut`, removida após): M1 2 failed;
  M2/M3/M4/M5b 1 failed cada; M0/M6/M7/M8 2 passed (documentados). Log da
  sessão citado no recibo da issue.
- CI do PR: ver recibo AID-2205 (check-runs first-hand via API).
