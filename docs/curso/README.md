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
python3 docs/curso/validate_course.py
```

O caso executável em `workflow-exemplo/` demonstra uma feature pequena de exportação CSV,
com PRD, spec, plano, implementação, testes, skill e validação honesta.
