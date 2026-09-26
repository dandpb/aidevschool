# Spec — AID-2732-b5-registry-status

## Comportamento exigido

1. **`PLAN_APPROVED` reconhece as duas formas canônicas de header**
   (`docs/sdlc/templates/*.md`, `intent/README.md` "Status lives in each
   file's header"):
   - linha própria: `Status: approved` (com indentação de espaços/tabs
     permitida, como hoje);
   - campo mid-line do header template: `... · From: <path> · Status:
     approved` — ou seja, `Status:` imediatamente após o separador `·` (com
     espaços/tabs entre o separador e a chave).
2. **Estrito permanece estrito**: `Status:` NÃO satisfaz aprovação quando
   embutido em prosa — ex. `` `Status: approved` `` em backticks dentro de
   um parágrafo ou bloco de código, ou "write Status: approved somewhere".
   O token precisa ser campo de header: início de linha ou precedido de `·`.
3. **Valor**: `approved` com boundary de palavra (sem mudança semântica em
   relação ao regex atual para o valor — `Status: draft`/`accepted`/
   `approved-pending-review` continuam rejeitados como aprovação).
4. **Mensagem de erro** do `ContractError` menciona as duas formas aceitas.

## Casos negativos (parte do aceite)

- `plan.md` com header canônico mid-line (`· Status: approved`) e **sem**
  nenhuma outra menção ⇒ carrega (regressão principal; falha antes do fix).
- `plan.md` citando `` `Status: approved` `` em prosa/backticks, sem campo
  de header ⇒ `ContractError`.
- `plan.md` com `· Status: draft` ⇒ `ContractError`.
- Congelamento completo (`Coordinator.freeze`) do registro REAL
  `AID-2676-agentic-factory-poc` contra repo sintético ⇒ contrato congelado
  com digest estável; re-load do congelado bate o digest (P4).

## CI smoke de registry

- Teste que varre `intent/*/` do checkout: todo diretório com `checks.md`
  (definição operacional de registro de fábrica) DEVE carregar via
  `load_from_registry` — registra o change-id no assert para diagnóstico.
- Diretório `intent/<x>/` sintético com `checks.md` + `plan.md` inválido ⇒
  `load_from_registry` levanta `ContractError` (prova que o smoke falha
  fechado para registro inválido).
- Job novo `factory (contract+registry)` no `ci.yml` executa
  `python3 -m pytest factory/tests -q` — hoje nenhum job roda a suíte.

## Fora de escopo

- Base pinada em `freeze` (proposta 5/AID-2684) — issue própria.
- Renormalização dos registros existentes (AID-2715/AID-2721 usam forma em
  linha própria; segue válida — não há por que rewritar histórico).
