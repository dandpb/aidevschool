# Spec: checagem de shape de módulo

Change-id: 2026-09-26-literacy-module-shape · From: intent.md

## Behavior

`validate_track` reporta, por módulo do `catalog.yaml`:

1. `catalog.yaml: módulo <id> sem campo obrigatório: slug` — quando ausente/vazio.
2. `catalog.yaml: módulo <id> com slug inválido: <slug>` — fora de
   `[a-z0-9][a-z0-9-]*` (minúsculas, dígitos, hífen; inicia alfanumérico).
3. `catalog.yaml: slug de módulo duplicado: <slug> (módulos <id1> e <id2>)`.
4. `catalog.yaml: módulo <id> sem campo obrigatório: title`.
5. `catalog.yaml: módulo <id> com order inválido: <order>` — não-inteiro
   (bool contado como inválido).

Erros são acumulados (não-fatais), na ordem de declaração dos módulos; a
checagem roda em `check_catalog` após `_check_prereq_journeys`.

## Non-goals

- Não validar estrutura de diretórios `modules/<slug>/`.
- Não migrar formato do catálogo; não validar `contentVersion`.
- Não alterar o compilador ou o read model gerado.

## Evidence

- Teste unitário + de pista (fixtures existentes) cobrindo os 5 diagnósticos.
- Repro do defeito original (módulo sem slug → validação verde, compile
  KeyError) vira teste de regressão.
- Trilha live (32 lições, 8 módulos) continua validando sem erros.
