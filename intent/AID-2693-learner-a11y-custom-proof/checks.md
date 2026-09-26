# Checks — AID-2693-learner-a11y-custom-proof

Prova custom de acessibilidade (não-default) na estação Provar.
Formato: `C<n> | profile=<cheap|standard> | <comando shell>` — sem operadores
de pipe `|`/`||` nos comandos (o parser de checks.md os corrompe; ver fricção
#1 relatada no programa FACTORY-STRESS).

C1 | profile=cheap | python3 scripts/a11y_check.py docs/curso-simples/index.html --pair text:bg --pair muted:bg --pair muted:surface --pair faint:bg --pair faint:surface --pair faint:surface-2 --pair faint:surface-3 --pair blue:bg --pair yellow:bg --pair green:bg --pair red:bg --pair code-text:code-bg --min-contrast 4.5
C2 | profile=standard | python3 scripts/a11y_check.py docs/curso-simples/index.html --full --pair text:bg --pair muted:bg --pair muted:surface --pair faint:bg --pair faint:surface --pair faint:surface-2 --pair faint:surface-3 --pair blue:bg --pair yellow:bg --pair green:bg --pair red:bg --pair code-text:code-bg --min-contrast 4.5
C3 | profile=cheap | python3 -m py_compile scripts/a11y_check.py

## Notas

- C2 (standard) exige prova produzida pelo contexto verificador (P2/P3) e é
  a prova completa: estrutura + contraste + guards progressivos.
- Contraste cobre apenas pares de tokens declarados (limite da análise
  estática; cores de runtime ficam para E2E de engine).
- Avisos (warnings) não falham a prova; apenas violações (exit 1). A política
  de severidade mora dentro do checker porque o formato checks.md não
  expressa severidade (fricção #4 do programa).
