# Intent: Engines públicas — honestidade contínua + publicação

Author: Daniel Pinheiro Barreto · Change-id: `2026-10-19-engines-publicas-regrant-continuo` · Status: `accepted` (Daniel, 2026-10-19 13:16 BRT, sala Engines Públicas)
Supersede: `2026-09-18-engines-publicas-current` (nunca aceite; premissa envelheceu) e o rascunho paralelo `2026-10-19-engines-publicas-honestas`.

Origem: análise da sala Engines Públicas em 2026-10-19 (Chief of Staff, Scrum Master, Product, Publish Lead, Live QA, Readiness Grant). Tip `main` = `a9906cb` (#715).

## Problem

1. **O honesty não dura.** Em 18/set o #489 deixou 6 claims current @ `b1e0d0c`. Em 18/out a tip `a9906cb` tem `product readiness (claims)` vermelho com **7 STALE-WINDOW** (os 6 + `minitown-explore-only`). É drift real de código: digests divergem em `literacyDojo/src/domain/{progress,migration,trackQueries}.ts`, `literacyDojo/src/adapters/indexedDbProgressRepository.ts` e `codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts`. A re-grant factory termina `skipped` (provável dedupe porque #694 já está aberto; Readiness Grant confirma).
2. **Re-grant automático morre BEHIND.** #654, #672 e #692 foram fechados sem merge; #694 (v107 @ `b08e0096`) está aberto, BEHIND, `regrant-pending-observation`, 0 reviews. Nenhum re-grant mergeou desde #607 (v105, 30/set). A observação é manual e chega sempre depois da main andar.
3. **Manifest e CI se contradizem.** A matrix grava 9 UCs `pass` (8 `customer-ready`, incluindo pixelquest e voxel standalone; miniTown `experimental`) com revalidação até 30/out. O CI reprova. Pelo contrato, vale o CI: hoje nenhuma surface pode ser chamada customer-ready na main.
4. **Publicação sem quadro nem prova.** Ainda não existe quadro por surface nem prova live executada. Gaps conhecidos: PixelQuest só no Hub (`/apps/pixelquest/`), sem Netlify standalone; `/apps/voxeldojo/` e miniTown no Hub caem em SPA fallback; `entry.route` do inventory ainda diz "static pilot"/"local route" em vez das URLs live.
5. **Processo.** O intent anterior ficou um mês em `draft` enquanto ~100 PRs entraram por outros pipelines (AID-*). Lições de 1/set: artefatos viveram fora do repo, plan divergiu em silêncio, merge com finding Important aberto, Reviewer sem identidade própria no GitHub.

Quem sofre: visitante (oferta que pode não valer na tip), facilitador (claim podre), Daniel (descobre o vermelho um mês depois).

## Proposed outcome

Prazo: **30/out** pelo manifest atual, com aceite até ~23/out (Readiness Grant confirma o `revalidateBy`; a matrix de setembro dava 16–18/out).

1. **Main verde de novo.** `product readiness (claims)` e `countersign-gate` verdes na tip, com os 7 UCs current sob `--require-current`, via #694 atualizado/re-ancorado + observação independente na tip + countersign do Live QA + merge do Daniel.
2. **Drift aparece antes do merge, não depois.** Um PR de produto que quebra fingerprint de UC coberto não entra na main sem re-grant junto (ou o caminho equivalente que o spec definir). Alerta diário nesta sala quando `--require-current` ficar vermelho na main.
3. **Quadro por surface** (Publish Lead): literacyDojo, codexDojo OS, dojoToday, pixelDojo/PixelQuest, voxelDojo, miniTown. Cada linha: URL live, Netlify/alias, etag real vs SPA fallback, allowlist Hub, claim current/stale, gaps. `entry.route` do inventory corrigido para as URLs live.
4. **Prova live** (Live QA) por surface: CTA → onboarding → missão → evidência → veredito honesto, com screenshots. É requisito de aceite no spec, não pós-merge.
5. **Promoção** só com claim current + checklist publish verde + prova live. miniTown permanece `experimental`.

## Affected users and systems

- Visitantes/aprendizes nas URLs públicas; facilitadores e guides.
- `docs/product-readiness/` (manifest, `cli.py check --require-current`, `enforce`, re-grant factory, producer reports).
- CI: `product readiness (claims)`, `countersign-gate`, workflow da re-grant factory.
- Surfaces: literacyDojo, codexDojo OS, dojoToday, pixelDojo/PixelQuest, voxelDojo, miniTown; Hub allowlist; Netlify.
- Fora: labs de operador (minimax, openclaw, mvp, zai, sdlc-quest) salvo `?operator=1`; curriculum 01–18; UC "Trilha Dev"; engines novas.

## Constraints

- intent → spec → plan → diff/tests → PR → merge só do Daniel. intent/spec/plan commitados no repo num PR próprio logo no início.
- completed ≠ mastered; host nunca fabrica PASS; não enfraquecer testes; não inventar customer-ready.
- Nenhum merge com finding Important aberto, salvo exceção escrita pelo Daniel no PR.
- Se quem implementar não for o Builder, registrar a exceção no `plan.md`.
- Não congelar o trabalho dos pipelines AID-*; este recorte convive com eles.

## Open questions

1. `product readiness (claims)` já é check obrigatório na branch protection da main. Por que o vermelho só aparece no push-run? (Skew de merge sem "up to date"? PR-run usa outro modo que o push-run?) A resposta decide o mecanismo do Outcome 2.
2. Mecanismo do Outcome 2: bloquear merge que quebra fingerprint, re-grant obrigatório no mesmo PR, ou congelar paths cobertos durante o re-anchor? (Preferência a definir no spec.)
3. #694: atualizar a branch, ou fechar e abrir re-grant novo na tip atual?
4. PixelQuest standalone: precisa de Netlify próprio para ser promovido, ou basta `/apps/pixelquest/` com etag real + claim + prova? (Preferência de Product em set: não bloqueia.)
5. Reviewer com identidade própria no GitHub (bot/App) com review exigido: entra neste recorte ou num intent separado?
6. Esta sala continua como dona do recorte ou o trabalho entra como tickets AID-*?
