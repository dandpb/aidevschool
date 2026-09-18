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
      "name_en": "Investigate before deciding",
      "role": "A investigadora",
      "role_en": "The investigator",
      "glyph": "◎",
      "stage": "Planejar + Projetar",
      "stage_en": "Plan + Design",
      "artifact": ".design/retry-webhook.md",
      "source": "https://agent-skills.techleads.club/skills/tlc-discover/",
      "brief": "Recupere o problema, respeite decisões já tomadas e entregue uma direção explícita.",
      "brief_en": "Recover the problem, respect decisions already made and deliver an explicit direction.",
      "input": "Ideia, contexto do projeto e decisões ainda abertas.",
      "input_en": "An idea, project context and still-open decisions.",
      "output": "Veredito e design; ou uma decisão justificada de não construir.",
      "output_en": "A verdict and design; or a justified decision not to build.",
      "prompt": "Use tlc-discover para explorar o retry de webhooks. Leia primeiro o contexto e as convenções disponíveis. Separe fatos de decisões de produto. A decisão de construir ainda está aberta: esclareça problema, alternativas menores e sucesso esperado antes de propor a arquitetura. Registre lacunas sem inventar métricas.",
      "prompt_en": "Use tlc-discover to explore the webhook retry. Read the available context and conventions first. Separate facts from product decisions. The build decision is still open: clarify problem, smaller alternatives and expected success before proposing the architecture. Record gaps without inventing metrics.",
      "tasks": [
        {
          "id": "tlc-situation",
          "type": "choice",
          "title": "Primeiro, descubra onde estamos.",
          "title_en": "First, find out where we are.",
          "lead": "Cenário fictício: a equipe diz “precisamos de Kafka para os retries”. Você não sabe se o produto está em uso nem o que já existe. Qual é o próximo movimento?",
          "lead_en": "Fictional scenario: the team says “we need Kafka for the retries”. You do not know whether the product is in use or what already exists. What is the next move?",
          "concept": "Uma tecnologia sugerida não define o problema. Investigue situação, compromissos e trabalho em andamento; uma decisão de produto não deve ser inferida do silêncio.",
          "concept_en": "A suggested technology does not define the problem. Investigate situation, commitments and work in progress; a product decision should not be inferred from silence.",
          "example": "Pergunta útil: o suporte reenvia manualmente porque falta uma ação, porque o serviço falha ou porque a plataforma ainda está sendo construída?",
          "example_en": "Useful question: does support resend manually because an action is missing, because the service fails, or because the platform is still being built?",
          "success": "Você recuperou o problema antes de escolher a tecnologia. O próximo artefato não nasce de uma premissa inventada.",
          "success_en": "You recovered the problem before choosing the technology. The next artifact is not born from an invented premise.",
          "options": [
            {
              "id": "stack",
              "label": "Escolher Kafka e só depois procurar uma justificativa.",
              "label_en": "Choose Kafka first and only then look for a justification.",
              "why": "Isso transforma uma preferência técnica em uma decisão de produto.",
              "why_en": "That turns a technical preference into a product decision."
            },
            {
              "id": "situation",
              "label": "Ler o contexto e esclarecer problema, uso atual e compromissos.",
              "label_en": "Read the context and clarify problem, current usage and commitments.",
              "why": ""
            },
            {
              "id": "zero",
              "label": "Concluir que não há demanda porque não existem métricas.",
              "label_en": "Conclude there is no demand because there are no metrics.",
              "why": "Ausência de instrumentação não demonstra ausência de demanda.",
              "why_en": "Lack of instrumentation does not demonstrate lack of demand."
            }
          ],
          "answer": "situation"
        },
        {
          "id": "tlc-verdict",
          "type": "classify",
          "title": "Nem toda conversa precisa de outro “sim”.",
          "title_en": "Not every conversation needs another “yes”.",
          "lead": "Classifique a saída de cada situação. Aqui, a decisão de construir e a decisão técnica são coisas diferentes.",
          "lead_en": "Classify the outcome of each situation. Here, the build decision and the technical decision are different things.",
          "concept": "Quando a decisão está aberta, o veredito pode encerrar, adiar ou reduzir o trabalho. Um compromisso já registrado não precisa de uma aprovação encenada. Impacto alto e pouca clareza pedem investigação delimitada.",
          "concept_en": "While the decision is open, the verdict can end, postpone or shrink the work. A recorded commitment needs no staged approval. High impact and low clarity call for a bounded investigation.",
          "example": "“Retry para administradores já aprovado por Ana” é entrada. “Migrar todos os dados sem entender compatibilidade” continua sendo uma dúvida material.",
          "example_en": "“Retry for administrators already approved by Ana” is input. “Migrate all the data without understanding compatibility” is still a material doubt.",
          "success": "Você preservou decisões reais e interrompeu apenas o que ainda precisava ser esclarecido.",
          "success_en": "You preserved real decisions and interrupted only what still needed clarifying.",
          "groups": [
            [
              "gate",
              "Apresentar veredito e aguardar decisão",
              "Present the verdict and await a decision"
            ],
            [
              "record",
              "Registrar compromisso e trabalhar a forma",
              "Record the commitment and work the shape"
            ],
            [
              "spike",
              "RFC ou spike com limite e pergunta",
              "RFC or spike with a limit and a question"
            ]
          ],
          "items": [
            {
              "id": "open",
              "text": "Construir ou não o retry ainda está em discussão.",
              "text_en": "Whether to build the retry is still under discussion.",
              "answer": "gate"
            },
            {
              "id": "committed",
              "text": "A responsável já aprovou o retry; nada contradiz a decisão.",
              "text_en": "The owner already approved the retry; nothing contradicts the decision.",
              "answer": "record"
            },
            {
              "id": "unclear",
              "text": "Migração irreversível com comportamento do provedor desconhecido.",
              "text_en": "Irreversible migration with unknown provider behavior.",
              "answer": "spike"
            }
          ]
        },
        {
          "id": "tlc-design",
          "type": "select",
          "title": "Prepare um design que outro agente entenda.",
          "title_en": "Prepare a design another agent can understand.",
          "lead": "Neste caso fictício, o retry para administradores já foi aprovado. Selecione três registros que ajudam no handoff, sem tratar suposições como fatos.",
          "lead_en": "In this fictional case, the administrator retry is already approved. Select three records that help the handoff, without treating assumptions as facts.",
          "concept": "O design preserva decisões concretas, fronteiras e o motivo das escolhas. É possível manter perguntas abertas explicitamente; “decidido” não é sinônimo de texto confiante.",
          "concept_en": "The design preserves concrete decisions, boundaries and the reason for choices. Open questions can stay explicit; “decided” is not a synonym for confident prose.",
          "example": "Decisão: somente admin do tenant. Fronteira: sem reenvio em massa. Lacuna: comportamento do destino após um timeout ainda precisa de confirmação.",
          "example_en": "Decision: tenant admins only. Boundary: no bulk resend. Gap: the destination’s behavior after a timeout still needs confirmation.",
          "success": "O handoff distingue contrato, escopo e incerteza. tlc-plan pode localizar o que está decidido e o que ainda bloqueia.",
          "success_en": "The handoff tells contract, scope and uncertainty apart. tlc-plan can locate what is decided and what still blocks.",
          "options": [
            {
              "id": "decision",
              "label": "Registrar quem aprovou: somente administradores do próprio tenant.",
              "label_en": "Record who approved: tenant administrators only.",
              "why": ""
            },
            {
              "id": "boundary",
              "label": "Registrar que reenvio em massa fica fora desta rodada.",
              "label_en": "Record that bulk resend stays out of this round.",
              "why": ""
            },
            {
              "id": "unknown",
              "label": "Marcar a política de duplicatas no destino como questão aberta.",
              "label_en": "Mark the destination’s duplicate policy as an open question.",
              "why": ""
            },
            {
              "id": "guess",
              "label": "Garantir exatamente uma entrega em qualquer destino.",
              "label_en": "Guarantee exactly one delivery to any destination.",
              "why": "Essa garantia não foi decidida nem demonstrada.",
              "why_en": "That guarantee was neither decided nor demonstrated."
            },
            {
              "id": "metric",
              "label": "Inventar uma economia de 90% para fortalecer o argumento.",
              "label_en": "Invent a 90% saving to strengthen the argument.",
              "why": "Métrica inventada não é evidência de necessidade ou resultado.",
              "why_en": "An invented metric is not evidence of need or outcome."
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
          "title_en": "Shipping is output. Solving is outcome.",
          "lead": "O suporte registra, neste exercício, 40 minutos por dia de reenvio manual. Qual definição permite avaliar se o trabalho valeu a pena?",
          "lead_en": "In this exercise support logs 40 minutes per day of manual resending. Which definition lets you evaluate whether the work paid off?",
          "concept": "O resultado de produto é observado após a entrega. Ele não deve ser transformado artificialmente em um teste unitário que “prova” um impacto de negócio.",
          "concept_en": "A product outcome is observed after delivery. It should not be artificially turned into a unit test that “proves” a business impact.",
          "example": "Critério técnico: uma entrega elegível gera uma tentativa. Resultado de produto: reduzir a intervenção manual, medido com o suporte após a adoção.",
          "example_en": "Technical criterion: an eligible delivery creates an attempt. Product outcome: less manual intervention, measured with support after adoption.",
          "success": "A aposta agora pode ser revisada. A meta de negócio não será usada como um check fictício no merge.",
          "success_en": "The bet can now be revisited. The business goal will not be used as a fictitious merge check.",
          "options": [
            {
              "id": "shipped",
              "label": "Sucesso é fazer merge de qualquer implementação.",
              "label_en": "Success is merging any implementation.",
              "why": "Merge não mostra se o trabalho manual diminuiu.",
              "why_en": "A merge does not show whether manual work decreased."
            },
            {
              "id": "outcome",
              "label": "Meta acordada: menos de 15 min/dia após duas semanas; Ana revisa a medição.",
              "label_en": "Agreed target: under 15 min/day after two weeks; Ana reviews the measurement.",
              "why": ""
            },
            {
              "id": "unit",
              "label": "Um teste retorna “15”; isso prova a economia de tempo.",
              "label_en": "A test returns “15”; that proves the time saving.",
              "why": "Um valor programado no teste não mede o trabalho do suporte.",
              "why_en": "A value programmed into the test does not measure support’s work."
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
      "name_en": "Turn decision into work",
      "role": "O planejador",
      "role_en": "The planner",
      "glyph": "◇",
      "stage": "Projetar + Construir",
      "stage_en": "Design + Build",
      "artifact": ".tasks/retry-webhook.md",
      "source": "https://agent-skills.techleads.club/skills/tlc-plan/",
      "brief": "Corte por resultado observável, investigue nove dimensões e exponha lacunas sem inventar escopo.",
      "brief_en": "Cut by observable outcome, investigate nine dimensions and expose gaps without inventing scope.",
      "input": "Uma decisão: ticket, design, PRD, RFC ou conversa.",
      "input_en": "A decision: ticket, design, PRD, RFC or conversation.",
      "output": "Tarefa com critérios, fronteira, decisões e questões não resolvidas.",
      "output_en": "A task with criteria, boundary, decisions and unresolved questions.",
      "prompt": "Use tlc-plan sobre .design/retry-webhook.md. Leia a fonte por inteiro e confronte-a com o código. Defina fatias verticais e critérios observáveis com valores concretos. Faça o surface walk e registre as nove dimensões em Swept, sem inventar novos requisitos. Diferencie open, blocks build e blocks go-live. Gere .tasks/retry-webhook.md.",
      "prompt_en": "Use tlc-plan on .design/retry-webhook.md. Read the source in full and confront it with the code. Define vertical slices and observable criteria with concrete values. Do the surface walk and record the nine dimensions under Swept, without inventing new requirements. Tell open, blocks build and blocks go-live apart. Generate .tasks/retry-webhook.md.",
      "tasks": [
        {
          "id": "tlc-slice",
          "type": "choice",
          "title": "Uma fatia que alguém consegue observar.",
          "title_en": "A slice someone can observe.",
          "lead": "O retry foi aprovado. Qual recorte tem um resultado de ponta a ponta verificável?",
          "lead_en": "The retry is approved. Which cut has a verifiable end-to-end outcome?",
          "concept": "Uma fatia vertical atravessa as camadas necessárias para entregar um comportamento. Criar estrutura pode ser preparação válida, mas não prova por si só a capacidade prometida.",
          "concept_en": "A vertical slice crosses the layers needed to deliver a behavior. Creating structure can be valid preparation, but by itself proves nothing about the promised capability.",
          "example": "Um admin solicita retry de uma entrega elegível e vê uma tentativa criada. Banco, serviço e interface podem participar da mesma fatia.",
          "example_en": "An admin requests a retry of an eligible delivery and sees an attempt created. Database, service and interface can all take part in the same slice.",
          "success": "A primeira entrega prova uma capacidade. As próximas podem aprofundá-la sem perder um ponto de verificação.",
          "success_en": "The first delivery proves one capability. The next ones can deepen it without losing a checkpoint.",
          "options": [
            {
              "id": "schema",
              "label": "Criar todas as tabelas, sem nenhum caminho que as use.",
              "label_en": "Create every table, with no path that uses them.",
              "why": "É preparação estrutural, não uma capacidade observável.",
              "why_en": "That is structural preparation, not an observable capability."
            },
            {
              "id": "vertical",
              "label": "Admin solicita um retry elegível e consulta a tentativa criada.",
              "label_en": "Admin requests an eligible retry and queries the created attempt.",
              "why": ""
            },
            {
              "id": "ui",
              "label": "Desenhar todos os botões, mas sem executar nenhum comportamento.",
              "label_en": "Design every button, but run no behavior.",
              "why": "Uma interface sem comportamento não demonstra o retry.",
              "why_en": "An interface without behavior does not demonstrate the retry."
            }
          ],
          "answer": "vertical"
        },
        {
          "id": "tlc-sweep",
          "type": "classify",
          "title": "As nove dimensões não podem virar nove suposições.",
          "title_en": "Nine dimensions must not become nine assumptions.",
          "lead": "O texto de cada linha é a fonte deste exercício. Dê um destino a cada dimensão: critério decidido, comportamento existente, não aplicável com motivo ou questão aberta.",
          "lead_en": "The text of each line is this exercise’s source. Give each dimension a destination: decided criterion, existing behavior, not applicable with a reason, or open question.",
          "concept": "A varredura encontra lacunas; não dá autorização para criar requisitos. Concorrência precisa de uma prova de chamadas simultâneas, não apenas de um teste de duplicata sequencial. n/a exige um motivo sobre a própria mudança, como estado vazio de tela em uma fatia sem tela.",
          "concept_en": "The sweep finds gaps; it grants no license to create requirements. Concurrency needs a proof of simultaneous calls, not just a sequential duplicate test. n/a requires a reason about the change itself, like an empty screen state in a slice with no screen.",
          "example": "“O guard já cobre esta rota” pede inspeção do código existente. “Ninguém decidiu retenção” pede Unresolved, não um prazo inventado.",
          "example_en": "“The guard already covers this route” calls for inspecting the existing code. “Nobody decided retention” calls for Unresolved, not an invented deadline.",
          "success": "As nove dimensões têm um destino rastreável. Um campo vazio não será confundido com um risco resolvido.",
          "success_en": "All nine dimensions have a traceable destination. An empty field will not be mistaken for a resolved risk.",
          "groups": [
            [
              "criterion",
              "Critério já decidido",
              "Criterion already decided"
            ],
            [
              "existing",
              "existing · comportamento verificado",
              "existing · verified behavior"
            ],
            [
              "na",
              "n/a · motivo explícito",
              "n/a · explicit reason"
            ],
            [
              "unresolved",
              "Unresolved · decisão pendente",
              "Unresolved · decision pending"
            ]
          ],
          "items": [
            {
              "id": "validation",
              "text": "Validação: a spec exige rejeitar ID vazio com 400.",
              "text_en": "Validation: the spec requires rejecting an empty ID with 400.",
              "answer": "criterion"
            },
            {
              "id": "failure",
              "text": "Falhas: a spec define resposta 404 para entrega ausente.",
              "text_en": "Failures: the spec defines a 404 response for a missing delivery.",
              "answer": "criterion"
            },
            {
              "id": "idempotency",
              "text": "Idempotência/retry: o mecanismo de deduplicação foi inspecionado e permanece igual.",
              "text_en": "Idempotency/retry: the deduplication mechanism was inspected and stays the same.",
              "answer": "existing"
            },
            {
              "id": "authorization",
              "text": "Autorização: a spec exige admin e isolamento entre tenants.",
              "text_en": "Authorization: the spec requires admin and isolation between tenants.",
              "answer": "criterion"
            },
            {
              "id": "concurrency",
              "text": "Concorrência/ordem: ninguém decidiu o resultado de duas solicitações simultâneas.",
              "text_en": "Concurrency/ordering: nobody decided the outcome of two simultaneous requests.",
              "answer": "unresolved"
            },
            {
              "id": "lifecycle",
              "text": "Ciclo de dados: a política de retenção das novas tentativas não foi decidida.",
              "text_en": "Data lifecycle: the retention policy for new attempts was not decided.",
              "answer": "unresolved"
            },
            {
              "id": "dependency",
              "text": "Dependência externa: o adaptador atual já converte timeout em estado failed; verificado.",
              "text_en": "External dependency: the current adapter already converts timeout into failed state; verified.",
              "answer": "existing"
            },
            {
              "id": "state",
              "text": "Transições: a spec define queued → processing → succeeded ou failed.",
              "text_en": "Transitions: the spec defines queued → processing → succeeded or failed.",
              "answer": "criterion"
            },
            {
              "id": "observability",
              "text": "Observabilidade: os eventos de auditoria e a política de redação existentes foram inspecionados e permanecem iguais.",
              "text_en": "Observability: the existing audit events and redaction policy were inspected and stay the same.",
              "answer": "existing"
            }
          ]
        },
        {
          "id": "tlc-criteria",
          "type": "classify",
          "title": "O número certo na camada certa.",
          "title_en": "The right number in the right layer.",
          "lead": "Classifique as três afirmações. Ter um número na frase não torna tudo verificável por uma única execução.",
          "lead_en": "Classify the three statements. Having a number in the sentence does not make everything verifiable by a single run.",
          "concept": "Um critério técnico deve nomear comportamento e valores observáveis. Percentis e taxas são propriedades de amostras; metas de serviço exigem uma medição apropriada.",
          "concept_en": "A technical criterion must name behavior and observable values. Percentiles and rates are properties of samples; service targets require an appropriate measurement.",
          "example": "Um teste HTTP verifica o 404. Um estudo de latência mede p95 em uma janela e carga definidas. “Rápido” não define nenhum dos dois.",
          "example_en": "An HTTP test verifies the 404. A latency study measures p95 over a defined window and load. “Fast” defines neither.",
          "success": "Você não usou um teste pequeno para alegar algo sobre uma distribuição inteira.",
          "success_en": "You did not use a small test to claim something about a whole distribution.",
          "groups": [
            [
              "check",
              "Critério técnico observável",
              "Observable technical criterion"
            ],
            [
              "target",
              "Meta de serviço / medição",
              "Service target / measurement"
            ],
            [
              "vague",
              "Vago: falta decisão",
              "Vague: decision missing"
            ]
          ],
          "items": [
            {
              "id": "http",
              "text": "Consultar uma entrega ausente retorna HTTP 404.",
              "text_en": "Querying a missing delivery returns HTTP 404.",
              "answer": "check"
            },
            {
              "id": "latency",
              "text": "p95 de latência abaixo de 300 ms na janela e carga acordadas.",
              "text_en": "p95 latency under 300 ms over the agreed window and load.",
              "answer": "target"
            },
            {
              "id": "fast",
              "text": "A experiência deve ser rápida e robusta.",
              "text_en": "The experience should be fast and robust.",
              "answer": "vague"
            }
          ]
        },
        {
          "id": "tlc-task-pr",
          "type": "choice",
          "title": "Tarefa não é sinônimo de pull request.",
          "title_en": "Task is not a synonym of pull request.",
          "lead": "Uma fonte aprovada contém duas fatias relacionadas. Nenhum bloqueio de ordem, dependência externa ou divisão entre equipes força tarefas separadas. O time quer PRs menores.",
          "lead_en": "An approved source contains two related slices. No ordering block, external dependency or team split forces separate tasks. The team wants smaller PRs.",
          "concept": "tlc-plan parte de uma tarefa por fonte. Fatias, tarefas e PRs têm papéis diferentes: resultado observável, unidade de trabalho e unidade de revisão.",
          "concept_en": "tlc-plan starts from one task per source. Slices, tasks and PRs play different roles: observable outcome, unit of work and unit of review.",
          "example": "Uma preparação de migração pode ter sua própria PR e continuar pertencendo à tarefa que prova o comportamento completo.",
          "example_en": "A migration preparation can have its own PR and still belong to the task that proves the complete behavior.",
          "success": "Você manteve o compromisso verificável e ajustou o tamanho da revisão sem inventar uma regra de fragmentação.",
          "success_en": "You kept the verifiable commitment and adjusted review size without inventing a fragmentation rule.",
          "options": [
            {
              "id": "one",
              "label": "Manter uma tarefa com as fatias e propor PRs revisáveis segundo as regras do time.",
              "label_en": "Keep one task with the slices and propose reviewable PRs under the team’s rules.",
              "why": ""
            },
            {
              "id": "layers",
              "label": "Abrir uma tarefa por camada, mesmo sem um resultado observável.",
              "label_en": "Open one task per layer, even without an observable outcome.",
              "why": "Isso troca a unidade de verificação pela organização técnica.",
              "why_en": "That trades the unit of verification for technical organization."
            },
            {
              "id": "always",
              "label": "Exigir exatamente cinco tarefas porque o framework gosta desse número.",
              "label_en": "Require exactly five tasks because the framework likes that number.",
              "why": "O número não veio da fonte, das dependências nem da prática da equipe.",
              "why_en": "The number came from neither the source, the dependencies nor team practice."
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
      "name_en": "Build. Then prove it.",
      "role": "A construtora",
      "role_en": "The builder",
      "glyph": "⌘",
      "stage": "Construir + Verificar",
      "stage_en": "Build + Verify",
      "artifact": ".checks/retry-webhook.md",
      "source": "https://agent-skills.techleads.club/skills/tlc-implement/",
      "brief": "Ligue cada check a uma prova, teste contra o código anterior e faça um handoff verificável.",
      "brief_en": "Tie every check to a proof, test against the previous code and make a verifiable handoff.",
      "input": "Trabalho decidido, critérios e escopo claro.",
      "input_en": "Decided work, criteria and a clear scope.",
      "output": "Implementação, checklist e relatório de verificação independente.",
      "output_en": "Implementation, checklist and an independent verification report.",
      "prompt": "Use tlc-implement sobre .tasks/retry-webhook.md. Declare o perfil do projeto e gere .checks/retry-webhook.md antes de editar. Ligue cada check a provas executáveis, sem enfraquecer testes. Ao concluir toda a feature, o orquestrador deve acionar um verificador novo sobre o intervalo completo. Sem essa capacidade, registre a verificação independente pendente; não a simule. Não faça push ou deploy sem autorização explícita.",
      "prompt_en": "Use tlc-implement on .tasks/retry-webhook.md. Declare the project profile and generate .checks/retry-webhook.md before editing. Tie every check to executable proofs, without weakening tests. When the whole feature is done, the orchestrator must trigger a fresh verifier over the full range. Without that capability, record the independent verification as pending; do not simulate it. Do not push or deploy without explicit authorization.",
      "tasks": [
        {
          "id": "tlc-profile",
          "type": "classify",
          "title": "Escolha o perfil sem esconder seus limites.",
          "title_en": "Choose the profile without hiding its limits.",
          "lead": "O perfil é declarado pelo projeto. Associe as características ao perfil que as introduz; os perfis seguintes acumulam as verificações anteriores.",
          "lead_en": "The profile is declared by the project. Match each characteristic to the profile that introduces it; later profiles accumulate the earlier checks.",
          "concept": "light é o padrão documentado; standard adiciona análise de cobertura e política de testes; ui adiciona confronto com fontes visuais vinculantes. Os perfis não são três nomes para a mesma garantia.",
          "concept_en": "light is the documented default; standard adds coverage analysis and test policy; ui adds confrontation with binding visual sources. The profiles are not three names for the same guarantee.",
          "example": "Uma tela prometida pelo design precisa ser enumerada e confrontada com a implementação. Dizer “unit tests verdes” não demonstra que a tela existe.",
          "example_en": "A screen promised by the design must be enumerated and confronted with the implementation. Saying “unit tests green” does not demonstrate the screen exists.",
          "success": "O relatório informa o perfil realmente utilizado e o que ele deixa de verificar.",
          "success_en": "The report states the profile actually used and what it fails to verify.",
          "groups": [
            [
              "light",
              "light",
              "light"
            ],
            [
              "standard",
              "standard",
              "standard"
            ],
            [
              "ui",
              "ui",
              "ui"
            ]
          ],
          "items": [
            {
              "id": "base",
              "text": "Padrão sem configuração: provas no HEAD, teste localizado e lacunas declaradas.",
              "text_en": "Default with no configuration: proofs at HEAD, localized testing and declared gaps.",
              "answer": "light"
            },
            {
              "id": "coverage",
              "text": "Acrescenta Coverage, política de testes e falhas injetadas por superfície de asserção.",
              "text_en": "Adds Coverage, test policy and injected failures per assertion surface.",
              "answer": "standard"
            },
            {
              "id": "screens",
              "text": "Acrescenta fontes de design vinculantes e enumeração das telas.",
              "text_en": "Adds binding design sources and enumeration of the screens.",
              "answer": "ui"
            }
          ]
        },
        {
          "id": "tlc-proof-lab",
          "type": "prooflab",
          "title": "Quebre a implementação. Não o teste.",
          "title_en": "Break the implementation. Not the test.",
          "lead": "Bug reproduzível: a busca retorna uma entrega de outro tenant. Escolha a suíte e a correção, depois execute as três versões. O código roda localmente sobre dados fictícios.",
          "lead_en": "Reproducible bug: the lookup returns another tenant’s delivery. Choose the suite and the fix, then run the three versions. The code runs locally on fictional data.",
          "concept": "Para este bug, a regressão deve detectar a versão anterior e aceitar a correção. Um mutante que retorna null para tudo verifica se os casos positivos também importam. Esta é uma prova reduzida de consulta, não da API completa.",
          "concept_en": "For this bug, the regression must detect the previous version and accept the fix. A mutant that returns null for everything checks whether the positive cases matter too. This is a reduced lookup proof, not of the whole API.",
          "example": "Uma suíte que só verifica o acesso do próprio tenant passa mesmo com o vazamento. Uma correção que nega tudo também é defeituosa, embora bloqueie o acesso cruzado.",
          "example_en": "A suite that only checks the tenant’s own access passes even with the leak. A fix that denies everything is also defective, even though it blocks cross access.",
          "success": "A suíte detectou o bug anterior e o mutante, e passou com a correção. Você observou os resultados em vez de confiar na palavra “verde”.",
          "success_en": "The suite caught the previous bug and the mutant, and passed with the fix. You observed the results instead of trusting the word “green”."
        },
        {
          "id": "tlc-verifier",
          "type": "choice",
          "title": "O verificador não é o último implementador.",
          "title_en": "The verifier is not the last implementer.",
          "lead": "Duas agentes implementaram partes da feature. O último lote ficou verde. Quem verifica a entrega completa?",
          "lead_en": "Two agents implemented parts of the feature. The last batch went green. Who verifies the complete delivery?",
          "concept": "Na skill, o orquestrador dispara um novo verificador após todos os lotes, cobrindo a base da feature até HEAD. Handoff desligado não elimina a separação entre autor e verificador.",
          "concept_en": "In the skill, the orchestrator triggers a fresh verifier after all batches, covering the feature base through HEAD. A disabled handoff does not remove the author/verifier separation.",
          "example": "Só conferir o último diff perde os contratos alterados no primeiro lote. Um relatório honesto identifica o intervalo inteiro e as provas de todos os checks.",
          "example_en": "Checking only the last diff misses the contracts changed in the first batch. An honest report identifies the whole range and the proofs for every check.",
          "success": "Você preservou o escopo da verificação. Um nome de papel não é uma prova de independência.",
          "success_en": "You preserved the verification scope. A role name is not proof of independence.",
          "options": [
            {
              "id": "author",
              "label": "A última implementadora se declara independente e dá 10/10.",
              "label_en": "The last implementer declares herself independent and gives 10/10.",
              "why": "Uma autoavaliação não satisfaz a separação exigida.",
              "why_en": "A self-assessment does not satisfy the required separation."
            },
            {
              "id": "orchestrator",
              "label": "O orquestrador envia todos os checks e base..HEAD a um verificador novo.",
              "label_en": "The orchestrator sends every check and base..HEAD to a fresh verifier.",
              "why": ""
            },
            {
              "id": "fake",
              "label": "Sem subagentes, escrever “verificado independentemente” para não bloquear.",
              "label_en": "With no subagents, write “independently verified” to avoid blocking.",
              "why": "Capacidade indisponível deve ser declarada; o relatório não pode inventar execução.",
              "why_en": "Unavailable capability must be declared; the report cannot invent execution."
            }
          ],
          "answer": "orchestrator"
        },
        {
          "id": "tlc-handoff",
          "type": "select",
          "title": "Passe o estado, não só a história.",
          "title_en": "Pass the state, not just the story.",
          "lead": "Um lote de fatias completas terminou com todas as suas provas verdes. Escolha três itens para o handoff. O limite de leitura deve caber no harness utilizado.",
          "lead_en": "A batch of complete slices ended with all its proofs green. Choose three items for the handoff. The reading budget must fit the harness in use.",
          "concept": "O próximo executor recebe checklist e diff, limites fechados e decisões novas. O handoff acontece em uma fronteira coerente; não deve esconder uma fatia incompleta atrás de uma suíte verde.",
          "concept_en": "The next executor receives checklist and diff, closed limits and new decisions. The handoff happens at a coherent boundary; it must not hide an incomplete slice behind a green suite.",
          "example": "“C1–C3 fechados no commit a12; o limite de tentativas foi esclarecido; a abordagem X foi descartada por incompatibilidade” preserva decisões que o diff sozinho não explica.",
          "example_en": "“C1–C3 closed in commit a12; the attempt limit was clarified; approach X was dropped for incompatibility” preserves decisions the diff alone does not explain.",
          "success": "O próximo agente recebe os registros necessários para continuar sem reinventar decisões ou repetir uma tentativa abandonada.",
          "success_en": "The next agent receives the records needed to continue without reinventing decisions or repeating an abandoned attempt.",
          "options": [
            {
              "id": "checks",
              "label": "Checklist e diff, com checks fechados e commit identificado.",
              "label_en": "Checklist and diff, with closed checks and an identified commit.",
              "why": ""
            },
            {
              "id": "decisions",
              "label": "Esclarecimentos do usuário ainda não registrados em outro artefato.",
              "label_en": "User clarifications not yet recorded in another artifact.",
              "why": ""
            },
            {
              "id": "rejected",
              "label": "Tentativas abandonadas e o motivo do descarte.",
              "label_en": "Abandoned attempts and the reason they were dropped.",
              "why": ""
            },
            {
              "id": "story",
              "label": "Somente “está quase pronto, confie em mim”.",
              "label_en": "Only “it’s almost done, trust me”.",
              "why": "Esse resumo não identifica contratos, commit ou provas.",
              "why_en": "That summary identifies no contracts, commit or proofs."
            },
            {
              "id": "token",
              "label": "Credenciais permanentes de produção para facilitar o próximo lote.",
              "label_en": "Permanent production credentials to speed up the next batch.",
              "why": "Handoff não autoriza novos poderes nem exposição de segredos.",
              "why_en": "A handoff authorizes no new powers and no secret exposure."
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
      "name_en": "Judge the PR with evidence",
      "role": "O juiz",
      "role_en": "The judge",
      "glyph": "⚖",
      "stage": "Verificar + portão de Publicar",
      "stage_en": "Verify + Deploy gate",
      "artifact": "findings.json",
      "source": "https://agent-skills.techleads.club/skills/the-judge/",
      "brief": "Poucos achados, bem sustentados. Um veredito coerente e uma revisão que converge.",
      "brief_en": "Few findings, well supported. A coherent verdict and a review that converges.",
      "input": "Uma PR/diff e as verificações reais do repositório.",
      "input_en": "A PR/diff and the repository’s real checks.",
      "output": "Achados rastreáveis e APPROVE, COMMENT ou REQUEST_CHANGES.",
      "output_en": "Traceable findings and APPROVE, COMMENT or REQUEST_CHANGES.",
      "prompt": "Use the-judge para revisar esta PR em português. Execute os checks disponíveis, leia o diff e valide cada achado com arquivo:linha ou documentação oficial consultada. Consolide a revisão e use o veredito correspondente às severidades. Nas reavaliações, mantenha IDs, carryover e o contrato de convergência. Sem PR ou autenticação, declare o bloqueio; não diga que publicou uma review.",
      "prompt_en": "Use the-judge to review this PR in English. Run the available checks, read the diff and validate every finding with file:line or consulted official documentation. Consolidate the review and use the verdict matching the severities. On re-reviews, keep IDs, carryover and the convergence contract. Without a PR or authentication, declare the blockage; do not claim a review was published.",
      "tasks": [
        {
          "id": "tlc-review",
          "type": "reviewlab",
          "title": "Tribunal: o que realmente merece um achado?",
          "title_en": "Tribunal: what really deserves a finding?",
          "lead": "PR fictícia: a nova linha 4 registra o cabeçalho de autenticação. A leitura confirma o fluxo, e um teste local com token sintético reproduz a exposição. Lint e tipos já foram executados; os demais candidatos estão abaixo.",
          "lead_en": "Fictional PR: the new line 4 logs the authentication header. Reading confirms the flow, and a local test with a synthetic token reproduces the exposure. Lint and types already ran; the remaining candidates are below.",
          "concept": "Cada achado publicado precisa de evidência. O tooling já relata falhas determinísticas; o revisor concentra os comentários em problemas confirmados que exigem julgamento. Uma falha preexistente vai ao resumo, não vira defeito introduzido pela PR.",
          "concept_en": "Every published finding needs evidence. Tooling already reports deterministic failures; the reviewer concentrates comments on confirmed problems that require judgment. A pre-existing failure goes to the summary, it does not become a defect introduced by the PR.",
          "example": "F1 → src/retry.ts:4, entrada sintética Authorization e registro capturado: um problema novo de exposição. “Não gosto deste nome” não tem o mesmo impacto.",
          "example_en": "F1 → src/retry.ts:4, synthetic Authorization input and captured log entry: a new exposure problem. “I don’t like this name” does not have the same impact.",
          "success": "Revisão consolidada preparada: F1 é blocker confirmado, então o veredito é REQUEST_CHANGES. Nada foi enviado ao GitHub.",
          "success_en": "Consolidated review prepared: F1 is a confirmed blocker, so the verdict is REQUEST_CHANGES. Nothing was sent to GitHub.",
          "options": [
            {
              "id": "F1",
              "label": "F1 · Nova exposição de token em src/retry.ts:4; reprodução confirmada.",
              "label_en": "F1 · New token exposure in src/retry.ts:4; reproduction confirmed.",
              "why": ""
            },
            {
              "id": "F2",
              "label": "F2 · Repetir em comentário inline o erro que o lint já reportou.",
              "label_en": "F2 · Repeat inline the error lint already reported.",
              "why": "O resultado do tooling fica em Checks run; não duplique o mesmo aviso inline.",
              "why_en": "Tooling output lives in the Checks run; do not duplicate the same warning inline."
            },
            {
              "id": "F3",
              "label": "F3 · Tratar bug antigo e não alterado como blocker desta PR.",
              "label_en": "F3 · Treat an old, unchanged bug as a blocker of this PR.",
              "why": "Achado preexistente pertence ao resumo, sem mudar o veredito por si só.",
              "why_en": "A pre-existing finding belongs in the summary, without changing the verdict by itself."
            },
            {
              "id": "F4",
              "label": "F4 · Afirmar de memória que a biblioteca externa está vulnerável.",
              "label_en": "F4 · Claim from memory that the external library is vulnerable.",
              "why": "Comportamento externo exige fonte oficial atual; sem evidência, não publique a afirmação.",
              "why_en": "External behavior requires a current official source; without evidence, do not publish the claim."
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
          "title_en": "Three verdicts, not a perfection grade.",
          "lead": "Todos os achados abaixo já têm evidência. Use o mapeamento da skill, não uma política universal de todas as equipes.",
          "lead_en": "All findings below already have evidence. Use the skill’s mapping, not a universal policy for every team.",
          "concept": "Um blocker leva a REQUEST_CHANGES. Sem blocker, um should-fix leva a COMMENT. Sem ambos, APPROVE pode coexistir com nits. O veredito de review não concede credenciais nem faz merge.",
          "concept_en": "A blocker leads to REQUEST_CHANGES. Without a blocker, one should-fix leads to COMMENT. Without either, APPROVE can coexist with nits. A review verdict grants no credentials and merges nothing.",
          "example": "Um problema de autorização confirmado é blocker. Uma melhoria cosmética não deve produzir um ciclo infinito de pedidos de mudança.",
          "example_en": "A confirmed authorization problem is a blocker. A cosmetic improvement should not produce an infinite loop of change requests.",
          "success": "O veredito comunica risco e pendências, sem fingir que APPROVE significa ausência de qualquer imperfeição.",
          "success_en": "The verdict communicates risk and pending items, without pretending APPROVE means free of any imperfection.",
          "groups": [
            [
              "REQUEST_CHANGES",
              "REQUEST_CHANGES",
              "REQUEST_CHANGES"
            ],
            [
              "COMMENT",
              "COMMENT",
              "COMMENT"
            ],
            [
              "APPROVE",
              "APPROVE",
              "APPROVE"
            ]
          ],
          "items": [
            {
              "id": "blocker",
              "text": "1 blocker de acesso entre tenants e 2 nits.",
              "text_en": "1 cross-tenant access blocker and 2 nits.",
              "answer": "REQUEST_CHANGES"
            },
            {
              "id": "should",
              "text": "Nenhum blocker; 1 should-fix confirmado.",
              "text_en": "No blocker; 1 confirmed should-fix.",
              "answer": "COMMENT"
            },
            {
              "id": "nit",
              "text": "Nenhum blocker ou should-fix; 2 nits.",
              "text_en": "No blocker or should-fix; 2 nits.",
              "answer": "APPROVE"
            }
          ]
        },
        {
          "id": "tlc-carryover",
          "type": "choice",
          "title": "Sem achados novos não significa sem pendências.",
          "title_en": "No new findings does not mean no pending items.",
          "lead": "Rodada 2: F1 foi corrigido. F2, um blocker da rodada anterior, continua aberto. Nenhum achado novo. Qual é a review correta?",
          "lead_en": "Round 2: F1 was fixed. F2, a blocker from the previous round, is still open. No new findings. What is the correct review?",
          "concept": "IDs estáveis e a tabela Resolution preservam o histórico. O carryover inclui pendências anteriores no veredito. Olhar apenas a lista de achados novos pode esconder um risco ainda aberto.",
          "concept_en": "Stable IDs and the Resolution table preserve history. Carryover includes previous pending items in the verdict. Looking only at the new-findings list can hide a still-open risk.",
          "example": "findings: [] com carryover.blocker: 1 continua exigindo REQUEST_CHANGES. A lista vazia não apaga F2.",
          "example_en": "findings: [] with carryover.blocker: 1 still requires REQUEST_CHANGES. The empty list does not erase F2.",
          "success": "A pendência continuou visível. Você verificou a resolução em vez de reiniciar a revisão do zero.",
          "success_en": "The pending item stayed visible. You verified the resolution instead of restarting the review from scratch.",
          "options": [
            {
              "id": "approve",
              "label": "APPROVE: a lista de achados novos está vazia.",
              "label_en": "APPROVE: the new-findings list is empty.",
              "why": "F2 continua sendo um blocker, mesmo sem novo comentário.",
              "why_en": "F2 is still a blocker, even without a new comment."
            },
            {
              "id": "carry",
              "label": "REQUEST_CHANGES: registrar F1 resolvido, F2 aberto e carryover.blocker = 1.",
              "label_en": "REQUEST_CHANGES: record F1 resolved, F2 open and carryover.blocker = 1.",
              "why": ""
            },
            {
              "id": "new",
              "label": "Ignorar F2 e abrir dez novas discussões cosméticas.",
              "label_en": "Ignore F2 and open ten new cosmetic discussions.",
              "why": "Isso troca resolução por novas frentes e viola a convergência.",
              "why_en": "That trades resolution for new fronts and violates convergence."
            }
          ],
          "answer": "carry"
        },
        {
          "id": "tlc-converge",
          "type": "choice",
          "title": "Saia do loop pelo motivo certo.",
          "title_en": "Exit the loop for the right reason.",
          "lead": "Rodada 3: uma divergência continua aberta depois de uma tentativa com nova evidência. O autor pede uma quarta rodada até alguém dar 10/10.",
          "lead_en": "Round 3: a disagreement is still open after one attempt with new evidence. The author asks for a fourth round until someone gives 10/10.",
          "concept": "O contrato do the-judge limita o mesmo conjunto de achados a três rodadas. Pendências são corrigidas, convertidas em follow-up por acordo ou escaladas. Um blocker real não desaparece por cansaço.",
          "concept_en": "The the-judge contract caps the same finding set at three rounds. Pending items are fixed, converted to agreed follow-ups or escalated. A real blocker does not vanish from fatigue.",
          "example": "A reavaliação confere resoluções e novos blockers introduzidos pela correção; não é uma caça infinita a nits. Segurança grave descoberta tarde continua sendo reportada.",
          "example_en": "The re-review checks resolutions and new blockers introduced by the fix; it is not an endless nit hunt. Serious security discovered late is still reported.",
          "success": "Você encerrou a repetição sem aprovar artificialmente. Decisão e risco ficam explícitos; a pessoa responsável assume a divergência.",
          "success_en": "You ended the repetition without approving artificially. Decision and risk stay explicit; the responsible person owns the disagreement.",
          "options": [
            {
              "id": "inflate",
              "label": "Aumentar a nota automaticamente e declarar perfeição.",
              "label_en": "Automatically raise the grade and declare perfection.",
              "why": "Isso substitui evidência por uma meta artificial.",
              "why_en": "That replaces evidence with an artificial target."
            },
            {
              "id": "stop",
              "label": "Manter o achado aberto e escalar a divergência; não iniciar a quarta rodada do mesmo conjunto.",
              "label_en": "Keep the finding open and escalate the disagreement; do not start a fourth round on the same set.",
              "why": ""
            },
            {
              "id": "endless",
              "label": "Revisar indefinidamente, adicionando novas exigências a cada rodada.",
              "label_en": "Review indefinitely, adding new requirements every round.",
              "why": "O loop ilimitado faz a review perder escopo e impede convergência.",
              "why_en": "The unlimited loop makes the review lose scope and prevents convergence."
            }
          ],
          "answer": "stop"
        }
      ]
    }
  ],
  "notice": "Adaptação didática independente do SDLC Quest, com cenários fictícios. Conteúdo das skills: Tech Leads Club, CC BY 4.0. Consultado em 16/09/2026. Nomes, caminhos e contratos preservados onde indicados; exemplos e mecânicas foram criados para este jogo. Não é produto oficial nem executa agentes, npx, GitHub ou deploy.",
  "notice_en": "An independent teaching adaptation of SDLC Quest with fictional scenarios. Skill content: Tech Leads Club, CC BY 4.0. Consulted on 2026-09-16. Names, paths and contracts preserved where indicated; examples and mechanics were created for this game. Not an official product, and it runs no agents, npx, GitHub or deploy.",
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
