# PRD — Escrita atômica do manifest de integridade do gate

## Problema

O item histórico de auditoria (verifier pixelDojo com `write_text()` direto) está obsoleto:
o verifier do Pixel foi removido e os receipts de literacia já usam `atomic_write_text`.
A única escrita não atômica restante no caminho de produção do gate é
`learner/gate/core.py::write_manifest`, que grava `.manifest.sha256` com
`path.write_text()` direto. Um crash no meio da escrita deixaria um manifest parcial, e
`verify_manifest` passaria a rejeitar keys válidas (fail fechado, mas com estado corrompido).

## Usuário

O próprio gate: o manifest protege `keys/` e `rubrics/` contra divergência.

## Objetivo

`write_manifest` usa o mesmo padrão write-temp-then-`os.replace` já estabelecido por
`atomic_write_json` no mesmo módulo.

## Escopo

- trocar a escrita em `write_manifest` por tmp + `os.replace`;
- teste de contrato: a escrita passa por `os.replace` (falha antes da correção);
- teste de conteúdo: manifest gravado bate com `manifest_hash` e não sobra `.tmp`.

## Fora de escopo

- mudar o formato do manifest;
- extrair helper compartilhado entre módulos;
- mexer em `atomic_write_json` ou no ledger.

## Critérios de aceite

- [x] Teste de atomicidade falha no código do `HEAD` e passa após a correção.
- [x] `python3 -m pytest learner/gate/tests -q` verde.
