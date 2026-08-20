# Testes do curso e do workflow

## Objetivo

Verificar que a entrega funciona como página estática offline e que o caso canário do workflow
é executável de verdade.

## Testes automatizados

A partir da raiz do repositório:

```bash
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py -q
python3 docs/curso/validate_course.py
```

O primeiro comando cobre o núcleo de exportação CSV. O segundo verifica a existência do HTML/CSS,
as âncoras, os links locais, os módulos obrigatórios, a ausência de recursos externos e a ausência
de JavaScript obrigatório.

## Checklist manual

- [ ] Abrir `docs/curso/index.html` diretamente no navegador.
- [ ] Navegar pelos links do topo em viewport largo.
- [ ] Reduzir a janela e confirmar navegação horizontal e leitura em viewport estreito.
- [ ] Usar `Tab` e confirmar foco visível.
- [ ] Abrir os seis artefatos do caso CSV.
- [ ] Conferir que a implementação declara HTTP e banco fora do escopo.

## Limites

A validação estrutural não substitui um smoke visual em cada navegador. O caso executável prova
o núcleo puro offline; não prova uma rota HTTP nem uma integração com banco, que foram excluídas
intencionalmente da fatia.
