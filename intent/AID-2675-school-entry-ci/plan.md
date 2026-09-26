# Plan: CI by-name para school-entry

Change-id: AID-2675-school-entry-ci · From: intent/AID-2675-school-entry-ci/spec.md · Status: approved

## Files that change

- `.github/workflows/ci.yml` — job novo `school-entry (TS)` (node 22, npm ci
  com cache, Playwright Chromium antes dos testes, `npm test` →
  `test:browser` → `check`).
- `intent/AID-2675-school-entry-ci/{intent,spec,plan}.md` (novos).

Fora do diff (ação de configuração, registrada no task record): adicionar o
contexto `school-entry (TS)` aos required status checks do `main` **após** o
PR reportar o check.

## Order of work

1. Verificação local pré-edit (primeiro hand): `npm test` 26/26,
   `test:browser` 7/7, `check` 21 módulos — verde com Chromium certo
   instalado; verificado também o modo de falha sem Chromium (C06 vermelho).
2. Editar `ci.yml` (job novo após `zai-duolingo-like`, antes de
   `design-md-lint`), validar YAML + actionlint se disponível.
3. `scripts/sdlc_guard_check.sh --base origin/main` — diff não toca testes;
   guard esperado limpo (a exigência de countersign é satisfeita no PR com o
   veredito QA pré-merge).
4. Commit → branch `aid-2675/ci-byname-school-entry` (base `origin/main`) →
   PR com evidência local no corpo.
5. CI do PR é a prova de ponta a ponta: primeira execução das suítes da
   engine em runner GitHub (Node 22 + Chromium gerenciado do Playwright).
6. CI verde no head (incl. `SDLC guardrails (diff)`) → adicionar contexto à
   branch protection → countersign QA fresh-context pré-merge (AID-2318/
   AID-2428 Stage 2: PR de agente + path de autoridade) → merge single-writer
   FPE com linha canônica `Countersign:` na merge message (AID-2655).

## Risks

- Primeira execução em runner CI: diferença de versão Chromium/Node 22 vs
  local 24 — mitigação: job instala o Chromium do lockfile do Playwright
  (`npx playwright install`), mesma major do Dockerfile; se vermelho por
  ambiente, diagnosticar no run; não enfraquecer o job.
- Runner sem as libs de sistema do Chromium: coberto por `--with-deps`
  (padrão dos jobs playwright existentes).
- Contexto required adicionado cedo demais penduraria outros PRs abertos:
  por isso a ordem do passo 6 (só após o PR reportar o contexto).
