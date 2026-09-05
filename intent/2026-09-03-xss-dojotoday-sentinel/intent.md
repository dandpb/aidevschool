# Intent: registro retroativo do fix XSS dojoToday (cadeia PRs #262/#264/#265, origem Sentinel)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-04 pelo FPE
> sob AID-771, em resposta ao achado **F1 (MÉDIO)** da Auditoria SDLC
> AID-767/B (SM AID-769, registro na âncora AID-400, comentário
> `1aa08ab0`): o fix chegou ao main **sem o registro fast-path do
> produtor**. Este arquivo não substitui nenhum veredito; a substância do
> loop (veredito independente pré-merge, guarda automatizada, re-grant)
> já tinha ocorrido e está citada abaixo. O que faltava — e este registro
> supre — era o elo escrito do produtor (`intent/<change-id>/` ou bloco
> curto de plano no registro da tarefa; `docs/sdlc/README.md`
> §Mapping/small-fix fast path).

Author: Sentinel (bot externo, produtor do fix) · registro retroativo: FPE (AID-771) · Change-id: 2026-09-03-xss-dojotoday-sentinel · Status: accepted (retrofit docs-only; gate = merge CEO do PR da AID-771)

## Problem

Em 2026-09-03 o Sentinel (bot externo de varredura) reportou **HIGH**: sink
de XSS na rota hosted `?host=os` do dojoToday. `boot()` em
`engines/dojoToday/src/main.ts` (~linha 341 no base `b549aea5`) fazia
`root.innerHTML = renderLocalSuggestion(...)` e
`renderLocalSuggestion` em `engines/dojoToday/src/localProjection.ts`
interpolava `suggestion.title` e `suggestion.detail` crus no template
string que termina em `innerHTML`. `title`/`detail` derivam de progresso
local do OS (IndexedDB), ou seja: superfície read-only, sem conta, mas com
entrada de dados não-confiáveis em um sink HTML.

Triagem honesta da QA (AID-753): **sink real, não-explorável no
estado de então** (nenhum caminho gravava payload hostil no progresso
local), severity mantida HIGH pela varredura por ser sink de innerHTML
com dado derivado de storage.

## Proposed outcome (o que de fato aconteceu — evidência em git/Paperclip)

Cadeia completa, na ordem em que ocorreu:

1. **Fix + veredito independente pré-merge** — PR #262 (Sentinel,
   "🛡️ Sentinel: [HIGH] Fix XSS in dojoToday local suggestion innerHTML"):
   `escapeHtml` (reutilizado de `engines/dojoToday/src/escape.ts`) nos
   interpoladores de `renderLocalSuggestion`, + escapes de payload. **QA
   AID-753 GO pré-merge publicado 2026-09-03T22:12:26Z** (reexecução em
   worktree dedicada, controle negativo no base `b549aea5`). Squash-merge
   CEO `fd7c52aa` 2026-09-04T02:13:03Z; `sdlc-guards` success no SHA.
   O mesmo diff rebaixou mecanicamente a readiness
   `dojotoday-daily-guidance` de `pass/validated-journey` para `stale/-`
   em `docs/product-readiness/README.md` (fingerprint do cenário mudou).
2. **Guarda automatizada** — PR #264 (FPE, AID-754/AID-760):
   `engines/dojoToday/playwright/hosted-os.spec.ts` (+198, arquivo novo;
   E2E da rota hosted + guardas de unidade com progresso hostil do OS;
   critério de mutação: remover `escapeHtml` quebra a guarda).
   **Countersign QA AID-761 GO** (critério de mutação confirmado de forma
   independente). Squash-merge CEO `289cdbd8` 2026-09-04T02:31:18Z.
3. **Re-grant de readiness** — AID-764 (FPE, reexecução 11/11
   `test:readiness` @ `289cdbd8` em worktree limpa) + countersign QA
   AID-766 (worktree própria, assessor independente) → PR #265 docs-only
   (v28, `pass/validated-journey` restaurado @ `289cdbd8`), merge CEO
   `9a7d840` 2026-09-04T03:17:37Z, relay AID-770.

O elo que faltava (produtor não registrou intent/plan; o registro
existente era o veredito QA pós-fato + heartbeats CEO genéricos) é
fechado por este par `intent.md`/`plan.md` retroativo, e o roteiro para
que não recorra com PRs de bots externos foi adicionado a
`docs/sdlc/README.md` (§External-origin PRs) no mesmo change da AID-771.

## Affected users and systems

- `engines/dojoToday/` — `src/localProjection.ts`, `src/main.ts` (sink),
  `src/escape.ts` (helper pré-existente), `playwright/hosted-os.spec.ts`
  (guarda nova).
- `docs/product-readiness/README.md` — downgrade mecânico (#262) e
  re-grant v28 (#265).
- Sem mudança de boundary de engine; a vista hosted permanece read-only:
  não escreve `learner/learning_state.yaml` e nunca marca `mastered`.

## Constraints

- Superfície vanilla-JS string-templated: escapes são defesa em
  profundidade mesmo com read model gerado localmente.
- Produtor (Sentinel) não tem presença Paperclip: por isso o registro
  fast-path precisa ser criado pelo lado da casa (roteiro documentado no
  §External-origin PRs de `docs/sdlc/README.md`).
- Registro retroativo nunca substitui veredito independente; produtor ≠
  verifier permanece.
- Este change (AID-771) é docs-only: 2 arquivos retro em `intent/` + 1
  seção curta em `docs/sdlc/README.md`; sem toque em código ou readiness.

## Open questions

Nenhuma em aberto para esta cadeia. Follow-up de processo (para PRs
Sentinel/Jules futuros) foi respondido pelo §External-origin PRs:
quem registra é o agente despachado pelo CEO, antes do merge.
