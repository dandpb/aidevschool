# Validação do Workflow Lab

O ciclo 00 referencia a validação do exemplo CSV. Os ciclos 01–10 executam dez handlers,
produzem dez artefatos JSON e acumulam somente as lições declaradas em `requires`.
`report.md` continua sendo uma projeção derivada, não evidência independente, e nenhum
registro afirma aprendizado humano.

## Resultado final observado

```text
rtk pytest docs/curso/workflow-exemplo/test_export_tasks.py docs/curso/workflow_lab/test_*.py -q
Pytest: 61 passed

rtk proxy python3 docs/curso/workflow_lab/lab.py \
  --fixtures docs/curso/workflow_lab/fixtures \
  --output docs/curso/workflow_lab/evidence/full-run-final
{"cycles_completed": ["cycle-00", ..., "cycle-10"], "ledger": "learning.ndjson", "report": "report.md"}
```

A execução pública retornou zero e produziu:

- [dez artefatos JSON](evidence/full-run-final/artifacts/), um para cada ciclo 01–10;
- [um ledger com 11 registros](evidence/full-run-final/learning.ndjson), em ordem de 00 a 10;
- [um relatório derivado](evidence/full-run-final/report.md), rotulado como não independente.

O SHA-256 do ledger é
`e639f841b46d8b89e70ae6eae452d5b5ddd545e07ae92d295d867046a507bf31`; o do relatório é
`675028bc7485a9ba5ccadaf381a31afb3fbe02306ef21b6b52f02a7ed4862027`. Os dez
artefatos podem ser conferidos com:

```text
shasum -a 256 docs/curso/workflow_lab/evidence/full-run-final/artifacts/*.json
```

## O que a suíte prova

- Os 11 ciclos resolvem somente os requisitos declarados e geram dez artefatos.
- Toda lição dos ciclos 00–09 tem consumidor posterior; o ciclo 10 resolve três lições.
- Duas execuções em saídas novas produzem artefatos, ledger e relatório byte a byte iguais.
- Um handler inválido no ciclo 10 falha antes de criar artefatos, ledger ou relatório.
- O access log rejeita inclusive uma linha vazia antes de calcular p50/p95.
- O scanner nunca serializa os valores sintéticos reconhecidos.
- O CLI funciona por caminho público, inclusive a partir de outro diretório de trabalho.
- Um diretório sem fixtures falha sem criar artefatos, ledger ou relatório.
- Um ledger contendo JSON válido fora do schema falha na linha de leitura antes de criar artefatos ou relatório.

## Exercício observado

Em uma cópia temporária, a última dependência do ciclo 10 foi trocada por
`lesson-not-produced`. O CLI retornou 1 com
`missing requirement lesson-not-produced for cycle-10` e não escreveu saídas duráveis.
Depois de restaurar a fixture, o mesmo passo retornou 0, criou dez artefatos, 11 linhas no
ledger e manteve o rótulo de projeção derivada no relatório.

## Skill pack observado

As três responsabilidades permanentes foram materializadas em `.agents/skills/` e passaram
pelo validador oficial do Skill Creator:

```text
rtk proxy python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/workflow-lab-build
Skill is valid!
rtk proxy python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/workflow-lab-verify
Skill is valid!
rtk proxy python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/workflow-lab-maintain
Skill is valid!
```

`workflow-lab-build` possui a mudança executável, `workflow-lab-verify` produz um veredito
somente leitura em saídas novas e `workflow-lab-maintain` sincroniza os ativos publicados
somente depois de um PASS independente. As skills tornam o procedimento repetível; elas não
rodam automaticamente e não substituem o gate.

## Limites honestos

Esta validação demonstra contratos, determinismo, falhas visíveis e reuso explícito de
lições. Ela não mede adoção, satisfação ou aprendizado de desenvolvedores. Uma negação de
política válida no ciclo 07 é um artefato observável, não uma exceção. As trocas de cada
artefato e do relatório são atômicas, mas uma falha de sistema operacional entre arquivos
pode deixar saída parcial; o ledger é anexado por último. O runner é single-writer e os
segredos usados são deliberadamente sintéticos.

## Histórico da fatia inicial: ciclos 00–01

Antes dos dez handlers, o tracer bullet continha somente o ciclo de metadados 00 e o filtro
NDJSON do ciclo 01. A cronologia abaixo foi preservada porque registra o primeiro vermelho,
as correções e a refatoração sem alterar os bytes daquela fatia.

### TDD vermelho

Comando inicial:

```text
rtk pytest -q docs/curso/workflow_lab/test_lab.py
```

Saída observada:

```text
1 failed
python3: can't open file '.../docs/curso/workflow_lab/lab.py': [Errno 2] No such file or directory
```

Casos de erro adicionados em ciclos vermelhos separados:

```text
rtk pytest -q docs/curso/workflow_lab/test_lab.py -k malformed
1 failed
AssertionError: assert 'line 2' in 'Expecting value: line 1 column 1 (char 0)'

rtk pytest -q docs/curso/workflow_lab/test_lab.py -k missing_requirement
1 failed
AssertionError: assert 'missing requirement safe-serialization-explicit-scope' in "'safe-serialization-explicit-scope'"
```

### TDD verde e auditoria

```text
rtk pytest -q docs/curso/workflow_lab/test_lab.py
Pytest: 7 passed

rtk proxy python3 <caminho-local>/check-no-excuse-rules.py docs/curso/workflow_lab/lab.py docs/curso/workflow_lab/test_lab.py
no violations in 2 file(s)
# (observação local: script do plugin omo, caminho específico da máquina — não é passo de reprodução)

rtk ruff check docs/curso/workflow_lab/lab.py docs/curso/workflow_lab/test_lab.py
[]
```

Os cenários públicos cobrem sucesso, JSON malformado com linha 1-based, objeto inválido com linha 1-based, requisito ausente, requisito adiantado, ciclo de requisitos e rejeição de ciclo já concluído. Falhas de preflight não criam o artefato do ciclo 01.

### Execução real inicial

```text
rtk proxy python3 docs/curso/workflow_lab/lab.py --fixtures docs/curso/workflow_lab/fixtures --output docs/curso/workflow_lab/evidence/real-run-final
{"cycles_completed": ["cycle-00", "cycle-01"], "ledger": "learning.ndjson", "report": "report.md"}
```

Artefatos capturados:

- `evidence/real-run-final/learning.ndjson` — duas linhas, uma por ciclo; SHA-256 `681d9685a7dcbf9b596e53bc44dd663a8e77c990570f12f63c9d54d5d692b50d`.
- `evidence/real-run-final/artifacts/cycle-01.json` — dois registros `req-7` + `error`, em ordem, e `counts_by_level.error = 2`; SHA-256 `6dc227f2b6ea3bc90ce8737f45ebc8d8c4410278506b4883c289587155ac10db`.
- `evidence/real-run-final/report.md` — explicitamente rotulado como projeção derivada; SHA-256 `8fa0ddbf615b199c692ca1c70481dfbfb185d7f2eda2a0eab8fa1954fc08b9ca`.

### Refatoração por responsabilidade

O CLI público permaneceu em `lab.py`. Contratos e preflight foram movidos para `contracts.py`; persistência para `storage.py`; o único handler executável daquela fatia para `handlers/structured.py`; despacho para `registry.py`; e orquestração para `engine.py`. O envelope compartilhado de `Cycle` expõe os dados restantes da fixture como payload JSON tipado, interpretado somente pelo handler. Naquele checkpoint, os ciclos 02–10 ainda não existiam.

Após cada extração segura, o comando abaixo permaneceu verde com sete cenários:

```text
rtk pytest -q docs/curso/workflow_lab/test_lab.py
Pytest: 7 passed
```

Gates finais:

```text
rtk ruff check docs/curso/workflow_lab/lab.py docs/curso/workflow_lab/contracts.py docs/curso/workflow_lab/engine.py docs/curso/workflow_lab/registry.py docs/curso/workflow_lab/storage.py docs/curso/workflow_lab/handlers/__init__.py docs/curso/workflow_lab/handlers/structured.py docs/curso/workflow_lab/test_lab.py
[]

rtk proxy python3 /Users/danielbarreto/.codex/plugins/cache/sisyphuslabs/omo/4.19.4/skills/programming/scripts/python/check-no-excuse-rules.py docs/curso/workflow_lab/lab.py docs/curso/workflow_lab/contracts.py docs/curso/workflow_lab/engine.py docs/curso/workflow_lab/registry.py docs/curso/workflow_lab/storage.py docs/curso/workflow_lab/handlers/__init__.py docs/curso/workflow_lab/handlers/structured.py docs/curso/workflow_lab/test_lab.py
no violations in 8 file(s)
```

Todos os arquivos Python ficaram abaixo de 200 linhas puras: `contracts.py` 130, `engine.py` 77, `handlers/__init__.py` 2, `handlers/structured.py` 52, `lab.py` 21, `registry.py` 15, `storage.py` 34 e `test_lab.py` 142.

O CLI também foi executado por caminho absoluto a partir de `/tmp`. `cmp -s` confirmou equivalência byte a byte com a execução anterior para ledger, artefato e relatório. Os hashes permaneceram:

- ledger: `681d9685a7dcbf9b596e53bc44dd663a8e77c990570f12f63c9d54d5d692b50d`;
- artefato: `6dc227f2b6ea3bc90ce8737f45ebc8d8c4410278506b4883c289587155ac10db`;
- relatório: `8fa0ddbf615b199c692ca1c70481dfbfb185d7f2eda2a0eab8fa1954fc08b9ca`.
