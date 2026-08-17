# Validação real — workflow de exportação CSV

**Data:** 2026-08-17  
**Escopo:** núcleo puro de exportação CSV; HTTP e banco ficaram fora da fatia por decisão da spec.

## Primeiro ciclo de execução

Na primeira tentativa de executar o teste pela raiz, a coleta falhou porque o teste não encontrava
o módulo local:

```text
ModuleNotFoundError: No module named 'export_tasks'
1 error during collection
```

Essa falha era de empacotamento do exemplo, não do comportamento do domínio. Como os arquivos
de teste e implementação foram criados na mesma primeira fatia, este episódio não é apresentado
como um RED de TDD sobre comportamento. A correção foi manter o exemplo sem dependências e inserir
o diretório do caso no `sys.path` do próprio arquivo de teste. Assim, o comando documentado funciona
tanto pela raiz quanto dentro da pasta.

## GREEN — implementação e execução

Com `export_tasks.py` implementado usando `csv.DictWriter`, executei:

```bash
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py -q
```

Resultado real:

```text
.....                                                                    [100%]
5 passed in 0.01s
```

Os cinco testes cobrem:

1. filtro por usuário autenticado, status e ordem descendente;
2. escaping de vírgula, aspas e quebra de linha;
3. cabeçalho para resultado vazio;
4. rejeição de usuário autenticado vazio;
5. rejeição de tarefa concluída sem `completed_at`.

## Validação estrutural da página

Executei:

```bash
python3 docs/curso/validate_course.py
```

A primeira execução encontrou dois links que ainda apontavam para `VALIDACAO.md` em caminhos
inexistentes. O link do HTML foi corrigido e este documento foi adicionado para fechar o loop.
A execução final reportou:

```text
course validation: PASS
anchors: 28
local links: 12
external resources: 0
javascript required: no
```

## O que foi provado

- O caso de negócio funciona offline e sem dependências externas.
- O filtro de posse existe antes da serialização.
- A biblioteca CSV trata campos que não podem ser concatenados ingenuamente.
- O caso vazio e entradas inválidas têm comportamento explícito.
- A página é uma única rota HTML com CSS local, âncoras e links locais.
- O pacote de contexto explicita por que HTTP, banco, logs e segredos ficam fora desta fatia.

## O que não foi provado

- Endpoint HTTP real.
- Integração com banco ou autenticação real.
- Deploy público.
- Compatibilidade visual em todos os navegadores.

Esses limites são intencionais: a primeira entrega prova um núcleo pequeno antes de adicionar
infraestrutura.

## Próxima fatia, se o caso for levado para uma aplicação

1. Adaptar o núcleo a um repositório/service existente.
2. Adicionar endpoint autenticado.
3. Criar teste de integração para status HTTP e `Content-Type`.
4. Fazer smoke no navegador e revisar risco de fórmulas de planilha.
5. Comparar a execução de dois modelos usando a mesma PRD, spec e gate.
