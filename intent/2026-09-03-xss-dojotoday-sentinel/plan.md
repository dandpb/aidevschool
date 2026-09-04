# Plan (fast-path, retro): fix XSS dojoToday renderLocalSuggestion

> **RETROSPECTIVE RECORD** — bloco curto fast-path registrado
> retroativamente (AID-771, achado F1 da auditoria AID-767/B). O plano que
> o produtor deveria ter deixado antes do merge do PR #262; os passos já
> executaram e as evidências estão citadas. Formato: small-fix fast path
> (`docs/sdlc/README.md` §Mapping) — artefatos colapsados neste bloco,
> self-verification e review não pulados.

Change-id: 2026-09-03-xss-dojotoday-sentinel · From: PR #262 (Sentinel) + PR #264 (AID-754) · Status: approved (retro; execução já concluída)

## Files that change (diff real do #262, squash `fd7c52aa`)

- `engines/dojoToday/src/localProjection.ts` — `renderLocalSuggestion`:
  `${suggestion.title}` / `${suggestion.detail}` →
  `${escapeHtml(suggestion.title)}` / `${escapeHtml(suggestion.detail)}`
  (import de `./escape`, helper pré-existente).
- `docs/product-readiness/README.md` — 1 linha: rebaixamento mecânico de
  `dojotoday-daily-guidance` para `stale/-` (fingerprint dos cenários
  mudou com o diff de código; revalidação fica para assessoria
  independente).

## Follow-up (diff do #264, squash `289cdbd8`)

- `engines/dojoToday/playwright/hosted-os.spec.ts` (novo, +198) — E2E da
  rota hosted `?host=os` + guardas de unidade para
  `renderLocalSuggestion`/`projectLocalSuggestion` com progresso hostil
  do OS (stub IndexedDB; nada executa; zero `pageerror`; mutação que
  remove `escapeHtml` quebra a guarda).

## Order of work (como executou)

1. QA AID-753 valida o PR #262 em worktree dedicada antes do merge
   (inclui controle negativo no base `b549aea5`) → GO
   2026-09-03T22:12:26Z.
2. Merge CEO (squash) `fd7c52aa` 2026-09-04T02:13:03Z; `sdlc-guards`
   success no SHA de merge.
3. Guarda automatizada #264 (AID-754) + countersign QA AID-761 GO →
   merge CEO (squash) `289cdbd8` 2026-09-04T02:31:18Z.
4. Re-grant: AID-764 reexecuta 11/11 `test:readiness` @ `289cdbd8`
   (worktree limpa) + countersign AID-766 → PR #265 docs-only v28, merge
   CEO `9a7d840` 2026-09-04T03:17:37Z.

## Risks

- Escape de texto legítimo mudar a exibição — coberto: guardas de unidade
  asserting render escapado; E2E da rota hosted.
- Readiness rebaixada gerar promessa quebrada — mitigado: downgrade
  mecânico no mesmo diff do fix e re-grant v28 na sequência (#265).
- Recorrência do gap de registro em PRs de bots — mitigado pelo
  §External-origin PRs em `docs/sdlc/README.md` (mesmo change AID-771).

## Proof (executável, como correu)

- CI no head atualizado do #262: 30/30 check-runs verdes (29 success +
  1 skipped) — verificado pela QA AID-753.
- CI no head atualizado do #264: 35/35 verdes (34 success + 1 skipped) —
  countersign AID-761; critério de mutação (remover `escapeHtml` →
  guarda falha) confirmado de forma independente.
- `cd engines/dojoToday && pnpm run test` inclui `hosted-os.spec.ts`;
  reexecução da QA AID-766: 11/11 `test:readiness` @ `289cdbd8`.

## Verification split

- Produtor: Sentinel (fix #262), FPE (guarda #264, AID-754) — nunca
  verificaram o próprio merge.
- Verificadores independentes: QA AID-753 (GO pré-merge #262), QA AID-761
  (countersign #264), QA AID-766 (countersign re-grant v28; assessor
  `independent-readiness-observer`, worktree própria).
- Gate final: merge CEO single-writer em #262/#264/#265.
