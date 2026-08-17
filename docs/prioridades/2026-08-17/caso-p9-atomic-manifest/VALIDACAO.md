# VALIDAÇÃO — P9: escrita atômica do manifest do gate

## Nota de escopo

O item original do audit (verifier pixelDojo com `write_text()`) está **obsoleto**: o verifier
foi removido do pixelDojo e `write_literacy_receipt` já usa `atomic_write_text`. A busca fresca
encontrou um único ponto não atômico no caminho de produção do gate:
`learner/gate/core.py::write_manifest`.

## RED

```bash
python3 -m pytest learner/gate/tests/test_manifest_atomic.py -q
```

```text
FAILED test_write_manifest_commits_via_os_replace
AssertionError: write_manifest must commit via os.replace
```

## Correção

`write_manifest` agora grava em `*.tmp` e comita com `os.replace`, mesmo padrão de
`atomic_write_json` no mesmo módulo.

## GREEN

```bash
python3 -m pytest learner/gate/tests/test_manifest_atomic.py learner/gate/tests -q
```

```text
209 passed in 1.58s
```

## Entregue de verdade

- `learner/gate/core.py`: manifest commitado atomicamente.
- `learner/gate/tests/test_manifest_atomic.py`: 2 testes (contrato de `os.replace` + conteúdo
  sem sobra de `.tmp`).

## Limites

- O teste prova o uso de `os.replace`, não simula um crash real de kernel/FS.
- Helpers atômicos ainda existem em dois módulos (`gate/core.py` e `substrate/fsio.py`);
  unificá-los é refatoração separada, fora deste caso.
