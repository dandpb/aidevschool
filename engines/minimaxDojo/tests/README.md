# tests/ — Testes de contrato do core

> Estes testes cobrem a **implementação de referência** em [`../core/`](../core/) (state machine,
> portões empíricos, memória) — garantem que a espec determinística se comporta como documentado.
> **Não são** os testes do aluno: esses rodam **por unidade** e **por linguagem foco** via portão
> empírico (ver [`../core/gates/README.md`](../core/gates/README.md)).

## Suítes

- `test_state_machine.py` — transições, invariantes e limite de retries da `UnitStateMachine`.
- `test_empirical_gates.py` — limiares de mutação/cobertura e blacklist de anti-padrões.
- `test_event_store.py` — log de eventos append-only (NDJSON).
- `test_config_seam.py` — o seam `config/learner.yaml` (marcador `⟨config: path⟩`).
- `test_learning_unit_e2e_contract.py` — contrato fim-a-fim de uma unidade.

## Rodar

Os testes importam via caminho absoluto (`engines.minimaxDojo.core...`), então rode **a partir da
raiz do ecossistema**:

```bash
python3 -m unittest discover -s engines/minimaxDojo/tests -t .
```

> Se você está procurando:
> - **Como os testes do aluno são rodados** → `prompts/per_agent/promotor.md` (PROMĘTOR)
> - **DoD por unidade** → `docs/03_robustness_trail.md`
> - **Catálogo de ferramentas de teste** → `docs/04_empirical_gates.md` § 7
