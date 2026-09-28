# Intent: CI by-name para school-entry (pré-requisito da publicação BETA ACCESS)

Author: Paperclip AID-2675 (assignee: Platform & Release Engineer) · Change-id: AID-2675-school-entry-ci · Status: accepted

> Origem: AID-2675 (BETA ACCESS: publicar school-entry com CI by-name),
> criada a partir do comentário do founder em AID-2660 (2026-09-26). A issue
> marca o job CI by-name como **pré-requisito explícito**: "criar job CI
> by-name para school-entry no workflow do repo ANTES de publicar". A issue é
> a fonte; não reescrevo aqui.

## Problem

- `engines/school-entry` (34 arquivos) está em `main` sem nenhum job CI que a
  execute — mesma classe de gap da AID-2286 (sdlc-quest / zai-duolingo-like
  sem cobertura pós-PR #471). A espinha "no claims without evidence" do
  `ci.yml` não cobre a superfície que está prestes a virar a porta de entrada
  pública do produto (recomendação por objetivo + painel de liberação do
  operador).
- Sem job by-name, uma regressão na engine não reverte PR nenhum antes da
  publicação; com a URL pública no ar, o custo do mesmo defeito sobe de
  "vermelho no CI" para "entrada pública quebrada".

## Proposed outcome

- Job by-name `school-entry (TS)` no `.github/workflows/ci.yml`: Node 22
  (mesma major do `node:22-bookworm-slim` do Dockerfile da engine; contrato
  `engines.node >= 22.13`), `npm ci` com cache do lockfile commitado,
  Chromium via `npx playwright install --with-deps` **antes** de `npm test`
  (o glob unitário `tests/*.test.mjs` já inclui `health.test.mjs`, que
  exercita o checker Chromium real — C06), depois `npm run test:browser`
  (7 specs) e `npm run check` (gate de sintaxe de 21 módulos).
- Contexto adicionado aos required status checks do `main` (branch
  protection) depois que o PR reportar o check, para o job bloquear merge
  quando vermelho — mesmo tratamento de `zai-duolingo-like`.
- `npm run test:live` fica FORA do CI: exige `TYPESAFE_API_KEY` real e faz
  chamadas de inferência pagas (README da engine: só ele exige credencial
  externa).

## Affected users and systems

- CI (`.github/workflows/ci.yml`): um job novo; nenhum job existente muda.
- Branch protection do `main`: +1 contexto required (`school-entry (TS)`).
- `engines/school-entry/`: **nenhuma** mudança de código (PR não toca a
  engine; ela é o sujeito do job, não do diff).

## Constraints

- Sem edição de testes protegidos (diff não toca `*/tests/*`; nenhum trailer
  SDLC-ALLOW-* necessário).
- Orçamento de runner: uma instalação npm (~1 dep: playwright) + download de
  Chromium + ~33 testes que rodam em segundos localmente — dentro do teto de
  feedback < 10 min/PR (prioridade PRE).
- Diff toca path de autoridade de processo (`.github/workflows/**`) →
  countersign QA fresh-context pré-merge é exigido pelo gate AID-2318/2428 e
  pela disciplina AID-2219; merge permanece single-writer FPE (R1 inativa).
