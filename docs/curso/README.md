# Curso — Engenharia de IA para Desenvolvimento

Página estática, em PT-BR, para ensinar LLMs, harnesses, prompt/context engineering,
PRDs/specs, execução guiada, agentes, MCP/ACP/Skills e Loop Engineering.

## Abrir

Abra `index.html` diretamente no navegador. Não há build, backend, dependência externa ou
JavaScript obrigatório.

## Validar

Na raiz do repositório:

```bash
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py -q
python3 -m pytest docs/curso/workflow_lab -q
python3 docs/curso/workflow_lab/lab.py \
  --fixtures docs/curso/workflow_lab/fixtures \
  --output "$(mktemp -d)/workflow-lab"
python3 docs/curso/validate_course.py
```

O caso executável em `workflow-exemplo/` demonstra uma feature pequena de exportação CSV,
com PRD, spec, plano, implementação, testes, skill e validação honesta.

O [Workflow Lab](workflow_lab/README.md) acrescenta 11 ciclos ao material: o ciclo 00 é o
caso CSV como metadados e os ciclos 01–10 são dez workflows executáveis. Uma execução nova
produz dez artefatos JSON, um `learning.ndjson` append-only com as lições reutilizadas e um
`report.md` explicitamente derivado. Leia também a [especificação](workflow_lab/SPEC.md), a
[validação registrada](workflow_lab/VALIDACAO.md) e o [índice do skill pack](workflow_lab/skills/executar-workflows-cumulativos.md).

O pacote permanente separa responsabilidades: [`workflow-lab-build`](../../.agents/skills/workflow-lab-build/SKILL.md)
evolui um ciclo; [`workflow-lab-verify`](../../.agents/skills/workflow-lab-verify/SKILL.md) comprova o
estado em contexto separado e somente leitura; [`workflow-lab-maintain`](../../.agents/skills/workflow-lab-maintain/SKILL.md)
sincroniza evidência e material didático somente depois de um PASS independente.

Os testes provam determinismo, contratos, falhas antes da persistência e acúmulo das lições
declaradas. Eles não medem adoção por desenvolvedores, aprendizagem humana ou valor em
produção; não alteram o `Makefile` da raiz nem o estado canônico em `learner/`.
