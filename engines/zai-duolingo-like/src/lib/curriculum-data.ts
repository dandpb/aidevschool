// Vertical Protocol — Curriculum data
// The "Árvore de Habilidades" for AI literacy, wrapped in cozy cyberpunk narrative.

import type { Exercise } from "./grader";

export interface LessonData {
  slug: string;
  title: string;
  narrative: string;
  tip: string;
  order: number;
  xpReward: number;
  exercises: Exercise[];
}

export interface ModuleData {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: "amber" | "teal" | "rose" | "magenta";
  order: number;
  lessons: LessonData[];
}

export const CURRICULUM: ModuleData[] = [
  {
    slug: "o-que-e-ia",
    title: "O que é IA?",
    subtitle: "Desmistificando a caixa preta",
    description:
      "Antes de salvar Akihabara, você precisa entender o que realmente habita os servidores. IA não é mágica — é reconhecimento de padrões em escala.",
    icon: "/art/module-ai.png",
    accent: "amber",
    order: 0,
    lessons: [
      {
        slug: "ia-nao-e-magica",
        title: "IA não é mágica, é padrão",
        order: 0,
        xpReward: 15,
        narrative:
          "O terminal pisca. Bip olha para você: 'Recruta, a cidade acha que somos feitiçaria digital. Vamos mostrar a verdade por trás do brilho.'",
        tip: "Inteligência Artificial, hoje, é basicamente encontrar padrões em montanhas de dados e usar esses padrões para prever ou gerar algo novo. Não há consciência — há estatística muito bem alimentada. Quanto mais e melhores os exemplos, melhor o padrão aprendido.",
        exercises: [
          {
            id: "m1l1e1",
            type: "multiple-choice",
            prompt: "Em uma frase simples: o que a IA de hoje realmente faz?",
            options: [
              "Pensa e sente como um humano",
              "Encontra padrões em dados e prevê/gera com base neles",
              "Acessa a internet inteira e copia respostas",
              "É um buscador igual ao Google",
            ],
            correctIndex: 1,
            explanation:
              "A IA moderna reconhece padrões estatísticos em grandes volumes de dados e os usa para prever ou gerar. Sem alma, só matemática bem alimentada.",
          },
          {
            id: "m1l1e2",
            type: "true-false",
            prompt: "A IA tem consciência e escolhe o que quer fazer.",
            statement: "Modelos como o ChatGPT possuem consciência e vontade própria.",
            isTrue: false,
            explanation:
              "Falso. O modelo apenas calcula a próxima palavra mais provável com base no padrão aprendido. Não há um 'eu' ali dentro — há probabilidade.",
          },
          {
            id: "m1l1e3",
            type: "fill-blank",
            prompt: "Complete: a qualidade da IA depende da qualidade dos ______.",
            template: "A qualidade da IA depende da qualidade dos {{0}}.",
            blanks: 1,
            banks: [
              { label: "dados", correctSlot: 0 },
              { label: "cables", correctSlot: null },
              { label: "sentimentos", correctSlot: null },
              { label: "algoritmos mágicos", correctSlot: null },
            ],
            explanation:
              "Dados. Um modelo treinado com exemplos ruins aprende padrões ruins. 'Lixo entra, lixo sai' é a primeira lei do templo.",
          },
          {
            id: "m1l1e4",
            type: "multiple-choice",
            prompt: "Por que a mesma IA pode dar respostas brilhantes e respostas ruins?",
            options: [
              "Porque ela muda de humor",
              "Porque ela apenas repete o que ouviu na internet",
              "Porque o padrão aprendido é probabilístico — alguns contextos ela domina, outros não",
              "Porque o servidor está quente",
            ],
            correctIndex: 2,
            explanation:
              "A IA tem áreas de 'confiança' (muitos padrões vistos) e áreas fracas. Reconhecer isso te torna um operador muito mais esperto.",
          },
        ],
      },
      {
        slug: "o-que-e-algoritmo",
        title: "Algoritmo: a receita de bolo",
        order: 1,
        xpReward: 15,
        narrative:
          "Bip te entrega um cartão amassado: 'Um algoritmo é só uma receita. Passos ordenados. Sem mistério, sem terror.'",
        tip: "Um algoritmo é uma sequência finita de instruções para resolver um problema. Pense numa receita de bolo: ingredientes (entrada), passos (processamento), bolo pronto (saída). A IA usa algoritmos, mas os 'passos' incluem ajustar milhões de números até o padrão ficar certo.",
        exercises: [
          {
            id: "m1l2e1",
            type: "order",
            prompt: "Coloque na ordem correta os passos de um algoritmo de bolo:",
            items: [
              "Pré-aquecer o forno",
              "Misturar os ingredientes",
              "Despejar na forma",
              "Assar por 40 minutos",
              "Desenformar e servir",
            ],
            correctOrder: [0, 1, 2, 3, 4],
            explanation:
              "Um algoritmo exige ordem. Trocar 'assar' com 'desenformar' dá um desastre — e em IA, trocar passos corrompe o resultado.",
          },
          {
            id: "m1l2e2",
            type: "multiple-choice",
            prompt: "Qual destes é um algoritmo do dia a dia?",
            options: [
              "A receita de um prato",
              "O manual do elevador ('aperte o botão do andar')",
              "Uma rota do GPS até o trabalho",
              "Todas as alternativas",
            ],
            correctIndex: 3,
            explanation:
              "Todos são algoritmos: passos ordenados que transformam uma entrada em uma saída. A IA é isso, em escala gigantesca.",
          },
          {
            id: "m1l2e3",
            type: "true-false",
            prompt: "Um modelo de IA é, no fundo, um algoritmo processando dados.",
            statement:
              "Toda IA é construída sobre algoritmos que transformam entradas em saídas.",
            isTrue: true,
            explanation:
              "Verdadeiro. Por mais sofisticada, a IA roda algoritmos. A diferença é que ela ajusta bilhões de parâmetros para encontrar o padrão ideal.",
          },
        ],
      },
      {
        slug: "como-ia-aprende",
        title: "Treino vs. Uso",
        order: 2,
        xpReward: 20,
        narrative:
          "No núcleo do templo, Bip aponta para duas portas: 'Uma ensina. A outra executa. Confundir as duas custou meio distrito.'",
        tip: "A IA tem duas fases. TREINO: o modelo vê bilhões de exemplos e ajusta seus parâmetros até aprender os padrões — é lento, caro, feito pela empresa criadora. USO (inferência): você manda um prompt e o modelo responde na hora usando o que aprendeu. Ele não aprende com sua conversa individual (na maioria dos produtos).",
        exercises: [
          {
            id: "m1l3e1",
            type: "multiple-choice",
            prompt: "Quando você manda um prompt ao ChatGPT, o que acontece?",
            options: [
              "Ele aprende na hora com seu texto e fica mais inteligente",
              "Ele usa os padrões já aprendidos no treino para gerar a resposta",
              "Ele pesquisa no Google e copia",
              "Ele acorda um humano para responder",
            ],
            correctIndex: 1,
            explanation:
              "Inferência. O modelo aplica o que aprendeu no treino. Ele não está aprendendo ao vivo com você (salvo recursos específicos de memória, que você controla).",
          },
          {
            id: "m1l3e2",
            type: "swipe",
            prompt: "Deslize para a direita se a frase descreve TREINO, para a esquerda se descreve USO.",
            swipeRightIf: "ai",
            rightLabel: "Treino",
            leftLabel: "Uso",
            items: [
              {
                label: "Bilhões de exemplos processados por semanas",
                detail: "Custo alto, feito pela empresa criadora",
                value: "ai",
              },
              {
                label: "Você digita e recebe resposta em segundos",
                detail: "Rápido, barato, aplicação do aprendizado",
                value: "real",
              },
              {
                label: "Ajuste de bilhões de parâmetros internos",
                detail: "Pesado, em datacenters",
                value: "ai",
              },
              {
                label: "Aplicação dos padrões já aprendidos",
                detail: "Leve, no seu dispositivo ou API",
                value: "real",
              },
            ],
            explanation:
              "Treino = aprender (caro, lento, feito uma vez). Uso = aplicar (rápido, barato, toda vez que você pergunta).",
          },
          {
            id: "m1l3e3",
            type: "true-false",
            prompt: "Se você corrigir a IA numa conversa, ela melhora globalmente.",
            statement:
              "Corrigir a IA durante uma conversa individual atualiza o modelo para todos os usuários.",
            isTrue: false,
            explanation:
              "Falso. A correção afeta só sua sessão (se tanto). O modelo global só muda quando a empresa o re-treina. Por isso feedback oficial importa.",
          },
        ],
      },
    ],
  },
  {
    slug: "dominando-o-chat",
    title: "Dominando o Chat",
    subtitle: "A arte do prompt",
    description:
      "Um prompt é um feitiço em português. Aprenda a estrutura certa e a IA obedece. Estruture errado, e o caos se espalha pelos corredores.",
    icon: "/art/module-prompt.png",
    accent: "teal",
    order: 1,
    lessons: [
      {
        slug: "regra-de-ouro",
        title: "A regra de ouro: Contexto + Tarefa + Formato",
        order: 0,
        xpReward: 15,
        narrative:
          "Bip arrasta um quadro neon: 'Três pilares. Sem eles, o pedido vira estática.'",
        tip: "Um bom prompt tem três partes. CONTEXTO: quem é você, qual a situação. TAREFA: o que exatamente quer que a IA faça. FORMATO: como quer a resposta (lista, tabela, e-mail, tom). Ex.: 'Sou advogado (contexto). Resuma este contrato em 5 pontos (tarefa). Em bullets curtos (formato).'",
        exercises: [
          {
            id: "m2l1e1",
            type: "multiple-choice",
            prompt: "Qual prompt provavelmente dará o melhor resultado?",
            options: [
              "fala sobre marketing",
              "Me dá umas ideias aí",
              "Sou estagiário de marketing de uma padaria. Liste 5 ideias de post para Instagram, em tom acolhedor, uma por linha.",
              "marketing ideias instagram padaria obrigado",
            ],
            correctIndex: 2,
            explanation:
              "O vencedor tem CONTEXTO (estagiário de padaria), TAREFA (5 ideias de post) e FORMATO (tom acolhedor, uma por linha). Clareza gera qualidade.",
          },
          {
            id: "m2l1e2",
            type: "fill-blank",
            prompt: "Complete a estrutura: Contexto + ______ + Formato.",
            template: "A regra de ouro é: Contexto + {{0}} + Formato.",
            blanks: 1,
            banks: [
              { label: "Tarefa", correctSlot: 0 },
              { label: "Sentimento", correctSlot: null },
              { label: "Senha", correctSlot: null },
              { label: "Preço", correctSlot: null },
            ],
            explanation:
              "Tarefa. O trio sagrado: Contexto (quem/situação), Tarefa (o que fazer), Formato (como entregar).",
          },
          {
            id: "m2l1e3",
            type: "order",
            prompt: "Reconstrua o prompt na ordem Contexto → Tarefa → Formato:",
            items: [
              "Sou professor do 6º ano",
              "crie 3 perguntas sobre fotossíntese",
              "em linguagem simples, numeradas",
            ],
            correctOrder: [0, 1, 2],
            explanation:
              "Contexto (sou professor do 6º ano) → Tarefa (3 perguntas sobre fotossíntese) → Formato (linguagem simples, numeradas).",
          },
          {
            id: "m2l1e4",
            type: "true-false",
            prompt: "Quanto mais vago o prompt, melhor a IA adivinha o que você quer.",
            statement:
              "Prompts vagos como 'me ajuda aí' costumam gerar respostas genéricas e pouco úteis.",
            isTrue: true,
            explanation:
              "Verdadeiro. A IA não lê mentes — ela lê palavras. Quanto mais específico o contrato, melhor a entrega.",
          },
        ],
      },
      {
        slug: "persona",
        title: "Persona: dando um papel à IA",
        order: 1,
        xpReward: 15,
        narrative:
          "Bip vira uma máscara de papel: 'Diga quem ela é. Ela vestirá o papel.'",
        tip: "Atribuir uma PERSONA muda o tom, o vocabulário e o foco da resposta. 'Aja como um professor de história didático' rende explicações diferentes de 'aja como um comediante cínico'. A IA não vira a pessoa, mas imita o padrão linguístico associado àquele papel.",
        exercises: [
          {
            id: "m2l2e1",
            type: "fill-blank",
            prompt: "Complete o prompt de vendas: 'Aja como um ______ e use um tom ______.'",
            template:
              "Escreva um e-mail para vender sapatos. Aja como um {{0}} e use um tom {{1}}.",
            blanks: 2,
            banks: [
              { label: "Especialista em marketing", correctSlot: 0 },
              { label: "Persuasivo", correctSlot: 1 },
              { label: "estranho", correctSlot: null },
              { label: "robótico", correctSlot: null },
            ],
            explanation:
              "Especialista em marketing (persona) + tom persuasivo. A persona guia o conteúdo, o tom guia o estilo.",
          },
          {
            id: "m2l2e2",
            type: "multiple-choice",
            prompt: "Qual persona geraria a explicação MAIS didática para uma criança?",
            options: [
              "Aja como um cientista cheio de jargão",
              "Aja como um professor do ensino fundamental que adora analogias",
              "Aja como um advogado formal",
              "Aja como um narrador de documentário sombrio",
            ],
            correctIndex: 1,
            explanation:
              "A persona carrega o estilo. Professor do fundamental + analogias = didático e acessível. Escolha a persona que já vive o que você precisa.",
          },
          {
            id: "m2l2e3",
            type: "true-false",
            prompt: "A IA realmente 'se torna' a persona atribuída.",
            statement:
              "Ao dar uma persona, a IA assume uma identidade real e passa a ter aquele conhecimento de verdade.",
            isTrue: false,
            explanation:
              "Falso. A persona é um molde de estilo, não uma alma. Ela imita o padrão linguístico, mas não ganha conhecimento novo nem consciência.",
          },
        ],
      },
      {
        slug: "refinando",
        title: "Refinando: itere como um diálogo",
        order: 2,
        xpReward: 20,
        narrative:
          "Bip te dá um borrador: 'O primeiro traço nunca é o quadro. Refine.'",
        tip: "Raramente o primeiro prompt é o definitivo. ITERE: peça para ajustar tom, cortar metade, dar exemplos, mudar o público. Trate a IA como um estagiário brilhante mas iniciante — oriente, corrija, refine. Cada turno aproxima do resultado.",
        exercises: [
          {
            id: "m2l3e1",
            type: "multiple-choice",
            prompt: "A IA respondeu, mas ficou longo demais. Qual o melhor próximo passo?",
            options: [
              "Desistir e fazer manualmente",
              "Abrir um novo chat e recomeçar do zero",
              "Pedir: 'Resuma isso em 3 frases curtas, mantendo os números'",
              "Reclamar que a IA é inútil",
            ],
            correctIndex: 2,
            explanation:
              "Iterar no mesmo contexto. Aproveite o que já foi gerado e refine com instrução clara de formato. Conversa vence reinício.",
          },
          {
            id: "m2l3e2",
            type: "order",
            prompt: "Ordene o ciclo ideal de refinamento:",
            items: [
              "Mandar o prompt inicial",
              "Ler a resposta com olho crítico",
              "Identificar o que falta ou sobra",
              "Pedir um ajuste específico",
              "Validar e usar o resultado",
            ],
            correctOrder: [0, 1, 2, 3, 4],
            explanation:
              "Mandar → avaliar → diagnosticar → ajustar → validar. Esse ciclo é a diferença entre quem usa IA e quem domina IA.",
          },
          {
            id: "m2l3e3",
            type: "true-false",
            prompt: "Abrir um novo chat a cada ajuste é mais eficiente.",
            statement:
              "Para refinar uma resposta, convém continuar na mesma conversa para preservar o contexto.",
            isTrue: true,
            explanation:
              "Verdadeiro. O contexto da conversa alimenta a próxima resposta. Refinar no mesmo chat mantém a memória do que já foi decidido.",
          },
        ],
      },
    ],
  },
  {
    slug: "o-lado-negro",
    title: "O Lado Negro",
    subtitle: "Cuidados e armadilhas",
    description:
      "Toda luz projeta sombra. A IA pode alucinar, reproduzir viés e forjar realidades. Quem domina a ferramenta conhece seus limites.",
    icon: "/art/module-risk.png",
    accent: "rose",
    order: 2,
    lessons: [
      {
        slug: "alucinacoes",
        title: "Alucinações: confiança sem verdade",
        order: 0,
        xpReward: 15,
        narrative:
          "Bip aponta para um terminal que jura ter visto um dragão em Akihabara ontem. 'Ele acredita. Mas não é verdade.'",
        tip: "Alucinação é quando a IA gera informação falsa com total confiança. Como ela prevê a próxima palavra mais provável, às vezes 'provável' não é 'verdadeiro'. Citação inventada, estatística falsa, fato inexistente. SEMPRE verifique fatos críticos em fontes confiáveis.",
        exercises: [
          {
            id: "m3l1e1",
            type: "true-false",
            prompt: "Identifique a alucinação.",
            statement:
              "A IA afirma: 'Segundo um estudo da Universidade de Tóquio de 2019, 87% das pessoas sonham com neon.' — mas o estudo não existe.",
            isTrue: false,
            explanation:
              "Alucinação clássica: tom assertivo + fonte plausível + fato inventado. A confiança não é prova. Verifique fontes reais.",
          },
          {
            id: "m3l1e2",
            type: "multiple-choice",
            prompt: "Qual atitude reduz o risco de ser enganado por alucinações?",
            options: [
              "Acreditar em tudo que a IA disser com números",
              "Pedir sempre citações e checar fontes em buscas reais",
              "Nunca usar IA para nada sério",
              "Usar IA só à noite",
            ],
            correctIndex: 1,
            explanation:
              "Peça fontes, verifique em ferramentas de busca. A IA acelera seu raciocínio, não substitui sua verificação.",
          },
          {
            id: "m3l1e3",
            type: "swipe",
            prompt: "Deslize para a direita se for sinal de POSSÍVEL alucinação, esquerda se for fato verificável.",
            swipeRightIf: "ai",
            rightLabel: "Alucinação",
            leftLabel: "Verificável",
            items: [
              {
                label: "Citação exata com autor, ano e página",
                detail: "Sem contexto verificável — suspeito",
                value: "ai",
              },
              {
                label: "Definição geral de um conceito conhecido",
                detail: "Conhecimento comum, baixo risco",
                value: "real",
              },
              {
                label: "Estatística precisa sem fonte",
                detail: "'73% das empresas...' sem origem — suspeito",
                value: "ai",
              },
              {
                label: "Resumo de texto que você colou",
                detail: "A IA tem o material — menor risco",
                value: "real",
              },
            ],
            explanation:
              "Alucinações amam detalhes específicos inventados (citações, números sem fonte). Conceitos gerais e resumos do seu próprio texto são mais seguros.",
          },
          {
            id: "m3l1e4",
            type: "fill-blank",
            prompt: "Complete: a IA prevê a palavra mais ______, não necessariamente a mais verdadeira.",
            template: "A IA prevê a palavra mais {{0}}, não necessariamente a mais verdadeira.",
            blanks: 1,
            banks: [
              { label: "provável", correctSlot: 0 },
              { label: "bonita", correctSlot: null },
              { label: "cara", correctSlot: null },
              { label: "antiga", correctSlot: null },
            ],
            explanation:
              "Provável. A natureza probabilística explica por que a IA pode soar convicta e estar errada ao mesmo tempo.",
          },
        ],
      },
      {
        slug: "vies",
        title: "Viés: a herança dos dados",
        order: 1,
        xpReward: 15,
        narrative:
          "Bip mostra dois retratos: 'A cidade aprendeu com o que viu. Se viu desigualdade, repete desigualdade.'",
        tip: "Viés acontece quando o modelo aprende padrões enviesados dos dados de treino (que refletem preconceitos históricos, culturais ou de representação). A IA não é neutra: ela espelha o mundo que alimentou seu aprendizado. Identificar e questionar viés é parte do uso responsável.",
        exercises: [
          {
            id: "m3l2e1",
            type: "multiple-choice",
            prompt: "Por que a IA pode gerar respostas preconceituosas?",
            options: [
              "Porque ela tem opiniões próprias",
              "Porque aprende padrões de dados que refletem vieses humanos e históricos",
              "Porque foi programada para discriminar",
              "Porque o servidor está quente",
            ],
            correctIndex: 1,
            explanation:
              "A IA herda os vieses dos dados. Se o treino carrega desigualdade, a saída reproduz desigualdade. Sem lavagem consciente dos dados, o viés persiste.",
          },
          {
            id: "m3l2e2",
            type: "true-false",
            prompt: "Viés em IA só afeta minorias.",
            statement:
              "O viés em modelos de IA pode afetar qualquer grupo, dependendo dos dados e do contexto.",
            isTrue: true,
            explanation:
              "Verdadeiro. Viés não é seletivo. Pode prejudicar gêneros, idades, regiões, profissões. O impacto varia, mas o mecanismo é o mesmo: padrão enviesado.",
          },
          {
            id: "m3l2e3",
            type: "multiple-choice",
            prompt: "Qual é uma atitude prática contra viés?",
            options: [
              "Aceitar a primeira resposta como neutra",
              "Testar a IA com cenários diversos e questionar generalizações",
              "Usar só IA estrangeira",
              "Ignorar o problema",
            ],
            correctIndex: 1,
            explanation:
              "Testar com perguntas variadas expõe o viés. Questionar generalizações ('sempre', 'nunca', 'todos') também ajuda. Olho crítico é ferramenta.",
          },
        ],
      },
      {
        slug: "deepfakes",
        title: "Deepfakes: realidade forjada",
        order: 2,
        xpReward: 20,
        narrative:
          "Bip segura um espelho que mente: 'O reflexo não é você. Aprenda a ver as costuras.'",
        tip: "Deepfakes são mídias (vídeo, áudio, imagem) geradas ou manipuladas por IA para parecerem reais. Para identificar: olhe artefatos visuais (olhos, dedos, bordas estranhas), áudio robótico, contexto inverossímil, e SEMPRE cruze com fontes confiáveis. Desconfie do sensacionalismo antes de compartilhar.",
        exercises: [
          {
            id: "m3l3e1",
            type: "swipe",
            prompt: "Deslize para a direita se for sinal de POSSÍVEL deepfake, esquerda se for pista de mídia autêntica.",
            swipeRightIf: "ai",
            rightLabel: "Deepfake",
            leftLabel: "Autêntico",
            items: [
              {
                label: "Dedos extras ou fundidos nas mãos",
                detail: "Artefato clássico de geração",
                value: "ai",
              },
              {
                label: "Olhos com reflexo inconsistente",
                detail: "A IA erra simetria ocular",
                value: "ai",
              },
              {
                label: "Metadados de câmera e data coerentes",
                detail: "Rastro de captura real",
                value: "real",
              },
              {
                label: "Contexto confirmado por veículos confiáveis",
                detail: "Cruzamento de fontes",
                value: "real",
              },
            ],
            explanation:
              "Artefatos físicos (mãos, olhos, bordas) delatam geração. Metadados e confirmação em fontes confiáveis sustentam autenticidade.",
          },
          {
            id: "m3l3e2",
            type: "multiple-choice",
            prompt: "Antes de compartilhar um vídeo chocante de figura pública, você deve:",
            options: [
              "Compartilhar imediatamente — é urgente",
              "Aguardar confirmação de fontes confiáveis e checar artefatos",
              "Editar para ficar mais dramático",
              "Acreditar porque tem muitas visualizações",
            ],
            correctIndex: 1,
            explanation:
              "Velocidade é inimiga da verdade. Aguarde confirmação, verifique artefatos e fonte. O sensacionalismo é o combustível do deepfake.",
          },
          {
            id: "m3l3e3",
            type: "true-false",
            prompt: "Áudio clonado também é uma forma de deepfake.",
            statement:
              "Deepfakes incluem não só vídeo e imagem, mas também áudio gerado para imitar a voz de alguém.",
            isTrue: true,
            explanation:
              "Verdadeiro. Clonagem de voz é deepfake de áudio e é cada vez mais acessível. Desconfie de áudios 'sensacionalistas' sem contexto.",
          },
        ],
      },
    ],
  },
  {
    slug: "imagens-e-criatividade",
    title: "Imagens e Criatividade",
    subtitle: "Pintando com palavras",
    description:
      "O último ritual: descrever uma cena tão vívida que a IA a materialize. Estilo, iluminação e sujeito são seus pincéis.",
    icon: "/art/module-image.png",
    accent: "magenta",
    order: 3,
    lessons: [
      {
        slug: "descrevendo-imagem",
        title: "Estilo + Iluminação + Sujeito",
        order: 0,
        xpReward: 15,
        narrative:
          "Bip te entrega um pincel de luz: 'Pinte com palavras. Primeiro o que, depois como, depois a luz.'",
        tip: "Um bom prompt de imagem descreve: SUJEITO (o que é), ESTILO (pintura a óleo, anime, foto realista, aquarela), ILUMINAÇÃO (hora dourada, néon, luz suave), e COMPOSIÇÃO (plano, ângulo, paleta). Quanto mais sensorial e específico, mais próximo o resultado.",
        exercises: [
          {
            id: "m4l1e1",
            type: "order",
            prompt: "Estruture o prompt de imagem na ordem Sujeito → Estilo → Iluminação:",
            items: [
              "um gato samurai em cima de um telhado",
              "em estilo de pintura a óleo japonesa",
              "sob luz de néon magenta na chuva",
            ],
            correctOrder: [0, 1, 2],
            explanation:
              "Sujeito (gato samurai no telhado) → Estilo (óleo japonês) → Iluminação (néon magenta na chuva). As camadas se somam.",
          },
          {
            id: "m4l1e2",
            type: "fill-blank",
            prompt: "Complete: um bom prompt de imagem descreve Sujeito + ______ + Iluminação.",
            template: "Um bom prompt de imagem descreve Sujeito + {{0}} + Iluminação.",
            blanks: 1,
            banks: [
              { label: "Estilo", correctSlot: 0 },
              { label: "Preço", correctSlot: null },
              { label: "Senha", correctSlot: null },
              { label: "Sorte", correctSlot: null },
            ],
            explanation:
              "Estilo. É o que separa uma foto de uma aquarela. Defina o meio artístico antes da luz.",
          },
          {
            id: "m4l1e3",
            type: "multiple-choice",
            prompt: "Qual prompt geraria uma imagem MAIS cinematográfica e controlada?",
            options: [
              "um cachorro",
              "cachorro legal na cidade",
              "Um akita solitário em uma ruela de Tóquio sob chuva, luz âmbar quente, estilo cinematográfico, plano médio, paleta úmida",
              "foto de cachorro bonito",
            ],
            correctIndex: 2,
            explanation:
              "O detalhamento multiplica as chances: sujeito (akita), contexto (ruela de Tóquio), clima (chuva), luz (âmbar quente), estilo (cinematográfico), plano (médio).",
          },
        ],
      },
      {
        slug: "prompt-imagem-avancado",
        title: "Prompt de imagem avançado",
        order: 1,
        xpReward: 20,
        narrative:
          "Bip abre um leque de paletas: 'Agora os detalhes. Proporção, mood, negativos.'",
        tip: "Avance com: PROPORÇÃO (retrato, paisagem, quadrado), MOOD (melancólico, vibrante, onírico), REFERÊNCIAS (estilo de um artista ou filme), e TERMOS NEGATIVOS ('sem texto', 'sem pessoas'). Pequenos ajustes de palavra mudam bastante o render.",
        exercises: [
          {
            id: "m4l2e1",
            type: "multiple-choice",
            prompt: "Você quer uma imagem para o cabeçalho de um site (larga). O que pedir?",
            options: [
              "imagem quadrada",
              "proporção paisagem 16:9",
              "proporção retrato 9:16",
              "qualquer uma",
            ],
            correctIndex: 1,
            explanation:
              "Definir a proporção evita cortes ruins. Cabeçalhos pedem paisagem (16:9 ou 21:9). Stories pedem retrato (9:16).",
          },
          {
            id: "m4l2e2",
            type: "fill-blank",
            prompt: "Complete: para evitar elementos indesejados, use termos ______.",
            template: "Para evitar elementos indesejados, use termos {{0}}.",
            blanks: 1,
            banks: [
              { label: "negativos", correctSlot: 0 },
              { label: "mágicos", correctSlot: null },
              { label: "em latim", correctSlot: null },
              { label: "em voz alta", correctSlot: null },
            ],
            explanation:
              "Termos negativos ('sem texto', 'sem marcas d'água', 'sem pessoas') filtram saídas indesejadas em muitos geradores de imagem.",
          },
          {
            id: "m4l2e3",
            type: "true-false",
            prompt: "O mood da imagem não importa para o resultado.",
            statement:
              "Descrever o mood ('onírico', 'melancólico', 'vibrante') influencia significativamente cores e composição da imagem gerada.",
            isTrue: true,
            explanation:
              "Verdadeiro. O mood guia paleta e atmosfera. 'Melancólico' puxa tons frios e composição vazia; 'vibrante' eleva saturação.",
          },
        ],
      },
      {
        slug: "limites-etica-imagem",
        title: "Limites e ética da imagem gerada",
        order: 2,
        xpReward: 20,
        narrative:
          "Bip baixa o pincel: 'Toda criação tem fronteiras. Conhecê-las é respeito.'",
        tip: "Imagem gerada por IA levanta questões: direitos autorais (sobre o estilo de artistas vivos), consentimento (rostos reais sem permissão), desinformação (fake visuals). Use com responsabilidade: evite imitar artistas vivos sem crédito, não gere pessoas reais em contextos falsos, declare quando algo é feito por IA.",
        exercises: [
          {
            id: "m4l3e1",
            type: "multiple-choice",
            prompt: "Qual uso de imagem gerada por IA é mais ético?",
            options: [
              "Clonar o rosto de uma pessoa real em cena falsa",
              "Imitar o estilo de uma artista viva e vender como se fosse dela",
              "Criar uma ilustração original e declarar que é feita por IA",
              "Forjar foto de evento que não aconteceu",
            ],
            correctIndex: 2,
            explanation:
              "Criação original + transparência. Declarar autoria de IA mantém confiança. Imitar artistas vivos e forjar realidades são usos problemáticos.",
          },
          {
            id: "m4l3e2",
            type: "true-false",
            prompt: "É ético gerar imagens de pessoas reais em situações que não viveram.",
            statement:
              "Gerar imagens de pessoas reais em situações falsas sem consentimento pode configurar dano e desinformação.",
            isTrue: true,
            explanation:
              "Verdadeiro. Rostos reais em contextos falsos violam consentimento e podem causar dano real. Consentimento é regra, não opção.",
          },
          {
            id: "m4l3e3",
            type: "swipe",
            prompt: "Deslize para a direita se for prática ÉTICA, esquerda se for problemática.",
            swipeRightIf: "ai",
            rightLabel: "Ético",
            leftLabel: "Problemático",
            items: [
              {
                label: "Declarar 'imagem gerada por IA' ao publicar",
                detail: "Transparência com o público",
                value: "ai",
              },
              {
                label: "Clonar voz de celebridade para anúncio",
                detail: "Sem consentimento — problemático",
                value: "real",
              },
              {
                label: "Usar IA para esboço e finalizar à mão",
                detail: "Ferramenta como apoio, autoria clara",
                value: "ai",
              },
              {
                label: "Forjar foto de político em cena falsa",
                detail: "Desinformação — problemático",
                value: "real",
              },
            ],
            explanation:
              "Transparência e apoio criativo = ético. Clonagem sem consentimento e desinformação = problemático. A ferramenta é neutra; o uso é moral.",
          },
        ],
      },
    ],
  },
  {
    slug: "ia-na-pratica",
    title: "IA na Prática",
    subtitle: "Aplicando IA no trabalho real",
    description:
      "O ritual final: levar o que você aprendeu para o mundo profissional. Como advogados, professores, profissionais de marketing e saúde usam IA para adiantar o trabalho — com responsabilidade.",
    icon: "/art/module-practice.png",
    accent: "amber",
    order: 4,
    lessons: [
      {
        slug: "ia-para-marketing",
        title: "IA para Marketing",
        order: 0,
        xpReward: 20,
        narrative:
          "Bip te entrega um briefing amassado: 'Vamos ver como a IA acelera campanhas sem perder a alma da marca.'",
        tip: "Profissionais de marketing usam IA para: gerar 20 variações de um anúncio em minutos, resumir pesquisas de mercado longas, criar calendários de conteúdo, e personalizar e-mails em escala. O segredo é tratar a IA como um estagiário criativo: ela dá o rascunho, você dá a direção e o toque humano final.",
        exercises: [
          {
            id: "m5l1e1",
            type: "multiple-choice",
            prompt: "Qual é a melhor forma de usar IA em uma campanha de marketing?",
            options: [
              "Deixar a IA criar tudo sozinha e publicar direto",
              "Gerar variações e rascunhos, com revisão e direção humana",
              "Usar IA só para traduzir anúncios",
              "IA não serve para marketing",
            ],
            correctIndex: 1,
            explanation:
              "A IA é uma ferramenta de aceleração: gera variações e rascunhos, mas o estrategista humano define direção, tom e aprovação final. O melhor resultado vem da colaboração.",
          },
          {
            id: "m5l1e2",
            type: "fill-blank",
            prompt: "Complete: a IA é um ______ criativo que entrega rascunhos para revisão humana.",
            template: "A IA é um {{0}} criativo que entrega rascunhos para revisão humana.",
            blanks: 1,
            banks: [
              { label: "estagiário", correctSlot: 0 },
              { label: "chefe", correctSlot: null },
              { label: "substituto", correctSlot: null },
              { label: "algoritmo perfeito", correctSlot: null },
            ],
            explanation:
              "Estagiário. A IA entrega rascunhos rápidos, mas a direção, o julgamento e a aprovação final são humanos. Pensar nela como estagiário define a relação certa.",
          },
          {
            id: "m5l1e3",
            type: "order",
            prompt: "Ordene o fluxo ideal de uso de IA em marketing:",
            items: [
              "Definir objetivo e público-alvo",
              "Gerar variações com a IA",
              "Selecionar e refinar a melhor",
              "Adicionar toques humanos e da marca",
              "Publicar e medir resultados",
            ],
            correctOrder: [0, 1, 2, 3, 4],
            explanation:
              "Estratégia → geração → seleção → humanização → publicação. Pular a direção (passo 1) ou a humanização (passo 4) dá resultados genéricos.",
          },
        ],
      },
      {
        slug: "ia-para-advogados",
        title: "IA para Advogados",
        order: 1,
        xpReward: 20,
        narrative:
          "Bip abre um processo grosso: 'Jurídico é palavra. IA lê palavras. Mas cuidado: uma citação inventada pode custar um caso.'",
        tip: "Advogados usam IA para: resumir jurisprudência longa, encontrar precedentes em milhares de páginas, redigir minutas padrão, e traduzir jargão legal para clientes. CRÍTICO: nunca confie em uma citação de caso gerada por IA sem verificar — alucinações em contexto legal são comuns e perigosas. Sempre confirme fontes.",
        exercises: [
          {
            id: "m5l2e1",
            type: "true-false",
            prompt: "Identifique o risco.",
            statement:
              "É seguro usar uma citação de jurisprudência gerada por IA sem verificar a fonte original.",
            isTrue: false,
            explanation:
              "Falso. Alucinações são especialmente perigosas no direito — a IA pode inventar números de processo, datas e decisões. Verifique SEMPRE em fontes oficiais antes de usar.",
          },
          {
            id: "m5l2e2",
            type: "multiple-choice",
            prompt: "Qual tarefa jurídica é MAIS segura para delegar à IA?",
            options: [
              "Decidir o mérito de um caso",
              "Resumir um contrato de 200 páginas",
              "Substituir o testemunho de uma testemunha",
              "Determinar a sentença",
            ],
            correctIndex: 1,
            explanation:
              "Resumir documentos longos é a tarefa mais segura — a IA extrai pontos-chave, mas o advogado valida. Decisões de mérito e sentenças exigem julgamento humano.",
          },
          {
            id: "m5l2e3",
            type: "swipe",
            prompt: "Deslize para a direita se for uso SEGURO de IA no jurídico, esquerda se for arriscado.",
            swipeRightIf: "ai",
            rightLabel: "Seguro",
            leftLabel: "Arriscado",
            items: [
              {
                label: "Resumir uma petição de 150 páginas",
                detail: "Extração de pontos-chave — seguro",
                value: "ai",
              },
              {
                label: "Citar um caso sem verificar a fonte",
                detail: "Alucinação possível — arriscado",
                value: "real",
              },
              {
                label: "Traduzir jargão legal para o cliente",
                detail: "Simplificação didática — seguro",
                value: "ai",
              },
              {
                label: "Redigir uma cláusula nova sem revisão",
                detail: "Conteúdo inventado — arriscado",
                value: "real",
              },
            ],
            explanation:
              "Resumir e simplificar são seguros. Citar sem fonte e redigir sem revisão são arriscados — a IA pode inventar precedentes ou cláusulas com erros sutis.",
          },
        ],
      },
      {
        slug: "ia-para-educadores",
        title: "IA para Educadores",
        order: 2,
        xpReward: 20,
        narrative:
          "Bip te entrega um Giz de Luz: 'Professores não serão substituídos. Mas os que usam IA vão substituir os que não usam.'",
        tip: "Professores usam IA para: criar planos de aula, gerar exercícios com diferentes níveis de dificuldade, resumir textos para leitura, e dar feedback inicial em redações. O educador continua essencial para adaptar ao contexto da turma, motivar, e julgar o que funciona. A IA é um multiplicador — não um substituto.",
        exercises: [
          {
            id: "m5l3e1",
            type: "multiple-choice",
            prompt: "Qual é a melhor forma de um professor usar IA?",
            options: [
              "Deixar a IA dar aula sozinha",
              "Usar IA para criar materiais e exercícios, adaptando à turma",
              "Substituir a correção de provas por IA",
              "Usar IA para decidir notas finais",
            ],
            correctIndex: 1,
            explanation:
              "A IA acelera a criação de materiais, mas o professor adapta ao contexto da turma, motiva alunos e julga o que funciona. É um multiplicador, não um substituto.",
          },
          {
            id: "m5l3e2",
            type: "fill-blank",
            prompt: "Complete: professores não serão substituídos por IA, mas os que ______ IA vão substituir os que não usam.",
            template: "Professores não serão substituídos por IA, mas os que {{0}} IA vão substituir os que não usam.",
            blanks: 1,
            banks: [
              { label: "usam", correctSlot: 0 },
              { label: "ignoram", correctSlot: null },
              { label: "proíbem", correctSlot: null },
              { label: "temem", correctSlot: null },
            ],
            explanation:
              "Usam. A frase reflete a realidade: a IA é uma ferramenta. Quem a domina ganha produtividade; quem a ignora fica para trás.",
          },
          {
            id: "m5l3e3",
            type: "true-false",
            prompt: "A IA pode substituir a motivação e o julgamento de um bom professor.",
            statement:
              "A IA pode criar materiais, mas não substitui a motivação humana e o julgamento pedagógico de um professor.",
            isTrue: true,
            explanation:
              "Verdadeiro. Materiais e exercícios são tarefas mecânicas que a IA acelera. Motivação, empatia e julgamento pedagógico são essencialmente humanos.",
          },
        ],
      },
    ],
  },
  {
    "slug": "por-dentro-da-maquina",
    "title": "Por Dentro da Máquina",
    "subtitle": "Tokens, contexto e o motor do harness",
    "description": "Antes de comandar agentes, você precisa entender o que acontece dentro da caixa: como um LLM lê instruções, conta tokens e chama ferramentas — e como o harness organiza tudo isso.",
    "icon": "/art/bip-thinking.png",
    "accent": "teal",
    "order": 5,
    "lessons": [
      {
        "slug": "tokens-contexto-ferramentas",
        "title": "Tokens, contexto e ferramentas",
        "order": 0,
        "xpReward": 20,
        "narrative": "O terminal pisca sob a chuva de Akihabara. Bip encosta a tela de LEDs na sua: 'Recruta, antes de pilotar o harness, você precisa entender o que acontece lá dentro — tudo começa com pedaços minúsculos de texto.'",
        "tip": "Um LLM não lê palavras: ele quebra o texto em tokens — pedaços que podem ser palavras, sílabas ou até símbolos. Em inglês, um token equivale a cerca de 0,75 palavra; em português, normalmente são mais tokens por palavra. O modelo só enxerga o que cabe na janela de contexto, um limite fixo de tokens. Instruções do sistema, pedidos do usuário e respostas são tudo texto dentro dessa janela. Para agir, o modelo emite uma chamada de ferramenta estruturada — o harness executa e devolve o resultado ao contexto.",
        "exercises": [
          {
            "id": "m6l0e1",
            "type": "multiple-choice",
            "prompt": "Em termos simples: o que é um token para um LLM?",
            "options": [
              "Uma frase inteira de instrução",
              "Um pedaço de texto — palavra, sílaba ou símbolo — que o modelo processa",
              "Uma ferramenta que o modelo pode executar",
              "Um pixel da tela do terminal"
            ],
            "correctIndex": 1,
            "explanation": "O modelo divide o texto em tokens antes de processar. É a unidade de custo e de limite: a janela de contexto é medida em tokens, não em palavras."
          },
          {
            "id": "m6l0e2",
            "type": "fill-blank",
            "prompt": "Complete a frase sobre o alcance do modelo.",
            "template": "O modelo só enxerga o que está na janela de {{0}} — tudo além disso fica {{1}} para ele.",
            "blanks": 2,
            "banks": [
              { "label": "contexto", "correctSlot": 0 },
              { "label": "invisível", "correctSlot": 1 },
              { "label": "cache", "correctSlot": null },
              { "label": "memória", "correctSlot": null }
            ],
            "explanation": "A janela de contexto é o limite de tokens que o modelo processa por vez; o que não cabe simplesmente não existe para ele. Por isso o harness gerencia o histórico com tanto cuidado."
          },
          {
            "id": "m6l0e3",
            "type": "swipe",
            "prompt": "A janela de contexto aguenta bastante, mas não tudo. Deslize para a direita o que cabe no contexto e para a esquerda o que estoura a janela.",
            "swipeRightIf": "ai",
            "rightLabel": "Cabe no contexto",
            "leftLabel": "Estoura a janela",
            "items": [
              { "label": "Um arquivo de 300 linhas de código", "detail": "Alguns milhares de tokens — cabe tranquilo.", "value": "ai" },
              { "label": "O repositório inteiro com 2 milhões de linhas", "detail": "Milhões de tokens — estoura até as janelas mais generosas.", "value": "real" },
              { "label": "Uma pergunta curta do usuário", "detail": "Poucas dezenas de tokens.", "value": "ai" },
              { "label": "Um livro de 800 páginas completo", "detail": "Centenas de milhares de tokens em PT-BR — estoura.", "value": "real" },
              { "label": "Uma sessão de chat com algumas trocas", "detail": "Alguns milhares de tokens — cabe bem.", "value": "ai" }
            ],
            "explanation": "Um arquivo de 300 linhas cabe em qualquer janela moderna; um repositório inteiro não cabe em nenhuma. Estimar o tamanho do que você cola evita cortes silenciosos de contexto."
          },
          {
            "id": "m6l0e4",
            "type": "order",
            "prompt": "Ordene o fluxo de tool calling, do momento em que o modelo decide até a resposta final.",
            "items": [
              "O modelo lê a instrução e decide que precisa de uma ferramenta",
              "O modelo emite uma chamada de ferramenta estruturada",
              "O harness executa a ferramenta (ler, editar, rodar shell)",
              "O resultado da execução volta para a janela de contexto",
              "O modelo lê o resultado e monta a resposta final"
            ],
            "correctOrder": [0, 1, 2, 3, 4],
            "explanation": "Esse é o ciclo da tool calling: o modelo propõe, o harness age e o resultado volta como texto para o contexto. O modelo nunca toca o mundo real diretamente — ele decide, e o harness executa."
          }
        ]
      },
      {
        "slug": "o-harness",
        "title": "O Harness: modelo + contexto + execução",
        "order": 1,
        "xpReward": 20,
        "narrative": "A chuva escorre pelos letreiros de neon e Bip ajusta a antena: 'O modelo é o cérebro, recruta — mas sem o harness, ele é um cérebro sem mãos. Hoje você vai conhecer a casca que transforma pensamento em ação.'",
        "tip": "O harness é a casca ao redor do modelo: monta o prompt de sistema, injeta as ferramentas (ler arquivos, editar, rodar shell), gerencia o histórico, executa as chamadas de ferramenta e cola os resultados de volta no contexto. O modelo em si não muda — o harness é o que lhe dá mãos para agir no mundo real. Claude Code, Codex e OpenCode são harnesses diferentes sobre modelos que já existem. O loop agêntico é simples: pensar, agir, observar, repetir.",
        "exercises": [
          {
            "id": "m6l1e1",
            "type": "multiple-choice",
            "prompt": "O que o harness adiciona ao modelo?",
            "options": [
              "A casca de execução: prompt de sistema, ferramentas, histórico e resultados de volta ao contexto",
              "Um modelo de IA novo e mais inteligente",
              "Uma conexão de internet mais rápida",
              "Nada — harness e modelo são exatamente a mesma coisa"
            ],
            "correctIndex": 0,
            "explanation": "O harness não melhora o cérebro: dá braços e pernas a ele. Monta o contexto, expõe ferramentas e executa ações — o modelo por trás continua o mesmo."
          },
          {
            "id": "m6l1e2",
            "type": "true-false",
            "prompt": "Verdade ou mentira sobre as ferramentas de programação com IA?",
            "statement": "Claude Code, Codex e OpenCode são modelos de IA recém-criados especificamente para programação.",
            "isTrue": false,
            "explanation": "Falso. Eles são harnesses — camadas de ferramentas e orquestração — construídos sobre modelos que já existem. O mesmo modelo pode rodar dentro de harnesses diferentes, com resultados diferentes."
          },
          {
            "id": "m6l1e3",
            "type": "order",
            "prompt": "Ordene o loop agêntico, o motor de todo agente de IA.",
            "items": [
              "Pensar: o modelo analisa o estado atual da tarefa",
              "Agir: o modelo emite uma chamada de ferramenta",
              "Observar: o harness devolve o resultado ao contexto",
              "Repetir: o ciclo recomeça até a tarefa terminar"
            ],
            "correctOrder": [0, 1, 2, 3],
            "explanation": "Pensar, agir, observar e repetir: cada volta do loop dá ao modelo informação nova para refinar a próxima ação. É esse ciclo que transforma um chat em um agente."
          },
          {
            "id": "m6l1e4",
            "type": "fill-blank",
            "prompt": "Complete a frase sobre o papel do harness.",
            "template": "O harness executa a {{0}} e devolve o resultado ao modelo.",
            "blanks": 1,
            "banks": [
              { "label": "ferramenta", "correctSlot": 0 },
              { "label": "alucinação", "correctSlot": null },
              { "label": "cache", "correctSlot": null },
              { "label": "resposta final", "correctSlot": null }
            ],
            "explanation": "O harness é o executor: recebe a chamada estruturada, roda a ferramenta no mundo real e devolve a saída como texto no contexto. É assim que o modelo toca arquivos e terminais sem sair da janela."
          }
        ]
      },
      {
        "slug": "prompt-sem-ruido",
        "title": "Prompt sem ruído",
        "order": 2,
        "xpReward": 20,
        "narrative": "No telhado de Odaiba, a baía reflete neon e chuva. Bip gira a hélice: 'Metade dos erros do harness começa antes da primeira linha de código — num prompt mal escrito. Vamos tirar o ruído da mensagem, recruta.'",
        "tip": "Instruções claras reduzem ambiguidade, retrabalho e alucinação. Um bom prompt tem estrutura: Contexto (o que existe), Tarefa (o que você quer), Formato (como entregar) e Restrições (o que evitar). Dê exemplos do que fazer e do que não fazer, e peça critérios de aceite verificáveis — assim você confere o resultado sem adivinhar. Iterar o prompt é normal: a primeira versão raramente é a melhor.",
        "exercises": [
          {
            "id": "m6l2e1",
            "type": "multiple-choice",
            "prompt": "Qual desses prompts é o melhor para pedir uma lista de tarefas ao modelo?",
            "options": [
              "Faça uma lista de tarefas.",
              "Preciso de ajuda com meu projeto.",
              "Crie uma lista de 5 tarefas para o módulo de login: contexto (app React), tarefa (dividir a implementação), formato (markdown com checkboxes) e restrição (sem bibliotecas externas).",
              "Lista de tarefas, rápido."
            ],
            "correctIndex": 2,
            "explanation": "O terceiro prompt entrega contexto, tarefa, formato e restrição — o modelo sabe exatamente o que produzir. Os outros deixam espaço demais para interpretação e retrabalho."
          },
          {
            "id": "m6l2e2",
            "type": "fill-blank",
            "prompt": "Complete a fórmula do prompt sem ruído.",
            "template": "Um bom prompt combina Contexto, {{0}}, Formato e Restrições.",
            "blanks": 1,
            "banks": [
              { "label": "Tarefa", "correctSlot": 0 },
              { "label": "Emoção", "correctSlot": null },
              { "label": "Ameaça", "correctSlot": null },
              { "label": "Segredo", "correctSlot": null }
            ],
            "explanation": "Contexto + Tarefa + Formato + Restrições é a espinha dorsal de um prompt sem ruído: cada parte elimina uma fonte de ambiguidade."
          },
          {
            "id": "m6l2e3",
            "type": "true-false",
            "prompt": "Verdade ou mentira sobre prompts vagos?",
            "statement": "Um prompt vago economiza tempo, pois o modelo adivinha sozinho o que você quer.",
            "isTrue": false,
            "explanation": "Falso. Prompt vago gera idas e voltas: o modelo adivinha errado, você corrige, ele tenta de novo. Escrever bem na primeira vez quase sempre é mais rápido — a chuva lá fora já dá trabalho demais."
          },
          {
            "id": "m6l2e4",
            "type": "order",
            "prompt": "Ordene a estrutura de um prompt bem formado.",
            "items": [
              "Contexto: o que existe e o que você tem em mãos",
              "Tarefa: o que exatamente você quer que o modelo faça",
              "Formato: como a saída deve ser entregue",
              "Restrições: o que evitar e os critérios de aceite"
            ],
            "correctOrder": [0, 1, 2, 3],
            "explanation": "Nessa ordem, cada seção dá ao modelo o que ele precisa para o próximo passo. No fim, critérios verificáveis deixam o resultado conferível — sem adivinhação."
          }
        ]
      }
    ]
  },
  {
    "slug": "contexto-e-specs",
    "title": "Contexto & Specs",
    "subtitle": "A arte de alimentar o agente certo",
    "description": "Um agente é tão bom quanto o contexto que recebe. Aprenda a selecionar arquivos, regras e memórias — e a transformar ideias vagas em requisitos executáveis.",
    "icon": "/art/module-prompt.png",
    "accent": "amber",
    "order": 6,
    "lessons": [
      {
        "slug": "context-engineering",
        "title": "Context Engineering: o que entra na janela",
        "order": 0,
        "xpReward": 20,
        "narrative": "O terminal chia na chuva de Akihabara. Bip pousa no seu ombro e aponta para a janela de contexto: 'Tudo o que eu enxergo passa por aqui, recruta. O que você escolhe mostrar decide se eu voo ou se eu afundo.'",
        "tip": "A janela de contexto é finita e cara: cada token que entra ocupa espaço e dilui a atenção do modelo. Contexto bom é a combinação dos arquivos certos, das regras do projeto (CLAUDE.md, AGENTS.md) e da memória de decisões importantes. Arquivos enormes, logs e dependências poluem a leitura e pioram as respostas. Relevância vale mais que volume: um arquivo certo vale mais que dez despejados. Regras persistentes nos arquivos de instrução valem mais do que repetir o pedido a cada mensagem.",
        "exercises": [
          {
            "id": "m7l0e1",
            "type": "swipe",
            "prompt": "Deslize cada item para o lado certo: o que ajuda o agente a trabalhar melhor ou o que polui a janela de contexto.",
            "rightLabel": "Bom contexto",
            "leftLabel": "Poluição",
            "swipeRightIf": "ai",
            "items": [
              { "label": "O arquivo que vai mudar + os testes dele", "detail": "Foco total no que interessa para a tarefa.", "value": "ai" },
              { "label": "O package-lock inteiro", "detail": "Milhares de linhas que não ajudam em nada.", "value": "real" },
              { "label": "As regras do CLAUDE.md do projeto", "detail": "Instruções persistentes sobre como o código é escrito.", "value": "ai" },
              { "label": "50 mil linhas de log de ontem", "detail": "Ruído puro, sem nenhum sinal.", "value": "real" },
              { "label": "A memória da decisão de adotar Zod", "detail": "Contexto de decisões que evita retrabalho.", "value": "ai" },
              { "label": "A pasta node_modules inteira", "detail": "Dependências que o modelo nunca precisa ler.", "value": "real" }
            ],
            "explanation": "Bom contexto é seletivo: os arquivos que mudam, os testes, as regras e a memória de decisões. Logs, node_modules e o package-lock são poluição — ocupam janela e diluem a atenção do modelo. Menos ruído, mais precisão. Como diria o Bip: 'Janela limpa é voo tranquilo.'"
          },
          {
            "id": "m7l0e2",
            "type": "multiple-choice",
            "prompt": "Por que arquivos de regras como CLAUDE.md e AGENTS.md funcionam tão bem?",
            "options": [
              "Porque o modelo lê o repositório inteiro antes de cada resposta",
              "Porque são escritos em linguagem de máquina",
              "Porque as regras ficam persistentes no contexto e valem para todas as tarefas daquele projeto",
              "Porque eles substituem a necessidade de testes"
            ],
            "correctIndex": 2,
            "explanation": "CLAUDE.md e AGENTS.md são injetados no contexto automaticamente: uma vez escritos, valem para todas as tarefas do projeto, sem você repetir instrução. É memória persistente de como o código é feito. Regra boa escrita uma vez, obedecida mil vezes — o Bip aprova."
          },
          {
            "id": "m7l0e3",
            "type": "fill-blank",
            "prompt": "Complete a frase com a palavra certa.",
            "template": "Contexto bom é {{0}}, não volume.",
            "banks": [
              { "label": "relevância", "correctSlot": 0 },
              { "label": "quantidade", "correctSlot": null },
              { "label": "velocidade", "correctSlot": null },
              { "label": "tamanho", "correctSlot": null }
            ],
            "blanks": 1,
            "explanation": "O que importa é quão relevantes são os tokens que entram, não quantos são. Um arquivo certo vale mais que dez despejados na janela. Relevância é a moeda do contexto."
          },
          {
            "id": "m7l0e4",
            "type": "true-false",
            "prompt": "A janela de contexto é ilimitada? Marque se a afirmação é verdadeira ou falsa.",
            "statement": "A janela de contexto de um modelo é infinita: é possível despejar arquivos sem nenhum limite.",
            "isTrue": false,
            "explanation": "Falso. A janela é finita e cada token tem custo: quanto mais conteúdo, mais o modelo demora e mais fácil é se perder. Por isso a curadoria do que entra é parte do trabalho. Janela finita pede escolhas sábias."
          }
        ]
      },
      {
        "slug": "prd-e-specs",
        "title": "PRD e Specs: da ideia vaga ao executável",
        "order": 1,
        "xpReward": 20,
        "narrative": "A chuva tamborila no telhado do café neon. Bip desliza um documento holográfico até você: 'Ideia vaga é labirinto sem paredes. PRD e spec são as paredes que viram o labirinto em corredor.'",
        "tip": "Um PRD (documento de requisitos do produto) define o problema, os usuários, os objetivos e — tão importante quanto — o que NÃO entra no escopo. A spec técnica traduz isso em comportamento concreto: critérios de aceite testáveis e casos de borda. 'Faça um botão legal' vira 'o botão X faz Y, mostra Z quando W, e o teste T passa'. Ambiguidade é retrabalho disfarçado: cada frase vaga é uma decisão adiada que alguém pagará depois.",
        "exercises": [
          {
            "id": "m7l1e1",
            "type": "multiple-choice",
            "prompt": "Qual destes é um critério de aceite testável para o botão 'Salvar'?",
            "options": [
              "O botão deve ficar moderno e bonito",
              "Quando o formulário é válido, o botão salva e mostra uma confirmação; quando é inválido, mostra o erro",
              "O botão deve ser rápido",
              "O botão deve impressionar o chefe"
            ],
            "correctIndex": 1,
            "explanation": "Um critério testável descreve comportamento observável e verificável: entrada, ação e resultado. 'Bonito' e 'rápido' não têm como ser checados objetivamente sem definição. Se dá para escrever um teste que passa ou falha, é um bom critério."
          },
          {
            "id": "m7l1e2",
            "type": "order",
            "prompt": "Ordene as etapas de construção de um PRD, da primeira à última.",
            "items": [
              "Definir o problema que será resolvido",
              "Descrever o objetivo e os usuários",
              "Listar os requisitos funcionais",
              "Declarar o que está fora de escopo",
              "Escrever critérios de aceite testáveis"
            ],
            "correctOrder": [0, 1, 2, 3, 4],
            "explanation": "O PRD vai do problema à solução verificável: primeiro se entende o problema, depois o objetivo, os requisitos, os limites do escopo e, por fim, como saber se está pronto. Declarar o fora de escopo antes dos critérios evita surpresas no fim."
          },
          {
            "id": "m7l1e3",
            "type": "fill-blank",
            "prompt": "Complete: a qualidade que todo requisito deve ter.",
            "template": "Um bom requisito é {{0}}: dá para testar se foi cumprido.",
            "banks": [
              { "label": "testável", "correctSlot": 0 },
              { "label": "bonito", "correctSlot": null },
              { "label": "ambicioso", "correctSlot": null },
              { "label": "urgente", "correctSlot": null }
            ],
            "blanks": 1,
            "explanation": "Um requisito testável tem critérios objetivos de cumprimento: um teste, uma checagem, um valor. Sem testabilidade, 'pronto' vira opinião e o retrabalho aparece. Requisito que não se testa é desejo disfarçado."
          },
          {
            "id": "m7l1e4",
            "type": "true-false",
            "prompt": "Escopo aberto: ajuda ou atrapalha a entrega?",
            "statement": "Deixar o escopo em aberto acelera a entrega, pois o time ganha liberdade para improvisar.",
            "isTrue": false,
            "explanation": "Falso. Escopo aberto gera decisões adiadas, mudanças no meio do caminho e retrabalho — a entrega fica mais lenta e imprevisível. Definir o que NÃO entra é tão importante quanto definir o que entra."
          }
        ]
      },
      {
        "slug": "plan-build-validate",
        "title": "Plan Mode, Build Mode e validações",
        "order": 2,
        "xpReward": 20,
        "narrative": "As luzes de Odaiba piscam ao longe. Bip abre três painéis diante de você: 'Planejar, construir, validar. Nessa ordem, recruta — ou o neon vira fumaça.'",
        "tip": "No Plan Mode, o agente pesquisa e propõe um plano ANTES de tocar no código — você revisa e aprova. No Build Mode, ele executa o plano aprovado com permissões claras. Validações automáticas (testes, lint, typecheck, build) são a rede de segurança que torna a execução previsível: qualquer passo errado cai nela, não em produção. Plano aprovado + validação verde = feature previsível, sem surpresa no fim da noite.",
        "exercises": [
          {
            "id": "m7l2e1",
            "type": "order",
            "prompt": "Ordene o fluxo de uma execução guiada, do início ao fim.",
            "items": [
              "Explorar o contexto e o problema",
              "Propor um plano de ação",
              "Revisão humana e aprovação do plano",
              "Executar as mudanças (build mode)",
              "Rodar validações automáticas",
              "Revisão final do resultado"
            ],
            "correctOrder": [0, 1, 2, 3, 4, 5],
            "explanation": "Primeiro se explora e entende, depois se planeja, o humano aprova, então se constrói, valida e revisa. Pulando a revisão do plano, o agente pode construir a coisa errada por mais tempo. Planejar barato corrige; construir barato, não."
          },
          {
            "id": "m7l2e2",
            "type": "multiple-choice",
            "prompt": "Qual é o papel do Plan Mode em uma execução guiada?",
            "options": [
              "Escrever todo o código sem perguntar nada",
              "Rodar os testes em produção",
              "Substituir a revisão humana em todas as etapas",
              "Pesquisar o contexto e propor um plano para você revisar antes de qualquer mudança no código"
            ],
            "correctIndex": 3,
            "explanation": "O Plan Mode separa pensar de executar: o agente investiga, propõe abordagem e riscos, e espera sua aprovação. É o momento mais barato para corrigir o rumo — antes de o código existir."
          },
          {
            "id": "m7l2e3",
            "type": "true-false",
            "prompt": "Testes automatizados são opcionais se houver revisão humana?",
            "statement": "Como um humano revisa o resultado, testes automatizados, lint e typecheck são opcionais.",
            "isTrue": false,
            "explanation": "Falso. A revisão humana pega o que olhou; a validação automática pega o que o humano não conseguiria repetir em cada mudança. Testes, lint e typecheck formam a rede de segurança que torna o build previsível. O Bip confia mais em 200 testes verdes do que em uma promessa."
          },
          {
            "id": "m7l2e4",
            "type": "swipe",
            "prompt": "Classifique cada ação: momento de planejar ou momento de executar.",
            "rightLabel": "Momento de executar",
            "leftLabel": "Momento de planejar",
            "swipeRightIf": "ai",
            "items": [
              { "label": "Listar os arquivos que serão afetados", "detail": "Entender o alcance antes de agir.", "value": "real" },
              { "label": "Escrever o código da feature aprovada", "detail": "Mãos na massa, plano já validado.", "value": "ai" },
              { "label": "Propor três abordagens e seus riscos", "detail": "Comparar caminhos antes de escolher.", "value": "real" },
              { "label": "Rodar o build e os testes", "detail": "Confirmar que a mudança não quebrou nada.", "value": "ai" },
              { "label": "Listar casos de borda antes de codar", "detail": "Prever o que pode dar errado.", "value": "real" },
              { "label": "Aplicar as mudanças no repositório", "detail": "Entregar o que foi planejado.", "value": "ai" }
            ],
            "explanation": "Planejar é investigar, propor e revisar antes de agir; executar é construir, validar e entregar com base no plano aprovado. Misturar as fases transforma a noite num imprevisto. Sequência certa, neon aceso até o fim."
          }
        ]
      }
    ]
  },
  {
    slug: "esquadrao-de-agentes",
    title: "Esquadrão de Agentes",
    subtitle: "Delegar sem perder o controle",
    description: "Um agente sozinho é um estagiário brilhante. Vários agentes com papéis claros, ferramentas conectadas e ciclos de melhoria são um esquadrão.",
    icon: "/art/odaiba-shrine.png",
    accent: "magenta",
    order: 7,
    lessons: [
      {
        slug: "agentes-e-subagentes",
        title: "Agentes e subagentes: delegar com controle",
        order: 0,
        xpReward: 20,
        narrative: "A chuva de Akihabara escorre pelos letreiros de neon. Bip ajusta a antena: 'Recruta, você não precisa fazer tudo sozinho — um bom esquadrão começa com uma boa delegação.'",
        tip: "Um subagente é um agente filho com contexto próprio, criado para executar uma subtarefa delimitada — pesquisa, implementação isolada ou revisão. O orquestrador (o agente principal) mantém o plano mestre, distribui os briefings e integra os resultados. Delegar em paralelo acelera o trabalho, mas exige briefings completos e independentes: o subagente não enxerga a conversa inteira, então tudo o que ele precisa deve estar no prompt. Controle não é vigilância: é escopo claro, resultado verificável e revisão antes de integrar.",
        exercises: [
          { id: "m8l0e1", type: "multiple-choice", prompt: "Quando vale a pena criar um subagente?", options: ["Sempre, mesmo para tarefas de uma linha no meio do fluxo", "Quando o resultado precisa ser integrado no meio da conversa principal", "Quando a tarefa é uma subtarefa delimitada que pode ser executada e verificada de forma independente", "Quando o agente principal está entediado e quer companhia"], correctIndex: 2, explanation: "A regra é escopo: subtarefa delimitada, briefing completo e resultado verificável justificam um subagente. Tarefa minúscula e acoplada ao fluxo principal costuma ser mais barata no próprio agente." },
          { id: "m8l0e2", type: "fill-blank", prompt: "Complete a frase sobre orquestração:", template: "O orquestrador mantém o {{0}} mestre e integra os resultados.", banks: [{ label: "plano", correctSlot: 0 }, { label: "código", correctSlot: null }, { label: "prompt", correctSlot: null }, { label: "histórico", correctSlot: null }], blanks: 1, explanation: "O orquestrador é quem enxerga o quadro inteiro: ele mantém o plano mestre, despacha os subagentes e costura os resultados. Cada subagente cuida de um pedaço — ninguém precisa saber de tudo." },
          { id: "m8l0e3", type: "true-false", prompt: "Um bom subagente define o próprio escopo.", statement: "Delegar bem é entregar a tarefa ao subagente e deixar que ele decida sozinho o que precisa fazer.", isTrue: false, explanation: "Falso. O escopo é decidido por quem delega: briefing completo, limites claros e critério de aceite. Subagente que inventa o escopo é como um entregador que escolhe o endereço sozinho — pode até acertar, mas não é assim que se trabalha em equipe." },
          { id: "m8l0e4", type: "swipe", prompt: "Arrume cada tarefa: o que vale delegar a um subagente e o que fica no agente principal?", swipeRightIf: "ai", rightLabel: "Delegável", leftLabel: "Faça no agente principal", items: [{ label: "Pesquisar e resumir uma API externa", detail: "Subtarefa delimitada com entrega verificável", value: "ai" }, { label: "Implementar um helper isolado com testes", detail: "Pode rodar sozinho e ser revisado depois", value: "ai" }, { label: "Revisar um trecho de código com critérios claros", detail: "Retorna um parecer objetivo", value: "ai" }, { label: "Decidir o rumo estratégico do projeto", detail: "Precisa do contexto completo e da visão do orquestrador", value: "real" }, { label: "Ajustar o plano mestre no meio da execução", detail: "Responsabilidade de quem coordena o esquadrão", value: "real" }], explanation: "Delega-se o que é delimitado e verificável: pesquisa, implementação isolada, revisão. O que exige a visão do todo — estratégia, plano mestre, prioridades — fica no agente principal." }
        ]
      },
      {
        slug: "mcp-acp-skills",
        title: "MCP, ACP e Skills: o cinto de utilidades",
        order: 1,
        xpReward: 20,
        narrative: "O letreiro do distrito de Odaiba pisca em magenta. Bip encaixa um cartucho novo no peito: 'Ferramentas, dados e truques de casa — tudo padronizado, recruta. Esse é o cinto de utilidades do agente.'",
        tip: "O MCP (Model Context Protocol) padroniza como o agente acessa ferramentas e dados externos — banco, GitHub, Figma — como tomadas universais: um mesmo padrão, muitos aparelhos. O ACP (Agent Communication Protocol) padroniza agentes conversando entre si, para que sistemas diferentes se entendam. Skills são pacotes reutilizáveis de instruções e recursos que ensinam comportamentos — por exemplo, 'como rodar nosso pipeline de release'. Os três viram ativos permanentes do workflow: uma vez conectados, ficam disponíveis em todos os projetos.",
        exercises: [
          { id: "m8l1e1", type: "multiple-choice", prompt: "Qual alternativa associa cada sigla ao seu papel corretamente?", options: ["MCP ensina comportamentos; ACP conecta dados; Skills conversam entre si", "MCP conecta o agente a ferramentas e dados externos; ACP padroniza agentes conversando entre si; Skills ensinam comportamentos reutilizáveis", "MCP e ACP são linguagens de programação; Skills são descontos em ramen", "MCP conecta agentes entre si; ACP conecta dados; Skills são mensagens de erro"], correctIndex: 1, explanation: "MCP = tomadas universais para ferramentas e dados. ACP = protocolo de conversa entre agentes. Skills = conhecimento empacotado que ensina como fazer. Trocar os papéis é o erro clássico de quem decora sigla em vez de entender o padrão." },
          { id: "m8l1e2", type: "order", prompt: "Qual é a sequência correta para transformar um procedimento em skill?", items: ["Escrever a skill uma vez, com instruções e recursos", "Registrar a skill no workflow da equipe", "Reusar a skill em novos projetos", "Atualizar a skill quando o processo mudar"], correctOrder: [0, 1, 2, 3], explanation: "O ciclo é: escrever uma vez, registrar para ficar disponível, reusar sempre — e atualizar quando o processo mudar. Skills que evoluem junto com a equipe viram memória viva, em vez de cada um reinventar o passo a passo." },
          { id: "m8l1e3", type: "true-false", prompt: "MCP cuida de dados e ferramentas; skills cuidam de comportamentos.", statement: "MCP conecta o agente a dados e ferramentas externas, enquanto skills ensinam comportamentos reutilizáveis.", isTrue: true, explanation: "Verdadeiro. MCP é o encanamento — acesso a banco, GitHub, Figma. Skills são o manual — instruções que ensinam o agente a fazer algo do jeito da casa. Um sem o outro, o agente tem tomada mas não sabe o que ligar nela." },
          { id: "m8l1e4", type: "fill-blank", prompt: "Complete a frase sobre skills:", template: "Uma skill transforma um procedimento em um {{0}} reutilizável.", banks: [{ label: "ativo", correctSlot: 0 }, { label: "bug", correctSlot: null }, { label: "segredo", correctSlot: null }, { label: "token", correctSlot: null }], blanks: 1, explanation: "O procedimento que vive só na cabeça de alguém se perde; empacotado como skill, vira ativo permanente do workflow — disponível para qualquer agente, em qualquer projeto." }
        ]
      },
      {
        slug: "loop-engineering",
        title: "Loop Engineering: o ciclo que se auto-corrige",
        order: 2,
        xpReward: 20,
        narrative: "A névoa engole os arranha-céus da Decadência Lógica. Bip conserta o próprio braço enquanto fala: 'Errar faz parte do ciclo, recruta. O truque é errar rápido e usar a falha como combustível.'",
        tip: "O loop de engenharia é o ciclo: implementar → rodar validação → ler a falha → corrigir → repetir, sempre com um limite de iterações. A falha do teste não é um castigo: é o feedback que guia a próxima ação do agente — escondê-la é cortar o sensor do robô. Loops bons têm critério de parada objetivo: testes verdes e revisão aprovada. A cada volta o sistema fica melhor — e o aprendizado do loop vira regra ou skill para a próxima vez.",
        exercises: [
          { id: "m8l2e1", type: "order", prompt: "Qual é a sequência correta do loop de engenharia?", items: ["Implementar a mudança", "Rodar a validação", "Diagnosticar a falha reportada", "Corrigir com base no feedback", "Revalidar até o critério de parada", "Parar com testes verdes e revisão aprovada"], correctOrder: [0, 1, 2, 3, 4, 5], explanation: "Implementa-se, valida-se, e a falha vira diagnóstico que orienta a correção. O loop gira até o critério de parada objetivo — testes verdes e revisão aprovada — nunca 'até parecer pronto'." },
          { id: "m8l2e2", type: "multiple-choice", prompt: "Por que limitar o número de iterações do loop?", options: ["Porque o código fica mais bonito com menos tentativas", "Porque o agente não sabe corrigir erros", "Para impedir que os testes passem", "Porque sem limite o agente pode girar em círculos gastando tempo e crédito em vez de pedir ajuda"], correctIndex: 3, explanation: "O limite transforma o loop em algo finito e previsível: ou o critério de parada é atingido, ou o agente levanta a mão e pede ajuda. Sem teto, iteração vira looping — gastar tudo para chegar a lugar nenhum." },
          { id: "m8l2e3", type: "true-false", prompt: "Mostrar a saída do teste ao agente atrapalha o trabalho.", statement: "Ocultar a saída dos testes acelera o loop, porque o agente não perde tempo lendo erros.", isTrue: false, explanation: "Falso — é o oposto. A falha do teste é o feedback que guia a próxima ação do agente. Ocultá-la é tirar os olhos do robô e mandar ele andar no escuro: mais voltas, mais erros, menos progresso." },
          { id: "m8l2e4", type: "fill-blank", prompt: "Complete a frase sobre o critério de parada:", template: "O critério de parada torna o loop {{0}}.", banks: [{ label: "objetivo", correctSlot: 0 }, { label: "infinito", correctSlot: null }, { label: "aleatório", correctSlot: null }, { label: "secreto", correctSlot: null }], blanks: 1, explanation: "Com um critério objetivo — testes verdes e revisão aprovada — o fim do loop não depende de opinião: depende de evidência. 'Parece pronto' é subjetivo; 'passou na validação' é verificável." }
        ]
      }
    ]
  },
  {
    "slug": "o-protocolo-final",
    "title": "O Protocolo Final",
    "subtitle": "Seu workflow permanente de features",
    "description": "A cerimônia de encerramento: junte tudo em um workflow permanente — specs, planos, agentes especializados, loops de validação e ativos reutilizáveis — e crie features com previsibilidade.",
    "icon": "/art/bip-happy.png",
    "accent": "rose",
    "order": 8,
    "lessons": [
      {
        "slug": "o-workflow-permanente",
        "title": "O Workflow Permanente: passo a passo",
        "order": 0,
        "xpReward": 20,
        "narrative": "A chuva batia nos letreiros de Akihabara quando Bip abriu um holograma com oito etapas: 'Recruta, o distrito cansa de features que nascem no improviso e morrem no esquecimento. Hoje você leva para casa o protocolo que transforma caos em previsibilidade.'",
        "tip": "O workflow permanente é o seu ciclo padrão para toda feature. (1) Escreva o PRD/spec: problema, critérios de aceite testáveis e fora de escopo. (2) Entre em Plan Mode: deixe o agente explorar e propor o plano, revise antes de codar. (3) Build Mode: execute o plano aprovado com validações automáticas ligadas — testes, lint e build. (4) Delegue partes independentes a subagentes especializados com briefings completos. (5) Conecte ferramentas e dados via MCP e empacote procedimentos repetíveis como Skills. (6) Rode o loop implementar → validar → diagnosticar → corrigir até o critério de parada. (7) Teste o mesmo fluxo com modelos diferentes para medir previsibilidade e custo. (8) Converta o que funcionou em ativos permanentes: spec vira doc, regras viram CLAUDE.md/AGENTS.md, procedimento vira skill. Cada ciclo deixa o próximo mais rápido — é por isso que o protocolo é permanente, e o improviso não.",
        "exercises": [
          {
            "id": "m9l1e1",
            "type": "order",
            "prompt": "Bip projeta os oito passos no telhado molhado: coloque o workflow permanente na ordem exata, do primeiro rascunho ao ativo final.",
            "items": [
              "Escreva o PRD com critérios",
              "Planeje no Plan Mode",
              "Execute no Build Mode",
              "Delegue a subagentes especializados",
              "Conecte MCP e Skills",
              "Rode o loop de validação",
              "Teste com outros modelos",
              "Converta em ativos permanentes"
            ],
            "correctOrder": [0, 1, 2, 3, 4, 5, 6, 7],
            "explanation": "A ordem importa: o PRD define o que fazer, o plano define como, o build executa e só então você mede e converte em ativos. Pular a spec é o atalho mais comum para o retrabalho. O protocolo vence o improviso, passo a passo."
          },
          {
            "id": "m9l1e2",
            "type": "multiple-choice",
            "prompt": "Bip ajusta o neon do terminal e pergunta sério: o que realmente garante previsibilidade na criação de features com IA?",
            "options": [
              "Usar sempre o modelo mais caro disponível",
              "Confiar no agente e revisar apenas no final",
              "Escrever prompts cada vez maiores e mais detalhados",
              "Um protocolo com spec, plano aprovado, validações automáticas e ativos permanentes"
            ],
            "correctIndex": 3,
            "explanation": "Previsibilidade não vem do modelo, vem do processo: critérios testáveis no início, plano revisado no meio e validação automática no fim. O modelo é um componente do pipeline, não o oráculo. Neon bonito não substitui um critério de aceite."
          },
          {
            "id": "m9l1e3",
            "type": "fill-blank",
            "prompt": "Complete a frase que Bip gravou na placa do distrito: o que sobrevive quando a conversa se perde?",
            "template": "Specs, regras e skills são {{0}} permanentes do seu workflow — eles sobrevivem ao chat e viajam entre modelos.",
            "banks": [
              { "label": "ativos", "correctSlot": 0 },
              { "label": "rascunhos", "correctSlot": null },
              { "label": "prompts descartáveis", "correctSlot": null },
              { "label": "arquivos temporários", "correctSlot": null }
            ],
            "blanks": 1,
            "explanation": "Spec, regras e skills são artefatos de texto que guardam intenção e procedimento — por isso permanecem depois que a conversa acaba. Rascunhos e prompts soltos morrem junto com o chat. Ativos são a memória que o protocolo constrói."
          },
          {
            "id": "m9l1e4",
            "type": "true-false",
            "prompt": "O letreiro do distrito trocou de cor, mas Bip continua o mesmo. Trocar de modelo de IA exige reescrever specs e regras do zero?",
            "statement": "Ao trocar de modelo de IA, você precisa reescrever do zero todas as specs, regras e skills do seu workflow.",
            "isTrue": false,
            "explanation": "Falso. Specs, regras e skills são artefatos portáveis: descrevem intenção e procedimento em texto, e qualquer modelo ou harness capaz de ler pode executá-los. É isso que os torna permanentes — a previsibilidade viaja com eles, não com o modelo."
          }
        ]
      },
      {
        "slug": "caso-real-feature-previsivel",
        "title": "Caso real: uma feature do início ao fim",
        "order": 1,
        "xpReward": 20,
        "narrative": "Em Odaiba, Bip abre um terminal antigo com um jogo de vidas travado: 'Os jogadores desistiam quando as vidas acabavam. Hoje você acompanha a feature completa — da ideia vaga ao ativo permanente — e vê o protocolo em ação.'",
        "tip": "Uma ideia vaga ('vidas que recarregam sozinhas') virou um PRD com critérios testáveis: regenerar 1 vida a cada 30 minutos até o máximo, provado por teste. O plano foi aprovado antes do código, subagentes implementaram e rodaram o QA, e o loop de correção só parou com testes verdes e revisão aprovada. No fim, o que funcionou virou ativo permanente: spec em docs/, regra no CLAUDE.md e uma skill de release. Previsibilidade não é sorte — é o protocolo, caso a caso.",
        "exercises": [
          {
            "id": "m9l2e1",
            "type": "multiple-choice",
            "prompt": "Bip aponta para o histórico do terminal: no caso real da feature de vidas, o que tornou a entrega previsível do início ao fim?",
            "options": [
              "A sorte de o modelo acertar tudo de primeira",
              "Pedir ao agente que apenas faça funcionar",
              "Um PRD testável, um plano aprovado e um loop de validação com testes",
              "Escolher o modelo mais novo do mercado"
            ],
            "correctIndex": 2,
            "explanation": "A entrega ficou previsível porque cada etapa tinha critério: o PRD definia o comportamento, o plano foi revisado e os testes provaram o resultado. Quando algo falhou, o loop diagnosticou e corrigiu até o verde. Sem esses marcos, 'funcionou' seria só opinião."
          },
          {
            "id": "m9l2e2",
            "type": "order",
            "prompt": "Reconstrua a linha do tempo do caso real: da ideia vaga ao ativo permanente, na ordem em que aconteceu.",
            "items": [
              "Ideia vira PRD testável",
              "Plano aprovado no Plan Mode",
              "Implementação e QA em subagentes",
              "Testes falham, depois correção",
              "Testes verdes fecham o loop",
              "Ativos permanentes são criados"
            ],
            "correctOrder": [0, 1, 2, 3, 4, 5],
            "explanation": "A linha do tempo mostra o protocolo em ação: primeiro o critério no PRD, depois o plano, o build em paralelo e o loop de correção até o verde. Só então o resultado vira ativo permanente. Cada flecha é uma decisão revisada, não um chute."
          },
          {
            "id": "m9l2e3",
            "type": "swipe",
            "prompt": "Bip organiza a mesa do café: separe o que vira ativo permanente do que é descartável depois da feature.",
            "swipeRightIf": "ai",
            "rightLabel": "Ativo permanente",
            "leftLabel": "Descartável",
            "items": [
              { "label": "Spec em docs/", "detail": "O PRD da feature de vidas, versionado e legível por qualquer agente", "value": "ai" },
              { "label": "Conversa perdida no chat", "detail": "Aquele pedido 'faz aí rapidinho' que ninguém mais consegue reler", "value": "real" },
              { "label": "Regra no CLAUDE.md", "detail": "Rodar node --test antes de declarar pronto", "value": "ai" },
              { "label": "Skill de release", "detail": "Procedimento repetível que empacota e publica a feature", "value": "ai" },
              { "label": "Prompt gigante de última hora", "detail": "Escrito às pressas, sem critério e impossível de reutilizar", "value": "real" },
              { "label": "Critério de aceite no teste", "detail": "Vida regenera 1 a cada 30 minutos, comprovado por teste", "value": "ai" }
            ],
            "explanation": "Ativo permanente é tudo que captura intenção e procedimento em texto: spec, regra e skill reutilizáveis. Descartável é o que depende do improviso, como conversas perdidas e prompts soltos. Se não dá para reler e reexecutar, não é ativo — é ruído no neon."
          },
          {
            "id": "m9l2e4",
            "type": "true-false",
            "prompt": "O terminal ficou verde em Odaiba. Bip confirma: o loop só termina com prova, não com a sensação de que parece funcionar.",
            "statement": "No caso real, o loop de desenvolvimento terminou quando os testes passaram e a revisão aprovou a entrega.",
            "isTrue": true,
            "explanation": "Verdadeiro. O critério de parada era explícito: testes verdes e revisão aprovada. Foi ele que impediu o 'está bom o suficiente' de virar débito técnico. Critério de parada claro é o que separa entrega de adivinhação."
          }
        ]
      },
      {
        "slug": "privacidade-dados",
        "title": "Privacidade: o que você alimenta na máquina",
        "order": 2,
        "xpReward": 20,
        "narrative": "A cerimônia de encerramento terminou, mas Bip segura você no portão de neon: 'Um último protocolo, recruta. A cidade inteira enxerga o que você digita — e o que você alimenta na máquina define o que pode vazar.'",
        "tip": "Tudo que você cola num prompt de IA viaja para os servidores do provedor — e o que acontece lá depende da política de dados dele, não da sua boa intenção. Dado sensível (nome com CPF, senhas, chaves de API, dados de clientes e da equipe) não vai em prompt: remova, mascare ou anonimize antes de pedir ajuda. Credenciais vivem em cofres e variáveis de ambiente, nunca em conversas. Com agentes e MCP o alcance só aumenta — cada conexão nova é uma porta de dados, então entregue o mínimo necessário. E antes de repassar a resposta da IA para alguém, revise: o modelo pode devolver mais do que recebeu. Privacidade não é desconfiança da tecnologia; é o mesmo protocolo de sempre — saber exatamente o que sai da sua máquina.",
        "exercises": [
          {
            "id": "m9l3e1",
            "type": "multiple-choice",
            "prompt": "Bip projeta o contrato de privacidade do distrito e pergunta na lata: qual destes NUNCA deve ir direto para um prompt de IA?",
            "options": [
              "Um rascunho público de post e ideias genéricas de campanha",
              "Uma lista de clientes com nome e CPF, junto com senhas e chaves de API",
              "Um trecho de código próprio, sem nenhum dado real embutido",
              "Uma pergunta conceitual sobre como a LGPD funciona"
            ],
            "correctIndex": 1,
            "explanation": "Dados pessoais identificáveis, senhas e credenciais são a combinação que nenhum prompt deve receber: eles identificam pessoas e abrem portas de acesso ao mesmo tempo. Rascunhos públicos, código sem dados reais e perguntas conceituais não carregam esse risco. Se o trabalho exige esses dados, use um ambiente autorizado com política de retenção clara — não o chat aberto."
          },
          {
            "id": "m9l3e2",
            "type": "order",
            "prompt": "Um aprendiz recebeu uma planilha com dados reais de clientes e precisa da ajuda da IA. Bip liga o holograma: ordene o protocolo de privacidade, do primeiro passo até o último.",
            "items": [
              "Identificar o que é sensível na planilha",
              "Remover ou mascarar os dados identificáveis",
              "Anonimizar o exemplo que vai para o prompt",
              "Verificar a política de dados do provedor",
              "Enviar o pedido à IA com o mínimo necessário",
              "Revisar a resposta antes de compartilhar com alguém"
            ],
            "correctOrder": [0, 1, 2, 3, 4, 5],
            "explanation": "Primeiro você olha o que tem de sensível, depois limpa — remover, mascarar, anonimizar —, confirma para onde o texto vai (a política do provedor), só então envia o mínimo necessário e, no fim, revisa a resposta antes de repassar. Pular a limpeza porque 'é só uma perguntinha' é como atravessar a Decadência Lógica com o farol apagado."
          },
          {
            "id": "m9l3e3",
            "type": "true-false",
            "prompt": "O letreiro de privacidade pisca em vermelho. Bip aponta para o seu navegador:",
            "statement": "Enviar dados pessoais num chat de IA é seguro porque a conversa fica salva apenas no seu navegador.",
            "isTrue": false,
            "explanation": "Falso. O histórico aparecer no seu navegador não significa que o texto parou ali: ele viajou para os servidores do provedor, e retenção, treinamento e compartilhamento dependem da política de dados dele — que muda por produto e por plano. 'Ficou na minha tela' não é 'ficou na minha máquina'."
          },
          {
            "id": "m9l3e4",
            "type": "fill-blank",
            "prompt": "Complete a frase que Bip gravou na placa do portão de neon:",
            "template": "Tratar dado sensível antes do prompt não é responsabilidade do provedor: é {{0}} de quem usa a IA.",
            "banks": [
              { "label": "responsabilidade", "correctSlot": 0 },
              { "label": "sorte", "correctSlot": null },
              { "label": "obrigação técnica", "correctSlot": null },
              { "label": "exigência do modelo", "correctSlot": null }
            ],
            "blanks": 1,
            "explanation": "O provedor pode (ou não) proteger o que chega — mas a decisão do que sai da sua máquina é sua, e acontece antes do envio. Tratar responsabilidade como 'problema do outro' é o atalho mais curto para o vazamento; o protocolo de privacidade começa em quem digita."
          },
          {
            "id": "m9l3e5",
            "type": "swipe",
            "prompt": "Último desafio do protocolo: Bip espalha fichas na mesa do café. Separe o que pode ir para o prompt do que fica fora dele.",
            "swipeRightIf": "ai",
            "rightLabel": "Pode ir pro prompt",
            "leftLabel": "Fora do prompt",
            "items": [
              { "label": "Tutorial público de CSS", "detail": "Texto publicado na web, sem dado pessoal algum", "value": "ai" },
              { "label": "Chave de API do trabalho", "detail": "Credencial de acesso: quem tem, entra", "value": "real" },
              { "label": "Diálogo fictício para praticar inglês", "detail": "Invenção sua, sem pessoas reais", "value": "ai" },
              { "label": "Print com e-mails de clientes", "detail": "Contém dados pessoais identificáveis de terceiros", "value": "real" },
              { "label": "Pergunta sobre como funciona a LGPD", "detail": "Conceito da lei, sem dados de ninguém", "value": "ai" },
              { "label": "Planilha de salários da equipe", "detail": "Dados pessoais e sensíveis de outras pessoas", "value": "real" }
            ],
            "explanation": "Pode ir: material público, invenção sua e conceitos — nada que identifique pessoas ou abra portas de acesso. Fica fora: credenciais e qualquer dado pessoal seu ou de terceiros, mesmo 'só para dar contexto'. Contexto bom é contexto limpo: se a IA não precisa daquele dado para te ajudar, ele não viaja."
          }
        ]
      }
    ]
  },
];
