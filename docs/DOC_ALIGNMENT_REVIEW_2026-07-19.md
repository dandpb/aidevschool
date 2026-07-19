# Revisão de alinhamento da documentação com a ideia central — 2026-07-19

| Campo | Valor |
| --- | --- |
| Status | Análise datada (evidência de um recorte temporal, cf. `DOCUMENTATION.md`) |
| Escopo | Documentação canônica do ecossistema: raiz, `docs/`, `curriculum/`, `learner/`, `engines/` |
| Critério | A ideia central: **democratização do conhecimento e aplicação de IA, de forma simples para pessoas não tecnológicas e também para programadores, por meio de pequenas lições, numa pegada Duolingo** |

## Veredito

**Alinhamento parcial.** A documentação implementa com fidelidade uma *escola pessoal de engenharia
para um aprendiz técnico* — e faz isso muito bem. Mas a metade "democratização + não-técnicos" da
ideia central **não aparece em nenhum documento do repositório**: `grep` por "democratiza",
"não-técnico" e "leigo" retorna zero ocorrências em todos os `.md`. "Duolingo" aparece apenas no
design de spaced-repetition. A causa não é drift dos docs — é que a ideia central evoluiu (de
"me ensine a programar melhor", cf. `docs/PROMPTS/-01_GOAL.md`) e a visão nova nunca foi registrada
em fonte canônica. Pelo próprio fundamento F2 do repo (uma fonte da verdade), uma visão sem arquivo
não existe.

## Avaliação por eixo da ideia central

**1. Pequenas lições — alinhado na estrutura, não na fricção.** A unidade de aprendizado é definida
como átomo pequeno (`learner/CONTEXT.md`), os jogos seguem "1 conceito → 1 mecânica"
(pixelDojo/voxelDojo), e a revisão espaçada FSRS opera sobre unidades pequenas. Porém a lição real
fora dos jogos exige escrever um attempt em Markdown, rodar `pytest`, e passar gates de
coverage/mutation — isso é um *ciclo de estudo*, não uma micro-lição.

**2. Pegada Duolingo — o eixo mais maduro.** `docs/design/spaced-repetition-streak/` é a melhor
peça de alinhamento do repo: mecânicas do Duolingo verificadas por pesquisa (FSRS +12% retenção,
streak, freeze), com exclusão fundamentada de hearts/leaderboards. A trilha de 18 projetos com
dependências (`curriculum/catalog.md`) é um análogo honesto de skill tree. O princípio "mastery só
com evidência executável" é, na prática, o que garante que a "lição concluída" significa algo — um
diferencial real sobre o Duolingo.

**3. Democratização e não-técnicos — ausente.** Todos os docs assumem um único aprendiz técnico
("The single human the ecosystem trains. One learner per ecosystem instance",
`learner/CONTEXT.md`; perfil autodeclarado "intermediário", `learner/learner_profile.md`). O
currículo começa em rate limiter com concorrência (Nível 1) e termina em Raft e search engine —
não há trilha de entrada. O onboarding pede Node 20+, pnpm, Python 3.10+ e opcionalmente Go/Rust.
Não existe nenhum documento voltado a uma pessoa não tecnológica. O doc com maior potencial
democratizador — `docs/FUNDAMENTOS.md` Parte 2 (protocolo de comunicação com IA) — é escrito para
quem já referencia arquivos por caminho.

## Achados por documento

| Documento | Alinhamento | Observação |
| --- | --- | --- |
| `README.md` / `docs/handbook/README.md` | Parcial | Framing correto da escola, mas sem a visão de democratização; leitor não descobre a ideia central em lugar nenhum. |
| `docs/PROMPTS/-01_GOAL.md` | Desatualizado como "foco principal" | Objetivo pessoal ("me ajudar a aprender"); é semente histórica válida, mas era o único registro de intenção — e não contém a ideia central atual. |
| `CONTEXT-MAP.md`, `learner/CONTEXT.md` | Parcial | "One learner per instance" é correto hoje; falta a ponte explícita "instância-piloto de uma visão replicável". |
| `curriculum/catalog.md` | Parcial | Excelente para o público programador; nenhum nível de entrada para não-técnicos, e o gap não é declarado. |
| `docs/FUNDAMENTOS.md` | Parcial | Parte 2 é conteúdo de democratização de IA em essência, mas endereçado só a dev. |
| `docs/design/spaced-repetition-streak/` | **Forte** | Base de pesquisa da pegada Duolingo; único lugar que cita Duolingo. |
| `docs/DOCUMENTATION.md`, `AGENTS.md`, `CLAUDE.md`, docs de engine | N/A → parcial | Corretos no que fazem (governança/operação); apenas não apontavam para nenhuma visão de produto. |
| Análises datadas (`TECH_DEBT_AUDIT`, `DOMAIN_ANALYSIS`, etc.) | Fora de escopo | Evidência histórica; não devem ser editadas (regra do próprio `DOCUMENTATION.md`). |

## Correções aplicadas nesta revisão

1. **`docs/VISION.md` criado** — registra a ideia central como norte canônico de produto, mapeia o
   que já existe a serviço dela e declara as lacunas como lacunas (sem virar promessa de status,
   respeitando a regra "docs-only ideas ≠ implementation status" de `docs/AGENTS.md`).
2. **Ponteiros adicionados** em `README.md`, `CLAUDE.md`, `docs/handbook/README.md` e
   `docs/DOCUMENTATION.md`, para que a visão seja descobrível de qualquer entrada do repo.
3. **Nota de evolução** no topo de `docs/PROMPTS/-01_GOAL.md` apontando para a visão vigente, sem
   reescrever o texto histórico.

## Recomendações que são decisões de produto (não aplicadas)

Estas exigem trabalho real, não edição de docs — registradas aqui para não se perderem: uma trilha
de entrada para não-técnicos (ex.: "aplicar IA no dia a dia" como Nível 0, antes de código); uma
forma de lição de baixa fricção fora dos jogos (hoje só os encounters chegam perto de "5 minutos");
onboarding sem toolchain (os apps exigem instalação — contrasta com o princípio "roda com
duplo-clique" que o Daniel usa em outros projetos); e o caminho de replicação da instância (a visão
"one learner per instance" só democratiza se criar uma instância for trivial).
