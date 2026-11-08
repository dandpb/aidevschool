# Review formal AID-3537 — fix de foco do mapa em texto /escola/ (AID-3532)

**Veredito: APROVADO** — PR #626 @ `0b2358ac` está correto, mínimo e provado. Aprovado para countersign/merge FPE.

- **Revisor:** Engine Systems Engineer (ESE, `ae071215`) — produtor ≠ verificador (padrão AID-3275(b))
- **Data:** 2026-09-30 ~21:5xZ · **Alvo:** PR #626 (`aid3532/fix-map-alt-focus`), base `d9dbdd5c` = origin/main, head `0b2358ac`
- **Worktree de verificação:** `/paperclip/tmp/aid3532-wt` (re-runs independentes do revisor, não os logs do produtor)

## Revisão de código

- Diff = `escola.js` (−1 linha funcional `removeAttribute("tabindex")` + comentário) e spec NOVO `playwright/escola-map-focus.pwa.spec.ts` (4 casos). Exatamente o escopo declarado; zero collateral.
- Correção adota a 1ª sugestão da issue: `tabindex="-1"` permanece no cartão — idempotente em ativações repetidas (`setAttribute`), cartões seguem fora da ordem de Tab (`-1` não entra no tab order), e o padrão é consistente com o alvo estático do skip link `#etapa-atual` (`index.html:68`, `tabindex="-1"` fixo no HTML).
- Spec bem construído: cobre Enter e click, ambos os cartões, ativação repetida; afirma `tabindex="-1"` junto ao foco; **mutation-guard** re-checa o foco 1 frame depois (`requestAnimationFrame`), que pegaria variantes que adiam a remoção do atributo (ex. `setTimeout`); corretamente restrito ao projeto `pwa` (`testMatch`, build real + preview, mesmo ambiente da repro QA B9).

## Verificação independente (revisor)

| Verificação | Comando | Resultado |
|---|---|---|
| Fix-pass no head | `npx playwright test --project=pwa escola-map-focus` @ `0b2358ac` | **4/4 passam** |
| Failing-first na base | mesmo spec sobre `d9dbdd5c` (escola.js pré-fix) | **4/4 falham** em `toBeFocused` — foco perdido (defeito reproduzido; bate com QA B9/lineage `e95611da`) |
| Regressão de superfície | `npx playwright test --project=pwa escola-entry` @ head | **4/4 passam** (serving, jornadas, SW offline/update) |
| Lint | `npx biome check playwright` | **clean** |

O re-run na base foi montado pelo revisor (checkout de `d9dbdd5c` + spec novo copiado), não reuso do `base-fail-run.txt` do produtor. Worktree devolvido limpo a `0b2358ac`.

## Encaminhamento

- **Merge:** FPE pela porta única `scripts/merge_pr.sh` (countersign-gate). Producer não mergeia.
- **QA/AID-3517:** após publicação, caso **B9** (marcado `test.fail`, lineage `e95611da`) passará a falhar "inesperadamente" no run público — sinal acordado para fechar AID-3532; marcador é da QA.
- Issue de review (AID-3537): **done** — veredito APROVADO registrado aqui e no thread de AID-3532.
