# Plan: checagem de shape de módulo

Change-id: 2026-09-26-literacy-module-shape · From: spec.md
Status: approved

Aprovação: ordem do dono no programa de estresse (AID-2676, comentário
09-26: "todos os agentes testam" via fábrica) + missão AID-2689 ("1 mudança
real de plataforma de currículo pela fábrica, integrando-se ao fluxo
`intent/`"), executada sob o guarda-corpo de PR com review humano.

## Files that change

- `curriculum/ai-literacy/tools/catalog_rules.py` — novo `_check_module_shape`
  + `MODULE_SLUG_RE`.
- `curriculum/ai-literacy/tools/semantic.py` — import e chamada em
  `check_catalog`.
- `curriculum/ai-literacy/tools/tests/test_module_shape.py` (novo) — 4 casos
  (repro KeyError, duplicidade/title, formato/order, unitário bool/empty).
- `curriculum/ai-literacy/tools/tests/test_semantic_branches.py` — contagem
  de erros de `check_catalog` 9→12 (fixture `known` sem slug/title/order).
- `intent/2026-09-26-literacy-module-shape/` — este contrato.

## Order of work

1. Contrato congelado (este diretório) ANTES do build (P4).
2. Patch do autor aplicado em worktree isolado na base c54e12ee.
3. Prova do verificador: C1 (suite), C2 (trilha live), C3 (standard).
4. Gate P1–P5 com head do PR == SHA provado; PR aberto para decisão humana
   (merge é do FPE até a política R1).

## Risks

- Falso positivo em módulo live com slug fora do padrão → verificado: os 8
  módulos live satisfazem a regra (probe 2026-09-26).
- Quebra de contrato de testes existentes → apenas a contagem 9→12,
  atualizada junto com justificativa no próprio teste.
