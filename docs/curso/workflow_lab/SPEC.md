# Especificação do Workflow Lab

## Escopo

O Workflow Lab é um executor local de fixtures JSON. Ele recebe um diretório
de fixtures e outro de saída; não inicia serviços, não chama rede e não altera
o estado canônico em `learner/`. O ciclo 00 apenas referencia o exemplo CSV
existente. Os ciclos 01–10 chamam handlers registrados e escrevem artefatos.

## Ciclos canônicos

| Ciclo | Trabalho e handler | Entrada versionada | Artefato | Gate principal | Lição promovida e `requires` |
| --- | --- | --- | --- | --- | --- |
| 00 | Metadados do CSV; `metadata-only` | `00-cycle-00.json` | `../workflow-exemplo/VALIDACAO.md` | contrato exato do ciclo 00 | `safe-serialization-explicit-scope`; nenhum |
| 01 | Filtra NDJSON por `request_id` e `level`; `filter-ndjson` | `01-cycle-01.json`: linhas e filtros | `artifacts/cycle-01.json` | linha inválida falha com número 1-based | `ndjson-exact-and-filter`; `safe-serialization-explicit-scope` |
| 02 | Aplica patch raso de configuração; `patch-json-config` | `02-cycle-02.json`: `document` e `patch` | `artifacts/cycle-02.json` | ambos devem ser objetos | `validate-before-atomic-replace`; `safe-serialization-explicit-scope` |
| 03 | Calcula retentativas; `build-retry-schedule` | `03-cycle-03.json`: UTC, tentativas e limites | `artifacts/cycle-03.json` | tempo canônico e inteiros positivos | `time-is-explicit-input`; `safe-serialization-explicit-scope` |
| 04 | Faz snapshot TTL/LRU; `snapshot-ttl-cache` | `04-cycle-04.json`: `now`, capacidade e entradas | `artifacts/cycle-04.json` | expira antes de ranquear; chaves únicas | `eligibility-before-ranking`; `time-is-explicit-input` |
| 05 | Ordena dependências; `plan-task-dependencies` | `05-cycle-05.json`: tarefas e durações | `artifacts/cycle-05.json` | referências válidas e DAG | `validate-complete-plan`; `ndjson-exact-and-filter`, `eligibility-before-ranking` |
| 06 | Planeja renomes sem mutar arquivos; `plan-safe-renames` | `06-cycle-06.json`: arquivos e renomes | `artifacts/cycle-06.json` | caminhos canônicos; fonte e destino válidos | `canonical-root-relative-paths`; `validate-complete-plan` |
| 07 | Verifica diff unificado; `check-unified-diff` | `07-cycle-07.json`: diff e política | `artifacts/cycle-07.json` | parse estreito; nega fora da política | `fail-closed-narrow-policy`; `canonical-root-relative-paths` |
| 08 | Resume access log; `summarize-access-log` | `08-cycle-08.json`: linhas fixas | `artifacts/cycle-08.json` | valida todas as linhas antes de agregar | `validate-all-before-derive`; `ndjson-exact-and-filter` |
| 09 | Migra registros v1/v2; `migrate-records-v1-v2` | `09-cycle-09.json`: registros versionados | `artifacts/cycle-09.json` | schema exato, IDs únicos | `canonical-version-output`; `validate-before-atomic-replace`, `validate-all-before-derive` |
| 10 | Localiza segredos sintéticos; `scan-synthetic-secrets` | `10-cycle-10.json`: arquivos sintéticos | `artifacts/cycle-10.json` | caminho canônico e preview sempre redigido | `redact-before-reporting`; `safe-serialization-explicit-scope`, `fail-closed-narrow-policy`, `canonical-version-output` |

Todo ciclo de 00 a 09 tem sua lição requerida por algum ciclo posterior no
conjunto canônico. O ciclo 10 resolve três lições declaradas. Esse é um
invariante exercitado pela suíte do conjunto, não uma afirmação sobre
aprendizado humano.

## Fixture e preflight

Cada fixture deve ser um objeto JSON com o envelope:

```text
cycle_id       string não vazia no formato cycle-NN
handler        string do enum público de handlers
requires       lista de IDs de lição não vazios
lesson_id      string não vazia
lesson_text    string não vazia
artifact_path  string não vazia
```

Os campos restantes são o payload específico do handler. As fixtures são
descobertas por `glob("*.json")` em ordem lexicográfica; nenhum arquivo
encontrado é erro. Para os handlers dos ciclos 01–10, `requires` não pode ser
vazio e `artifact_path` precisa ser exatamente
`artifacts/cycle-NN.json`. O ciclo 00 é a exceção declarada na tabela.

Antes de chamar qualquer handler, o preflight rejeita IDs de ciclo ou lição
duplicados, requisitos repetidos, requisitos ausentes, ciclos de requisitos,
requisitos adiantados e ciclos já marcados como concluídos no ledger. Assim,
uma falha de preflight não cria artefatos, `learning.ndjson` nem `report.md`.

## CLI público

```sh
python3 docs/curso/workflow_lab/lab.py \
  --fixtures CAMINHO/DE/FIXTURES --output CAMINHO/DE/SAIDA
```

Os dois argumentos são obrigatórios e são caminhos. Em sucesso, o processo
retorna 0 e escreve somente um objeto JSON em `stdout`:

```json
{
  "cycles_completed": ["cycle-00", "...", "cycle-10"],
  "ledger": "learning.ndjson",
  "report": "report.md"
}
```

O exemplo mostra a execução canônica completa. Em modo parcial, um diretório
não vazio pode conter apenas os próximos ciclos; requisitos anteriores devem
estar no ledger da saída e `cycles_completed` lista somente os ciclos desta
chamada.

Se argumentos obrigatórios estiverem ausentes, o `argparse` escreve uso em
`stderr` e retorna 2. Se nenhum `*.json` for encontrado, ou houver erro de
parsing da fixture, preflight, persistência ou handler, o processo retorna 1,
não escreve resumo em `stdout` e escreve a mensagem em `stderr`. Por exemplo,
uma fixture de ciclo 01 sem requisitos escreve
`cycle-01 requires at least one lesson` em `stderr`.

## Persistência e determinismo

O executor constrói todos os bytes dos artefatos antes de persistir. Cada
artefato e `report.md` usam escrita atômica; após isso o executor acrescenta
os registros do ciclo em `learning.ndjson`. O lock `.writer.lock` permite um
único escritor por diretório de saída.

Os handlers serializam artefatos JSON de modo determinístico; o conjunto
canônico é testado em duas saídas novas para igualdade byte a byte de todos os
artefatos, ledger e relatório. Cada registro de ledger contém:

```text
cycle_id, handler, requires, resolved_requires, fixture_sha256,
artifact_path, lesson_id, lesson_text, status
```

`resolved_requires` inclui somente os registros das lições citadas em
`requires`, na mesma ordem. `fixture_sha256` é SHA-256 dos bytes da fixture.
O ledger é a fonte persistida; `report.md` apenas lista seus ciclos e é
explicitamente rotulado como projeção derivada, não evidência independente.

## Limites

Este laboratório não confirma valor para pessoas, domínio de conteúdo ou uso
em produção. Também não aplica renomes, não executa retentativas, não trata
segredos reais e não transforma o relatório em evidência independente. Use os
testes e os artefatos como prova executável do contrato, dentro desses limites.
