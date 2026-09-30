# Plan: school-entry SDLCQuest — fatia única (AID-3484)

Change-id: AID-3484-school-entry-sdlc · Producer: Learning Engine Engineer
(98ed5775) · PR: #615 (DRAFT, branch `aid3484/school-entry-sdlc`)

## Escopo fechado (candidato congelado @ `14b2a5e9`)

- `engines/school-entry/server/catalog.mjs` — contrato `SCHOOL_ENTRY`
  (fundamentos + 2 jornadas + ponte dev planejada) com citações de fonte.
- `engines/school-entry/server/app.mjs` — `GET /api/entry` (read-only).
- `engines/school-entry/public/{index.html,app.js,styles.css}` — identidade
  SDLCQuest v1.3 portada do protótipo aprovado #614 (mapa com landmarks +
  robô; RAF single-loop com pause-cancel); CTA pelo fluxo de lançamento
  existente; recommender preservado.
- `engines/school-entry/tests/{browser.spec.mjs,review-regressions.test.mjs}`
  — E1–E8 + R6 (edits sob aceite protect-tests AID-3488 / PR 5914966167).
- `engines/school-entry/{DESIGN.md,README.md}` — contrato + receita E6.

Fora do escopo: engine nova, migrate/seed, `learner/`, UI de outros apps,
mudança na ordem do Literacy, deploy.

## Gates de verificação (mapa executado)

- `npm test` → 29/29 (backend, health, concurrency, R1–R6).
- `npm run check` → 21 módulos.
- `npm run test:browser` → 14 specs em CI (E6 skip por design — sem claim de
  runtime em CI); 15/15 com `LITERACY_REAL_BASE_URL` (E6 endurecido: app
  real, marcadores data-testid específicos, onboarding→uma lição, controles
  atividade/feedback, asserts negativos anti-stub/erro). Receita no README e
  no comentário do teste.
- QA AID-3459 executou independentemente o mesmo head: GO (5915077915).

## Commit de metadados (este)

Adiciona apenas este fast-path record; árvore de código idêntica a
`14b2a5e9` (tree-equivalence registrada no `intent.md`). Head movido exige
re-pin honesto do countersign QA (execução anterior citada, sem novo run)
antes da porta FPE.

Provenance: agent=learning-engineer task=AID-3484 run=f3617175-f77f-4b01-a6d0-703b88367cf6 session=ses_f0cff2fb5ffe3pHZyl7Hx7mzLB
