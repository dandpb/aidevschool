# Intent: fatia única school-entry — entrada SDLCQuest (AID-3484)

Author: Learning Engine Engineer (agente Paperclip `98ed5775`) ·
Change-id: AID-3484-school-entry-sdlc · Status: implemented — candidato de
código congelado @ `14b2a5e9` (diretiva board 3703dea3), este registro é o
commit de metadados pré-merge (fast path item 1, AID-2219).

> Paperclip carrier: AID-3484 (filha de AID-3453 — "Unificar escola e
> currículo de IA"). Fatia única de entrada aprovada pelo CEO nos comentários
> a8e8346a (14:28Z) e 0a88be74 (14:32Z) de 2026-09-30. PR: #615 (DRAFT),
> branch `aid3484/school-entry-sdlc` — separado de `aid3453/unify-school`
> (candidato 579ce995 congelado até CI terminal).

## Problem

A escola única precisa de uma porta de entrada honesta para os dois públicos
(IA no cotidiano; IA para Dev) com destinos verificados first-hand, sem herdar
`recommendedEntryMissionId` legado e sem inventar rota.

## Decision (ADR curto de engine)

**Contrato de entrada estático + lançamento verificado.** O conteúdo da
entrada é um contrato de servidor congelado (`SCHOOL_ENTRY` em
`engines/school-entry/server/catalog.mjs`) exposto por `GET /api/entry`; a UI
apenas renderiza. Disponibilidade NÃO entra no contrato — é verificada por
lançamento (`/api/launch/literacyDojo`), preservando a porta única
operador+Chromium. Jornada descrita como **adaptativa** (onboarding +
Mapa Inicial `l02`; sem sequência fixa, sem deep-link por lição); ponte Dev
rotulada **prévia planejada** (lições dev são missões hospedadas do OS, fora
da jornada pública do app standalone); `game-02-warehouse` NÃO é porta de
entrada (diretiva CEO). Alternativa rejeitada: disponibilidade embutida no
contrato (acoplaria conteúdo à checagem e criaria cache positivo entre
perguntas). Invariante: mesma entrada → mesma progressão recomendada;
nenhum estado de aprendizagem é criado aqui (read-only por design).

## Outcome

Commits do produtor: `3f93626f` → `4a39918f` → `7dc3cb2c` → `b8eac9a0` →
`d966e557` → `14b2a5e9` (candidato final; E1–E8 + R1–R6). Verificação do
produtor @ `14b2a5e9`: `npm test` 29/29; `npm run test:browser` 15/15 com
`LITERACY_REAL_BASE_URL` (E6 endurecido contra o app literacyDojo real);
`npm run check` 21 módulos.

## Cadeia de veredito (antes do merge — AID-2219)

- **FSE (Full-Stack Feature Engineer, revisor §2 cross-domain):** PR #615
  comments `5913941050` (approve parcial 15:02Z) → `5914038151`
  (REQUEST CHANGES, 5 findings, 15:08Z) → `5914734416` (round 2: fixes 1–8
  aceitos first-hand; R2-1..R2-3 restantes) → resposta do produtor
  `5914882993` (@ `14b2a5e9`).
- **Diretiva do board (0d14e754/3703dea3):** lógica E6 @ `14b2a5e9` ACEITA
  independentemente; congelamento do candidato; correções só de metadados.
- **Platform & Release Engineer (protect-tests, owner DISTINTO):** **AID-3488**
  — APPROVE limitado dos edits dos 2 arquivos de teste existentes, escopo head
  `14b2a5e9` (PR comment `5914966167`; correção de ledger `5915074783`:
  nenhuma asserção da base removida; remoção `l01–l14` reclassificada
  intra-PR).
- **QA (AID-3459, veredito/countersign):** execução first-hand própria do E6
  endurecido no head `14b2a5e9` (15/15 browser, 29/29 backend) — veredito
  **GO** + countersign `5915077915` pinando `14b2a5e9…` (40-hex).

## Tree-equivalence (registro do commit de metadados)

Este commit adiciona SOMENTE `intent/AID-3484-school-entry-sdlc/` — a árvore
de código é idêntica à do candidato congelado: `git diff 14b2a5e9..HEAD` não
toca nada fora de `intent/AID-3484-school-entry-sdlc/`. O head movido exige
re-pin honesto do countersign QA no head final (citando a execução anterior
+ árvore idêntica, sem alegar novo run — diretiva 0d14e754); merge somente
após re-pin + CI verde no head final, pela porta única (`scripts/merge_pr.sh`,
FPE).

## Follow-ups

- QA: re-pin do countersign no head final (AID-3459).
- Merge: single-writer FPE via `scripts/merge_pr.sh`; nenhum deploy nesta
  fatia; QA desktop/mobile/feedback/retomada contínuo (AID-3459).

Provenance: agent=learning-engineer task=AID-3484 run=f3617175-f77f-4b01-a6d0-703b88367cf6 session=ses_f0cff2fb5ffe3pHZyl7Hx7mzLB
