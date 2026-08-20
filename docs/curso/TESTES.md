# Testes do curso e do workflow

## Objetivo

Verificar que a entrega funciona como página estática offline, que o caso canário do workflow
é executável de verdade e que os dez workflows cumulativos têm contratos e artefatos observáveis.

## Testes automatizados

A partir da raiz do repositório:

```bash
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py -q
python3 -m pytest docs/curso/workflow_lab -q
python3 docs/curso/workflow_lab/lab.py \
  --fixtures docs/curso/workflow_lab/fixtures \
  --output "$(mktemp -d)/workflow-lab"
python3 docs/curso/validate_course.py
```

Quando o Skill Creator do Codex estiver instalado, valide também o pacote operacional:

```bash
for skill in workflow-lab-build workflow-lab-verify workflow-lab-maintain; do
  python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py ".agents/skills/$skill"
done
```

O primeiro comando cobre o núcleo de exportação CSV. A suíte do `workflow_lab` cobre os 11
ciclos (00 de metadados e 01–10 executáveis), os dez artefatos JSON, o `learning.ndjson`, a
projeção `report.md`, o determinismo entre saídas novas e a falha sem persistência. O CLI deve
retornar zero e resumir `cycle-00` a `cycle-10`; a saída deve conter dez artefatos JSON e um
ledger com 11 linhas. O último comando verifica HTML/CSS, âncoras, links locais, módulos
obrigatórios, ausência de recursos externos e ausência de JavaScript obrigatório.

## Checklist manual

- [ ] Abrir `docs/curso/index.html` diretamente no navegador.
- [ ] Navegar pelos links do topo em viewport largo.
- [ ] Reduzir a janela e confirmar navegação horizontal e leitura em viewport estreito.
- [ ] Usar `Tab` e confirmar foco visível.
- [ ] Abrir os seis artefatos do caso CSV.
- [ ] Executar o CLI em uma saída temporária e conferir os dez artefatos JSON.
- [ ] Conferir 11 linhas em `learning.ndjson` e a marca de projeção derivada em `report.md`.
- [ ] Confirmar que uma fixture sem requisito falha antes de criar artefato, ledger ou relatório.
- [ ] Conferir que a implementação declara HTTP e banco fora do escopo.
- [ ] Conferir que Build, Verify e Maintain continuam com responsabilidades separadas.

## Limites

A validação estrutural não substitui um smoke visual em cada navegador. O laboratório prova
execução determinística, contratos, artefatos e reuso explícito de lições; não prova adoção por
desenvolvedores, aprendizagem humana, uma rota HTTP ou uma integração com banco. Essas integrações
foram excluídas intencionalmente das fatias offline. O `Makefile` da raiz permanece inalterado.
