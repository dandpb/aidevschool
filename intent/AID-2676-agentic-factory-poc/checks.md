# Checks — AID-2676-agentic-factory-poc

Obrigações congeladas antes do build (HTML §02: "checks derivados e
congelados"). Formato: `C<n> | profile=<cheap|standard> | <comando>`.

```
C1 | profile=cheap | python3 -m pytest factory/tests/ -q
C2 | profile=cheap | python3 -c "import factory.coordinator, factory.gate, factory.verify, factory.queue, factory.ledger, factory.contract, factory.gitwork, factory.model"
C3 | profile=standard | python3 -m pytest factory/tests/ -q -k "e2e or negative or ledger"
```

## Notas

- `C3` (standard) exige prova produzida pelo contexto verificador —
  revalidação de digest e autoria de contexto são parte do gate (P2/P3).
- Spike de compatibilidade tlc-spec-lean: os validadores esperam outra
  estrutura de `plan.md`/`.specs/`; a adaptação declarada desta POC é o
  formato acima (IDs estáveis + comando executável), sem segundo diretório
  permanente e sem symlink (HTML §03).
- A cobertura completa por mutantes do perfil standard fica declarada como
  follow-up (spec, concerns flagged).
