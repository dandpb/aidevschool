# SPEC — Verificador de higiene do working tree

## Estado atual

Na entrada desta rodada, `git check-ignore` não reconhecia:

- `engines/codexdojo-os-prototype/.env.production.local`;
- `kimi-debug-session_-20260817-104125.zip`;
- `engines/codexdojo-os-prototype/test-results-pilot/`.

O arquivo `.env.production` existente é usado pelo piloto como configuração de URLs de build e
também fica coberto pela regra genérica `.env.*`. Ele exige revisão separada antes de um eventual
`git add`; esta verificação não aprova seu conteúdo.

## Estado desejado

O `.gitignore` da raiz cobre esses artefatos e um script local prova a regra sem abrir nem
imprimir o conteúdo dos arquivos.

## Interface do verificador

```text
python3 docs/prioridades/2026-08-17/caso-p1-higiene/verify_hygiene.py
```

Saída esperada:

```text
hygiene verification: PASS
ignored paths: 4
tracked sensitive candidates: 0
values inspected: no
```

## Regras

1. Use `git check-ignore --no-index --quiet` por caminho.
2. Procure apenas nomes rastreados que sejam candidatos perigosos; não leia valores.
3. Falhe fechado se um caminho local esperado não estiver ignorado.
4. Não trate `.env.production` como seguro apenas por nome; mantenha a revisão explícita.
5. A regra não deve remover arquivos locais necessários ao piloto.

## Limites

O verificador não é um scanner de conteúdo, não prova que nenhum segredo existe e não substitui
revisão humana de novos artefatos.
