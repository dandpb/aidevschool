# Visão — AI DevSchool

| Campo | Valor |
| --- | --- |
| Status | Canônico para intenção de produto (não é estado operacional) |
| Criado | 2026-07-19 · **Decisor:** Daniel |
| Última revisão | 2026-08-21 |
| Relação | Evolui [`docs/PROMPTS/-01_GOAL.md`](PROMPTS/-01_GOAL.md), que permanece como semente histórica |
| Regra | Intenção não prova implementação, domínio ou mastery; os links abaixo apontam para as fontes operacionais. |

## A ideia central

**Democratizar o ensino de IA — de forma simples para pessoas não tecnológicas e
também para programadores — por meio de pequenas lições e assistentes de IA, numa
pegada Duolingo/gamificação, com design em voxel art que ajuda nas explicações.**

Dois públicos, uma mecânica:

| Público | O que aprende | Trilha |
| --- | --- | --- |
| Pessoas não tecnológicas | Aplicar IA no dia a dia: pedir, verificar e decidir com critério | **IA na Prática**: a experiência de microlições sustentada internamente pela trilha [`AI Literacy`](../curriculum/ai-literacy/README.md) e consumida pelo [`LiteracyDojo`](../engines/literacyDojo/README.md) |
| Programadores | Engenharia robusta com IA: testes, review, benchmark e arquitetura | **Trilha Dev**: primeiro capítulo mission-first no codexdojo OS e continuidade nos 18 projetos de código (01–18) em [`curriculum/catalog.md`](../curriculum/catalog.md) |

Esta tabela descreve o destino do produto, não o escopo do release candidate.
O lançamento público entrega **IA na Prática** no LiteracyDojo (14 missões)
e a **Trilha Dev** no CodexDojo OS público (`https://aidevschool-codexdojo-os.netlify.app/?track=dev`):
escolha de trilha, trilho guiado WAREHOUSE → WORMHOLE → RELAY STATION, e Engine Hub
allowlist (voxel 16, PixelQuest, dojoToday local, literacy). Os 18 projetos de
código continuam fora desta oferta.

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
6. **Trilha Dev.** O LiteracyDojo avulso aponta para o OS público com
   `?track=dev`. No OS, o trilho guiado é WAREHOUSE → WORMHOLE → RELAY STATION;
   as outras simulações voxel ficam no Engine Hub, não no trilho. Conclusão
   local não é `mastered`.
7. **Lançamento.** LiteracyDojo (IA na Prática) e CodexDojo OS (escolha de
   trilha + Hub allowlist) são as URLs públicas. Use cases Dev em
   product-readiness permanecem `stale` até assessment fresco — não são
   customer-ready só porque a URL existe.
8. **Progresso.** Sem conta, onboarding, conclusão, XP, meta diária, sequência e
   conquistas ficam neste navegador. Esses dados locais não sincronizam entre
   dispositivos e não podem representar `mastered`.
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

- **No piloto separado, uma entrada mission-first para os dois públicos:** o
  codexdojo OS recomenda
  uma trilha ajustável, executa três missões prontas por trilha e preserva a
  troca de trilha, o retorno e o progresso local no mesmo dispositivo. O
  desktop e o Engine Hub continuam acessíveis como superfícies secundárias.
- **Contratos de execução sem autoridade implícita:** LiteracyDojo e os três
  jogos Dev usam envelopes correlacionados e origin-bound para estado,
  evidência e renderer. Evidência bruta, recibo independente, gate canônico e
  analytics permanecem registros separados.
- **Mentoria e voxel com degradação segura:** o coach contextual não recebe
  ferramentas e cai para orientação determinística; missões Dev preservam
  simulação e critérios em uma projeção sem WebGL e com movimento reduzido.
- **Uma trilha real para pessoas não técnicas:** **IA na Prática** é o nome da
  experiência para o aprendiz; **AI Literacy** mantém o conteúdo canônico e o
  LiteracyDojo oferece o player guiado. O currículo ligado é a
  autoridade para quantidade e status do conteúdo; o README do engine é a
  autoridade para implementação e release.
- **Lições pequenas por definição:** a unidade de aprendizado é um átomo
  (conceito, smell, padrão —
  [`learner/CONTEXT.md`](../learner/CONTEXT.md)); no LiteracyDojo, uma
  microlição dura 3–5 minutos; nos jogos, um conceito vira uma mecânica.
- **Mecânica Duolingo/gamificação com base em pesquisa:** o substrato compartilhado já usa
  FSRS, streak, freeze e sinais de XP nas superfícies de microlição; hearts e leaderboards
  foram excluídos por evidência (não contam como mastery).
  O [design de revisão e streak](design/spaced-repetition-streak/README.md)
  define a direção; o README do LiteracyDojo mantém os critérios atuais de
  release.
- **Trilhas com dependências:** o catálogo numerado tem 19 entradas (00–18),
  das quais 18 são projetos de programação; AI Literacy mantém sua própria
  trilha de microlições dentro do currículo compartilhado.
- **Integridade da lição:** learning gate + verificador independente + evidência
  adequada ao gate. Código exige checks executáveis; Nível 0 usa o checklist
  falsificável rotulado do ADR-0004.

## Lacunas (estado re-verificado em 2026-07-25)

Cada item abaixo foi re-checado no mesmo estado do repositório. Itens
**resolvidos** apontam evidência operacional; residual honesto permanece onde a
democratização ainda não cobre o ecossistema inteiro.

1. **Release do LiteracyDojo (MVP IA na Prática) — resolvida para o player.**
   No estado atual do repo, `engines/literacyDojo/` passa lint, testes unitários,
   build e E2E (`npm run lint|test|build|test:e2e`). Critérios de release do
   README do engine e tickets do MVP (`tickets.md`) estão verdes neste corte.
   Evidência: README operacional do engine + suíte local re-executada. Residual:
   isto **não** certifica o ecossistema multi-engine inteiro (pixel/voxel/tutor
   core), só a superfície de microaprendizagem não técnica.

2. **Entrada pública no navegador (sem install/conta) — resolvida apenas para
   LiteracyDojo.** URL de produção documentada e verificável:
   <https://aidevschool-literacydojo.netlify.app> (HTTP 200, shell
   `LiteracyDojo — IA com confiança no trabalho`). Progresso é local
   (IndexedDB neste navegador), sem conta obrigatória; o limite é comunicado no
   produto. Residual: o host mission-first unificado, **miniTown** e o catálogo
   amplo de programação ainda não têm URL pública oficial verificada neste
   documento.

3. **Evidência no-code independente — julgamento resolvido; promoção canônica
   pendente.** O producer (LiteracyDojo) emite
   `LiteracyEvidenceRecord` e registra no máximo `completed` — nunca
   `mastered` (`LessonStatus` sem o valor). O verificador independente vive em
   `learner/gate/literacy_verifier.py` e CLI
`python3 -m learner.gate.literacy_verifier --evidence PATH`: re-julga o envelope,
   emite recibo estruturado (`verdict`, `mastery_eligible`,
   `producer_writes_mastered: false`) e falha fechado se a evidência faltar, for
   inválida ou não ficar `mastery_eligible`. O julgamento independente existe e
   é testado, mas ainda não promove AI Literacy a `mastered`: qualquer promoção
   futura deve passar pelo limite canônico `verify_and_gate` /
   `commit_gate_transition`, que persiste `learner/learning_state.yaml`, em vez
   de criar outro registro autoritativo.

4. **Contas e sincronização entre dispositivos — pendentes.** O host preserva
   continuidade local no mesmo navegador, mas não oferece conta obrigatória,
   identidade remota ou sincronização entre dispositivos.

5. **Catálogo amplo — pendente.** O host publica seis missões no primeiro
   capítulo (três por trilha). As demais lições e projetos continuam canônicos,
   mas não devem ser descritos como missões integradas antes de receber binding,
   fallback, evidência e verificação equivalentes.

6. **Estado canônico multi-learner — pendente.** A replicação de uma instância
   filesystem é automatizada por `python3 -m learner.new_instance --name "Jane"
   --id jane`, sem herdar mastery e com views regeneradas. Isso não transforma
   `learner/learning_state.yaml` em um serviço multi-tenant nem conecta o
   progresso IndexedDB de várias pessoas ao gate canônico.

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

Decisões estruturais ainda abertas (não bloqueiam o primeiro capítulo local):

1. **miniTown público.** Se/when publicar a entrada cozy zero-install (hoje
   residual local). LiteracyDojo já tem URL de produção.
2. **Mastery canônico no-code no substrate.** Quando e como um recibo
`learner.gate.literacy_verifier` promove unidades AI Literacy em
   `learner/learning_state.yaml` sem misturar com o gate de código — o
   julgamento independente já existe; a promoção canônica multi-engine não.
3. **Replicação multi-learner do filesystem.** Contas, sincronização entre
   dispositivos e serviço canônico multi-tenant permanecem fora do primeiro
   lançamento.

Para o audit detalhado de engines/curriculum/agents vs. esta visão, ver
[`docs/AUDIT_ENGINES_CURRICULUM_2026-07-19.md`](AUDIT_ENGINES_CURRICULUM_2026-07-19.md) (draft
para revisão).
