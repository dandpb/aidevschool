# Arquitetura da documentação do AI DevSchool

| Campo | Valor |
| --- | --- |
| Status | Canônico para navegação e governança documental |
| Criado | 2026-07-10 |
| Última revisão | 2026-07-19 |
| Escopo | Documentação rastreada do ecossistema; não inclui dependências ou saídas geradas |

## Contexto

O AI DevSchool é um ecossistema com um currículo e estado de aprendizagem compartilhados,
mas vários engines, contratos e superfícies de trabalho. A documentação acompanha essa
estrutura: há guias canônicos para orientar pessoas e agentes, documentos locais junto aos
componentes que descrevem e artefatos de evidência que precisam permanecer no projeto que os
produziu.

Este índice consolida a **navegação e a classificação** da documentação. Ele não transforma
relatórios, decisões históricas, prompts ou evidência de aprendizagem em uma única fonte de
verdade. Quando houver conflito, o código, os contratos e o estado canônico citados abaixo têm
precedência sobre documentos explicativos.

## Problema e motivação

Sem uma taxonomia explícita, os mesmos fatos podem ser procurados em vários lugares, e
documentos de contexto, operação, design e evidência podem ser confundidos como equivalentes.
Isso cria dois riscos: duplicar contratos que já possuem uma fonte canônica e alterar artefatos
históricos ou gerados como se fossem guias ativos.

A consolidação deve tornar a entrada correta descoberta em poucos passos, preservar a evidência
auditável junto ao trabalho que a gerou e impedir que um resumo substitua a fonte de verdade.

## Escopo

### Incluído

- Índice único para a documentação rastreada do repositório.
- Classificação por finalidade e fonte canônica.
- Rotas para guias do ecossistema, contextos de domínio, engines, currículo, decisões e análises.
- Regras de manutenção para impedir duplicação e drift.

### Fora do escopo

- Reescrever conteúdo técnico local de cada engine ou de cada projeto do currículo.
- Mover ou apagar relatórios, ADRs, prompts, evidências, memória de loops ou saídas geradas.
- Declarar status de implementação, domínio ou mastery a partir de documentação.
- Documentação de dependências em `node_modules/` e estado de ferramentas em diretórios `.*/`.

## Solução: mapa canônico de leitura

### Comece pela pessoa

| Público | Entrada | Limite atual |
| --- | --- | --- |
| Pessoa não técnica | [Guia do estudante — LiteracyDojo](product-readiness/student-guide.md#standalone-literacydojo) | Comece pela meta e pela jornada; o README do engine mantém os detalhes de implementação e release. |
| Pessoa não técnica, tutoria em chat | [`aiDevschoolMvp`](../engines/aiDevschoolMvp/aidevschool/SKILL.md) | Skill instalável C01–C24; validação `--check` é read-only, instalação cria estado e revisão recorrente. |
| Pessoa não técnica, exploração experimental | [Guia do estudante — miniTown](product-readiness/student-guide.md#experimental-minitown) | Explore-only; não contém microlições, persistência, progressão, evidência ou mastery. |
| Programador | [Guia do estudante — jornadas de programação](product-readiness/student-guide.md#programmer-journeys) | O guia conduz ao currículo e aos engines; cada jornada mantém seus próprios limites de evidência. |
| Programador, missão diária | [Guia do estudante — dojoToday](product-readiness/student-guide.md#programmer-journeys) | A projeção read-only do scheduler, streak e gate não avalia nem promove mastery. |
| Facilitador | [Guia do facilitador](product-readiness/facilitator-guide.md); [kit do piloto humano](PILOTO_PERCURSO_CLIENTE.md); [kit P6 de alunos reais](piloto/README.md) | O guia cobre operação cross-product; o kit delimita o piloto LiteracyDojo com 1–3 pessoas; o kit P6 gateia a decisão O3-C2. Setup técnico continua local. |
| Revisor de readiness | [Matriz de product readiness](product-readiness/README.md) | Matriz gerada distingue tier pretendido de decisão independente atual. |
| Contribuidor | [Handbook](handbook/README.md) + [AGENTS.md](../AGENTS.md) | Setup e comandos continuam locais a cada engine. |

### Comece pelo objetivo

| Necessidade | Fonte canônica | Papel |
| --- | --- | --- |
| Orientação rápida do repositório | [README raiz](../README.md) | Entrada para pessoas e execução local. |
