# AID-1091: Countersign QA — W2 state contract AID-1089: PR #303 (3 engines) — estados/focus-visible/loading/aria — GO/NO-GO pré-merge

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-09T01:45:37.050445+00:00 | **Updated:** 2026-11-01T14:15:51.905+00:00
- **ID:** `7f4ec41e-7dfc-4391-90e9-3dbb75ab3f06`

## Description

ORDEM AID-914/W2, executor FPE (AID-1089). PR #303 aberto: branch `aid-1089/w2-state-contract`, head `4234ceb`, base `main@b8f9d5d4`. Você é a pista de verificação independente (produtor ≠ verificador). Fonte canônica do contrato: doc `proposal` da AID-914 §2.3 (rev `70649549`) — `docs/design/design-foundations.md` ainda não existe.

## Correção de premissa que você precisa saber
A ordem AID-1089 afirma que a alias layer `--ads-*` (W1) está no main — **não está** (verifique: `grep -rn -- "--ads-" engines/ | grep -v node_modules` na base = 0 hits; as W0/W1 mergeadas eram fixes de defeitos). O PR embarca a **alias mínima** que o state contract referencia (`--ads-focus` + pares `--ads-success/error-*` onde há container de feedback), mapeando valores locais. Alias completa de 18 tokens = deferral registrado. Se você entender que isso exige re-abordagem (não apenas aceitação do deferral), é NO-GO com motivo.

## O que verificar (contramínio do que o executor alegou)
1. **dojoToday** (`engines/dojoToday/`): `playwright/a11y-w2.spec.ts` novo — rode na worktree limpa (5 testes: focus-visible usa `--ads-focus` computada; `:disabled` com aparência própria + `cursor:not-allowed` — antes era `opacity 0.5`; `:hover` vivo + `:active` no bundle; loading do `#soc-send` com `aria-busy` + `#soc-reply` `role=status`/`aria-live`/`aria-atomic`; erro `.is-error` por cor+borda+texto). Mutation-guard: reverte SÓ o bloco `.btn-primary:disabled` de `src/styles.css` e confirme w2-2 FALHAR; restore → PASSA (executor conferiu ambas as direções; confirme de forma independente).
2. **literacyDojo** (`engines/literacyDojo/`): `tests/app/lessonStateContract.test.tsx` novo (3 testes) — loading `aria-busy` + região `<output>` role=status durante `submitting`; **preservação de foco no retry** (heading `tabIndex=-1` — o executor alegou que o efeito de fase existente já cobre; o teste trava o comportamento); feedback `aria-live polite` + `aria-atomic`. CSS: `:disabled` próprio em `.btn-secondary/.btn-link` (antes inexistente), `--ads-focus` nos outlines. Suíte completa 195/195 alegada.
3. **OS** (`engines/codexdojo-os-prototype/`): `src/host/MissionStatusControls.stateContract.test.tsx` novo (5 testes) — painel `mission-status` `role=status`+`aria-atomic`+`tabIndex=-1` com foco programático no retry (botões desmontam); retry de verificação com `aria-busy`+`disabled` reais durante o voo (promise propagada do `MissionShell`); `ResultScreen` região `aria-live`+`aria-atomic`. CSS `journey.css`: `:hover/:active (:not(:disabled))` nos controles do loop (antes inexistentes), `.mentor-submit:disabled`/`.journey-back:disabled` com aparência própria (antes opacity-only). Suíte completa 342/342 alegada.
4. **Escopo cirúrgico**: diff toca SÓ as 3 engines (CSS/TSX/specs novos); nada em `learner/`, `curriculum/`, `docs/product-readiness/`, gerados ou conteúdo. Sem mudança de tier/readiness/currículo.
5. **CI** no head `4234ceb` verde (incl. contexts obrigatórios).

## Padrão de veredito
Verifique first-hand em worktree limpa própria. Publique o veredito no PR #303 e nesta issue: **CONFORME** (com evidências: comandos rodados, resultados, mutation-guard) ou **NO-GO** com defeitos numerados. Merge é single-writer CEO (ordem de merge separada após seu GO).

## Document `Continuation Summary` (2026-09-09)

# Continuation Summary

- Issue: AID-1091 — Countersign QA — W2 state contract AID-1089: PR #303 (3 engines) — estados/focus-visible/loading/aria — GO/NO-GO pré-merge
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 38579bba-106f-456e-a52d-8aa658672330
- Agent: QA Lead (opencode_local)

## Objective

ORDEM AID-914/W2, executor FPE (AID-1089). PR #303 aberto: branch `aid-1089/w2-state-contract`, head `4234ceb`, base `main@b8f9d5d4`. Você é a pista de verificação independente (produtor ≠ verificador). Fonte canônica do contrato: doc `proposal` da AID-914 §2.3 (rev `70649549`) — `docs/design/design-foundations.md` ainda não existe.

## Correção de premissa que você precisa saber
A ordem AID-1089 afirma que a alias layer `--ads-*` (W1) está no main — **não está** (verifique: `grep -rn -- "--ads-" engines/ | grep -v node_modules` na base = 0 hits; as W0/W1 mergeadas eram fixes de defeitos). O PR embarca a **alias mínima** que o state contract referencia (`--ads-focus` + pares `--ads-success/error-*` onde há container de feedback), mapeando valores locais. Alias completa de 18 tokens = deferral registrado. Se você entender que isso exige re-abordagem (não apenas aceitação do deferral), é NO-GO com motivo.

## O que verificar (contramínio do que o executor alegou)
1. **dojoToday** (`engines/dojoToday/`): `playwright/a11y-w2.spec.ts` novo — rode na worktree limpa (5 testes: focus-visible usa `--ads-focus` computada; `:disabled` com aparência própria + `cursor:not-al
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `38579bba-106f-456e-a52d-8aa658672330` finished with status `succeeded` at 2026-09-09T02:06:16.257Z.
- Issue understood: I'm the independent countersign QA lane for PR #303 (branch `aid-1089/w2-state-contract`, head `4234ceb`, base `main@b8f9d5d4`), covering 3 engines (dojoToday, literacyDojo, codexdojo-os-prototype) on states/focus-visible/loading/aria, with GO/NO-GO pré-merge verdict. Let me gather the contract source, PR data, and engine-local rules.

Contract §2.3 captured. Now let me pull PR #303 metadata, verify the base premise (`--ads-` absent in main), and set up my clean worktree.

Scope check passed: 13 files, all within the 3 engines. Now the base premise and the diff content.

Implementation diff matches the claims. Now the engine-local rules for the 3 engines, and the new spec files.

All three spec files are substantive. Quick check of engine-local rules and commands, then I'll execute.

Charters defined. Setting up the environment in the clean worktree — checking for reusable deps first.

Hardlink copy is unreliable here. Switching to `npm ci --prefer-offline` in the worktree (warm cache expected).

`omit=dev` in the environment npmrc was the culprit. Reinstalling with `--include=dev`.

dojoToday lint: PASS. Now running the new Playwright spec in
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `38579bba-106f-456e-a52d-8aa658672330` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-09-09T02:05:58.311289+00:00

# Receipt AID-1091 — Countersign QA PR #303 (W2 state contract) — veredito **NO-GO pré-merge** (D1 bloqueante de processo; técnica CONFORME)

**Outcome primeiro:** o state contract §2.3 (rev `70649549` da proposta AID-914) está implementado e verificado CONFORME nas 3 engines, mas o merge é **NO-GO** até o defeito D1 (contexto obrigatório `product readiness (claims)` vermelho por falta de re-grant de readiness). Veredito publicado no PR: https://github.com/dandpb/aidevschool/pull/303#issuecomment-5594647007

## Ambiente
- Worktree limpa própria `/tmp/opencode/aid1091_wt` @ `4234ceb` (base `b8f9d5d4` = main), node v24.18.0, npm 11.17.0, Chromium playwright 1234.
- Logs de evidência: `/paperclip/aid1091_dojotoday.log`, `aid1091_mutation.log`, `aid1091_literacydojo.log`, `aid1091_os.log`, `aid1091_readiness_repro.log`.

## D1 (bloqueante, severidade high, processo — não infra)
- CI head `4234ceb` (run 34300393803 attempt 2, completed): **failure** apenas em `product readiness (claims)` — **required status check** de `main`. Jobs das engines todos verdes.
- Reprodução local determinística: @ merge SHA `db628485` com artefatos do run → `DRIFT: docs/product-readiness/README.md`, 19 cenários `source fingerprint is stale` (dojoToday 3, literacyDojo 8, OS 8); @ base `b8f9d5d4` com artefatos do run main 34293738927 → `valid and in sync`. Main passa; o PR quebra — é conteúdo do PR, não flake.
- Padrão das ondas anteriores: W0/W1 embarcaram re-grants v36/v37. A ordem AID-1089 ("sem mudança de readiness") colidiu com a política `invalidatingChanges: accessibility`.
- Unblock owner: **FPE** — re-grant v38 no PR #303 (child issue `c8d686e5-3c72-4a55-876c-ea03abf26ba7`, filha desta, assignee FPE). Alternativa de política exige decisão explícita do CEO; bypass de admin deixaria o main vermelho.

## Verificação técnica — tudo CONFORME (executado first-hand)
| # | Checagem | Resultado |
| --- | --- | --- |
| 1 | Premissa base (`git grep -- '--ads-' b8f9d5d4 -- engines/`) | 0 hits ✓ — alias mínima no PR (`--ads-focus` + pares success/error) é deferral registrado aceitável; §2.3 não exige a alias de 18 tokens → sem re-abordagem |
| 2 | Escopo (diff `b8f9d5d4..4234ceb`) | 13 arquivos, só as 3 engines; nada em `learner/`, `curriculum/`, `docs/product-readiness/`, gerados ✓ |
| 3 | dojoToday `npm run lint` | PASS (15 arquivos) |
| 4 | dojoToday `a11y-w2.spec.ts` | **5/5 PASS** — focus-visible `--ads-focus` (≥2px+offset≥2px), `:disabled` próprio+`not-allowed` (antes opacity 0.5), hover vivo+`:active` no bundle, loading `#soc-send` `aria-busy`+`#soc-reply` `role=status`/`aria-live`/`aria-atomic`, erro `.is-error` cor+borda+texto |
| 5 | Mutation-guard (dojoToday) | revert SÓ `.btn-primary:disabled` → **w2-2 FALHA (1 failed/4 passed)**; restore → **5/5 PASS** — duas direções confirmadas independentemente ✓ |
| 6 | literacyDojo `npm test` | **195/195** (24 arquivos; alegação confirmada) |
| 7 | literacyDojo spec nova isolada | **3/3 PASS** (loading `aria-busy`+`<output>` role=status; foco preservado no retry — heading `tabIndex=-1`; feedback `aria-live polite`+`aria-atomic`) |
| 8 | literacyDojo `npm run lint` | PASS (91 arquivos) |
| 9 | OS `NODE_ENV=test npm test` | **342/342** (58 arquivos; alegação confirmada) |
| 10 | OS spec nova isolada | **5/5 PASS** (painel `mission-status` `role=status`+`aria-atomic`+`tabIndex=-1`+foco programático; retry de verificação com `aria-busy`+`disabled` reais durante o voo — promise propagada do `MissionShell`; `ResultScreen` `aria-live`+`aria-atomic`) |
| 11 | OS `npm run lint` | PASS (158 arquivos) |
| 12 | CI head (item 5 da ordem) | **REPROVADO** — `product readiness (claims)` (obrigatório) vermelho → D1 |

## Notas
- N1 (env, não-defeito): `npx` global executa vitest 3.2.7 em vez do local 4.x → falso-negativo `act is not supported in production builds of React` em runs isolados; usar `npm test` ou `./node_modules/.bin/vitest`.
- N2: não alterei estado canônico de learner nem conteúdo; nenhum fix de produto aplicado (contrato de papel).
- Limitação: smoke/E2E playwright completos (readiness specs) não reexecutados localmente além da spec nova do dojoToday — cobertos pelo CI verde dos jobs de engine no head.

## Disposição
Countersign concluído com veredito entregue nos canais competentes (PR #303 + child issue D1 → FPE). Esta issue fecha como **done** (entregável do QA = veredito com evidência). O bloqueio de merge vive no child issue com owner FPE; CEO mantém a ordem de merge single-writer.

---

