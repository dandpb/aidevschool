# Checks — AID-2715-proof-ledger-anchor

Obrigações congeladas antes do build. Formato:
`C<n> | profile=<cheap|standard> | <comando>`.

```
C1 | profile=cheap | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -m pytest factory/tests/test_p2_evidence_anchor.py -q
C3 | profile=standard | python3 -c "import factory.gate, factory.coordinator, factory.model; assert callable(factory.gate.evidence_anchor_gaps); assert callable(factory.model.proof_evidence)"
```

## Notas

- C2 isola a regressão do ataque S5 (AID-2686/S5 → AID-2715).
- C3 (standard) prova importabilidade da superfície nova pelo contexto
  verificador.
