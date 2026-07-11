# ADR-0001: Adopt `docs/FUNDAMENTOS.md` as canonical principles and `architecture-weed` as the review loop

> **Nota de caminho atual (2026-07-11):** este ADR preserva os caminhos do momento da decisão. O
> verificador criado originalmente sob o namespace Pixel agora vive em
> `learner/gate/` e é executado com `python3 -m learner.gate`; persistência passa pela API atômica
> `learner.substrate.gate`.

- **Status:** Accepted
- **Date:** 2026-07-05
- **Decisor:** Daniel (with `architecture-weed` loop, this run)
- **Principles cited:** F1 (contrato antes de código), F2 (fonte única, views derivadas), F3 (produtor ≠ verificador), F4 (estado auditável), F5 (fatia vertical antes de escala), F6 (gates empíricos), F7 (falha visível), F8 (simplicidade como passo obrigatório)

## Contexto

Em 2026-07-05 o ecossistema produziu dois artefatos no mesmo dia que, juntos, fecham um buraco
estrutural antigo:

1. **`docs/FUNDAMENTOS.md`** (Accepted, 2026-07-05, 108 linhas) — 8 princípios (F1–F8) + protocolo
   de comunicação com IA (anatomia do pedido, 7 regras de conduta, ADR-lite template, tabela de
   anti-padrões). É a primeira vez que os princípios ficam em um único lugar, citáveis por F-id,
   com provas ancoradas no histórico (`docs/ARCHITECTURE_EVALUATION_2026-07-05.md`).
2. **A correção dos gaps 1, 2, 5, 6** registrada em `ARCHITECTURE_EVALUATION_2026-07-05.md`
   (reversão das 18 masterizações semeadas, criação do verifier em
   um verifier inicialmente namespaced sob Pixel, primeiro loop real fechado em U0 com 1 entrada legítima em
   `units_log`, atualização do `CLAUDE.md` raiz com 6 engines).

O que ainda falta: o FUNDAMENTOS.md é um documento aceito por Daniel, mas não há (a) um ADR
formalizando a adoção pelo sistema, (b) um processo recorrente que impeça a próxima erosão, e
(c) o link de `AGENTS.md` e `engines/codexDojo/ecosystem/MANIFEST.md` para ele. Sem isso, o
próximo ciclo de drift começa agora e o doc vira referência histórica em vez de ferramenta.

## Opções

| Opção | Complexidade | Custo agora | Familiaridade | Reversibilidade |
| --- | --- | --- | --- | --- |
| **A. Status quo** — FUNDAMENTOS.md existe, mas sem ADR nem loop | Baixa | Zero | Alta (é o que temos hoje) | n/a |
| **B. Só ADR** — formaliza o doc mas não cria processo de revisão | Baixa | 1 ADR | Alta | Média (doc vira fonte mas drift acumula) |
| **C. Só loop** — loop sem princípio canônico, vira revisão ad-hoc | Média | 1 skill + memória | Média | Alta (loop pode citar F-ids inventados) |
| **D. ADR + loop (escolhida)** — formaliza a fonte e o processo numa só decisão | Média | 1 ADR + 1 skill + memória inicial | Alta (espelha o padrão `.claude/skills/threejs-dojo/`) | Alta (deprecate cada peça com 1 ADR) |

## Decisão

**Opção D.** Adotamos `docs/FUNDAMENTOS.md` como documento canônico de princípios de
arquitetura e o loop `architecture-weed` (`.claude/skills/architecture-weed/SKILL.md`,
`.loops/architecture-weed/memory.md`) como o processo recorrente que produz ADRs
testando decisões contra esses princípios.

A formalização tem três partes:

1. **FUNDAMENTOS.md é fonte de verdade.** Toda ADR futura cita princípios por F-id
   (F1, F2, …, F8) em vez de re-explicá-los. `AGENTS.md` passa a referenciá-lo no índice
   de "Where to look". `engines/codexDojo/ecosystem/MANIFEST.md` passa a listá-lo na seção
   de contratos canônicos.
2. **Loop `architecture-weed` é o processo.** Produz 1 ADR por run, em MADR-lite, com
   verifier fresh-context ≥ 8/10. Cadência on-demand enquanto o substrate estiver em
   movimento; re-avaliar para semanal após 3 runs limpos.
3. **ADRs vivem em `docs/design/adr/`.** Arquivo nomeado `NNNN-<slug>.md`. Numeração
   sequencial. ADRs passados não são editados — substituição via novo ADR com
   `Superseded-by ADR-NNNN`.

## Consequências

**Fica mais fácil:**

- Detectar drift cedo (loop varre `engines/`, `learner/`, `curriculum/`, `.mavis/` toda
  run contra os 8 princípios).
- Novos contribuidores (humanos ou agentes) encontram os princípios em um só lugar,
  citáveis por F-id.
- O verifier do `architecture-weed` é a primeira execução real de "produtor ≠ verificador"
  aplicada à própria arquitetura — espelha o padrão que o `pixelDojo/verifier` já fez
  para o learning gate (F3 em dois lugares).
- Auditoria: cada decisão arquitetural tem timestamp, princípio citado, e evidência
  file:line — `git log` resolve "por que X é assim?".

**Fica mais difícil:**

- Toda afirmação arquitetural agora precisa de F-id ou fica visivelmente fora do
  framework. Resistência esperada: "isso é óbvio" ou "F1 não se aplica aqui" — ambos
  viram ADR de exceção em vez de atalho.
- O loop vai produzir ADRs que ratificam o que já é fato (como esta). Isso é intencional
  (F4 — estado auditável) mas parece trabalho extra no começo.
- Training Mode ON: o loop pausa antes de cada step até ter 3 runs limpos. Aceitável;
  é o investimento para poder rodar autônomo depois.

**Revisitar quando:**

- Os contratos do substrato mudarem (novo engine, novo campo de learner-state, novo
  tipo de evidência) → FUNDAMENTOS.md pode precisar de F9 e ADR de extensão.
- 3 runs consecutivas voltarem sem divergência consequente → considerar (a) ampliar
  o escaneamento (incluir `docs/PROMPTS/IDEIAS/`, docs internos de engines), ou
  (b) cadenciar a cada 2 semanas em vez de on-demand.
- O openclaw amadurecer o suficiente para automatizar a varredura → ADR-0002 pode
  propor loop com trigger de arquivo em vez de on-demand.
- O FUNDAMENTOS.md tiver revisão material → escrever ADR-0002 com
  `Superseded-by` mapeando os 8 princípios v2.

## Evidência

- `docs/FUNDAMENTOS.md` — princípios canônicos (Accepted, 2026-07-05, decisor Daniel).
- `docs/ARCHITECTURE_EVALUATION_2026-07-05.md` — gap analysis do dia, 4 de 6 gaps
  fechados na mesma sessão (linhas 32–78).
- `learner/learning_state.yaml` — estado pós-correção (masterizações semeadas removidas).
- localização histórica sob Pixel — verificador criado para fechar GAP 2 (17 testes
  passando).
- `.claude/skills/threejs-dojo/SKILL.md` — convenção de skill já existente que esta
  decisão espelha.
- `learner/pipeline_status.md` — GAP 3 ainda aberto (ciclo 01 parado em `impl-done`),
  registrado aqui para a próxima run do loop atacar.
