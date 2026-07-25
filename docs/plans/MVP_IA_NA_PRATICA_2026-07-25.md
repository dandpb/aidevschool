# MVP IA na Prática — consenso de grooming

| Campo | Valor |
| --- | --- |
| Status | Plano aprovado para implementação |
| Data | 2026-07-25 |
| Público | Pessoas não técnicas que querem aplicar IA no dia a dia |
| Superfície | `engines/literacyDojo/` |
| Limite | Não prova `mastered`; registra somente progresso local `completed` |

## Objetivo do MVP

Entregar por um link de navegador, sem instalação ou conta, uma primeira
experiência que ajuda uma pessoa não técnica a entender onde um assistente de
IA pode ajudar e qual microlição deve fazer em seguida.

O sinal de sucesso do piloto é a pessoa concluir sem ajuda o Mapa Inicial e a
primeira microlição, entender a rota recebida e identificar uma ação prática
para sua rotina.

## Experiência de entrada

1. **Acolhimento.** O produto se apresenta como um assistente de IA: ajuda a
   organizar, resumir, criar rascunhos, comparar opções e planejar passos; não
   substitui o julgamento da pessoa.
2. **Apresentação da pessoa.** Sem nome e sem texto livre, ela escolhe objetivo,
   contexto de uso e nível de confiança. A confiança muda apenas tom e dicas.
3. **Primeira ação.** Ela escolhe uma categoria de aplicação, como agendamento,
   comunicação ou busca de notícias. A escolha contextualiza exemplos, sem
   armazenar detalhes pessoais.
4. **Mapa Inicial.** Ela compara duas respostas de IA e explica qual é mais
   confiável. Essa atividade vale como primeira microlição concluída.
5. **Rota seguinte.** Acerto na primeira tentativa leva à rota intermediária;
   erro, dica ou nova tentativa levam à rota guiada.

## Roteiros adaptativos

| Rota | Sequência inicial | Ajuda |
| --- | --- | --- |
| Guiada | Mapa Inicial → Sua primeira conversa com uma IA → O que a IA faz bem e onde costuma falhar → Como formular pedidos melhores | Linguagem mais direta e dicas disponíveis cedo |
| Intermediária | Mapa Inicial → O que a IA faz bem e onde costuma falhar → Como formular pedidos melhores | Menos explicações introdutórias; dica permanece disponível sob demanda |

As rotas convergem após a primeira lição de formulação de pedidos. Não há
conteúdo paralelo no MVP.

## Trilha Dev

A entrada mostra a Trilha Dev como um próximo caminho marcado “em breve”. Ela
não abre um segundo fluxo, não cria progresso e não promete acesso no MVP.

## Direção de experiência

- **Assistente pedagógico.** A interface fala como um guia acolhedor e explica
  o próximo passo. No MVP, ele usa conteúdo e feedback estruturados; não exige
  um modelo de IA externo para funcionar.
- **Ritmo Duolingo, sem armadilhas.** Microlições, feedback imediato, XP,
  sequência e revisões motivam o retorno, mas nunca substituem aprendizagem ou
  classificam alguém como `mastered`.
- **Voxel art com função didática.** Ilustrações voxel bonitas tornam cenários
  concretos: uma agenda para organizar compromissos, uma redação para melhorar
  uma mensagem e uma banca de notícias para comparar fontes. A arte explica a
  tarefa; não é decoração solta.
- **Escopo visual do MVP.** Usar cenas e ilustrações leves, responsivas e
  acessíveis. Não acoplar o player ao runtime 3D do miniTown ou às simulações
  técnicas do voxelDojo; esses engines servem a outros contextos pedagógicos.

## Escopo técnico mínimo

- Reutilizar a atividade atual de comparação da lição `l02` como Mapa Inicial
  independente, removendo sua dependência da lição introdutória.
- Manter `l01` como primeiro passo exclusivo da rota guiada.
- Persistir no progresso local a rota escolhida e a categoria de aplicação;
  ambos ficam somente no navegador atual.
- Trocar o desbloqueio linear por uma recomendação de próxima lição apenas na
  entrada; após a convergência, preservar a sequência existente.
- Não introduzir backend, autenticação, LLM obrigatório, texto livre em
  telemetria ou declaração de `mastered`.

## Critérios de aceite

- Uma pessoa nova abre o link e chega ao Mapa Inicial sem cadastro.
- O resultado do Mapa define a rota por desempenho, não por autoconfiança.
- A primeira atividade concluída é registrada como `completed`, nunca como
  `mastered`.
- A rota guiada e a intermediária mostram a próxima lição correta.
- Ao recarregar a página, o progresso e a rota persistem no mesmo navegador.
- A Trilha Dev aparece como “em breve” sem navegação para um fluxo inexistente.
- O fluxo inteiro é coberto por teste de navegador, além dos testes de domínio
  e da validação do conteúdo canônico.

## Fora do escopo

- Contas, sincronização entre dispositivos e backend multiusuário.
- Agentes que executam ações em nome da pessoa.
- Chat aberto, ranking, certificados ou coleta de detalhes pessoais.
- Conteúdo novo para cada rota.

## Ordem de implementação

1. Atualizar o contrato de conteúdo e o progresso local para representar o
   Mapa Inicial e a rota.
2. Implementar o acolhimento, seleção por categorias e a apresentação do
   Mapa Inicial.
3. Aplicar a recomendação de próxima lição e a convergência das rotas.
4. Tornar a Trilha Dev visível como “em breve”.
5. Cobrir o fluxo guiado, o intermediário, a persistência e a retomada com
   testes; então publicar o app estático e verificar o link público.
