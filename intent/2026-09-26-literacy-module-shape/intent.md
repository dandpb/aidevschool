# Intent: checagem de shape de módulo no validador ai-literacy

Change-id: 2026-09-26-literacy-module-shape · Status: accepted · Origin: AID-2689 (FACTORY-STRESS)

> Mudança real de plataforma de currículo executada pela fábrica agente
> (`factory/`, PR #527/#529) como POC de estresse do programa AID-2681.

## Problem

O validador da trilha (`curriculum/ai-literacy/tools/validate.py`) não valida
campos de módulo (`slug`, `title`, `order`). O compilador do read model
(`compiler.py:_modules_payload`) indexa esses campos diretamente: um catálogo
com módulo sem `slug` passa na validação (0 erros) e **quebra o compile com
`KeyError: 'slug'`** — reproduzido ao vivo em 2026-09-26 contra c54e12ee.
Slugs duplicados colidem no roteamento por slug das superfícies que consomem
o read model.

## Proposed outcome

`_check_module_shape` no `catalog_rules.py`, ligada ao pipeline semântico:
slug obrigatório, kebab-case (`[a-z0-9][a-z0-9-]*`), único por catálogo;
`title` obrigatório; `order` inteiro. Autor de conteúdo passa a ver erro de
validação legível em CI em vez de traceback no compile. Zero mudança para o
aprendiz (tooling apenas; catálogo live já satisfaz a regra — verificado).

## Affected users and systems

- Content Designer (autoria): novo diagnóstico precoce.
- CI (`.github/workflows/ci.yml`, job python): suite existente
  `curriculum/ai-literacy/tools/tests` cobre a regra automaticamente.
- Nenhuma superfície learner/, nenhum engine, nenhum formato de lição muda.

## Constraints

- Escopo estrito: `curriculum/ai-literacy/tools/` (+ testes). Sem toques em
  `engines/`, `learner/`, `.mavis/`.
- Catálogo live permanece verde (zero regressão nas lições live).
- Mudança produzida pela fábrica: produtor (`agent-author`) ≠ verificador
  (`agent-verifier`); contrato congelado antes do build (P1–P5).
