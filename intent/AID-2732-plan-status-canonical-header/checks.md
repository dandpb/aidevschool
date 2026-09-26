# Checks — AID-2732-plan-status-canonical-header

Obrigações congeladas antes do build. Formato:
`C<n> | profile=<cheap|standard> | <comando>`.

```
C1 | profile=cheap | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -c "import factory.contract, factory.coordinator, factory.gate, factory.verify, factory.queue, factory.ledger, factory.gitwork, factory.model"
C3 | profile=standard | python3 -m pytest factory/tests/ -q -k "canonical"
```

## Notas

- C3 (standard) cobre o arquivo novo `test_plan_status_canonical.py`
  (positivos + negativos do header canônico) e deve ser produzido pelo
  contexto verificador (P2/P3).
- C1 mantém a suíte completa da fábrica (18 casos pré-existentes +
  novos) para regressão das estações.
