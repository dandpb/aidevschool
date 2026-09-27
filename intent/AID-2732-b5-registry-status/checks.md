# Checks — AID-2732-b5-registry-status

Obrigações congeladas antes do build. Formato:
`C<n> | profile=<cheap|standard> | <comando>`.

```
C1 | profile=cheap | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_b5_canonical_registry.py factory/tests/test_registry_smoke.py -q
C3 | profile=standard | python3 -c "from pathlib import Path; from factory.contract import load_from_registry; c = load_from_registry(Path('intent'), 'AID-2676-agentic-factory-poc', 'HEAD'); print('canonical registry loads:', c.change_id, c.digest[:12])"
```

## Notas

- C2 isola a regressão B5 (AID-2683 F0/#10 · AID-2684 #3/#17 · AID-2686
  #5/F1 → AID-2732).
- C3 é a repro mínima do corpo da AID-2732: `load_from_registry` sobre o
  registro canônico de `main` — saída obrigatória non-empty no receipt.
