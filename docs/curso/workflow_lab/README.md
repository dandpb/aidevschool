# Laboratório de workflows cumulativos

Este laboratório executa um conjunto pequeno de workflows de desenvolvimento
com fixtures JSON versionadas. Cada ciclo produz um artefato observável e
registra apenas as lições que declarou em `requires`.

O conjunto tem 11 ciclos: o ciclo 00 referencia o exemplo CSV já existente
em `../workflow-exemplo/`; os dez ciclos novos, 01–10, produzem artefatos
JSON em uma saída escolhida por quem executa o CLI.

## Executar e verificar

Na raiz do repositório, execute a suíte focada e depois uma execução isolada:

```sh
python3 -m pytest docs/curso/workflow_lab -q
python3 docs/curso/workflow_lab/lab.py \
  --fixtures docs/curso/workflow_lab/fixtures \
  --output "$(mktemp -d)/workflow-lab"
```

Com o diretório canônico, o segundo comando escreve um resumo JSON em
`stdout`, não escreve em `learner/` e retorna zero quando os 11 ciclos
terminam. Um diretório sem fixtures `*.json` é rejeitado. Erros do contrato
ou de um handler vão para `stderr` e retornam 1. Consulte o
[contrato do laboratório](SPEC.md) para os campos e os gates.

O modo parcial aceita um subconjunto não vazio de fixtures. Requisitos que
não estão nesse subconjunto precisam existir no ledger da saída, produzidos
por uma execução anterior; o resumo lista somente os ciclos executados nessa
chamada. A prova canônica deste curso continua sendo a execução completa das
11 fixtures em uma saída nova.

## Saída produzida

Para uma saída indicada como `OUT`, a árvore é:

```text
OUT/
├── artifacts/
│   ├── cycle-01.json
│   ├── ...
│   └── cycle-10.json
├── learning.ndjson
└── report.md
```

`learning.ndjson` é o registro durável, em formato append-only: cada execução
bem-sucedida acrescenta registros dos ciclos concluídos. `report.md` é uma
projeção derivada desse registro e declara que não é evidência independente.
Os arquivos de artefato e o relatório são substituídos atomicamente; o ledger
é anexado por último. Um arquivo `.writer.lock` torna a saída single-writer.

Não reutilize uma saída já concluída para rodar as mesmas fixtures: o
preflight rejeita ciclos previamente concluídos. Para uma nova execução, use
um diretório novo. O laboratório não muda estado de aprendiz nem usa o
relatório como prova de aprendizado humano.

## Valor observável para desenvolvimento

Os workflows fornecem artefatos locais para tarefas rotineiras: filtrar logs,
planejar dependências e renomes, verificar uma alteração, normalizar registros
e redigir achados com segredos sintéticos. O valor verificável aqui é o
artefato determinístico e os testes que exercitam os gates; não há medição de
uso, nota de usuário ou alegação de valor humano comprovado.

## Exercício: quebre e restaure uma dependência

O exercício usa cópias temporárias. Ele remove a única lição exigida pelo
ciclo 01, mostra que o preflight falha antes de criar artefatos e depois
restaura a fixture para uma execução completa.

1. Crie a cópia de trabalho e remova `requires` de `01-cycle-01.json`.

   ```sh
   LAB_TMP="$(mktemp -d)"
   cp -R docs/curso/workflow_lab/fixtures "$LAB_TMP/fixtures"
   python3 - "$LAB_TMP/fixtures/01-cycle-01.json" <<'PY'
   import json
   import sys
   from pathlib import Path

   path = Path(sys.argv[1])
   fixture = json.loads(path.read_text(encoding="utf-8"))
   fixture["requires"] = []
   path.write_text(json.dumps(fixture), encoding="utf-8")
   PY
   ```

2. Execute o CLI e observe a falha e a ausência do artefato do ciclo 01.

   ```sh
   python3 docs/curso/workflow_lab/lab.py \
     --fixtures "$LAB_TMP/fixtures" --output "$LAB_TMP/output"
   test ! -e "$LAB_TMP/output/artifacts/cycle-01.json"
   ```

   O processo retorna 1 e `stderr` contém
   `cycle-01 requires at least one lesson`. O diretório de saída pode existir,
   mas o preflight não cria artefatos, ledger ou relatório.

3. Restaure a fixture, escolha uma saída nova e rode novamente.

   ```sh
   cp docs/curso/workflow_lab/fixtures/01-cycle-01.json \
     "$LAB_TMP/fixtures/01-cycle-01.json"
   python3 docs/curso/workflow_lab/lab.py \
     --fixtures "$LAB_TMP/fixtures" --output "$LAB_TMP/output-ok"
   test -e "$LAB_TMP/output-ok/artifacts/cycle-01.json"
   test -e "$LAB_TMP/output-ok/learning.ndjson"
   ```

O observável final é o resumo com `cycle-00` a `cycle-10`, dez artefatos JSON
e um ledger com 11 linhas. Remova `LAB_TMP` manualmente quando terminar.

## Documentos relacionados

- [Especificação do contrato](SPEC.md)
- [Índice humano do skill pack](skills/executar-workflows-cumulativos.md)
- [Build: evoluir um ciclo](../../../.agents/skills/workflow-lab-build/SKILL.md)
- [Verify: provar de forma independente](../../../.agents/skills/workflow-lab-verify/SKILL.md)
- [Maintain: sincronizar o estado aprovado](../../../.agents/skills/workflow-lab-maintain/SKILL.md)
- [Exemplo CSV que fundamenta o ciclo 00](../workflow-exemplo/SPEC.md)
