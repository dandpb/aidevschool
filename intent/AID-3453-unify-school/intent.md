# Intent: Escola única por competências — unificar escola e currículo de IA

Author: CEO (issue) · Founding Product Engineer (change) · Change-id: `AID-3453-unify-school` · Status: draft (aguardando confirmação do plano)

> Origem: Paperclip **AID-3453 — "Unificar escola e currículo de IA"** (goal
> `754b6643`, projeto Onboarding). Este arquivo **linka, não reescreve** — a
> issue é a fonte única da intenção. Citação do núcleo:
> "executar uma escola única por competências, com fundamentos compartilhados e
> duas jornadas: IA no cotidiano e IA para Dev (…) Curar antes de acrescentar
> (…) Classificar manter, fundir, melhorar, adiar ou remover, com
> rastreabilidade."

## Problem

Hoje existem 8 famílias de conteúdo de IA com IDs, pré-requisitos e evidências
próprias, sem uma matriz única fonte→competência. O mesmo conceito aparece
duplicado entre famílias (ex.: "IA não é fonte de verdade" existe na literacy
l02, no MVP C11/C14 e na ZAI "O Lado Negro"), e o seam de unificação existente
(`engines/codexdojo-os-prototype/config/mission-bindings.yaml` +
`learner/substrate/mission_catalog.py`) cobre só 24 das 32 lições literacy e
nenhuma fonte dev além dos 17 jogos voxel.

## Proposed outcome

1. Uma matriz curricular rastreável (fonte→competência→público→pré-requisito→
   prática→evidência→decisão) cobrindo 100% das famílias citadas na issue.
2. Contrato de release pedagógico explícito, separado de board/R2.
3. Plano da primeira fatia vertical aprovável, com quatro frentes filhas
   (CCE curadoria, CPE integração, UX, QA) vinculadas a AID-3453.

## Affected users and systems

- Substrato compartilhado: `curriculum/` (ai-literacy + 18 projetos),
  `learner/substrate/`, `engines/shared/teaching-evidence/`.
- Engines consumidores: literacyDojo, aiDevschoolMvp, zai-duolingo-like,
  codexdojo-os-prototype (bindings), sdlc-quest (identidade visual), voxelDojo,
  pixelDojo, codexDojo (dashboard/MANIFEST se contratos mudarem).
- Docs: `docs/curso-simples/`, `dev-workflow-claude/`.

## Constraints (da issue, inalteradas)

- Curar antes de acrescentar; reusar AID-1721/2123/2115; reusar
  mission-bindings.yaml, `learner/substrate/mission_catalog.py`,
  `@aidevschool/evidence`; compilador das 32 lições já existe e o filtro
  `ia_pratica` vive no adaptador literacyDojo (não mover para o compilador).
- Identidade visual: SDLCQuest v1.3 — não inventar outro sistema.
- Jogos = prática opcional, sem pré-requisitos alheios obrigatórios.
- `completed`/`pass`/simulação ≠ domínio; mastered só com evidência
  independente aceita (gate AID-1222 preservado; piloto outubro AID-641/909
  intocado; sem recrutamento).
- Sem deploy/restart de produção, segredos, ampliação de acesso, compras,
  merge automático ou destruição de dados. Remoção somente com prova de
  dependências + recuperação Git. Worktree/branch limpa e isolada.
- Mudanças limitadas em branches/PRs draft com revisão independente;
  preservar IDs e progresso.

## Open questions

1. ~~ZAI: a issue cita "27 lições"; o fonte em main tem 7 módulos/19 lições.~~
   **RESOLVIDO r1.1 (P1 da revisão):** a issue estava certa — **9 módulos /
   27 lições** (contagem estrutural: eval do array `CURRICULUM` em Node,
   base `1975e2c7`; inclui `por-dentro-da-maquina`, `contexto-e-specs` e
   `o-protocolo-final`/`caso-real-feature-previsivel`). O "7/19" da r1 era
   artefato de grep. Regra daí em diante: contagem de fonte TS = parse
   estrutural, nunca grep de chaves.
2. SDLCQuest "6 gates": verificar contagem canônica na frente CPE/UX (o gate
   do harness existe; a decomposição em 6 precisa de citação exata).
3. Competency IDs definitivos (F1–F6/D1–D7 propostos na spec) e o par
   primária/apoio de cada unidade precisam de ratificação na r2 da CCE.
