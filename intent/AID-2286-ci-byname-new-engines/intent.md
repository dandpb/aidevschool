# Intent: CI by-name para engines sdlc-quest e zai-duolingo-like + gate .mjs no CI

Author: Paperclip AID-2286 (assignee: Platform & CI Engineer) · Change-id: AID-2286-ci-byname-new-engines · Status: accepted

> Origem: veredito QA AID-2281 "CONFORME COM RESSALVA" (comentário 1835c128,
> 2026-09-17T14:00:13Z), ressalvas R1 (principal) e R4, sobre o retrofit-accept
> do merge 3c5629c0 (PR #471). Issue AID-2286 cita a entrega exata; não
> reescrevo aqui — a issue é a fonte.

## Problem

- R1: nenhum job do CI executa as engines novas `sdlc-quest` (harness próprio,
  `node tools/test.cjs`, 323 testes) nem `zai-duolingo-like` (Next.js+Prisma,
  `verify` = vitest+eslint+tsc, build standalone, e2e Playwright). Regressões
  nessas engines não podem reverter nenhum PR — a espinha "no claims without
  evidence" do ci.yml não as cobre.
- R4 (pré-existente): as suítes node:test do gate (`learner/gate/tests/*.test.mjs`,
  18 arquivos) não rodam em nenhum job; o job `learner` executa apenas o lado
  pytest do diretório.
- Achado novo durante o trabalho: `engines/zai-duolingo-like/package-lock.json`
  está incompleto (faltam transitivas `@emnapi/*`) — `npm ci` falha com EUSAGE,
  violando a convenção AID-1670 (lockfile commitado instalável).

## Proposed outcome

- Jobs by-name no `.github/workflows/ci.yml`: `sdlc-quest` (node 22, zero
  deps, `node tools/test.cjs`), `zai-duolingo-like` (npm ci → prisma generate
  → verify → build → e2e Playwright autocontido), e um passo
  `node --test learner/gate/tests/*.test.mjs` no job `learner`.
- PRs que tocarem qualquer uma dessas superfícies ficam vermelhos quando uma
  suíte quebra; o push de main mantém a mesma cobertura.

## Affected users and systems

- CI (`.github/workflows/ci.yml`): dois jobs novos + um passo novo no job
  `learner`.
- `engines/zai-duolingo-like/package-lock.json`: resync (nenhuma mudança em
  package.json/fontes; resolução dentro das faixas semver declaradas).
- Engines `sdlc-quest` e `zai-duolingo-like`: sem mudanças de código.

## Constraints

- Sem edição de testes protegidos (nenhum trailer SDLC-ALLOW-* necessário —
  diff não toca `*/tests/*`).
- e2e do zai deve ser autocontido (sqlite + `next start` + page.route stubs);
  mini-services/bun não entram no CI.
- Orçamento de runner: sdlc-quest é segundos; zai fica na ordem dos outros
  engines Next/Playwright já presentes.
