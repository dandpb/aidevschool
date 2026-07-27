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
| Pessoa não técnica | [LiteracyDojo](../engines/literacyDojo/README.md) + [conteúdo AI Literacy](../curriculum/ai-literacy/README.md) | O currículo ligado mantém o status do conteúdo; o README do engine mantém o status de implementação e release. |
| Pessoa não técnica, tutoria em chat | [`aiDevschoolMvp`](../engines/aiDevschoolMvp/aidevschool/SKILL.md) | Skill instalável C01–C24; validação `--check` é read-only, instalação cria estado e revisão recorrente. |
| Pessoa não técnica, exploração | [miniTown](../engines/miniTown/README.md) | Superfície local de exploração; não contém as microlições e não marca domínio. |
| Programador | [Currículo de programação](../curriculum/catalog.md) + [codexDojo](../engines/codexDojo/README.md) | Projetos 01–18; status e evidência variam por projeto. |
| Programador, missão diária | [dojoToday](../engines/dojoToday/README.md) | Projeção read-only do scheduler, streak e gate; não avalia nem promove domínio. |
| Contribuidor | [Handbook](handbook/README.md) + [AGENTS.md](../AGENTS.md) | Setup e comandos continuam locais a cada engine. |

### Comece pelo objetivo

| Necessidade | Fonte canônica | Papel |
| --- | --- | --- |
| Orientação rápida do repositório | [README raiz](../README.md) | Entrada para pessoas e execução local. |
| Ideia central e públicos | [Visão do produto](VISION.md) | Intenção canônica; não substitui status operacional. |
| Ciclo de uma lição curta | [Contrato de microlição](design/micro-lesson-contract.md) | Objetivo, tentativa, feedback, retry, evidência, progresso, revisão e verificação. |
| Arquitetura, onboarding e superfícies | [Handbook](handbook/README.md) | Guia de navegação do ecossistema. |
| Regras de contribuição e comandos | [AGENTS.md raiz](../AGENTS.md) | Convenções operacionais para agentes e contribuidores. |
| Linguagem do domínio | [Mapa de contextos](../CONTEXT-MAP.md) | Direciona para glossários por bounded context. |
| Objetivo fundador | [Meta do ecossistema](PROMPTS/-01_GOAL.md) | Intenção de produto, não estado operacional. |

### Estado, contratos e evidência

| Tipo de verdade | Fonte | Regra de uso |
| --- | --- | --- |
| Estado do aprendiz | [`learner/learning_state.yaml`](../learner/learning_state.yaml) | Fonte canônica; views derivadas nunca são editadas à mão. |
| Catálogo do currículo | [`curriculum/catalog.md`](../curriculum/catalog.md) | Identidade e status dos projetos. |
| Contrato do substrato | [`learner/substrate/interface.md`](../learner/substrate/interface.md) | Limites de leitura, escrita, validação e sincronização. |
| Requisitos para arquivos | [`MANIFEST.md`](../engines/codexDojo/ecosystem/MANIFEST.md) | Rastreabilidade de contrato de produto. |
| Contrato entre jogos | [Teaching-game contract](design/teaching-game-contract.md) | Evidência e limites de integração Pixel/Voxel. |
| Conteúdo de AI Literacy | [`curriculum/ai-literacy/`](../curriculum/ai-literacy/README.md) | YAML canônico; `ready` descreve conteúdo válido, não mastery. |
| Contratos de AI Literacy | [`docs/design/ai-literacy/`](design/ai-literacy/README.md) | Conteúdo, evidência e limites do bounded context. |
| Evidência de um projeto | `curriculum/<projeto>/docs/` | Permanece local, auditável e não é resumida neste índice. |

### Vocabulário de status

| Termo | Significado |
| --- | --- |
| `planned` | Intenção documentada, sem comportamento entregue. |
| `ready` | Conteúdo autoral existe e passa pelo contrato do catálogo. |
| `local` | A superfície roda a partir deste repositório; não implica URL pública. |
| `live` | Uma rota pública foi publicada e verificada na versão citada. Configuração de deploy sozinha não basta. |
| `generated` | Projeção derivada; deve ser regenerada, nunca editada à mão. |
| `completed` | Progresso da experiência local; não comprova competência. |
| `mastered` | Competência promovida apenas por verificador independente e evidência adequada. |

### Superfícies locais

Cada engine mantém o documento de operação ao lado de seu runtime. O handbook é a visão
inter-engine; o guia local é a autoridade para comandos, dependências e limitações daquele
engine.

| Superfície | Entrada local | Visão do handbook |
| --- | --- | --- |
| Microlições de IA | [`engines/literacyDojo/README.md`](../engines/literacyDojo/README.md) | [LiteracyDojo](handbook/12_engine_literacyDojo.md) |
| Tutoria AI Literacy instalável | [`engines/aiDevschoolMvp/aidevschool/SKILL.md`](../engines/aiDevschoolMvp/aidevschool/SKILL.md) | Contrato local da skill e scripts determinísticos. |
| Exploração Nível 0 | [`engines/miniTown/README.md`](../engines/miniTown/README.md) | [miniTown](handbook/11_engine_miniTown.md) |
| Missão diária do programador | [`engines/dojoToday/README.md`](../engines/dojoToday/README.md) | Projeção local do learner substrate. |
| Dashboard | [`engines/codexDojo/README.md`](../engines/codexDojo/README.md) | [codexDojo](handbook/03_engine_codexDojo.md) |
| OS educacional | [`engines/codexdojo-os-prototype/README.md`](../engines/codexdojo-os-prototype/README.md) | [codexdojo OS](handbook/03b_engine_codexdojo-os-prototype.md) |
| Jogo 2D | [`engines/pixelDojo/README.md`](../engines/pixelDojo/README.md) | [pixelDojo](handbook/04_engine_pixelDojo.md) |
| Tutoring core | [`engines/minimaxDojo/INDEX.md`](../engines/minimaxDojo/INDEX.md) | [minimaxDojo](handbook/05_engine_minimaxDojo.md) |
| Motor de evolução | [`engines/miniMaxEvolutionEngine/README.md`](../engines/miniMaxEvolutionEngine/README.md) | [miniMaxEvolutionEngine](handbook/06_engine_miniMaxEvolutionEngine.md) |
| Runner | [`engines/openclaw/README.md`](../engines/openclaw/README.md) | [Onboarding](handbook/02_onboarding.md) |
| Simulações 3D | [`engines/voxelDojo/README.md`](../engines/voxelDojo/README.md) | [voxelDojo](handbook/10_engine_voxelDojo.md) |

### Design, decisões e análises

| Classe | Local | Como tratar |
| --- | --- | --- |
| TDD descritivo do ecossistema | [TDD do ecossistema](design/tdd-ecossistema.md) | Snapshot arquitetural datado; use contratos locais e o handbook para superfícies posteriores à sua revisão. |
| ADRs | [`docs/design/adr/`](design/adr/) | Decisões pontuais; são históricos imutáveis depois de aceitos. |
| Designs ativos | [`docs/design/`](design/) | Contratos e propostas com escopo explícito. |
| Visão do produto | [`docs/VISION.md`](VISION.md) | Intenção dual-audience; validar status nos contratos e engines ligados. |
| Auditorias e análises | [`docs/TECH_DEBT_AUDIT_2026-07-08.md`](TECH_DEBT_AUDIT_2026-07-08.md) e relatórios datados | Evidência de um recorte temporal; não é guia operacional permanente. |
| Arquivo | [`docs/archive/`](archive/) | Contexto histórico; não usar como instrução atual. |
| Prompts e ideias | [`docs/PROMPTS/`](PROMPTS/) | Material de intenção e descoberta; validar contra fontes ativas antes de implementar. |

## Regras de consolidação

1. **Uma fonte de verdade por fato.** Prefira linkar o contrato, estado ou catálogo canônico em
   vez de copiá-lo para um README ou relatório.
2. **Documentação de uso fica junto da superfície.** Alterações de runtime, setup ou limite de um
   engine atualizam seu guia local e, quando necessário, a página correspondente do handbook.
3. **O handbook explica a relação entre superfícies.** Não deve duplicar detalhes de configuração
   que pertencem a um engine.
4. **Evidência fica com o trabalho avaliado.** `curriculum/<projeto>/docs/`, resultados,
   diagnósticos e relatórios não são movidos para `docs/` nem colapsados em resumos.
5. **Design e histórico preservam contexto.** ADRs, auditorias, planos e `docs/archive/` são
   classificados e linkados; não são reescritos para aparentar ser estado atual.
6. **Saídas geradas e estado de ferramenta não entram no corpus canônico.** Isso inclui
   dependências, builds, caches e registros de ferramentas, mesmo quando usam Markdown.

## Plano de manutenção

| Mudança | Atualize | Verificação |
| --- | --- | --- |
| Novo engine ou app | README local, handbook e esta tabela de superfícies | Links relativos e comando de validação do engine. |
| Novo contrato cross-engine | Documento em `docs/design/`, handbook e `MANIFEST.md` quando afetar produto | Consumidores e fontes de verdade apontam para o mesmo contrato. |
| Alteração de estado/currículo | Fonte em `learner/` ou `curriculum/`; somente os adaptadores necessários | Validador do substrato e evidência independente adequada ao gate declarado. |
| Nova decisão arquitetural | ADR em `docs/design/adr/` e links nas superfícies afetadas | Decisão distingue contexto, consequência e fonte vigente. |
| Nova auditoria ou plano | Documento datado em `docs/` ou `docs/archive/` conforme vigência | Não substitui instruções atuais sem uma atualização explícita de fontes canônicas. |

## Riscos e controles

| Risco | Controle |
| --- | --- |
| Índice ficar obsoleto | Toda nova superfície deve adicionar sua rota nesta página e no handbook. |
| Duplicação de estado ou contratos | Links para fontes canônicas, com regras explícitas de precedência. |
| Evidência ser confundida com guia | Artefatos permanecem no projeto e são classificados como evidência local. |
| História ser executada como instrução atual | `docs/archive/`, ADRs e análises datadas são marcados por finalidade. |

## Questões em aberto

- Um validador automatizado de links Markdown seria útil quando o repositório adotar uma ferramenta
  de documentação compartilhada. Até lá, links modificados devem ser checados no diff.
- A retenção de artefatos de ferramenta em diretórios ocultos é uma política de repositório, não
  uma migração desta consolidação.
