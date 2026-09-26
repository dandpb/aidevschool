# Intent: docs pela fábrica — POC de estresse com mudança de documentação

Author: Docs & Readiness Engineer (issue AID-2698) · Change-id: AID-2698-docs-factory-poc · Status: accepted

> Origem: programa FACTORY-STRESS (umbrella AID-2681, ordem do dono em
> AID-2676). Missão da issue AID-2698: rodar 1 mudança de documentação pela
> fábrica para estressar a pergunta "a prova aceita não-código?".

## Problem

A fábrica agente (`factory/`, PR #527) provou o loop ponta-a-ponta com código
(18→150 testes), mas o produto AiDevSchool é rico em documentação com claims
datadas (guias, readiness, handbook). Não sabemos, com evidência, se o mesmo
rail aceita um diff só-de-docs com checks determinísticos sobre artefatos de
documentação — e onde a ergonomia trava para um autor de docs.

## Proposed outcome

1. Uma página nova do handbook (`docs/handbook/14_factory_docs_loop.md` +
   linha no índice do README do handbook) ensinando autoras de docs a rodar
   o loop, com claim de verificação datada e fonte.
2. Checks congelados puramente documentais (estrutura, claim datada, índice,
   links) executados pelo verificador em clean-room — prova de que não-código
  é cidadão de primeira classe na fábrica.
3. Receipt completo (comandos + saídas) na issue AID-2698, com fricções e
   propostas de melhoria replicadas no umbrella AID-2681.

## Affected users and systems

`docs/handbook/` (nova página + índice) e `intent/AID-2698-docs-factory-poc/`
(este contrato). Nenhum engine, `learner/`, `curriculum/` ou `.mavis/`.

## Constraints

- Checks stdlib-only, determinísticos, uma linha por obrigação (formato
  `factory/contract.py`).
- Autor ≠ verificador; promoção fail-closed P1–P5; runtime state só em
  `.scratch/factory/`.
- Docs de domínio de engine continuam com o dono da engine; esta página
  cobre o caminho do autor de docs e linka o dono da fábrica para internals.

## Open questions

1. O resumo de recibo (`receipt.summary.json`) pode refluir para o registro
   versionado dentro do MESMO head promovido? (registrado como fricção na
   issue — hoje é impossível por desenho: o head provado congela no gate)
