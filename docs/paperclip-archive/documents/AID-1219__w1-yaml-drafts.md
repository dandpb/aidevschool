<!-- issue: AID-1219 | key: w1-yaml-drafts | doc_id: d91f0003-f106-46dd-8cba-98469d53f22d | updated: 2026-09-10 08:58:32.417+00 -->

# AID-1219 — W1 drafts T1–T3: YAMLs completos (l30–l32), validados em scratch @e839d0fc

(AID-1219)

# AID-1219 — W1 drafts T1–T3: YAMLs completos (l30–l32) — validados em scratch @e839d0fc

**Status:** conteúdo integral dos drafts de lição (production-ready para o FPE; mesma forma dos YAMLs anexados como arquivos de trabalho). Validação: `validate.py --compile --compile-verifier` verde com as 3 lições `ready` (32/32). Colocar em `curriculum/ai-literacy/modules/08-rotina-com-ia-ii/` nas tarefas de produção, com os flips `planned→ready` correspondentes no catálogo.

## `l30-rotinas-repetitivas.yaml`

```yaml
# Lição l30 — Onda W1 l30–l32 (spec AID-1219; briefs AID-528 rev 1 §5 ressuscitados
# via AID-1214 §3.1): rotinas repetitivas — o que automatizar.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l30
version: 1
moduleId: mod-08
title: "Rotinas repetitivas: o que automatizar"
objective: "Distinguir tarefas do próprio trabalho que valem virar rotina assistida (repetitiva + estruturada + baixo risco) das que exigem julgamento humano a cada vez, e parametrizar o pedido-padrão da tarefa escolhida."
estimatedMinutes: 4
skillIds: [pedir, aplicar]
prerequisites: [l18]

activities:
  - id: l30-a1
    type: choice
    skillId: aplicar
    instruction: "NA SUA SEMANA DE TRABALHO, QUAIS TAREFAS VALEM VIRAR ROTINA ASSISTIDA COM A IA? MARQUE TODAS AS CANDIDATAS."
    data:
      multiSelect: true
      options:
        - id: opt-a
          text: "O relatório semanal para a diretoria: toda sexta, os mesmos campos e o mesmo formato — só os números da semana mudam."
        - id: opt-b
          text: "A resposta-padrão para agendar reuniões: o texto-base é sempre o mesmo; muda só o nome, a data e o horário."
        - id: opt-c
          text: "O resumo das atas do time: a ata é nova toda semana, mas a estrutura do resumo pedida à IA é sempre a mesma."
        - id: opt-d
          text: "O feedback delicado sobre o erro de um colega: acontece toda semana com alguém, mas cada conversa depende da pessoa, do momento e do histórico."
        - id: opt-e
          text: "A escolha do próximo contratado da equipe: repete a cada vaga aberta, mas cada decisão muda a vida de alguém."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-a, opt-b, opt-c]
    feedback:
      onFailure: "Vira rotina assistida o que junta três coisas: REPETITIVA (mesmo ritmo, toda semana), ESTRUTURADA (mesma forma, mesmos campos) e BAIXO RISCO (um erro não custa caro nem expõe ninguém). Tarefa que repete no ritmo mas depende de julgamento humano — pessoa certa, momento certo, consequência para outros — continua humana a cada vez: a IA pode rascunhar, você decide."
      perCheck:
        opt-a: "Candidata: repetitiva (sexta a sexta), estruturada (mesmos campos e formato) e de baixo risco — você revisa antes de enviar e o erro não é irreversível."
        opt-b: "Candidata: o texto-base é fixo e só os dados pequenos mudam — é quase um modelo com campos, exatamente o que uma rotina assistida faz bem."
        opt-c: "Candidata: o material muda (ata nova), mas a estrutura do resumo é sempre a mesma — repetição de forma, conteúdo novo."
        opt-d: "Não é candidata: o ritmo repete, mas o conteúdo exige julgamento a cada vez — pessoa, momento e histórico mudam a conversa. Automatizar aqui é terceirizar o próprio julgamento (o que a l13 pede para você manter)."
        opt-e: "Não é candidata: decisão sobre pessoas tem consequência real e irreversível — a IA pode ajudar a organizar critérios, mas a decisão é humana a cada vez."
      onSuccess: "Exato! O teste dos três ingredientes: repetitiva + estruturada + baixo risco. O que depende de julgamento humano a cada vez não vira rotina — vira IA como assistente, com você decidindo."
    storage:
      policy: structured_only
    hints:
      - "Para cada tarefa, pergunte: o ritmo repete, mas a FORMA também repete? E o que acontece se sair errado?"
      - "Duas dessas tarefas tratam de pessoas e consequências — julgamento humano a cada vez."
      - "As candidatas têm a mesma cara do pedido-padrão que você salvou na lição da biblioteca de pedidos."

  - id: l30-a2
    type: prompt_builder
    skillId: pedir
    instruction: "VOCÊ ESCOLHEU AUTOMATIZAR O RELATÓRIO SEMANAL. MONTE O PEDIDO-PADRÃO DA ROTINA PREENCHENDO OS CAMPOS — O QUE FICA SALVO E O QUE MUDA A CADA SEMANA."
    data:
      scenario: "Na sua ferramenta de IA você salvou um pedido-padrão para não recomeçar do zero toda semana (como na lição da biblioteca de pedidos). Neste exercício você não roda automação nenhuma — você monta o pedido-padrão por campos rotulados, como faria na ferramenta real ao criar a rotina. O pedido 'relatório', sozinho, devolve toda semana um texto de forma diferente."
      genericPrompt: "relatório"
      fields:
        - id: tarefa
          label: "Tarefa"
          hint: "O que a rotina pede à IA, sempre igual? Ex.: resumir o desempenho semanal da equipe."
        - id: dado-que-muda
          label: "Dado que muda a cada semana"
          hint: "O que você troca no pedido toda semana? Ex.: os números de vendas, atendimento e prazos da semana."
        - id: formato
          label: "Formato"
          hint: "Que forma fixa a saída deve ter? Ex.: resumo executivo curto em tópicos."
    evaluation:
      strategy: deterministic
      fields:
        tarefa:
          minLength: 8
          mustIncludeAny: ["resumir", "resumo", "relatar", "relatório", "relatorio"]
        dado-que-muda:
          minLength: 8
          mustIncludeAny: ["números", "numeros", "dados", "semana", "vendas", "resultados", "indicadores"]
        formato:
          minLength: 4
          mustIncludeAny: ["resumo", "tópicos", "topicos", "lista", "tabela", "uma página", "uma pagina"]
    feedback:
      onFailure: "Um pedido-padrão de rotina separa o FIXO do VARIÁVEL: a tarefa e o formato ficam salvos (é o que dá regularidade); o dado da semana é o único campo que você troca a cada uso. Se tudo mudar junto, não é rotina — é recomeçar do zero."
      perCheck:
        tarefa: "Diga a ação fixa da rotina: resumir, relatar ou montar o resumo do desempenho."
        dado-que-muda: "Nomeie o que é trocado a cada semana: os números, dados ou resultados da semana."
        formato: "Trave a forma da saída: resumo, tópicos, lista, tabela — sempre igual."
      onSuccess: "Pedido-padrão pronto! Tarefa e formato salvos, dado da semana como único campo variável — na próxima sexta você troca uma coisa só."
    storage:
      policy: structured_only
    hints:
      - "No pedido-padrão, o que você nunca mais quer digitar? E o que muda toda semana?"
      - "A tarefa e o formato ficam fixos; os números da semana são o campo variável."
      - "Palavras que precisam aparecer: resumir/relatar na Tarefa, números ou semana no Dado, resumo/tópicos no Formato."

  - id: l30-a3
    type: output_comparison
    skillId: aplicar
    instruction: "DUAS PESSOAS TRANSFORMARAM O MESMO PEDIDO-PADRÃO EM ROTINA. COMPARE E ESCOLHA A FORMA SEGURA."
    data:
      scenario: "Você e uma colega criaram o mesmo pedido-padrão do relatório semanal. Cada uma transformou o pedido em rotina de um jeito — na vida real isso vira uma regra de uso; aqui você decide por controles rotulados."
      outputs:
        - id: out-a
          text: "Toda sexta eu cole os números da semana no pedido-padrão, a IA monta o resumo no formato combinado — e eu LEIO antes de mandar para a diretoria. Se algo mudou demais (meta nova, resultado estranho), eu ajusto o pedido na hora e depois sigo."
        - id: out-b
          text: "Liguei o envio automático: toda sexta o resumo sai direto para a diretoria sem passar por mim. Ganhei minha sexta de volta."
      criteria:
        - id: c-revisao-humana
          text: "A saída passa por leitura humana antes de chegar a quem usa"
        - id: c-sem-envio-cego
          text: "Nada é enviado automaticamente sem alguém conferir antes"
        - id: c-ajusta-quando-muda
          text: "Quando o dado ou a regra muda, o pedido é ajustado antes do próximo uso"
    evaluation:
      strategy: deterministic
      betterOutputId: out-a
      requiredCriterionIds: [c-revisao-humana, c-sem-envio-cego]
    feedback:
      onFailure: "A rotina A mantém o humano no ponto que importa: a IA produz sempre igual, mas quem valida o resultado antes de chegar à diretoria é você — e o pedido se ajusta quando o dado muda. A rotina B terceiriza o julgamento junto com o trabalho: envio cego é exatamente o risco que a lição 13 pede para você não correr."
      perCheck:
        betterOutputId: "A rotina A automatiza o trabalho e mantém o julgamento; a B automatiza os dois — e o erro viaja sozinho até a diretoria."
        c-revisao-humana: "Faltou este critério: alguém lê o resultado antes de ele chegar a quem usa — a revisão é o cinto de segurança da rotina."
        c-sem-envio-cego: "Faltou este critério: envio automático sem conferência nenhuma é o ponto onde um erro vira erro público."
        c-ajusta-quando-muda: "Critério bônus da rotina A: ela também prevê ajustar o pedido quando o dado muda — o que a lição 'quando a automação erra' treina em detalhe."
      onSuccess: "Exato! Automatizar o trabalho não é automatizar o julgamento: produção automática, validação humana — e ajuste fino quando o dado muda."
    storage:
      policy: structured_only
    hints:
      - "Pergunte: quando o resultado chega à diretoria, quem já leu aquele texto?"
      - "O que acontece na rotina B se o dado desta semana estiver errado ou diferente do usual?"
      - "A rotina segura mantém a leitura humana antes do envio — e sabe ajustar o pedido quando algo muda."

rubric:
  id: l30-rubric
  criteria:
    - id: r-identifica-candidata
      text: "Aplica o teste repetitiva + estruturada + baixo risco para separar o que vira rotina assistida do que exige julgamento humano a cada vez."
      weight: 1
    - id: r-parametriza-o-pedido
      text: "Monta o pedido-padrão com tarefa e formato fixos e um único campo variável (o dado que muda a cada semana)."
      weight: 1
    - id: r-mantem-controle-humano
      text: "Escolhe a rotina com revisão humana antes do uso e sem envio cego, mantendo o próprio julgamento."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l30-a1, l30-a2, l30-a3]
```

## `l31-pequenas-automacoes.yaml`

```yaml
# Lição l31 — Onda W1 l30–l32 (spec AID-1219; briefs AID-528 rev 1 §5 ressuscitados
# via AID-1214 §3.1): pequenas automações — onde o humano valida.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l31
version: 1
moduleId: mod-08
title: "Pequenas automações: onde o humano valida"
objective: "Classificar saídas de automação entre uso direto e checagem obrigatória, nomear o que falta em um pedido de automação (gatilho, limite de escala) e sequenciar a adoção segura."
estimatedMinutes: 4
skillIds: [avaliar, proteger]
prerequisites: [l12]

activities:
  - id: l31-a1
    type: safety_classification
    skillId: proteger
    instruction: "SUA ROTINA ASSISTIDA JÁ ESTÁ RODANDO. PARA CADA SAÍDA ABAIXO, DECIDA: PODE SER USADA DIRETO OU EXIGE CHECAGEM OBRIGATÓRIA ANTES DE USAR?"
    data:
      labels:
        safe: "Uso direto — pode ir sem conferir"
        sensitive: "Checagem obrigatória antes de usar"
      items:
        - id: i-rascunho-divulgacao
          text: "O rascunho do post de divulgação do evento aberto do mês, montado pela rotina a partir da agenda já pública"
        - id: i-lembrete-semanal
          text: "O lembrete interno de segunda-feira com a lista de compromissos públicos da equipe, sem dados de clientes"
        - id: i-numero-diretoria
          text: "O número consolidado do mês que a rotina monta para a apresentação da diretoria"
        - id: i-nome-cliente
          text: "O nome do cliente citado no e-mail de acompanhamento que a rotina prepara"
        - id: i-valor-contrato
          text: "O valor do contrato citado no resumo que a rotina gera para a reunião comercial"
        - id: i-historico-gasto
          text: "O quanto aquele cliente gastou este ano, citado no e-mail de aniversário que a rotina envia"
    evaluation:
      strategy: deterministic
      classification:
        i-rascunho-divulgacao: safe
        i-lembrete-semanal: safe
        i-numero-diretoria: sensitive
        i-nome-cliente: sensitive
        i-valor-contrato: sensitive
        i-historico-gasto: sensitive
    feedback:
      onFailure: "A regra da lição 12 continua valendo dentro da rotina: número que sustenta decisão, nome de cliente em comunicação, valor de contrato e histórico de gasto são checagem obrigatória — não porque a IA erra sempre, mas porque o erro desses viaja sozinho. Rascunho de divulgação pública e lembrete sem dados sensíveis podem ir direto: o pior caso é um ajuste rápido."
      perCheck:
        i-rascunho-divulgacao: "Uso direto: nasce de fonte pública e é um rascunho seu — se sair estranho, você ajusta antes de publicar, sem dano."
        i-lembrete-semanal: "Uso direto: informação interna sem dado pessoal nem de cliente; o pior caso é um compromisso fora de ordem."
        i-numero-diretoria: "Checagem obrigatória: número que sustenta decisão da diretoria — número errado automático vira decisão errada (a lição de números e fatos vale em dobro na rotina)."
        i-nome-cliente: "Checagem obrigatória: nome de cliente em comunicação que sai automaticamente — um nome trocado é um relacionamento exposto."
        i-valor-contrato: "Checagem obrigatória: valor de contrato em material de reunião — erro de valor em contexto comercial custa caro."
        i-historico-gasto: "Checagem obrigatória: quanto o cliente gastou é dado sensível dele, citado automaticamente em um e-mail — exposição sem revisão."
      onSuccess: "Exato! A classificação de sensibilidade da l12 não desaparece quando a tarefa vira rotina — ela é exatamente o mapa do onde o humano valida."
    storage:
      policy: structured_only
    hints:
      - "Para cada saída, pergunte: se isso sair errado e ninguém conferir, quem percebe — e a que custo?"
      - "O que sustenta decisão, cita cliente, ou mostra valor e histórico de gasto não viaja sem checagem."
      - "Rascunho de fonte pública e lembrete interno sem dados são uso direto; número para diretoria, nome, valor e histórico são checagem."

  - id: l31-a2
    type: missing_context
    skillId: avaliar
    instruction: "UM COLEGA PEDIU À IA: 'TODA SEMANA, MONTE O RESUMO DE VENDAS E ME MANDE'. O QUE FALTA NO PEDIDO DELE PARA A ROTINA SER CONTROLÁVEL?"
    data:
      prompt: "COLEGA (pedido): 'toda semana, monte o resumo de vendas e me mande' · O QUE ACONTECEU: o resumo da primeira semana veio bom — mas ele nunca disse quando a rotina dispara, nem até onde ela pode ir sozinha, e já pegou um resumo montado com a planilha parcial de uma sexta atrasada."
      contextOptions:
        - id: gatilho-definido
          text: "O gatilho: o que dispara a rotina e quando (sexta ao completar a planilha? segunda cedo?) — 'toda semana' não diz qual sexta, nem com qual dado"
        - id: limite-de-escala
          text: "O limite: até onde a rotina vai sozinha (só o rascunho? envia para quem?) e o que SEMPRE volta para um humano decidir"
        - id: formato-do-resumo
          text: "O formato do resumo (tópicos, tamanho, indicadores), para a saída vir sempre igual e o estranho saltar aos olhos"
        - id: nome-do-modelo-de-ia
          text: "O nome do modelo de IA que vai executar a rotina"
        - id: uma-ia-mais-recente
          text: "Usar uma IA mais recente, que sabe sozinha quando a planilha está incompleta"
    evaluation:
      strategy: deterministic
      requiredContextIds: [gatilho-definido, limite-de-escala]
      optionalContextIds: [formato-do-resumo]
    feedback:
      onFailure: "Um pedido de automação tem duas âncoras que um pedido comum não tem: o GATILHO (quando roda e com qual dado — por isso ele pegou a planilha parcial) e o LIMITE (até onde vai sozinha e o que sempre volta para você). Nome de modelo e 'IA mais recente' são desvio: nenhum modelo adivinha sexta atrasada."
      perCheck:
        gatilho-definido: "Faltou isto: o gatilho — 'toda semana' não diz qual dia, nem espera a planilha estar completa. Foi assim que o resumo saiu com dado parcial."
        limite-de-escala: "Faltou isto: o limite — 'me mande' não diz se a rotina rascunha ou envia, nem para quem. Sem limite, a rotina decide sozinha o que é decisão sua."
        formato-do-resumo: "Isto é opcional: fixar o formato ajuda o erro a saltar aos olhos — mas a rotina não fica incontrolável sem isso."
        nome-do-modelo-de-ia: "Isto é mito: o nome do modelo não define quando a rotina dispara nem até onde vai — gatilho e limite são combinado seu, não do modelo."
        uma-ia-mais-recente: "Isto é mito: IA mais recente não adivinha planilha incompleta — quem precisa saber da sexta atrasada é o gatilho, não o modelo."
      onSuccess: "Exato! Gatilho (quando e com qual dado) e limite (até onde sozinha, o que volta para você) — os dois combinados que fazem uma automação pequena ser controlável."
    storage:
      policy: structured_only
    hints:
      - "Por que o resumo saiu com a planilha parcial? O que o pedido nunca especificou?"
      - "Um pedido de automação precisa dizer quando roda e até onde vai sozinho."
      - "Procure as duas âncoras: gatilho (dia e dado) e limite (o que sempre volta para um humano)."

  - id: l31-a3
    type: sort
    skillId: avaliar
    instruction: "ORDENE A ADOÇÃO SEGURA DA SUA PRIMEIRA AUTOMAÇÃO — DO PRIMEIRO PASSO À AMPLIAÇÃO."
    data:
      items:
        - id: s1-piloto
          text: "Escolher UMA tarefa pequena e de baixo risco para o piloto — por exemplo, o rascunho do relatório semanal"
        - id: s2-revisao-total
          text: "Rodar o piloto com revisão manual de TUDO o que sai, por algumas semanas, conferindo as saídas críticas"
        - id: s3-ajustar
          text: "Ajustar gatilho, limite e pedido com o que o piloto ensinou (inclusive os erros)"
        - id: s4-ampliar
          text: "Ampliar gradualmente para outras tarefas — mantendo checagem obrigatória onde o erro custa caro"
    evaluation:
      strategy: deterministic
      expectedOrder: [s1-piloto, s2-revisao-total, s3-ajustar, s4-ampliar]
    feedback:
      onFailure: "A adoção segura cresce em círculos: piloto pequeno de baixo risco, revisão manual de tudo enquanto você ainda não conhece os erros, ajuste do combinado (gatilho, limite, pedido) — e só então ampliar, levando as checagens para onde o erro custa caro. Ampliar antes de revisar é apostar; ajustar antes do piloto é ajustar no escuro."
      perCheck:
        s1-piloto: "O piloto vem primeiro: tarefa pequena e de baixo risco — erro barato enquanto você aprende o comportamento da rotina."
        s2-revisao-total: "A revisão total vem junto do piloto: com poucas saídas, dá para conferir tudo e conhecer os pontos fracos."
        s3-ajustar: "O ajuste vem depois de conhecer os erros do piloto: gatilho, limite e pedido ganham o que a prática ensinou."
        s4-ampliar: "A ampliação vem por último: mais tarefas, com a checagem concentrada onde o erro custa caro — não revisão total para sempre."
      onSuccess: "Exato! Círculos concêntricos: piloto pequeno → revisão de tudo → ajuste do combinado → ampliação com checagem nos pontos críticos."
    storage:
      policy: structured_only
    hints:
      - "Pergunte: o que você precisa conhecer ANTES de deixar a rotina crescer?"
      - "Revisar tudo só é viável quando a rotina é pequena — por isso o piloto vem antes da ampliação."
      - "A ordem é: piloto de baixo risco, revisão total, ajuste do combinado, ampliação gradual."

rubric:
  id: l31-rubric
  criteria:
    - id: r-classifica-a-saida
      text: "Classifica cada saída de automação entre uso direto e checagem obrigatória, estendendo a regra de sensibilidade para dentro da rotina."
      weight: 1
    - id: r-nomea-o-que-falta
      text: "Nomeia o que falta em um pedido de automação: gatilho (quando e com qual dado) e limite de escala (o que sempre volta ao humano)."
      weight: 1
    - id: r-sequencia-a-adocao
      text: "Ordena a adoção segura: piloto pequeno, revisão manual de tudo, ajuste e ampliação gradual com checagem nos pontos críticos."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l31-a1, l31-a2, l31-a3]
```

## `l32-quando-a-automacao-erra.yaml`

```yaml
# Lição l32 — Onda W1 l30–l32 (spec AID-1219; briefs AID-528 rev 1 §5 ressuscitados
# via AID-1214 §3.1): quando a automação erra.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l32
version: 1
moduleId: mod-08
title: "Quando a automação erra"
objective: "Detectar que uma rotina automatizada degradou (saída coerente com a semana anterior mas errada para esta), aplicar a correção mínima no pedido (só o dado que mudou) e repor o contexto perdido."
estimatedMinutes: 3
skillIds: [avaliar]
prerequisites: [l19]

activities:
  - id: l32-a1
    type: choice
    skillId: avaliar
    instruction: "TODA SEGUNDA, A ROTINA ENTREGA O RESUMO SEMANAL DE VENDAS PARA A REUNIÃO. NESTA SEMANA A PLANILHA MUDOU: A COLUNA 'VENDAS DO PERÍODO' VIROU 'VENDAS LÍQUIDAS' E ENTROU UMA LINHA DE ESTORNO. O RESUMO CHEGOU COM O MESMO FORMATO DE SEMPRE E NÚMEROS 'NA MÉDIA' DAS OUTRAS SEMANAS. QUAL É O SINAL DE QUE A ROTINA DEGRADOU?"
    data:
      options:
        - id: opt-a
          text: "A saída veio impecável no formato e 'na média' das semanas — mas o dado desta semana mudou (coluna nova, estorno); o resumo respondeu ao que a rotina esperava, não ao que chegou."
        - id: opt-b
          text: "A rotina demorou alguns minutos a mais para rodar na segunda de manhã."
        - id: opt-c
          text: "O formato do resumo mudou um pouco em relação às outras semanas."
        - id: opt-d
          text: "A rotina avisou, em vermelho, que não encontrou o arquivo da planilha."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-a]
    feedback:
      onFailure: "Degradação de rotina é o erro SILENCIOSO: a saída continua bonita, no formato de sempre, e por isso mesmo ninguém desconfia — mas ela foi montada com o dado velho ou incompleto. Lentidão (b) não muda conteúdo; mudança de formato (c) é sinal de outra coisa (o pedido foi editado); aviso de erro (d) é falha barulhenta, que se anuncia sozinha: o perigoso é o erro que não avisa."
      perCheck:
        opt-a: "Este é o sinal: coerência com a semana ANTERIOR + desconexão com o dado DESTA semana. A coluna mudou, o estorno entrou — e o resumo saiu como se nada tivesse acontecido."
        opt-b: "Lentidão muda o tempo, não o conteúdo — o resumo lento ainda estaria errado pela mesma razão."
        opt-c: "Mudança de formato seria estranho em outra direção (alguém mexeu no pedido); aqui o formato veio EXATAMENTE igual — o problema estava no dado."
        opt-d: "Erro anunciado é o caso fácil: a rotina para e avisa. A degradação é o caso difícil: ela NÃO avisa — entrega bonito e errado."
      onSuccess: "Exato! O sinal é a combinação: saída coerente com as semanas anteriores + dado desta semana que mudou. Rotina degradada erra em silêncio — quem conhece o dado é você."
    storage:
      policy: structured_only
    hints:
      - "Compare a saída com duas coisas: com as semanas anteriores e com o dado desta semana. Com qual delas ela combina?"
      - "O aviso vermelho seria um erro óbvio — o que torna ESTE erro perigoso é justamente o que ele não faz."
      - "A saída parece certa porque repete o padrão antigo — mas a planilha desta semana não é mais a antiga."

  - id: l32-a2
    type: output_comparison
    skillId: avaliar
    instruction: "VOCÊ DETECTOU A DEGRADAÇÃO. COMPARE AS DUAS CORREÇÕES E ESCOLHA A MELHOR."
    data:
      scenario: "A rotina do resumo semanal de vendas degradou depois que a planilha mudou (coluna 'vendas do período' virou 'vendas líquidas', entrou linha de estorno). Você vai corrigir o pedido da rotina."
      outputs:
        - id: out-a
          text: "Correção no ponto: 'A planilha mudou: a coluna de vendas do período agora se chama vendas líquidas, e entrou uma linha de estorno que precisa ser descontada. Use a coluna nova e considere o estorno. O resto segue como combinado: resumo para a reunião, em tópicos, com os três indicadores de sempre.'"
        - id: out-b
          text: "Recomeço total: apagar a rotina e o pedido-padrão, escrever um pedido inteiro do zero e montar um modelo novo de resumo — só depois de algumas semanas testar de novo."
      criteria:
        - id: c-so-o-que-mudou
          text: "A correção aponta exatamente o que mudou no dado desta semana (coluna nova, estorno)"
        - id: c-mantem-o-combinado
          text: "Preserva a regra que continuava valendo (formato, indicadores, público da reunião)"
        - id: c-sem-retrabalho-cego
          text: "Não joga fora o que funcionava sem saber o que exatamente deu errado"
    evaluation:
      strategy: deterministic
      betterOutputId: out-a
      requiredCriterionIds: [c-so-o-que-mudou, c-mantem-o-combinado]
    feedback:
      onFailure: "A correção A é mínima como na lição de conversas longas: nomeia SÓ o que mudou (coluna, estorno) e reafirma o combinado que segue valendo (tópicos, três indicadores, reunião). A B é retrabalho no escuro: apagar tudo sem diagnosticar joga fora o aprendizado de semanas e ainda esconde a causa real — o próximo pedido novo nasce com o mesmo buraco."
      perCheck:
        betterOutputId: "A correção A conserta a causa com o menor gesto possível; a B troca a casa porque uma porta emperrou."
        c-so-o-que-mudou: "Faltou este critério: a correção precisa dizer o que exatamente mudou no dado — coluna nova e estorno — senão a IA corrige no escuro."
        c-mantem-o-combinado: "Faltou este critério: reafirmar a regra que continua valendo (formato, indicadores, público) — senão a correção desmonta o que funcionava."
        c-sem-retrabalho-cego: "Critério bônus da correção A: recomeço total sem diagnóstico joga fora o que funcionava e não garante que o erro não volte."
      onSuccess: "Exato! Correção mínima: o que mudou + a regra que segue valendo. É o mesmo gesto da conversa longa degradada — agora aplicado à rotina."
    storage:
      policy: structured_only
    hints:
      - "O que exatamente quebrou: o pedido inteiro, ou a parte que lê o dado?"
      - "Uma correção boa diz o que mudou E o que continua valendo — só uma das duas não basta."
      - "A correção mínima nomeia a coluna nova e o estorno, e mantém tópicos, indicadores e público como estavam."

  - id: l32-a3
    type: missing_context
    skillId: avaliar
    instruction: "O PEDIDO DE CORREÇÃO FOI SÓ 'ATUALIZA O RESUMO, POR FAVOR'. O QUE FALTA NESSA CORREÇÃO?"
    data:
      prompt: "ROTINA (combinado da segunda 9h): resumo semanal de vendas para a reunião — tópicos, três indicadores, máximo de 1 página. · O QUE ACONTECEU: a planilha mudou (coluna 'vendas do período' virou 'vendas líquidas'; entrou uma linha de estorno) e o resumo saiu 'na média', ignorando a mudança. · SEU PEDIDO DE CORREÇÃO: 'atualiza o resumo, por favor'."
      contextOptions:
        - id: o-que-mudou
          text: "O que mudou no dado: a coluna nova e a linha de estorno — sem isso, 'atualizar' não diz o que a IA precisa ler de diferente"
        - id: regra-que-continua-valendo
          text: "A regra que continua valendo: tópicos, os três indicadores, 1 página, público da reunião — para a correção não desmontar o combinado"
        - id: onde-a-mudanca-aparece
          text: "Onde a mudança está na planilha (aba, linha da coluna), para a IA localizar sozinha o ponto novo"
        - id: nome-do-modelo-de-ia
          text: "O nome do modelo de IA que executa a rotina"
        - id: recomecar-tudo
          text: "Apagar a rotina inteira e recomeçar do zero, já que ela falhou uma vez"
    evaluation:
      strategy: deterministic
      requiredContextIds: [o-que-mudou, regra-que-continua-valendo]
      optionalContextIds: [onde-a-mudanca-aparece]
    feedback:
      onFailure: "'Atualiza' não corrige rotina degradada: a IA não sabe o que mudou no seu dado — quem viu a planilha nova foi você. A correção que repõe o contexto diz O QUE MUDOU (coluna, estorno) e A REGRA QUE SEGUE VALENDO (tópicos, indicadores, 1 página). Nome de modelo é desvio; apagar tudo é pânico — uma falha não aposenta um combinado que funcionou por semanas."
      perCheck:
        o-que-mudou: "Faltou isto: dizer o que mudou no dado (coluna nova, estorno). Sem isso, a 'atualização' continua lendo a planilha velha que existe só na memória da rotina."
        regra-que-continua-valendo: "Faltou isto: reafirmar o que segue valendo (tópicos, três indicadores, 1 página) — correção sem regra vira licença para a IA improvisar a forma."
        onde-a-mudanca-aparece: "Isto é opcional: apontar aba e linha ajuda a IA a localizar a mudança, mas o pedido já corrige sem isso."
        nome-do-modelo-de-ia: "Isto é mito: o nome do modelo não informa a mudança da planilha — o contexto perdido é seu, não do modelo."
        recomecar-tudo: "Isto é pânico, não correção: apagar a rotina joga fora o combinado que funcionava e não conserta a causa (o dado que mudou)."
      onSuccess: "Exato! Correção de rotina repõe o contexto em duas partes: o que mudou + a regra que continua valendo. A rotina volta a ler o presente, sem perder o combinado."
    storage:
      policy: structured_only
    hints:
      - "A IA não viu a planilha nova. O que só você sabe sobre esta semana?"
      - "Uma correção completa diz o que mudou e o que segue valendo."
      - "Procure: a mudança (coluna, estorno) e o combinado antigo que não pode se perder (formato, indicadores, tamanho)."

rubric:
  id: l32-rubric
  criteria:
    - id: r-detecta-o-desvio
      text: "Reconhece o sinal de degradação: saída coerente com semanas anteriores mas desconectada do dado atual."
      weight: 1
    - id: r-aplica-correcao-minima
      text: "Corrige só o que quebrou (o dado que mudou), sem descartar o pedido-padrão que funcionava."
      weight: 1
    - id: r-repoem-o-contexto
      text: "Repõe o contexto perdido: nomeia o que mudou e reafirma a regra que continua valendo."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l32-a1, l32-a2, l32-a3]
```
