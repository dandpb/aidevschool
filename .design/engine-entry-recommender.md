# Entrada AI DevSchool e recomendação de engines com TypeSafe

> Descoberta aprovada para implementação local. Daniel confirmou “siga com as recomendaçoes” e “aprovado”; resoluções técnicas/visuais concretas estão em .checks/engine-entry-recommender.md. Publicação permanece posterior.
> Tarefa derivada por **tlc-plan**: `.tasks/engine-entry-recommender.md`. O planejamento registra o escopo confirmado sem promover pendências a decisões; as pendências de implementação foram resolvidas pela delegação registrada; a tarefa conserva as pendências de publicação.

## Situation

- Project: ecossistema em construção, com múltiplas aplicações e entradas já documentadas. Não foi medida adoção nesta descoberta nem verificada disponibilidade dos deployments.
- Decision: Daniel confirmou nesta conversa de 17/09/2026 a nova entrada independente, a integração TypeSafe, o controle global de liberação, até três recomendações e o fallback de catálogo completo liberado.
- In flight: `.design/semantic-substrate-seam.md` e `.tasks/semantic-substrate-seam.md` tratam outra integração TypeSafe, no substrato. Há alterações concorrentes em `learner/substrate/` e projeções de aprendiz; esta descoberta não as modifica nem depende delas para recomendar engines.
- At stake: encaminhar o aluno a um destino inadequado ou não liberado; permitir alterações indevidas na liberação global; expor a credencial do provedor. A recomendação não possui autoridade sobre aprendizagem ou mastery.

## Problem

Construção de uma porta de entrada para o ecossistema: o aluno descreve o que quer aprender ou fazer e recebe destinos adequados, sem precisar conhecer os nomes e papéis das engines. O operador precisa controlar quais destinos podem ser oferecidos a todos os alunos naquele momento.

O objeto da recomendação é a engine. A frase “tenho 15 minutos” é um exemplo de contexto, não restringe o produto a sessões de quinze minutos nem transforma a seleção em recomendação de exercícios.

O repositório já oferece guias e entradas por aplicação. Não foi estabelecido nesta conversa como alunos reais escolhem hoje, quanto tempo levam, nem a frequência de escolhas inadequadas. Não se atribui custo ou melhoria numérica a essa ausência de medição.

## Evidence

- Teste anterior desta sessão: cinco chamadas de inferência TypeSafe, quinze respostas tipadas, HTTP 200 e modelo reportado `jev-1.13.0`. Demonstrou interpretação de exemplos sintéticos; não validou ranking de engines reais. Evidência local: `.scratch/typesafe-demo-20260917/results.json`.
- `engines/codexdojo-os-prototype/src/engines/registry.ts` contém descrições e configuração de runtime. `resolveEngineUrl` valida a URL; não testa funcionamento atual do destino.
- `engines/codexdojo-os-prototype/src/apps/studentCatalog.ts` aplica uma allowlist estática do OS. Ela não é a nova configuração global solicitada.
- O registro do OS não é um inventário completo do disco: `engines/sdlc-quest/` possui README e package.json, mas não consta no registro examinado. Nem toda pasta em `engines/` é uma aplicação para alunos.
- Replanejamento verificou 13 raízes de engines com arquivos versionados, enumeradas em Sources da tarefa. `engines/zai-duolingo-like/` agora possui package.json e fonte versionada, contrariando a descrição de diretório vazio no registro do OS. A presença de fonte não prova capacidade pedagógica, publicação, liberação ou funcionamento.
- `docs/design/product-readiness.md` define prontidão por jornada e validade de evidências. Liberação administrativa, prontidão e funcionamento atual são fatos diferentes.
- O bridge examinado no OS é um plugin local com restrição a loopback. Não constitui autenticação administrativa pública reutilizável sem novo desenho.
- Grounding do planejamento: `src/surface/operatorSurface.ts` no OS seleciona a superfície de operador por parâmetro de URL ou modo de desenvolvimento. Isso é seleção de interface, não autorização administrativa. `engines/shared/teaching-evidence/hostProtocol.ts` responde `engine.ready` ao handshake; esse evento isolado também não prova uma jornada utilizável ou a saúde de todas as engines.
- A qualidade do top três ainda não foi medida. A pergunta de validação é se os destinos escolhidos atendem às descrições de alunos, preservando a liberação global; nenhum limiar de score ou confiança está aprovado.

## Journey

Confirmado por Daniel:

1. O operador acessa uma interface restrita que lista todas as engines e marca cada uma como liberada ou bloqueada para alunos.
2. Essa liberação é global: a mesma configuração vale para todos os alunos.
3. O aluno acessa uma entrada independente do AI DevSchool, sem login, e descreve seu objetivo.
4. A recomendação considera a configuração vigente na pergunta e usa a API TypeSafe.
5. A página apresenta até três engines, ordenadas pela proximidade com o pedido, com motivo curto e botão “Começar”. O aluno escolhe; não há redirecionamento automático.
6. Com menos de três opções disponíveis, não se inventam destinos para completar a lista.
7. Se TypeSafe falhar, a página mostra todas as engines disponíveis, com descrições e ações de acesso. Essa lista não é apresentada como ranking personalizado.
8. Se nenhuma engine estiver disponível, a página informa a indisponibilidade.
9. Disponibilidade exige duas condições: liberação manual e checagem automática de funcionamento. A mesma regra filtra recomendações e fallback. Liberação manual sozinha não basta.

Decisão fechada pela aprovação das recomendações: se não houver correspondência, informar essa limitação e oferecer o catálogo elegível.

Estados incluídos pela aprovação das recomendações:

- Texto vazio: solicitar uma descrição antes de chamar a API.
- Nova descrição: substituir a recomendação anterior pelo resultado da nova pergunta.
- Falha ao carregar a configuração: informar que não foi possível consultar a disponibilidade; não confundir com catálogo vazio nem liberar tudo.
- Engine desativada depois da pergunta: revalidar a liberação ao clicar em “Começar” e informar a mudança, oferecendo as opções ainda disponíveis.
- Falha de salvamento no painel: preservar o último estado confirmado e informar que a mudança não foi aplicada.

## Verdict

Already committed — see Situation. Daniel escolheu construir a entrada e integrar a API TypeSafe; esta descoberta define o comportamento e as fronteiras, sem reabrir o fornecedor.

Alternativa menor considerada: catálogo manual sem recomendação personalizada. Ele resolve acesso e continua necessário como fallback, mas não entrega a escolha por descrição solicitada. Não é substituto da integração confirmada.

## Success

Proposta de avaliação, ainda não confirmada: no primeiro piloto, Daniel verifica se um aluno consegue descrever seu objetivo, reconhecer uma opção útil e começar na engine escolhida sem orientação externa. Indicações para engines desativadas ou sem capacidade correspondente são sinais de falha. A ativação administrativa isolada não prova que o destino funciona.

Não há baseline, prazo de avaliação ou meta quantitativa confirmados. Não transformar essa proposta em promessa de resultado nem em critério de aprovação automática.

## Boundary

In: entrada independente sem login; descrição do aluno; integração TypeSafe; até três destinos ordenados; motivo curto; navegação por escolha; painel restrito de liberação global; checagem automática de funcionamento; catálogo completo das engines identificadas; fallback para todas as disponíveis (liberadas e com funcionamento verificado); mensagem quando não houver destinos disponíveis.

Out: gerar exercícios; executar engines dentro da entrada; conceder mastery; alterar gates; sincronizar progresso entre engines; permissões por aluno ou turma; recomendar apenas a trilha de programação; modificar a outra integração TypeSafe no substrato.

A primeira versão será preparada para acesso público pela internet, conforme confirmação de Daniel nesta conversa. A publicação efetiva fica para uma etapa posterior. Domínio, hospedagem e retirada ou redirecionamento das entradas atuais não estão definidos; a nova entrada pode coexistir com as URLs atuais até decisão de lançamento.

## Prior art

- A skill TypeSafe e a referência HTTP consultadas nesta sessão sustentam julgamentos tipados e múltiplas perguntas independentes por requisição.
- `Score` por candidato é a proposta para ranking graduado; uma única `Choice` mede competição entre opções, não adequação independente de cada destino.
- TypeSafe não produz explicação livre: os motivos precisam ser compostos a partir de capacidades verificadas e sinais avaliados, sem inventar funcionalidades.
- Não foi feita pesquisa de fornecedores alternativos: TypeSafe é requisito explícito do usuário.

## Shape

Proposta para revisão: uma aplicação independente de entrada, com uma camada de servidor que lê a liberação global, verifica funcionamento e chama TypeSafe com candidatos elegíveis. O painel restrito altera essa mesma configuração persistente; ela não pode existir apenas no navegador do operador, pois deve valer para todos.

Nomes abaixo são propostas de localização e responsabilidade, não arquivos implementados nem decisões de stack/hosting.

### Adds

- `engines/school-entry/` — nome proposto para a aplicação independente.
- Tela de entrada `/` — descrição, carregamento, até três resultados, fallback completo e estados vazios/erro.
- Tela administrativa `/admin/engines` — inventário completo e controle global por engine; acesso restrito confirmado, método de autenticação pendente. Exibir liberação administrativa separadamente do estado observado de funcionamento.
- Modelo proposto `EngineOffering` — `engineId`, nome, descrição fundamentada, capacidades, destino e liberação global. Identidade e liberação são distintas de prontidão.
- Serviço de recomendação — consulta a configuração atual, envia julgamentos à API TypeSafe e retorna resultados verificáveis contra os candidatos enviados.
- Persistência global de liberação — tecnologia e hospedagem ainda não decididas; precisa sobreviver à sessão do navegador e ser compartilhada entre alunos.
- Verificação de funcionamento por engine — critério, validade temporal e método ainda precisam de prova. Um HTTP 200 isolado não comprova que a experiência está utilizável. Resultado desconhecido não equivale a sucesso.

### Changes

- Mapa de entradas do ecossistema — documentar a nova entrada quando implementada, preservando a diferença entre projeto, publicação e disponibilidade.
- Fonte de metadados das engines — decidir uma autoridade e um modo de sincronização a partir do inventário real. Copiar a allowlist do OS não atende ao escopo.
- `engines/codexDojo/ecosystem/MANIFEST.md` — referência a esta descoberta; integração futura terá referência própria a arquivos implementados.

### Leaves

- `learner/` e `curriculum/` — sem novas cópias, avaliações ou mudanças de progresso.
- Engines existentes — mantêm suas jornadas, execução e requisitos de acesso.
- Controle de prontidão — não recebe aprovação implícita pelo botão de liberação.
- Bridge local do OS — não será tratado como autenticação de um painel público.

A alternativa mais pesada seria um serviço compartilhado de catálogo e disponibilidade para todas as engines, migrando consumidores existentes. Ela passa a valer se houver outro consumidor confirmado da mesma configuração; essa necessidade não foi estabelecida. A aplicação independente deixa de ser suficiente se vários produtos precisarem administrar a mesma liberação. A checagem automática já foi exigida e pertence à proposta leve também; isso não implica adotar um serviço separado de monitoramento.

## Roadmap

| Block | Delivers | Clarity |
|---|---|---|
| Entrada e painel | Jornada visual, top três, fallback e administração global | design |
| Administração e implantação | Autenticação restrita, hospedagem e persistência global | rfc |
| Catálogo | Inventário inicial verificado de 13 engines; manutenção sem migração do OS | open |
| Funcionamento atual | Checagem automática por engine com validade e limites explícitos | spike |
| Adequação com TypeSafe | Ranking sobre capacidades reais e motivos verificáveis | spike |

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| Entrada | Independente do CodexDojo OS | Daniel definiu o novo ponto inicial do AI DevSchool | Dentro do OS somente se a escolha de produto mudar | reversible |
| Ambiente da primeira versão | Preparada para acesso público pela internet; publicação posterior | Daniel confirmou a recomendação nesta conversa | Entrega apenas local não atende à decisão | reversible |
| Objeto recomendado | Engine | Correção explícita do usuário | Atividade requer outra descoberta | reversible |
| Fornecedor | API TypeSafe, usando a skill `typesafe-ai` | Requisito explícito; API testada nesta sessão | Outro fornecedor somente com mudança do requisito | reversible |
| Controle | Interface lista todas as engines e libera/bloqueia individualmente | Operador controla destinos oferecidos | Allowlist fixa não entrega administração em runtime | reversible |
| Escopo da liberação | Global, igual para todos os alunos | Confirmado em voz | Por turma/aluno só se houver necessidade futura confirmada | costly |
| Acesso do aluno | Sem login na nova entrada | Confirmado por Daniel na descoberta | Conta obrigatória somente com mudança de produto | reversible |
| Administração | Restrita a operadores | Confirmado por Daniel; altera acesso global | Painel público não atende ao requisito | costly |
| Disponibilidade | Liberação manual AND checagem automática de funcionamento | Confirmado por Daniel na descoberta | Liberação apenas manual foi rejeitada | reversible |
| Atualidade | Configuração vigente no momento da pergunta | Requisito explícito de disponibilidade atual | Snapshot de build somente se atualização tardia for aceita | reversible |
| Resultado normal | Até 3 engines, ordenadas por proximidade ao pedido | Confirmado em voz | Uma indicação única foi substituída pelo top três | reversible |
| Ação | Motivo curto + botão “Começar” por opção | Aluno escolhe o destino | Redirecionamento automático foi descartado | reversible |
| Falha TypeSafe | Mostrar todas as engines disponíveis (liberadas e verificadas), sem alegar personalização | Fallback definido por Daniel, condicionado à regra posterior de disponibilidade | Bloquear a entrada contraria o fallback escolhido | reversible |
| Nenhuma liberada | Informar indisponibilidade | Confirmado em voz | Exibir bloqueadas como disponíveis contraria o requisito | reversible |

## Architecture resolutions

1. Sob delegação, a aplicação usa servidor Node22, SQLite persistente e sessão de operador com senha scrypt, cookie HttpOnly e proteção de origem/CSRF. Hospedagem e domínio continuam como etapa de publicação.
O inventário inicial foi resolvido pela inspeção do repositório e está na tarefa. A manutenção da lista passa a Open; não exige que o usuário enumere engines. Persistência da liberação global continua vinculada ao item 1.

## Validation scope

1. Avaliar ranking TypeSafe com descrições reais e cenários sintéticos de liberação. Proposta de recorte: 8 pedidos em português, incluindo pedido vago, objetivo não atendido e diferentes preferências; repetir os dois casos ambíguos. Comparar manualmente adequação do top três, motivos, custo e tempo. Parar após esse conjunto; não construir a aplicação no spike. Se o ranking não for útil, revisar rubrica e metadados antes de planejar a integração. Limiar de exclusão não está decidido.
2. Definir o que uma checagem automática pode comprovar em cada forma de execução. Proposta de recorte: um destino web independente e um destino hospedado dentro do OS; demonstrar saudável, indisponível e página que responde mas não inicializa. Parar ao obter um contrato viável ou registrar necessidade de adaptar a engine. A resposta define custo de cobertura, tempo de consulta e validade do resultado; esses números não estão decididos. Engines locais ou internas precisam de um destino utilizável antes de serem elegíveis para a entrada pública.

## Interface reference

1. Desenhar entrada, resultados, fallback, vazio e falha de consulta; painel com listagem, liberação e erro de salvamento. Mostrar a distinção entre lista geral e recomendação sem expor detalhes internos da API ao aluno.
2. Identidade da entrada independente ainda não escolhida. `DESIGN.md` diz que não existe uma paleta única do ecossistema; não herdar a identidade do OS como decisão implícita.
3. Referência selecionada pelo implementador sob delegação: `engines/school-entry/docs/entry-concept.png`, regras em `engines/school-entry/DESIGN.md` e comparação em `engines/school-entry/docs/VALIDATION.md`. Não houve aprovação individual da imagem pelo usuário.

## Open

1. Nome técnico proposto: `school-entry`; ajustar ao criar a tarefa se houver convenção mais apropriada.
2. Motivos curtos: proposta de composição determinística com capacidades verificadas; copy final será revisada no desenho.
3. Ordem do fallback: proposta alfabética pelo nome exibido, sem ranking implícito.
4. Manutenção do catálogo: proposta de inventário versionado da entrada, preservando identidades existentes quando aplicáveis e sem migrar consumidores do OS. As 13 raízes atuais estão documentadas na tarefa; capacidades e destinos precisam de evidência própria antes da liberação. Localização de arquivo é decisão reversível de implementação.

## Sources

- Conversa desta descoberta, 17/09/2026 — decisões textuais e por voz registradas em Decisions.
- `.agents/skills/typesafe-ai/SKILL.md` — capacidades, composição, limites e credencial no servidor.
- https://docs.typesafe.ai/api — contrato HTTP consultado nesta sessão.
- https://docs.typesafe.ai/primitives/score — ranking graduado, conforme documentação consultada nesta sessão.
- `.scratch/typesafe-demo-20260917/results.json` — smoke de API anterior, sem teste de ranking de engines.
- `engines/codexdojo-os-prototype/src/engines/registry.ts` — metadados e resolução de URL.
- `engines/codexdojo-os-prototype/src/apps/studentCatalog.ts` — allowlist pública estática do OS.
- `engines/codexdojo-os-prototype/bridge/plugin.ts` — restrição local do bridge.
- `docs/design/product-readiness.md` — autoridade e validade da prontidão.
- `docs/VISION.md`, `docs/handbook/README.md`, `DESIGN.md` — intenção, entradas existentes e identidades visuais; não comprovam disponibilidade em runtime.
- `.design/semantic-substrate-seam.md` — trabalho paralelo TypeSafe com responsabilidade distinta.

## Implementation decision update

Daniel aprovou as recomendações e delegou os detalhes técnicos e visuais. As seções anteriores preservam a fundamentação da descoberta; as propostas agora têm resolução concreta no checklist .checks/engine-entry-recommender.md e em engines/school-entry/DESIGN.md. A decisão para ausência de correspondência é aviso e catálogo disponível. Checagem automática verifica entrada utilizável em navegador, não mera resposta HTTP. A implementação usa servidor Node com estado global SQLite e administração autenticada; a referência de tela foi selecionada pelo implementador sob delegação, não aprovada individualmente pelo usuário. Nenhum RFC/spike listado acima permanece como pedido de autorização ao usuário; suas provas são obrigações do checklist. Não há autorização de push/deploy.
