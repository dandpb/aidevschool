# Visão — AI DevSchool

| Campo | Valor |
| --- | --- |
| Status | Canônico para intenção de produto (não é estado operacional) |
| Criado | 2026-07-19 · **Decisor:** Daniel |
| Última revisão | 2026-07-19 |
| Relação | Evolui [`docs/PROMPTS/-01_GOAL.md`](PROMPTS/-01_GOAL.md), que permanece como semente histórica |
| Regra | Intenção não prova implementação, domínio ou mastery; os links abaixo apontam para as fontes operacionais. |

## A ideia central

**Democratizar o conhecimento e a aplicação de IA — de forma simples para pessoas não
tecnológicas e também para programadores — por meio de pequenas lições, numa pegada Duolingo.**

Dois públicos, uma mecânica:

| Público | O que aprende | Trilha |
| --- | --- | --- |
| Pessoas não tecnológicas | Aplicar IA no dia a dia: pedir, verificar e decidir com critério | **IA na Prática**: a experiência de microlições sustentada internamente pela trilha [`AI Literacy`](../curriculum/ai-literacy/README.md) e consumida pelo [`LiteracyDojo`](../engines/literacyDojo/README.md) |
| Programadores | Engenharia robusta com IA: testes, review, benchmark e arquitetura | Os 18 projetos de código (01–18) em [`curriculum/catalog.md`](../curriculum/catalog.md) |

O que não muda entre públicos está no
[`contrato de microlição`](design/micro-lesson-contract.md): objetivo curto,
tentativa, feedback, dica, nova tentativa, evidência e revisão. A regra de ouro
continua: **uma lição só conta como dominada com evidência adequada e um
verificador independente**, nunca por autoavaliação ou opinião de modelo. É
isso que separa esta escola de um app de trivia.

## Fluxo mínimo do MVP

1. **Mapa Inicial.** Antes da primeira microlição, a pessoa informa o objetivo,
   compara duas respostas de IA para uma situação cotidiana e justifica qual é
   mais confiável. A primeira lição recomendada reaproveita esse resultado; o
   Mapa Inicial orienta a experiência, não é evidência de domínio.
2. **Primeiro valor.** A pessoa conclui uma microlição de 3–5 minutos e sai com
   uma ação aplicável ao seu contexto.
3. **Roteiro Inicial Adaptativo.** O resultado do Mapa Inicial altera a próxima
   lição e o nível de ajuda: iniciantes seguem uma rota mais guiada; quem já
   demonstra critério avança para entendimento e avaliação de IA. O MVP
   reaproveita as microlições existentes, sem criar conteúdo paralelo. A
   resposta prática escolhe a rota; a autoconfiança só ajusta o tom e as dicas.
   Acerto na primeira tentativa inicia a rota intermediária; erro, dica ou nova
   tentativa inicia a rota guiada.
4. **Ordem de entrada.** A comparação é independente como Mapa Inicial; “Sua
   primeira conversa com uma IA” torna-se o primeiro passo apenas da rota
   guiada.
5. **Convergência.** A rota guiada segue Mapa Inicial → primeira conversa →
   limites da IA; a intermediária segue Mapa Inicial → limites da IA. Ambas
   convergem em como formular pedidos melhores.
6. **Trilha Dev.** Ela aparece na entrada como um próximo caminho, marcada como
   “em breve”; o MVP não cria um segundo fluxo de progresso nem promete acesso
   antes de estar pronto.
7. **Lançamento.** O MVP abre por link no navegador, sem instalação nem conta
   obrigatória, para que pessoas não técnicas possam testá-lo de verdade.
8. **Progresso.** Sem conta no MVP, o progresso fica neste navegador e esse
   limite é comunicado claramente à pessoa.
9. **Acolhimento.** Antes do Mapa Inicial, a pessoa recebe uma apresentação
   breve, informa onde quer aplicar IA e entende que ela pode ajudar a
   organizar, resumir, criar rascunhos, comparar opções e planejar passos —
   sem substituir seu julgamento.
10. **Primeira ação.** A pessoa escolhe uma categoria de tarefa, sem texto livre
    ou dados pessoais, como agendamento, comunicação ou busca de notícias. A
    escolha contextualiza a primeira aplicação prática.
11. **Linguagem.** A entrada apresenta um “assistente de IA”; automações e
    agentes são conceitos posteriores, não uma promessa do primeiro contato.
12. **Experiência.** Microlições, progresso e feedback usam uma apresentação
    bonita e lúdica. Ilustrações em voxel art explicam ideias e situações, sem
    exigir que a pessoa entenda tecnologia para aproveitar a experiência.

`Mapa Inicial` não é o **Diagnostic** de uma unidade de programação: este último
continua sendo um desafio do learning gate, com regras próprias de tentativa e
verificação.

O escopo e os critérios de aceite do MVP estão em
[`MVP IA na Prática`](plans/MVP_IA_NA_PRATICA_2026-07-25.md).

## O que já existe a serviço da visão

- **Uma trilha real para pessoas não técnicas:** **IA na Prática** é o nome da
  experiência para o aprendiz; **AI Literacy** mantém o conteúdo canônico e o
  LiteracyDojo oferece o player guiado. O currículo ligado é a
  autoridade para quantidade e status do conteúdo; o README do engine é a
  autoridade para implementação e release.
- **Lições pequenas por definição:** a unidade de aprendizado é um átomo
  (conceito, smell, padrão —
  [`learner/CONTEXT.md`](../learner/CONTEXT.md)); no LiteracyDojo, uma
  microlição dura 3–5 minutos; nos jogos, um conceito vira uma mecânica.
- **Mecânica Duolingo com base em pesquisa:** o substrato compartilhado já usa
  FSRS, streak e freeze; hearts e leaderboards foram excluídos por evidência.
  O [design de revisão e streak](design/spaced-repetition-streak/README.md)
  define a direção; o README do LiteracyDojo mantém os critérios atuais de
  release.
- **Trilhas com dependências:** o catálogo numerado tem 19 entradas (00–18),
  das quais 18 são projetos de programação; AI Literacy mantém sua própria
  trilha de microlições dentro do currículo compartilhado.
- **Integridade da lição:** learning gate + verificador independente + evidência
  adequada ao gate. Código exige checks executáveis; Nível 0 usa o checklist
  falsificável rotulado do ADR-0004.

## Lacunas (o que a visão pede e ainda não existe)

Registradas como lacunas, não como promessas nem como status:

1. **Release completa do LiteracyDojo.** O engine só pode ser anunciado como
   release quando satisfizer, no mesmo estado do repositório, todos os critérios
   mantidos em seu README. Esta visão não replica o status operacional.
2. **Onboarding simples.** O LiteracyDojo e o miniTown ainda exigem preparação
   local. Não há um link público oficial em que uma pessoa apenas abra o
   navegador e comece a aprender.
3. **Evidência no-code independente.** O progresso local do LiteracyDojo para em
   `completed`; a promoção a `mastered` ainda precisa de um verificador
   independente adequado às atividades não técnicas.
4. **Replicação da instância.** Hoje é "one learner per ecosystem instance", com o Daniel como
   learner 0. A visão só se cumpre se criar uma instância para outra pessoa for trivial.

## Como ler o resto da documentação à luz deste doc

O ecossistema atual é a **instância-piloto** da visão. "One learner, one curriculum, many engines"
descreve a instância — não o limite da ideia. Quando um doc parecer assumir "isto é só para o
Daniel" ou "só para devs", a leitura correta é: *é o estágio atual, provando a mecânica que depois
se abre para os dois públicos*.

## Duas entradas não técnicas, dois papéis

**`engines/literacyDojo/` é a superfície de microaprendizagem.** Ela consome o
conteúdo canônico de `curriculum/ai-literacy/`, oferece tentativas e feedback
determinísticos e registra no máximo `completed` no navegador. Seu README
mantém o status operacional vigente.

**`engines/miniTown/` é a entrada cozy de exploração** (AD-004 em
`.specs/STATE.md`). O simulador não exige código, mas também não é o player das
14 microlições. Ele nunca marca mastery nem escreve estado canônico.

**A trilha não-técnica vive no mesmo catálogo** (AD-005): `curriculum/00_ai_in_practice/`,
projeto 00 / Nível 0 em `curriculum/catalog.md` — preservando "1 aprendiz, 1 currículo,
vários motores". Unidades dessa trilha usam o gate no-code (AD-006).

## Próximas decisões pendentes

Estas decisões mudam a estrutura do repo. Não estão tomadas. São registradas aqui pra não se
perderem entre revisões.

1. **Entrada pelo navegador.** Definir onde publicar o LiteracyDojo e o
   miniTown, como versionar conteúdo e como comunicar o status da release.
2. **Verificação no-code.** Definir o verificador e a evidência mínima para
   transformar aplicação real em competência verificada.
3. **Replicação da instância.** Hoje "one learner per instance" + setup manual =
   democratização-zero. Visão se cumpre quando uma segunda pessoa roda a escola com um
   comando.

Para o audit detalhado de engines/curriculum/agents vs. esta visão, ver
[`docs/AUDIT_ENGINES_CURRICULUM_2026-07-19.md`](AUDIT_ENGINES_CURRICULUM_2026-07-19.md) (draft
para revisão).
