# Workflow permanente para desenvolver com IA

Este é o processo mínimo recomendado para transformar uma ideia em uma feature verificável,
sem depender de um modelo específico. Ele é intencionalmente manual no começo: automação,
MCPs e agentes adicionais entram somente depois que o fluxo se repete sem ambiguidade.

## A tese

```text
ideia → PRD → spec → contexto → plano → build em fatias → validação → review → memória → skill
```

Uma conversa pode produzir uma resposta. Um workflow produz **ativos que melhoram a próxima
conversa**.

## 1. Escolha uma fatia pequena

Escolha uma mudança que possa ser demonstrada e validada em uma sessão:

- um comportamento observável;
- poucos arquivos;
- baixo risco reversível;
- um usuário claro;
- pelo menos um teste automatizável.

Não comece por "construir a plataforma". Comece por uma feature que um aluno ou programador
consiga usar.

## 2. Escreva o PRD mínimo

```md
# PRD — <feature>

## Problema
<dor observável>

## Usuário
<quem se beneficia>

## Objetivo
<resultado observável>

## Escopo
- <comportamento 1>
- <comportamento 2>

## Fora de escopo
- <o que não será resolvido agora>

## Critérios de aceite
- [ ] <critério verificável>
- [ ] <critério verificável>

## Riscos e decisões abertas
- <risco>
```

## 3. Faça a spec técnica

A spec responde como a entrega se encaixa no sistema atual:

- estado atual e estado desejado;
- interfaces, entradas, saídas e erros;
- arquivos permitidos;
- casos de borda;
- estratégia de teste;
- ordem de implementação;
- não-metas.

Se a spec ainda deixa o agente escolher uma decisão importante, registre a decisão como aberta
ou resolva-a antes do Build Mode. Não esconda decisões dentro do código.

## 4. Monte o pacote de contexto

Inclua somente:

1. regras permanentes do projeto;
2. PRD e spec;
3. arquivos diretamente relacionados;
4. testes e contratos existentes;
5. logs ou histórico recortados que explicam o problema.

Exclua dependências, build output, logs gigantes, segredos e arquivos sem relação. Contexto
selecionado é uma medida de qualidade, não uma economia opcional.

## 5. Rode Plan Mode

Peça um plano sem edição:

```text
Você está em Plan Mode. Não altere arquivos.
Leia somente o pacote de contexto fornecido.
Entregue: diagnóstico do estado atual, arquivos afetados, etapas pequenas,
riscos, decisões abertas, testes e critérios de aceite.
Se algo não estiver especificado, pergunte ou marque como decisão aberta.
```

O humano revisa o plano. O plano só está aprovado quando respeita escopo, não inventa
contratos e associa cada etapa a uma validação.

## 6. Rode Build Mode em fatias

Para cada etapa aprovada:

```text
Você está em Build Mode.
Implemente somente a etapa <N> do plano aprovado.
Não altere arquivos fora do escopo.
Adicione ou atualize os testes necessários.
Ao final, liste arquivos, decisões, testes executados e pendências.
```

Uma fatia deve ser pequena o bastante para que o diff e a falha sejam compreensíveis.

## 7. Valide em camadas

A ordem sugerida é:

1. teste específico da fatia;
2. lint e typecheck, quando existirem;
3. suíte completa;
4. build ou smoke do produto;
5. critérios de aceite no comportamento real;
6. revisão independente do diff.

A frase "parece funcionar" nunca substitui a saída de um comando ou uma observação
reproduzível.

## 8. Separe papéis quando houver escala

Comece com um agente orquestrador e uma sessão de implementação. Quando o fluxo for repetido,
extraia papéis com contrato:

| Papel | Pode fazer | Deve entregar |
|---|---|---|
| Investigador | ler e localizar | mapa de contexto e riscos |
| Planejador | analisar e propor | plano sem editar |
| Implementador | editar escopo aprovado | diff + testes |
| Testador | criar/executar verificações | matriz de cenários + evidências |
| Revisor | somente ler e refutar | findings priorizados |
| Documentador | registrar resultado | spec, decisão, aprendizado ou skill |

Produtor e verificador não compartilham a narrativa como prova. O verificador deve começar
com o contrato e os artefatos, não com a explicação do produtor.

## 9. Trabalhe com modelos diferentes

Mantenha invariantes fora do modelo:

- mesma spec;
- mesmo pacote de contexto;
- mesmo formato de plano;
- mesmos comandos de validação;
- mesmo critério de aceite.

Escolha o modelo por tarefa, não por lealdade:

- raciocínio profundo: arquitetura, trade-offs e revisão;
- modelo rápido: tarefas mecânicas, testes simples e documentação;
- modelo com ferramentas: exploração, edição incremental e execução.

Trocar de modelo não deve mudar o que significa "pronto".

## 10. Promova o aprendizado

Depois da validação, responda:

- o modelo assumiu algo errado?
- faltou algum arquivo ou regra no contexto?
- qual instrução reduziu retrabalho?
- qual falha merece um teste?
- o que deve virar template, regra, skill ou decisão?

Promova somente conhecimento reutilizável:

```text
spec repetida     → template de spec
prompt repetido   → prompt versionado
checklist repetido→ skill
erro recorrente   → teste/regra/pitfall
decisão estrutural→ ADR curto
```

## Caso canário executado neste curso

A feature de exemplo é **exportar tarefas concluídas em CSV para o usuário autenticado**.
Ela está em [`docs/curso/workflow-exemplo/`](docs/curso/workflow-exemplo/):

- `PRD.md` — problema, usuário, escopo e aceite;
- `SPEC.md` — contrato técnico do núcleo puro;
- `CONTEXTO.md` — arquivos incluídos, excluídos e justificativa;
- `PLAN.md` — fatias de execução;
- `export_tasks.py` — implementação real, sem dependências;
- `test_export_tasks.py` — testes de autorização, ordenação, CSV e erro;
- `skills/exportar-csv-seguro.md` — procedimento promovido a skill;
- `docs/curso/workflow-exemplo/VALIDACAO.md` — execução, correção de primeira falha, validação estrutural e limites conhecidos.

Execute de novo com:

```bash
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py -q
python3 docs/curso/validate_course.py
```

O caso implementa o **núcleo puro** que um endpoint chamaria. A rota HTTP e o banco ficaram
fora do escopo para que o exemplo seja pequeno, executável offline e verificável de verdade.

## Laboratório cumulativo de workflows

O exemplo CSV vira o ciclo 00 de um laboratório permanente. Os ciclos 01–10 adicionam dez
casos reais e pequenos para desenvolvimento: filtro de logs, patch atômico de configuração,
agenda de retry, snapshot TTL/LRU, plano de dependências, renomes seguros, política de diff,
resumo de access log, migração v1→v2 e varredura de segredos sintéticos. Cada ciclo tem uma
fixture, um handler, um teste de falha e uma lição promovida que pode ser declarada por ciclos
posteriores.

Execute a suíte e uma saída limpa assim:

```bash
python3 -m pytest docs/curso/workflow_lab -q
python3 docs/curso/workflow_lab/lab.py \
  --fixtures docs/curso/workflow_lab/fixtures \
  --output "$(mktemp -d)/workflow-lab"
```

O CLI completa 11 ciclos, cria dez artefatos JSON em `artifacts/`, acumula 11 registros em
`learning.ndjson` e gera `report.md` como projeção derivada. O ledger registra somente os
`requires` declarados por cada ciclo; assim, o aprendizado acumulado é um ativo técnico
reutilizável, não um resumo implícito de todo o histórico. Falhas que levantam erro no
preflight ou em um handler acontecem antes das escritas; uma negação de política válida
permanece observável no artefato do ciclo 07.

Consulte o [README do laboratório](docs/curso/workflow_lab/README.md), a
[especificação](docs/curso/workflow_lab/SPEC.md), a [validação](docs/curso/workflow_lab/VALIDACAO.md)
e o [índice humano do skill pack](docs/curso/workflow_lab/skills/executar-workflows-cumulativos.md).
As instruções canônicas ficam separadas em
[`workflow-lab-build`](.agents/skills/workflow-lab-build/SKILL.md),
[`workflow-lab-verify`](.agents/skills/workflow-lab-verify/SKILL.md) e
[`workflow-lab-maintain`](.agents/skills/workflow-lab-maintain/SKILL.md): Build produz,
Verify prova em outro contexto e Maintain promove somente o estado aprovado.

Os testes demonstram determinismo, acúmulo e reuso de lições, além de artefatos observáveis.
Isso não é estudo de adoção, prova de aprendizagem humana ou medição de valor para uma equipe;
essas conclusões exigiriam uso real e uma avaliação separada. O laboratório também é offline e
não modifica o estado canônico em `learner/`.

## Definition of Done

Uma feature só pode ser chamada de pronta quando:

- [ ] a spec está versionada;
- [ ] o contexto usado está explícito;
- [ ] o plano foi revisado;
- [ ] cada mudança tem teste ou justificativa documentada;
- [ ] os comandos de validação passaram;
- [ ] o diff foi revisado por alguém diferente do produtor, quando o risco exigir;
- [ ] limitações e itens fora de escopo estão escritos;
- [ ] pelo menos um aprendizado foi promovido a ativo permanente ou foi registrada a decisão de não promover.
