# MVP IA na Prática: entrada adaptativa para AI Literacy

Status: ready-for-agent

## Problem Statement

Pessoas não técnicas precisam de uma forma simples, bonita e segura de começar a usar IA no cotidiano, sem precisar aprender programação, criar uma conta ou entender jargões. A trilha AI Literacy já contém microlições e um player local, mas a entrada atual é linear: ela coleta intenção e autoconfiança e envia toda pessoa para a mesma sequência.

Isso não entrega valor logo no primeiro contato. Uma pessoa iniciante precisa de acolhimento e apoio mais explícito; alguém que já demonstra critério ao avaliar uma resposta de IA deve poder avançar sem repetir uma introdução. O produto também precisa comunicar a visão completa da escola: IA na Prática agora, Trilha Dev como próximo caminho, ambas sustentadas por pequenas lições, assistentes pedagógicos, gamificação saudável e explicações visuais em voxel art.

## Solution

Transformar a entrada do LiteracyDojo em uma experiência adaptativa chamada **Mapa Inicial**. Antes dele, um assistente pedagógico acolhe a pessoa, explica em linguagem simples como um assistente de IA pode ajudar e coleta somente objetivo, contexto, confiança e uma categoria de tarefa.

O Mapa Inicial reutiliza a atividade determinística de comparação de respostas de IA. Acerto na primeira tentativa leva à rota intermediária; erro, pedido de dica ou nova tentativa levam à rota guiada. A atividade já conta como a primeira microlição concluída. As duas rotas convergem em uma lição sobre como formular pedidos melhores.

A experiência usa cenas e ilustrações voxel art para tornar situações como agendamento, comunicação e busca de notícias concretas. O assistente pedagógico funciona com conteúdo e feedback estruturados; um LLM não é necessário para o MVP.

## User Stories

1. As a pessoa não técnica, I want to abrir a experiência por um link, so that I can começar sem instalar ferramentas ou criar conta.
2. As a pessoa não técnica, I want to ser recebida por um assistente de IA em linguagem simples, so that I can entender o propósito da experiência sem medo de termos técnicos.
3. As a pessoa não técnica, I want to saber o que um assistente de IA costuma fazer bem e onde meu julgamento continua necessário, so that I can usar IA com expectativa realista.
4. As a pessoa não técnica, I want to indicar meu objetivo e contexto de uso, so that a experiência possa começar por algo relevante para mim.
5. As a pessoa não técnica, I want to escolher uma categoria de tarefa sem escrever dados pessoais, so that eu possa contextualizar a experiência preservando minha privacidade.
6. As a pessoa não técnica, I want to ver exemplos de agendamento, comunicação e busca de notícias, so that eu consiga imaginar aplicações úteis de IA na minha rotina.
7. As a pessoa não técnica, I want to comparar duas respostas de IA e explicar minha escolha, so that eu aprenda desde o início que confiança aparente não é evidência.
8. As a pessoa não técnica, I want to receber feedback imediato e específico, so that eu saiba o que observar em uma resposta antes de usá-la.
9. As a pessoa iniciante, I want to receber uma rota guiada quando preciso de apoio, so that eu possa começar com uma primeira conversa simples antes de avançar.
10. As a pessoa com experiência intermediária, I want to avançar para entender limites e usos adequados da IA, so that eu não repita uma introdução que já domino.
11. As a pessoa aprendiz, I want to pedir uma dica sem ser punida, so that eu possa continuar aprendendo quando estiver insegura.
12. As a pessoa aprendiz, I want to ver uma explicação clara de por que recebi minha rota, so that a personalização seja compreensível e confiável.
13. As a pessoa aprendiz, I want to concluir o Mapa Inicial como minha primeira microlição, so that eu perceba progresso imediato.
14. As a pessoa aprendiz, I want to retomar minha rota depois de recarregar a página, so that eu não perca meu progresso no mesmo navegador.
15. As a pessoa aprendiz, I want to ver XP, sequência e revisões como incentivo, so that eu tenha motivação para retornar sem confundir isso com competência comprovada.
16. As a pessoa aprendiz, I want to aprender com cenas voxel art ligadas à tarefa, so that conceitos abstratos de IA tenham um contexto visual memorável.
17. As a pessoa interessada em programação, I want to ver a Trilha Dev como próxima etapa, so that eu entenda que a escola também terá uma evolução para engenharia com IA.
18. As a pessoa interessada em programação, I want to ver a Trilha Dev marcada como em breve quando ela ainda não está disponível, so that eu não seja levada a um fluxo inexistente.
19. As a pessoa preocupada com privacidade, I want to saber que meu progresso fica apenas neste navegador no MVP, so that eu possa decidir conscientemente como usar a experiência.
20. As a pessoa responsável pelo produto, I want to observar conclusão da entrada e primeira lição sem receber texto livre, so that eu possa validar o piloto respeitando minimização de dados.
21. As a pessoa responsável pelo conteúdo, I want to manter as lições no conteúdo canônico, so that a adaptação não duplique textos ou avaliações em componentes de interface.
22. As a pessoa responsável pela qualidade, I want to testar as duas rotas por comportamento observável, so that mudanças de implementação não quebrem a experiência adaptativa.

## Implementation Decisions

- O bounded context continua sendo **AI Literacy** e o produto continua sendo o LiteracyDojo. A mudança não altera o currículo de programação nem o Learner Journey do aprendiz único.
- A maior seam existente é a combinação da camada de casos de uso do LiteracyDojo com o domínio de progresso. A recomendação de próxima lição e o estado da rota vivem ali, em vez de criar um roteador paralelo de tela ou um segundo mecanismo de progresso.
- O Mapa Inicial reutiliza a atividade de comparação determinística existente. Ela fica independente da lição introdutória e é a primeira atividade disponível da entrada.
- O resultado prático governa a rota: somente um acerto na primeira tentativa inicia a rota intermediária. Erro, dica ou nova tentativa iniciam a rota guiada. A autoconfiança altera somente a quantidade e o momento das dicas.
- A rota guiada segue Mapa Inicial, primeira conversa com uma IA, limites da IA e formulação de pedidos. A intermediária começa no Mapa Inicial, segue para limites da IA e converge na formulação de pedidos.
- O progresso local passa a guardar a rota selecionada e a categoria de aplicação. Esses valores são estruturados, ficam no navegador atual e não recebem texto livre.
- A conclusão do Mapa Inicial registra `completed` e pode conceder engajamento local. Ela nunca registra `mastered` nem altera o estado canônico do Learner Journey.
- O assistente pedagógico usa copy e feedback determinísticos do produto. Um provider generativo permanece opcional e não bloqueia o funcionamento do MVP.
- Voxel art é linguagem visual de explicação: cada cena deve tornar a tarefa concreta. As ilustrações são leves e acessíveis; o player não importa os runtimes 3D do miniTown nem do voxelDojo.
- A Trilha Dev é uma superfície visível de continuação, marcada como em breve. Ela não tem rota funcional, progresso próprio ou promessa de acesso neste escopo.
- O MVP é publicado como aplicação estática acessível por link, sem conta, backend, sincronização entre dispositivos ou autenticação.

## Testing Decisions

- Testes devem observar resultados de produto: rota mostrada, próxima lição recomendada, persistência após reload, privacidade do estado e impossibilidade de navegar para uma Trilha Dev inexistente. Eles não devem testar detalhes de composição de componentes.
- O domínio e os casos de uso devem testar a classificação de rota para acerto imediato, erro, dica e nova tentativa; também devem testar a convergência das rotas e a manutenção da sequência após ela.
- O conteúdo canônico deve continuar validando IDs, pré-requisitos, versões e atividade de comparação. A mudança de independência do Mapa Inicial precisa ser validada pelo compilador de conteúdo.
- O repositório de progresso local deve ser testado com persistência e migração forward-only, garantindo que rota e categoria sobrevivam ao reload no mesmo navegador.
- Testes de componentes devem cobrir boas-vindas, seleção por categoria, linguagem de apoio, foco por teclado, contraste e feedback não dependente apenas de cor.
- O teste de navegador deve percorrer uma sessão guiada e uma intermediária, capturar a evidência estruturada emitida e provar a retomada após reload.
- O teste de navegador deve verificar que nenhuma resposta de texto livre é persistida ou enviada pelos eventos de analytics.
- A arte voxel deve receber verificação visual de viewport pequeno e não pode impedir leitura, navegação por teclado ou conclusão da atividade.
- A referência de testes existente é a vertical slice do LiteracyDojo, que já cobre onboarding, lição, resultado, IndexedDB e emissão de evidência.

## Out of Scope

- Contas, login, backend multiusuário, sincronização, recuperação de progresso em outro dispositivo e armazenamento remoto de dados pessoais.
- Um agente que executa ações reais, integra calendário, pesquisa notícias em tempo real ou envia mensagens em nome da pessoa.
- Chat aberto, feedback dependente de LLM, correção por LLM, ranking público, certificados e coleta de texto livre.
- Implementar ou liberar a Trilha Dev; ela é apenas um sinal de continuidade visual no MVP.
- Acoplar o MVP aos engines miniTown, pixelDojo ou voxelDojo, ou alterar seus contratos de evidência.

## Further Notes

- O critério do piloto é: uma pessoa não técnica conclui Mapa Inicial e a primeira microlição sem ajuda, entende por que recebeu aquela rota e identifica uma aplicação prática para sua rotina.
- XP, sequência e conquistas são sinais de engajamento. `completed` é progresso de experiência. `mastered` continua reservado ao verificador independente e não entra no estado do MVP.
- O plano de grooming complementar descreve a sequência de implementação e a direção visual. Esta especificação é a fonte pronta para um agente executar.

