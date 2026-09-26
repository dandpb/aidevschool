# Spec — AID-2734-plan-status-inline

## Comportamento exigido (critérios de aceite de AID-2734, citados)

1. Loop documentado do `factory/README.md` executa na árvore do fix:
   intake → claim → **freeze** com `--change-id AID-2676-agentic-factory-poc`
   termina rc=0.
2. Teste de contrato mútuo template↔parser em `factory/tests/`:
   (i) header renderizado do template com `Status: approved` inline passa;
   (ii) formato legado início-de-linha passa;
   (iii) `Status: draft` inline e ausência de Status continuam BLOQUEANDO.
3. Sem enfraquecimento: `pytest factory/tests/ -q` verde com os novos
   negativos.
4. A correção atravessa o SDLC: `intent/AID-2734-plan-status-inline/`
   (intent.md citando AID-2729; spec/plan/checks), produtor ≠ verificador
   (P3), gate, PR com linha `Countersign:` na merge message.

## Não-funcional / fronteiras

- Fail-closed preservado: apenas `Status: approved` (boundary de palavra)
  aprova; `draft`, outros valores e ausência de marcador bloqueiam o freeze.
- Fora de escopo: traceback/exit-1 do CLI nessa falha (AID-2728, BAIXA).
- Sem mudança de CLI, formato de estado ou recibo; sem reformatar registros
  existentes em `intent/`.
