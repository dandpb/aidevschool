# Checks — 2026-09-26-literacy-module-shape

Obrigações congeladas antes do build. Formato: `C<n> | profile=<cheap|standard> | <comando>`.

```
C1 | profile=cheap | python3 -m pytest curriculum/ai-literacy/tools/tests -q
C2 | profile=cheap | python3 curriculum/ai-literacy/tools/validate.py
C3 | profile=standard | python3 -m pytest curriculum/ai-literacy/tools/tests -q -k module_shape
```

## Notas

- C2 prova zero regressão na trilha live (32 lições ready, 8 módulos).
- C3 (standard) re-executa a suite da regra pelo contexto verificador,
  exigindo prova produzida por contexto distinto do autor (P2/P3).
