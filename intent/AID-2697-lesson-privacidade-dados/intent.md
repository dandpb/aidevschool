# Intent: lição de privacidade de dados fecha o currículo do Vertical Protocol

Author: Founding Product Engineer (AID-2697) · Change-id: AID-2697-lesson-privacidade-dados · Status: accepted

> Origem: issue AID-2697 (FACTORY-STRESS onda 2, GO AID-2736) — "Escolher 1
> item user-facing real e rodá-lo pela fábrica". O item escolhido é conteúdo
> novo user-facing no motor Duolingo-like (`engines/zai-duolingo-like/`), não
> um probe sintético.

## Problem

O currículo do jogo cozy-cyberpunk ("Vertical Protocol") termina em
`o-protocolo-final` sem nenhuma lição sobre privacidade de dados — o que é
seguro colar num prompt, o que nunca deve sair da máquina do aprendiz e como
delegar a agentes sem vazar dados sensíveis. Para um produto de letramento
em IA com ethos local-first/LGPD, terminar a jornada sem o tema privacidade
deixa a maior promessa do produto sem cumprir: ensinar a usar IA sem
entregar a si mesmo.

## Proposed outcome

Uma nova lição jogável (`privacidade-dados`, 5 exercícios nos 5 tipos do
grader) fecha o módulo final. Aprendizes que completaram o jogo voltam e
encontram conteúdo novo desbloqueado; nenhuma progressão existente é
retravada (inserção apenas no último módulo, provada por teste de regressão
de unlock).

## Affected users and systems

- `engines/zai-duolingo-like/` — conteúdo do currículo (`src/lib/curriculum-data.ts`)
  e teste de regressão novo (`tests/unit/curriculum-privacy-lesson.test.ts`).
- Sem mudança em `learner/`, `curriculum/` (substrato compartilhado) ou `.mavis/`:
  o jogo é autocontido (seed deriva de `CURRICULUM`).

## Constraints

- Zero custo externo; sem PII; producer ≠ verifier (fluxo da fábrica AID-2676).
- Inserção no ÚLTIMO módulo (`o-protocolo-final`) — inserir no meio
  retravaria módulos seguintes para quem já completou (`isModuleUnlocked`
  exige TODAS as lições do módulo anterior).

## Open questions

Nenhuma bloqueante. Tema e posição foram decididos aqui; ajustes de texto
de conteúdo podem vir em reviews futuros sem mudar o contrato.
