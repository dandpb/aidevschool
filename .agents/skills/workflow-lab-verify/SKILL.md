---
name: workflow-lab-verify
description: Verifique de forma independente o Workflow Lab quando alguém pedir validação, determinismo, evidência, regressão ou uma prova dos workflows cumulativos; execute a suíte, o CLI canônico e o validador em saídas temporárias, compare os 12 arquivos duráveis e entregue um relatório PASS/FAIL sem corrigir código.
---

# Verificar o Workflow Lab

Use esta skill para produzir uma prova independente do laboratório descrito em
[`README.md`](../../../docs/curso/workflow_lab/README.md) e no
[`SPEC.md`](../../../docs/curso/workflow_lab/SPEC.md). O alvo é o contrato
observável, não a confiança em `VALIDACAO.md` ou em um relatório anterior.

## Guardrails

- Trabalhe a partir da raiz do repositório, mas escreva apenas em um diretório
  novo criado por `mktemp -d`.
- Não altere código, fixtures, HTML, `learner/`, `evidence/` ou qualquer saída
  rastreada. Não atualize artefatos existentes para fazê-los passar.
- Não use rede nem um relatório derivado como evidência independente.
- Cada PASS exige o comando exato, o código de saída, um observável binário e
  o caminho do artefato temporário que o sustenta. Se uma etapa falhar, marque
  FAIL, preserve a saída para diagnóstico e não declare aprovação.

## Procedimento

1. Resolva a raiz e reserve saídas novas:

   ```sh
   set -u
   REPO_ROOT="$(git rev-parse --show-toplevel)"
   VERIFY_TMP="$(mktemp -d)"
   FIXTURES="$REPO_ROOT/docs/curso/workflow_lab/fixtures"
   LAB="$REPO_ROOT/docs/curso/workflow_lab/lab.py"
   PYTHON_BIN=""
   for candidate in python3.13 python3.12 python3.11 python3; do
     if command -v "$candidate" >/dev/null 2>&1 \
       && "$candidate" -c 'import sys; raise SystemExit(sys.version_info < (3, 11))'; then
       PYTHON_BIN="$candidate"
       break
     fi
   done
   test -n "$PYTHON_BIN"
   git -C "$REPO_ROOT" status --short -- learner > "$VERIFY_TMP/learner-before.txt"
   ```

   Registre `REPO_ROOT` e `VERIFY_TMP` no relatório final. Nunca use
   `docs/curso/workflow_lab/evidence/full-run-final` como destino. Execute cada
   gate separadamente e capture seu código de saída; não envolva a sequência
   inteira em `set -e`, pois uma falha deve chegar ao relatório `FAIL`.

2. Rode a suíte focada do exemplo e do laboratório. O retorno deve ser zero:

   ```sh
   "$PYTHON_BIN" -m pytest \
     "$REPO_ROOT/docs/curso/workflow-exemplo/test_export_tasks.py" \
     "$REPO_ROOT/docs/curso/workflow_lab" -q
   ```

   Registre o número observado de testes e o stdout/stderr capturado. O número
   deve ser conferido na execução atual, não copiado de `VALIDACAO.md`.

3. Execute o CLI canônico em uma saída nova e depois em um cwd não relacionado.
   A primeira execução testa o caminho usual; a segunda prova que o CLI não
   depende do cwd:

   ```sh
   "$PYTHON_BIN" "$LAB" --fixtures "$FIXTURES" --output "$VERIFY_TMP/run-a"
   (
     cd /tmp
     "$PYTHON_BIN" "$LAB" --fixtures "$FIXTURES" --output "$VERIFY_TMP/run-b"
   )
   ```

   Cada execução deve retornar zero e reportar `cycle-00` até `cycle-10`.
   Confirme também, com comandos que falham se algo estiver ausente:

   ```sh
   test "$(find "$VERIFY_TMP/run-a/artifacts" -type f -name 'cycle-*.json' | wc -l | tr -d ' ')" = 10
   test "$(wc -l < "$VERIFY_TMP/run-a/learning.ndjson" | tr -d ' ')" = 11
   test -s "$VERIFY_TMP/run-a/report.md"
   grep -Fq 'Derived projection; not independent evidence.' "$VERIFY_TMP/run-a/report.md"
   ```

   Os observáveis devem apontar para `run-a/artifacts/`,
   `run-a/learning.ndjson` e `run-a/report.md` dentro de `VERIFY_TMP`.

4. Prove determinismo entre as duas execuções. Compare exatamente os 12
   arquivos duráveis do contrato: dez artefatos, o ledger e o relatório.
   Use o trecho abaixo, que também falha se houver arquivo esperado ausente:

   ```sh
   "$PYTHON_BIN" - "$VERIFY_TMP/run-a" "$VERIFY_TMP/run-b" <<'PY'
   import sys
   from pathlib import Path

   first, second = map(Path, sys.argv[1:])
   durable = [Path("learning.ndjson"), Path("report.md")]
   durable += [Path("artifacts") / f"cycle-{index:02}.json" for index in range(1, 11)]
   for relative in durable:
       left, right = first / relative, second / relative
       assert left.is_file() and right.is_file(), relative
       assert left.read_bytes() == right.read_bytes(), relative
   print(f"byte-determinism: PASS ({len(durable)} durable files)")
   PY
   ```

5. Confira o acúmulo declarado de lições no ledger da primeira saída. A
   resolução deve seguir a ordem de `requires`, não incluir lições implícitas,
   e cada lição dos ciclos 00–09 deve ser consumida por um ciclo posterior:

   ```sh
   "$PYTHON_BIN" - "$VERIFY_TMP/run-a/learning.ndjson" <<'PY'
   import json
   import sys
   from pathlib import Path

   records = [json.loads(line) for line in Path(sys.argv[1]).read_text().splitlines()]
   assert [record["cycle_id"] for record in records] == [f"cycle-{i:02}" for i in range(11)]
   for record in records:
       resolved = record["resolved_requires"]
       assert [lesson["lesson_id"] for lesson in resolved] == record["requires"]
   consumed = {lesson for record in records for lesson in record["requires"]}
   assert {record["lesson_id"] for record in records[:10]} <= consumed
   assert len(records[-1]["resolved_requires"]) == 3
   print("declared-learning-resolution: PASS (11 records; cycles 00-09 consumed)")
   PY
   ```

6. Rode o validador da página a partir da raiz. Ele deve retornar zero e
   confirmar âncoras, links locais, recursos externos e que JavaScript não é obrigatório:

   ```sh
   "$PYTHON_BIN" "$REPO_ROOT/docs/curso/validate_course.py"
   git -C "$REPO_ROOT" status --short -- learner > "$VERIFY_TMP/learner-after.txt"
   cmp "$VERIFY_TMP/learner-before.txt" "$VERIFY_TMP/learner-after.txt"
   ```

   Inclua o stdout capturado e a confirmação de que o estado Git visível de
   `learner/` não mudou; não substitua esse resultado por uma inspeção visual ou
   pelo conteúdo de uma documentação anterior.

7. Escreva um relatório de verificação em
   `$VERIFY_TMP/verification-report.md`. O relatório precisa conter:

   - data/hora, raiz, diretório temporário e commit observado;
   - cada invocação acima, seu retorno e o observável correspondente;
   - caminhos dos 12 arquivos comparados e a confirmação de igualdade byte a
     byte;
   - a resolução das lições declaradas, o estado preservado de `learner/` e o
     resultado do validador da página;
   - um único veredito `PASS` somente se todas as etapas passarem, ou `FAIL`
     com a primeira falha, sem editar a implementação para removê-la.

   O relatório e as saídas em `VERIFY_TMP` são a evidência desta invocação e
   podem ser descartados depois; nenhum arquivo de evidência do repositório
   deve ser reescrito.

## Critério de conclusão

A skill terminou somente quando a suíte, as duas execuções em cwd distintos, a
contagem dos 12 arquivos, a comparação byte a byte, a resolução declarada das
lições, a ausência de mudança visível em `learner/` e `validate_course.py` foram
executados nesta invocação, e
`$VERIFY_TMP/verification-report.md` contém o veredito fundamentado. Um teste
verde isolado ou um relatório pré-existente não satisfaz este critério.

## Referências

- [Contrato do laboratório](../../../docs/curso/workflow_lab/SPEC.md)
- [Procedimento de execução](../../../docs/curso/workflow_lab/README.md)
- [Validação registrada, somente como contexto](../../../docs/curso/workflow_lab/VALIDACAO.md)
