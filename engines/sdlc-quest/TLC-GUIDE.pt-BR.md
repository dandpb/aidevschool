# SDLC Quest v1.2 — Guia da Oficina TLC

Expansão independente: 16 desafios em quatro módulos, além dos 18 originais. Não contém notas nem progresso do usuário.

## Começar
Abra o HTML autocontido e escolha **Entrar na oficina**. A ordem sugerida é Discover → Plan → Implement → Judge; cada módulo também pode ser estudado isoladamente.

## Preservar o progresso da v1.1
Na v1.1, abra Configurações e baixe o backup JSON. Na v1.2, use Configurações → Restaurar backup e confira a prévia antes de confirmar. Abrir um arquivo de nome ou caminho diferente pode não reutilizar o armazenamento anterior. A importação substitui o progresso atual, não combina dois arquivos.

## Instalar fora do navegador
O jogo não executa comandos. No terminal do seu projeto, após conferir a origem e as opções do instalador:

```sh
npx @tech-leads-club/agent-skills install --skill tlc-discover tlc-plan tlc-implement the-judge
```

O comando é o publicado na página consultada em 16/09/2026. A instalação não foi executada nem validada nesta entrega.

## tlc-discover

**Entrada:** Ideia, contexto do projeto e decisões ainda abertas.

**Saída:** Veredito e design; ou uma decisão justificada de não construir.

**Onde se encaixa:** Planejar + Projetar. Artefato associado: `.design/retry-webhook.md`.

**Prompt sugerido:**

```text
Use tlc-discover para explorar o retry de webhooks. Leia primeiro o contexto e as convenções disponíveis. Separe fatos de decisões de produto. A decisão de construir ainda está aberta: esclareça problema, alternativas menores e sucesso esperado antes de propor a arquitetura. Registre lacunas sem inventar métricas.
```

**O que você pratica:**

- Primeiro, descubra onde estamos. Uma tecnologia sugerida não define o problema. Investigue situação, compromissos e trabalho em andamento; uma decisão de produto não deve ser inferida do silêncio.
- Nem toda conversa precisa de outro “sim”. Quando a decisão está aberta, o veredito pode encerrar, adiar ou reduzir o trabalho. Um compromisso já registrado não precisa de uma aprovação encenada. Impacto alto e pouca clareza pedem investigação delimitada.
- Prepare um design que outro agente entenda. O design preserva decisões concretas, fronteiras e o motivo das escolhas. É possível manter perguntas abertas explicitamente; “decidido” não é sinônimo de texto confiante.
- Publicar é saída. Resolver é resultado. O resultado de produto é observado após a entrega. Ele não deve ser transformado artificialmente em um teste unitário que “prova” um impacto de negócio.

Fonte: https://agent-skills.techleads.club/skills/tlc-discover/

## tlc-plan

**Entrada:** Uma decisão: ticket, design, PRD, RFC ou conversa.

**Saída:** Tarefa com critérios, fronteira, decisões e questões não resolvidas.

**Onde se encaixa:** Projetar + Construir. Artefato associado: `.tasks/retry-webhook.md`.

**Prompt sugerido:**

```text
Use tlc-plan sobre .design/retry-webhook.md. Leia a fonte por inteiro e confronte-a com o código. Defina fatias verticais e critérios observáveis com valores concretos. Faça o surface walk e registre as nove dimensões em Swept, sem inventar novos requisitos. Diferencie open, blocks build e blocks go-live. Gere .tasks/retry-webhook.md.
```

**O que você pratica:**

- Uma fatia que alguém consegue observar. Uma fatia vertical atravessa as camadas necessárias para entregar um comportamento. Criar estrutura pode ser preparação válida, mas não prova por si só a capacidade prometida.
- As nove dimensões não podem virar nove suposições. A varredura encontra lacunas; não dá autorização para criar requisitos. Concorrência precisa de uma prova de chamadas simultâneas, não apenas de um teste de duplicata sequencial. n/a exige um motivo sobre a própria mudança, como estado vazio de tela em uma fatia sem tela.
- O número certo na camada certa. Um critério técnico deve nomear comportamento e valores observáveis. Percentis e taxas são propriedades de amostras; metas de serviço exigem uma medição apropriada.
- Tarefa não é sinônimo de pull request. tlc-plan parte de uma tarefa por fonte. Fatias, tarefas e PRs têm papéis diferentes: resultado observável, unidade de trabalho e unidade de revisão.

Fonte: https://agent-skills.techleads.club/skills/tlc-plan/

## tlc-implement

**Entrada:** Trabalho decidido, critérios e escopo claro.

**Saída:** Implementação, checklist e relatório de verificação independente.

**Onde se encaixa:** Construir + Verificar. Artefato associado: `.checks/retry-webhook.md`.

**Prompt sugerido:**

```text
Use tlc-implement sobre .tasks/retry-webhook.md. Declare o perfil do projeto e gere .checks/retry-webhook.md antes de editar. Ligue cada check a provas executáveis, sem enfraquecer testes. Ao concluir toda a feature, o orquestrador deve acionar um verificador novo sobre o intervalo completo. Sem essa capacidade, registre a verificação independente pendente; não a simule. Não faça push ou deploy sem autorização explícita.
```

**O que você pratica:**

- Escolha o perfil sem esconder seus limites. light é o padrão documentado; standard adiciona análise de cobertura e política de testes; ui adiciona confronto com fontes visuais vinculantes. Os perfis não são três nomes para a mesma garantia.
- Quebre a implementação. Não o teste. Para este bug, a regressão deve detectar a versão anterior e aceitar a correção. Um mutante que retorna null para tudo verifica se os casos positivos também importam. Esta é uma prova reduzida de consulta, não da API completa.
- O verificador não é o último implementador. Na skill, o orquestrador dispara um novo verificador após todos os lotes, cobrindo a base da feature até HEAD. Handoff desligado não elimina a separação entre autor e verificador.
- Passe o estado, não só a história. O próximo executor recebe checklist e diff, limites fechados e decisões novas. O handoff acontece em uma fronteira coerente; não deve esconder uma fatia incompleta atrás de uma suíte verde.

Fonte: https://agent-skills.techleads.club/skills/tlc-implement/

## the-judge

**Entrada:** Uma PR/diff e as verificações reais do repositório.

**Saída:** Achados rastreáveis e APPROVE, COMMENT ou REQUEST_CHANGES.

**Onde se encaixa:** Verificar + portão de Publicar. Artefato associado: `findings.json`.

**Prompt sugerido:**

```text
Use the-judge para revisar esta PR em português. Execute os checks disponíveis, leia o diff e valide cada achado com arquivo:linha ou documentação oficial consultada. Consolide a revisão e use o veredito correspondente às severidades. Nas reavaliações, mantenha IDs, carryover e o contrato de convergência. Sem PR ou autenticação, declare o bloqueio; não diga que publicou uma review.
```

**O que você pratica:**

- Tribunal: o que realmente merece um achado? Cada achado publicado precisa de evidência. O tooling já relata falhas determinísticas; o revisor concentra os comentários em problemas confirmados que exigem julgamento. Uma falha preexistente vai ao resumo, não vira defeito introduzido pela PR.
- Três vereditos, não uma nota de perfeição. Um blocker leva a REQUEST_CHANGES. Sem blocker, um should-fix leva a COMMENT. Sem ambos, APPROVE pode coexistir com nits. O veredito de review não concede credenciais nem faz merge.
- Sem achados novos não significa sem pendências. IDs estáveis e a tabela Resolution preservam o histórico. O carryover inclui pendências anteriores no veredito. Olhar apenas a lista de achados novos pode esconder um risco ainda aberto.
- Saia do loop pelo motivo certo. O contrato do the-judge limita o mesmo conjunto de achados a três rodadas. Pendências são corrigidas, convertidas em follow-up por acordo ou escaladas. Um blocker real não desaparece por cansaço.

Fonte: https://agent-skills.techleads.club/skills/the-judge/

## Os dois laboratórios

**Provas:** cinco asserções em três versões da consulta. O arquivo de execução contém os resultados locais. Os exemplos .checks descrevem os critérios, mas não atestam execução.

**Review:** seleção de achados e veredito sobre um diff fictício. findings.json é explicitamente simulado; nenhum script oficial foi rodado e nenhuma review foi publicada.

## Limites que continuam valendo

O the-judge não substitui verificação independente nem infraestrutura de autorização. APPROVE não é uma nota de perfeição, merge ou deploy. O limite de três rodadas exige resolução, acordo ou escalonamento, não aprovação forçada. A campanha original continua ensinando release e manutenção.

## Atribuição

Adaptação didática independente do SDLC Quest, com cenários fictícios. Conteúdo das skills: Tech Leads Club, CC BY 4.0. Consultado em 16/09/2026. Nomes, caminhos e contratos preservados onde indicados; exemplos e mecânicas foram criados para este jogo. Não é produto oficial nem executa agentes, npx, GitHub ou deploy.
https://creativecommons.org/licenses/by/4.0/
