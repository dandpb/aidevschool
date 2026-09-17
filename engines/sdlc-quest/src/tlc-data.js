/* Teaching adaptation with attribution; no agent execution. */
(function(root){
'use strict';
const data={
  "version": "1.2.0",
  "checkedAt": "2026-09-16",
  "install": "npx @tech-leads-club/agent-skills install --skill tlc-discover tlc-plan tlc-implement the-judge",
  "flow": "https://agent-skills.techleads.club/tlc-ai-dev-flow/",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "modules": [
    {
      "id": "discover",
      "skill": "tlc-discover",
      "name": "Investigue antes de decidir",
      "role": "A investigadora",
      "glyph": "◎",
      "stage": "Planejar + Projetar",
      "artifact": ".design/retry-webhook.md",
      "source": "https://agent-skills.techleads.club/skills/tlc-discover/",
      "brief": "Recupere o problema, respeite decisões já tomadas e entregue uma direção explícita.",
      "input": "Ideia, contexto do projeto e decisões ainda abertas.",
      "output": "Veredito e design; ou uma decisão justificada de não construir.",
      "prompt": "Use tlc-discover para explorar o retry de webhooks. Leia primeiro o contexto e as convenções disponíveis. Separe fatos de decisões de produto. A decisão de construir ainda está aberta: esclareça problema, alternativas menores e sucesso esperado antes de propor a arquitetura. Registre lacunas sem inventar métricas.",
      "tasks": [
        {
          "id": "tlc-situation",
          "type": "choice",
          "title": "Primeiro, descubra onde estamos.",
          "lead": "Cenário fictício: a equipe diz “precisamos de Kafka para os retries”. Você não sabe se o produto está em uso nem o que já existe. Qual é o próximo movimento?",
          "concept": "Uma tecnologia sugerida não define o problema. Investigue situação, compromissos e trabalho em andamento; uma decisão de produto não deve ser inferida do silêncio.",
          "example": "Pergunta útil: o suporte reenvia manualmente porque falta uma ação, porque o serviço falha ou porque a plataforma ainda está sendo construída?",
          "success": "Você recuperou o problema antes de escolher a tecnologia. O próximo artefato não nasce de uma premissa inventada.",
          "options": [
            {
              "id": "stack",
              "label": "Escolher Kafka e só depois procurar uma justificativa.",
              "why": "Isso transforma uma preferência técnica em uma decisão de produto."
            },
            {
              "id": "situation",
              "label": "Ler o contexto e esclarecer problema, uso atual e compromissos.",
              "why": ""
            },
            {
              "id": "zero",
              "label": "Concluir que não há demanda porque não existem métricas.",
              "why": "Ausência de instrumentação não demonstra ausência de demanda."
            }
          ],
          "answer": "situation"
        },
        {
          "id": "tlc-verdict",
          "type": "classify",
          "title": "Nem toda conversa precisa de outro “sim”.",
          "lead": "Classifique a saída de cada situação. Aqui, a decisão de construir e a decisão técnica são coisas diferentes.",
          "concept": "Quando a decisão está aberta, o veredito pode encerrar, adiar ou reduzir o trabalho. Um compromisso já registrado não precisa de uma aprovação encenada. Impacto alto e pouca clareza pedem investigação delimitada.",
          "example": "“Retry para administradores já aprovado por Ana” é entrada. “Migrar todos os dados sem entender compatibilidade” continua sendo uma dúvida material.",
          "success": "Você preservou decisões reais e interrompeu apenas o que ainda precisava ser esclarecido.",
          "groups": [
            [
              "gate",
              "Apresentar veredito e aguardar decisão"
            ],
            [
              "record",
              "Registrar compromisso e trabalhar a forma"
            ],
            [
              "spike",
              "RFC ou spike com limite e pergunta"
            ]
          ],
          "items": [
            {
              "id": "open",
              "text": "Construir ou não o retry ainda está em discussão.",
              "answer": "gate"
            },
            {
              "id": "committed",
              "text": "A responsável já aprovou o retry; nada contradiz a decisão.",
              "answer": "record"
            },
            {
              "id": "unclear",
              "text": "Migração irreversível com comportamento do provedor desconhecido.",
              "answer": "spike"
            }
          ]
        },
        {
          "id": "tlc-design",
          "type": "select",
          "title": "Prepare um design que outro agente entenda.",
          "lead": "Neste caso fictício, o retry para administradores já foi aprovado. Selecione três registros que ajudam no handoff, sem tratar suposições como fatos.",
          "concept": "O design preserva decisões concretas, fronteiras e o motivo das escolhas. É possível manter perguntas abertas explicitamente; “decidido” não é sinônimo de texto confiante.",
          "example": "Decisão: somente admin do tenant. Fronteira: sem reenvio em massa. Lacuna: comportamento do destino após um timeout ainda precisa de confirmação.",
          "success": "O handoff distingue contrato, escopo e incerteza. tlc-plan pode localizar o que está decidido e o que ainda bloqueia.",
          "options": [
            {
              "id": "decision",
              "label": "Registrar quem aprovou: somente administradores do próprio tenant.",
              "why": ""
            },
            {
              "id": "boundary",
              "label": "Registrar que reenvio em massa fica fora desta rodada.",
              "why": ""
            },
            {
              "id": "unknown",
              "label": "Marcar a política de duplicatas no destino como questão aberta.",
              "why": ""
            },
            {
              "id": "guess",
              "label": "Garantir exatamente uma entrega em qualquer destino.",
              "why": "Essa garantia não foi decidida nem demonstrada."
            },
            {
              "id": "metric",
              "label": "Inventar uma economia de 90% para fortalecer o argumento.",
              "why": "Métrica inventada não é evidência de necessidade ou resultado."
            }
          ],
          "answer": [
            "decision",
            "boundary",
            "unknown"
          ]
        },
        {
          "id": "tlc-success",
          "type": "choice",
          "title": "Publicar é saída. Resolver é resultado.",
          "lead": "O suporte registra, neste exercício, 40 minutos por dia de reenvio manual. Qual definição permite avaliar se o trabalho valeu a pena?",
          "concept": "O resultado de produto é observado após a entrega. Ele não deve ser transformado artificialmente em um teste unitário que “prova” um impacto de negócio.",
          "example": "Critério técnico: uma entrega elegível gera uma tentativa. Resultado de produto: reduzir a intervenção manual, medido com o suporte após a adoção.",
          "success": "A aposta agora pode ser revisada. A meta de negócio não será usada como um check fictício no merge.",
          "options": [
            {
              "id": "shipped",
              "label": "Sucesso é fazer merge de qualquer implementação.",
              "why": "Merge não mostra se o trabalho manual diminuiu."
            },
            {
              "id": "outcome",
              "label": "Meta acordada: menos de 15 min/dia após duas semanas; Ana revisa a medição.",
              "why": ""
            },
            {
              "id": "unit",
              "label": "Um teste retorna “15”; isso prova a economia de tempo.",
              "why": "Um valor programado no teste não mede o trabalho do suporte."
            }
          ],
          "answer": "outcome"
        }
      ]
    },
    {
      "id": "plan",
      "skill": "tlc-plan",
      "name": "Transforme decisão em trabalho",
      "role": "O planejador",
      "glyph": "◇",
      "stage": "Projetar + Construir",
      "artifact": ".tasks/retry-webhook.md",
      "source": "https://agent-skills.techleads.club/skills/tlc-plan/",
      "brief": "Corte por resultado observável, investigue nove dimensões e exponha lacunas sem inventar escopo.",
      "input": "Uma decisão: ticket, design, PRD, RFC ou conversa.",
      "output": "Tarefa com critérios, fronteira, decisões e questões não resolvidas.",
      "prompt": "Use tlc-plan sobre .design/retry-webhook.md. Leia a fonte por inteiro e confronte-a com o código. Defina fatias verticais e critérios observáveis com valores concretos. Faça o surface walk e registre as nove dimensões em Swept, sem inventar novos requisitos. Diferencie open, blocks build e blocks go-live. Gere .tasks/retry-webhook.md.",
      "tasks": [
        {
          "id": "tlc-slice",
          "type": "choice",
          "title": "Uma fatia que alguém consegue observar.",
          "lead": "O retry foi aprovado. Qual recorte tem um resultado de ponta a ponta verificável?",
          "concept": "Uma fatia vertical atravessa as camadas necessárias para entregar um comportamento. Criar estrutura pode ser preparação válida, mas não prova por si só a capacidade prometida.",
          "example": "Um admin solicita retry de uma entrega elegível e vê uma tentativa criada. Banco, serviço e interface podem participar da mesma fatia.",
          "success": "A primeira entrega prova uma capacidade. As próximas podem aprofundá-la sem perder um ponto de verificação.",
          "options": [
            {
              "id": "schema",
              "label": "Criar todas as tabelas, sem nenhum caminho que as use.",
              "why": "É preparação estrutural, não uma capacidade observável."
            },
            {
              "id": "vertical",
              "label": "Admin solicita um retry elegível e consulta a tentativa criada.",
              "why": ""
            },
            {
              "id": "ui",
              "label": "Desenhar todos os botões, mas sem executar nenhum comportamento.",
              "why": "Uma interface sem comportamento não demonstra o retry."
            }
          ],
          "answer": "vertical"
        },
        {
          "id": "tlc-sweep",
          "type": "classify",
          "title": "As nove dimensões não podem virar nove suposições.",
          "lead": "O texto de cada linha é a fonte deste exercício. Dê um destino a cada dimensão: critério decidido, comportamento existente, não aplicável com motivo ou questão aberta.",
          "concept": "A varredura encontra lacunas; não dá autorização para criar requisitos. Concorrência precisa de uma prova de chamadas simultâneas, não apenas de um teste de duplicata sequencial. n/a exige um motivo sobre a própria mudança, como estado vazio de tela em uma fatia sem tela.",
          "example": "“O guard já cobre esta rota” pede inspeção do código existente. “Ninguém decidiu retenção” pede Unresolved, não um prazo inventado.",
          "success": "As nove dimensões têm um destino rastreável. Um campo vazio não será confundido com um risco resolvido.",
          "groups": [
            [
              "criterion",
              "Critério já decidido"
            ],
            [
              "existing",
              "existing · comportamento verificado"
            ],
            [
              "na",
              "n/a · motivo explícito"
            ],
            [
              "unresolved",
              "Unresolved · decisão pendente"
            ]
          ],
          "items": [
            {
              "id": "validation",
              "text": "Validação: a spec exige rejeitar ID vazio com 400.",
              "answer": "criterion"
            },
            {
              "id": "failure",
              "text": "Falhas: a spec define resposta 404 para entrega ausente.",
              "answer": "criterion"
            },
            {
              "id": "idempotency",
              "text": "Idempotência/retry: o mecanismo de deduplicação foi inspecionado e permanece igual.",
              "answer": "existing"
            },
            {
              "id": "authorization",
              "text": "Autorização: a spec exige admin e isolamento entre tenants.",
              "answer": "criterion"
            },
            {
              "id": "concurrency",
              "text": "Concorrência/ordem: ninguém decidiu o resultado de duas solicitações simultâneas.",
              "answer": "unresolved"
            },
            {
              "id": "lifecycle",
              "text": "Ciclo de dados: a política de retenção das novas tentativas não foi decidida.",
              "answer": "unresolved"
            },
            {
              "id": "dependency",
              "text": "Dependência externa: o adaptador atual já converte timeout em estado failed; verificado.",
              "answer": "existing"
            },
            {
              "id": "state",
              "text": "Transições: a spec define queued → processing → succeeded ou failed.",
              "answer": "criterion"
            },
            {
              "id": "observability",
              "text": "Observabilidade: os eventos de auditoria e a política de redação existentes foram inspecionados e permanecem iguais.",
              "answer": "existing"
            }
          ]
        },
        {
          "id": "tlc-criteria",
          "type": "classify",
          "title": "O número certo na camada certa.",
          "lead": "Classifique as três afirmações. Ter um número na frase não torna tudo verificável por uma única execução.",
          "concept": "Um critério técnico deve nomear comportamento e valores observáveis. Percentis e taxas são propriedades de amostras; metas de serviço exigem uma medição apropriada.",
          "example": "Um teste HTTP verifica o 404. Um estudo de latência mede p95 em uma janela e carga definidas. “Rápido” não define nenhum dos dois.",
          "success": "Você não usou um teste pequeno para alegar algo sobre uma distribuição inteira.",
          "groups": [
            [
              "check",
              "Critério técnico observável"
            ],
            [
              "target",
              "Meta de serviço / medição"
            ],
            [
              "vague",
              "Vago: falta decisão"
            ]
          ],
          "items": [
            {
              "id": "http",
              "text": "Consultar uma entrega ausente retorna HTTP 404.",
              "answer": "check"
            },
            {
              "id": "latency",
              "text": "p95 de latência abaixo de 300 ms na janela e carga acordadas.",
              "answer": "target"
            },
            {
              "id": "fast",
              "text": "A experiência deve ser rápida e robusta.",
              "answer": "vague"
            }
          ]
        },
        {
          "id": "tlc-task-pr",
          "type": "choice",
          "title": "Tarefa não é sinônimo de pull request.",
          "lead": "Uma fonte aprovada contém duas fatias relacionadas. Nenhum bloqueio de ordem, dependência externa ou divisão entre equipes força tarefas separadas. O time quer PRs menores.",
          "concept": "tlc-plan parte de uma tarefa por fonte. Fatias, tarefas e PRs têm papéis diferentes: resultado observável, unidade de trabalho e unidade de revisão.",
          "example": "Uma preparação de migração pode ter sua própria PR e continuar pertencendo à tarefa que prova o comportamento completo.",
          "success": "Você manteve o compromisso verificável e ajustou o tamanho da revisão sem inventar uma regra de fragmentação.",
          "options": [
            {
              "id": "one",
              "label": "Manter uma tarefa com as fatias e propor PRs revisáveis segundo as regras do time.",
              "why": ""
            },
            {
              "id": "layers",
              "label": "Abrir uma tarefa por camada, mesmo sem um resultado observável.",
              "why": "Isso troca a unidade de verificação pela organização técnica."
            },
            {
              "id": "always",
              "label": "Exigir exatamente cinco tarefas porque o framework gosta desse número.",
              "why": "O número não veio da fonte, das dependências nem da prática da equipe."
            }
          ],
          "answer": "one"
        }
      ]
    },
    {
      "id": "implement",
      "skill": "tlc-implement",
      "name": "Construa. Depois, prove.",
      "role": "A construtora",
      "glyph": "⌘",
      "stage": "Construir + Verificar",
      "artifact": ".checks/retry-webhook.md",
      "source": "https://agent-skills.techleads.club/skills/tlc-implement/",
      "brief": "Ligue cada check a uma prova, teste contra o código anterior e faça um handoff verificável.",
      "input": "Trabalho decidido, critérios e escopo claro.",
      "output": "Implementação, checklist e relatório de verificação independente.",
      "prompt": "Use tlc-implement sobre .tasks/retry-webhook.md. Declare o perfil do projeto e gere .checks/retry-webhook.md antes de editar. Ligue cada check a provas executáveis, sem enfraquecer testes. Ao concluir toda a feature, o orquestrador deve acionar um verificador novo sobre o intervalo completo. Sem essa capacidade, registre a verificação independente pendente; não a simule. Não faça push ou deploy sem autorização explícita.",
      "tasks": [
        {
          "id": "tlc-profile",
          "type": "classify",
          "title": "Escolha o perfil sem esconder seus limites.",
          "lead": "O perfil é declarado pelo projeto. Associe as características ao perfil que as introduz; os perfis seguintes acumulam as verificações anteriores.",
          "concept": "light é o padrão documentado; standard adiciona análise de cobertura e política de testes; ui adiciona confronto com fontes visuais vinculantes. Os perfis não são três nomes para a mesma garantia.",
          "example": "Uma tela prometida pelo design precisa ser enumerada e confrontada com a implementação. Dizer “unit tests verdes” não demonstra que a tela existe.",
          "success": "O relatório informa o perfil realmente utilizado e o que ele deixa de verificar.",
          "groups": [
            [
              "light",
              "light"
            ],
            [
              "standard",
              "standard"
            ],
            [
              "ui",
              "ui"
            ]
          ],
          "items": [
            {
              "id": "base",
              "text": "Padrão sem configuração: provas no HEAD, teste localizado e lacunas declaradas.",
              "answer": "light"
            },
            {
              "id": "coverage",
              "text": "Acrescenta Coverage, política de testes e falhas injetadas por superfície de asserção.",
              "answer": "standard"
            },
            {
              "id": "screens",
              "text": "Acrescenta fontes de design vinculantes e enumeração das telas.",
              "answer": "ui"
            }
          ]
        },
        {
          "id": "tlc-proof-lab",
          "type": "prooflab",
          "title": "Quebre a implementação. Não o teste.",
          "lead": "Bug reproduzível: a busca retorna uma entrega de outro tenant. Escolha a suíte e a correção, depois execute as três versões. O código roda localmente sobre dados fictícios.",
          "concept": "Para este bug, a regressão deve detectar a versão anterior e aceitar a correção. Um mutante que retorna null para tudo verifica se os casos positivos também importam. Esta é uma prova reduzida de consulta, não da API completa.",
          "example": "Uma suíte que só verifica o acesso do próprio tenant passa mesmo com o vazamento. Uma correção que nega tudo também é defeituosa, embora bloqueie o acesso cruzado.",
          "success": "A suíte detectou o bug anterior e o mutante, e passou com a correção. Você observou os resultados em vez de confiar na palavra “verde”."
        },
        {
          "id": "tlc-verifier",
          "type": "choice",
          "title": "O verificador não é o último implementador.",
          "lead": "Duas agentes implementaram partes da feature. O último lote ficou verde. Quem verifica a entrega completa?",
          "concept": "Na skill, o orquestrador dispara um novo verificador após todos os lotes, cobrindo a base da feature até HEAD. Handoff desligado não elimina a separação entre autor e verificador.",
          "example": "Só conferir o último diff perde os contratos alterados no primeiro lote. Um relatório honesto identifica o intervalo inteiro e as provas de todos os checks.",
          "success": "Você preservou o escopo da verificação. Um nome de papel não é uma prova de independência.",
          "options": [
            {
              "id": "author",
              "label": "A última implementadora se declara independente e dá 10/10.",
              "why": "Uma autoavaliação não satisfaz a separação exigida."
            },
            {
              "id": "orchestrator",
              "label": "O orquestrador envia todos os checks e base..HEAD a um verificador novo.",
              "why": ""
            },
            {
              "id": "fake",
              "label": "Sem subagentes, escrever “verificado independentemente” para não bloquear.",
              "why": "Capacidade indisponível deve ser declarada; o relatório não pode inventar execução."
            }
          ],
          "answer": "orchestrator"
        },
        {
          "id": "tlc-handoff",
          "type": "select",
          "title": "Passe o estado, não só a história.",
          "lead": "Um lote de fatias completas terminou com todas as suas provas verdes. Escolha três itens para o handoff. O limite de leitura deve caber no harness utilizado.",
          "concept": "O próximo executor recebe checklist e diff, limites fechados e decisões novas. O handoff acontece em uma fronteira coerente; não deve esconder uma fatia incompleta atrás de uma suíte verde.",
          "example": "“C1–C3 fechados no commit a12; o limite de tentativas foi esclarecido; a abordagem X foi descartada por incompatibilidade” preserva decisões que o diff sozinho não explica.",
          "success": "O próximo agente recebe os registros necessários para continuar sem reinventar decisões ou repetir uma tentativa abandonada.",
          "options": [
            {
              "id": "checks",
              "label": "Checklist e diff, com checks fechados e commit identificado.",
              "why": ""
            },
            {
              "id": "decisions",
              "label": "Esclarecimentos do usuário ainda não registrados em outro artefato.",
              "why": ""
            },
            {
              "id": "rejected",
              "label": "Tentativas abandonadas e o motivo do descarte.",
              "why": ""
            },
            {
              "id": "story",
              "label": "Somente “está quase pronto, confie em mim”.",
              "why": "Esse resumo não identifica contratos, commit ou provas."
            },
            {
              "id": "token",
              "label": "Credenciais permanentes de produção para facilitar o próximo lote.",
              "why": "Handoff não autoriza novos poderes nem exposição de segredos."
            }
          ],
          "answer": [
            "checks",
            "decisions",
            "rejected"
          ]
        }
      ]
    },
    {
      "id": "judge",
      "skill": "the-judge",
      "name": "Julgue a PR com evidências",
      "role": "O juiz",
      "glyph": "⚖",
      "stage": "Verificar + portão de Publicar",
      "artifact": "findings.json",
      "source": "https://agent-skills.techleads.club/skills/the-judge/",
      "brief": "Poucos achados, bem sustentados. Um veredito coerente e uma revisão que converge.",
      "input": "Uma PR/diff e as verificações reais do repositório.",
      "output": "Achados rastreáveis e APPROVE, COMMENT ou REQUEST_CHANGES.",
      "prompt": "Use the-judge para revisar esta PR em português. Execute os checks disponíveis, leia o diff e valide cada achado com arquivo:linha ou documentação oficial consultada. Consolide a revisão e use o veredito correspondente às severidades. Nas reavaliações, mantenha IDs, carryover e o contrato de convergência. Sem PR ou autenticação, declare o bloqueio; não diga que publicou uma review.",
      "tasks": [
        {
          "id": "tlc-review",
          "type": "reviewlab",
          "title": "Tribunal: o que realmente merece um achado?",
          "lead": "PR fictícia: a nova linha 4 registra o cabeçalho de autenticação. A leitura confirma o fluxo, e um teste local com token sintético reproduz a exposição. Lint e tipos já foram executados; os demais candidatos estão abaixo.",
          "concept": "Cada achado publicado precisa de evidência. O tooling já relata falhas determinísticas; o revisor concentra os comentários em problemas confirmados que exigem julgamento. Uma falha preexistente vai ao resumo, não vira defeito introduzido pela PR.",
          "example": "F1 → src/retry.ts:4, entrada sintética Authorization e registro capturado: um problema novo de exposição. “Não gosto deste nome” não tem o mesmo impacto.",
          "success": "Revisão consolidada preparada: F1 é blocker confirmado, então o veredito é REQUEST_CHANGES. Nada foi enviado ao GitHub.",
          "options": [
            {
              "id": "F1",
              "label": "F1 · Nova exposição de token em src/retry.ts:4; reprodução confirmada.",
              "why": ""
            },
            {
              "id": "F2",
              "label": "F2 · Repetir em comentário inline o erro que o lint já reportou.",
              "why": "O resultado do tooling fica em Checks run; não duplique o mesmo aviso inline."
            },
            {
              "id": "F3",
              "label": "F3 · Tratar bug antigo e não alterado como blocker desta PR.",
              "why": "Achado preexistente pertence ao resumo, sem mudar o veredito por si só."
            },
            {
              "id": "F4",
              "label": "F4 · Afirmar de memória que a biblioteca externa está vulnerável.",
              "why": "Comportamento externo exige fonte oficial atual; sem evidência, não publique a afirmação."
            }
          ],
          "answer": [
            "F1"
          ]
        },
        {
          "id": "tlc-severity",
          "type": "classify",
          "title": "Três vereditos, não uma nota de perfeição.",
          "lead": "Todos os achados abaixo já têm evidência. Use o mapeamento da skill, não uma política universal de todas as equipes.",
          "concept": "Um blocker leva a REQUEST_CHANGES. Sem blocker, um should-fix leva a COMMENT. Sem ambos, APPROVE pode coexistir com nits. O veredito de review não concede credenciais nem faz merge.",
          "example": "Um problema de autorização confirmado é blocker. Uma melhoria cosmética não deve produzir um ciclo infinito de pedidos de mudança.",
          "success": "O veredito comunica risco e pendências, sem fingir que APPROVE significa ausência de qualquer imperfeição.",
          "groups": [
            [
              "REQUEST_CHANGES",
              "REQUEST_CHANGES"
            ],
            [
              "COMMENT",
              "COMMENT"
            ],
            [
              "APPROVE",
              "APPROVE"
            ]
          ],
          "items": [
            {
              "id": "blocker",
              "text": "1 blocker de acesso entre tenants e 2 nits.",
              "answer": "REQUEST_CHANGES"
            },
            {
              "id": "should",
              "text": "Nenhum blocker; 1 should-fix confirmado.",
              "answer": "COMMENT"
            },
            {
              "id": "nit",
              "text": "Nenhum blocker ou should-fix; 2 nits.",
              "answer": "APPROVE"
            }
          ]
        },
        {
          "id": "tlc-carryover",
          "type": "choice",
          "title": "Sem achados novos não significa sem pendências.",
          "lead": "Rodada 2: F1 foi corrigido. F2, um blocker da rodada anterior, continua aberto. Nenhum achado novo. Qual é a review correta?",
          "concept": "IDs estáveis e a tabela Resolution preservam o histórico. O carryover inclui pendências anteriores no veredito. Olhar apenas a lista de achados novos pode esconder um risco ainda aberto.",
          "example": "findings: [] com carryover.blocker: 1 continua exigindo REQUEST_CHANGES. A lista vazia não apaga F2.",
          "success": "A pendência continuou visível. Você verificou a resolução em vez de reiniciar a revisão do zero.",
          "options": [
            {
              "id": "approve",
              "label": "APPROVE: a lista de achados novos está vazia.",
              "why": "F2 continua sendo um blocker, mesmo sem novo comentário."
            },
            {
              "id": "carry",
              "label": "REQUEST_CHANGES: registrar F1 resolvido, F2 aberto e carryover.blocker = 1.",
              "why": ""
            },
            {
              "id": "new",
              "label": "Ignorar F2 e abrir dez novas discussões cosméticas.",
              "why": "Isso troca resolução por novas frentes e viola a convergência."
            }
          ],
          "answer": "carry"
        },
        {
          "id": "tlc-converge",
          "type": "choice",
          "title": "Saia do loop pelo motivo certo.",
          "lead": "Rodada 3: uma divergência continua aberta depois de uma tentativa com nova evidência. O autor pede uma quarta rodada até alguém dar 10/10.",
          "concept": "O contrato do the-judge limita o mesmo conjunto de achados a três rodadas. Pendências são corrigidas, convertidas em follow-up por acordo ou escaladas. Um blocker real não desaparece por cansaço.",
          "example": "A reavaliação confere resoluções e novos blockers introduzidos pela correção; não é uma caça infinita a nits. Segurança grave descoberta tarde continua sendo reportada.",
          "success": "Você encerrou a repetição sem aprovar artificialmente. Decisão e risco ficam explícitos; a pessoa responsável assume a divergência.",
          "options": [
            {
              "id": "inflate",
              "label": "Aumentar a nota automaticamente e declarar perfeição.",
              "why": "Isso substitui evidência por uma meta artificial."
            },
            {
              "id": "stop",
              "label": "Manter o achado aberto e escalar a divergência; não iniciar a quarta rodada do mesmo conjunto.",
              "why": ""
            },
            {
              "id": "endless",
              "label": "Revisar indefinidamente, adicionando novas exigências a cada rodada.",
              "why": "O loop ilimitado faz a review perder escopo e impede convergência."
            }
          ],
          "answer": "stop"
        }
      ]
    }
  ],
  "notice": "Adaptação didática independente do SDLC Quest, com cenários fictícios. Conteúdo das skills: Tech Leads Club, CC BY 4.0. Consultado em 16/09/2026. Nomes, caminhos e contratos preservados onde indicados; exemplos e mecânicas foram criados para este jogo. Não é produto oficial nem executa agentes, npx, GitHub ou deploy.",
  "stageMap": [
    [
      "discover"
    ],
    [
      "discover",
      "plan"
    ],
    [
      "plan",
      "implement"
    ],
    [
      "implement",
      "judge"
    ],
    [
      "judge"
    ],
    []
  ]
};
if(typeof module==='object'&&module.exports)module.exports=data;else root.QuestTLCData=data;
})(typeof globalThis!=='undefined'?globalThis:this);
