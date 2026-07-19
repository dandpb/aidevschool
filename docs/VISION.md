# Visão — AI DevSchool

| Campo | Valor |
| --- | --- |
| Status | Canônico para intenção de produto (não é estado operacional) |
| Criado | 2026-07-19 · **Decisor:** Daniel |
| Relação | Evolui [`docs/PROMPTS/-01_GOAL.md`](PROMPTS/-01_GOAL.md), que permanece como semente histórica |
| Regra | Este doc registra intenção. Nunca declara status de implementação, domínio ou mastery (cf. [`docs/AGENTS.md`](AGENTS.md)). |

## A ideia central

**Democratizar o conhecimento e a aplicação de IA — de forma simples para pessoas não
tecnológicas e também para programadores — por meio de pequenas lições, numa pegada Duolingo.**

Dois públicos, uma mecânica:

| Público | O que aprende | Trilha |
| --- | --- | --- |
| Pessoas não tecnológicas | Aplicar IA no dia a dia: como pedir, verificar e desconfiar do que a IA entrega | Nível 0: [`curriculum/00_ai_in_practice/`](../curriculum/00_ai_in_practice/docs/spec.md) (status `planned`) + [`engines/miniTown/`](../engines/miniTown/README.md) |
| Programadores | Engenharia robusta com IA: testes, review, benchmark, arquitetura | Os 18 projetos de [`curriculum/catalog.md`](../curriculum/catalog.md) |

O que não muda entre públicos: lições pequenas, revisão espaçada, streak — e a regra de ouro do
ecossistema: **uma lição só conta como dominada com evidência executável**, nunca por autoavaliação
ou opinião de modelo. É isso que separa esta escola de um app de trivia.

## O que já existe a serviço da visão

- **Lições pequenas por definição:** a unidade de aprendizado é um átomo (conceito, smell, padrão —
  [`learner/CONTEXT.md`](../learner/CONTEXT.md)); nos jogos, 1 conceito → 1 mecânica
  (pixelDojo/voxelDojo).
- **Mecânica Duolingo com base em pesquisa:** FSRS, streak e freeze confirmados; hearts e
  leaderboards excluídos por evidência
  ([`docs/design/spaced-repetition-streak/`](design/spaced-repetition-streak/README.md)).
- **Trilha com dependências:** o catálogo de 19 projetos (00–18) funciona como skill tree honesta.
- **Integridade da lição:** learning gate + verificador independente + evidência executável — a
  garantia de que "concluído" significa algo.

## Lacunas (o que a visão pede e ainda não existe)

Registradas como lacunas, não como promessas nem como status:

1. **Trilha de entrada para não-técnicos.** Identidade criada em 2026-07-19:
   [`curriculum/00_ai_in_practice/`](../curriculum/00_ai_in_practice/docs/spec.md) (Nível 0,
   status `planned`, gate no-code ADR-0004). O que falta: as unidades reais de lição — a
   Parte 2 de [`FUNDAMENTOS.md`](FUNDAMENTOS.md) é o embrião do conteúdo.
2. **Lição de baixa fricção fora dos jogos.** Attempt em Markdown + pytest + gates é um ciclo de
   estudo, não uma micro-lição de 5 minutos. Só os encounters dos jogos chegam perto do formato
   Duolingo hoje.
3. **Onboarding simples.** Primeiro passo: `./setup.sh onboard` prepara só o miniTown
   (deploy estático: `engines/miniTown/netlify.toml`). Rodar a escola completa ainda exige
   Node, pnpm e Python (e Go/Rust para o polyglot) — "abre e funciona" segue como meta.
4. **Replicação da instância.** Hoje é "one learner per ecosystem instance", com o Daniel como
   learner 0. A visão só se cumpre se criar uma instância para outra pessoa for trivial.

## Como ler o resto da documentação à luz deste doc

O ecossistema atual é a **instância-piloto** da visão. "One learner, one curriculum, many engines"
descreve a instância — não o limite da ideia. Quando um doc parecer assumir "isto é só para o
Daniel" ou "só para devs", a leitura correta é: *é o estágio atual, provando a mecânica que depois
se abre para os dois públicos*.

## O motor do Nível 0: miniTown (decidido 2026-07-19)

**`engines/miniTown/` é a entrada cozy oficial do público não-técnico** (AD-004 em
`.specs/STATE.md`). Simulador observacional de cidade (Townscaper + A Short Hike), sem menus e
sem pré-requisito de código — a estética que uma pessoa não-técnica reconhece como "posso mexer
sem medo". Está inventariado em `engines/AGENTS.md`, no MANIFEST do codexDojo e no handbook
(`docs/handbook/11_engine_miniTown.md`). Ele nunca marca mastery: é superfície de exploração;
o gate continua com o verificador.

**A trilha não-técnica vive no mesmo catálogo** (AD-005): `curriculum/00_ai_in_practice/`,
projeto 00 / Nível 0 em `curriculum/catalog.md` — preservando "1 aprendiz, 1 currículo,
vários motores". Unidades dessa trilha usam o gate no-code (AD-006).

## Próximas decisões pendentes (não decididas)

Estas decisões mudam a estrutura do repo. Não estão tomadas. São registradas aqui pra não se
perderem entre revisões.

3. **Onboarding zero-install.** Primeiro passo dado (2026-07-19): `./setup.sh onboard`
   prepara só o miniTown, e `engines/miniTown/netlify.toml` define o deploy estático (build
   do HEAD verificado limpo). O que falta decidir: publicar o link público oficial e
   empacotar as lições junto — "abrir no browser sem instalar nada" ainda não é verdade.
4. **Replicação da instância.** Hoje "one learner per instance" + setup manual =
   democratização-zero. Visão se cumpre quando uma segunda pessoa roda a escola com um
   comando.

Para o audit detalhado de engines/curriculum/agents vs. esta visão, ver
[`docs/AUDIT_ENGINES_CURRICULUM_2026-07-19.md`](AUDIT_ENGINES_CURRICULUM_2026-07-19.md) (draft
para revisão).
