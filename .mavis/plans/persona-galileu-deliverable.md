# Deliverable — persona Galileu (laboratório + arquitetura)

## Summary
Criei `agent.md` (7 seções) e `PERSONA.md` (6 seções) para o papel
**Galileu** (laboratório + arquitetura) do ÁGORA Continuum, em dois
lugares complementares: a versão **Mavis runtime**
(`~/.mavis/agents/galileu/`) e a versão **motor dojo**
(`engines/minimaxDojo/agents/10_galileu/`). Modelo **opus**; rigor
estatístico (≥ 10 amostras, warmup 500+, mediana + média + mínimo +
CV% < 20%); ADRs em **MADR** (≥ 2 alternativas, ≥ 1 rejeitada
explicitamente, consequências negativas, fitness function executável);
**default = monolito modular**; alerta ativo contra o anti-padrão
**Monolito Distribuído**; contexto isolado (sem narrativa pedagógica);
cross-model (opus ↔ sonnet) obrigatório em alegação consequente.

## Changed files

### Criados
1. `~/.mavis/agents/galileu/agent.md` — **190 linhas, 7 seções H2**
   (Voz & registro · Disciplina de evidência · Limites · Gestão de
   estado · Disciplina assíncrona · Memória · Ambiguidade).
2. `~/.mavis/agents/galileu/PERSONA.md` — **338 linhas, 6 seções H2
   top-level** (Identity & mission · Activation triggers · Workflow ·
   Mental models you bring · Anti-patterns · Voz & saídas padrão). 8
   H2 adicionais aparecem dentro do **fenced code block** que mostra
   o template MADR (## Context, ## Decision Drivers, ## Considered
   Options, ## Decision Outcome, ## Pros and Cons, ## Anti-padrão
   check, ## Fitness Function, ## More Information) — não são seções
   reais, mesmo padrão documentado no deliverable da Mneme.
3. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/10_galileu/agent.md`
   — **201 linhas, 7 seções H2** (mesma estrutura do #1, com overlay
   do dojo: paths relativos, referências a `prompts/per_agent/galileu.md`
   e `docs/04_empirical_gates.md`, gate "isolation" explícito em State
   management).
4. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/10_galileu/PERSONA.md`
   — **338 linhas, 6 seções H2 top-level** (mesma estrutura do #2,
   com Activation triggers marcados "(dojo)" e cross-referências a
   `01_maestro` / `04_cartografo` / `05_mestre_conteudo` /
   `08_promotor` / `09_critico` / `14_seneca`).

### Não tocados (já existiam)
- `engines/minimaxDojo/agents/10_galileu/README.md` — 14 linhas com
  resumo curto ("Laboratório + arquitetura — benchmarks com rigor
  estatístico, ADRs em MADR, fitness functions. Default = monolito
  modular. **Modelo sugerido:** opus").
- `engines/minimaxDojo/prompts/per_agent/galileu.md` — system prompt
  canônico (222 linhas) já completo e referenciado pelo engine
  `agent.md` / `PERSONA.md`.

## Estrutura

### `agent.md` (7 seções — espelha `cartografo/agent.md`)
1. **Voz & registro** — pt-BR; engenheiro empírico, não coach;
   advogado do **número**; recusa ADR com 1 alternativa e benchmark
   com CV% alto com a frase exata, sem hedging.
2. **Disciplina de evidência** — thresholds canônicos (amostras ≥ 10,
   warmup ≥ 500, **CV% < 20%**); bloqueio automático com frase
   canônica; tabela `Métrica | Valor | Threshold | Status`
   obrigatória; ADR MADR com ≥ 2 alternativas + ≥ 1 rejeitada +
   consequências negativas + fitness function; **4 sinais de
   Monolito Distribuído** explícitos.
3. **Limites (não saia da raia)** — não escreve código de produção;
   não fecha o próprio portão; **não vê narrativa pedagógica**;
   não prescreve arquitetura por gosto; não sugere distribuição
   sem evidência; não aceita fitness function que nunca falha;
   boundary explícita vs. `coder`, `promotor`, `critico`,
   `cartografo`, `maestro`.
4. **Gestão de estado** — paths canônicos
   (`engines/minimaxDojo/whiteboard/benchmarks/U-NNN.bench.md`,
   `whiteboard/decisions/ADR-NNNN-titulo.md`,
   `<repo>/tests/perf/`); atomicidade por artefato; owner field;
   **contexto isolado explícito** (vê código+workload+pergunta+ambiente+DoD;
   não vê trilha, unidades dominadas, histórico do aluno).
5. **Disciplina assíncrona** — benchmark noturno via `mavis cron
   self`; cross-model em paralelo; Sêneca 24h para ADR estrutural;
   Sêneca imediato para risco de segurança/irreversibilidade.
6. **Memória** — 3 camadas (project → agent → user) com guard
   contra especificidade do projeto vazar; núcleo curado pequeno.
7. **Ambiguidade** — default monolito modular; zona cinzenta
   15–20% CV% (pedir mais rodadas); ADR com 1 alternativa = voto
   (rejeitar); alerta ativo de Monolito Distribuído (seção
   explícita obrigatória); prosa inline em vez de `ask_user`.

### `PERSONA.md` (6 seções top-level — espelha `cartografo/PERSONA.md`)
1. **Identity & mission** — Galileu = método experimental; 3 modos
   de operação (Benchmark / ADR / Fitness function); restrições
   inegociáveis; produto (números + decisões + testes que falham);
   não decide se unidade está dominada (é o `promotor`).
2. **Activation triggers** — tabela de 6 gatilhos (U-008/U-009,
   library com impacto de perf, ADR solicitado, fitness function no
   pipeline, sinal de Monolito Distribuído, benchmark de feature);
   6 não-invocações (ensinar → mestre_conteudo, decidir dominado
   → promotor, trilhar → cartografo, code review → critico, etc.).
3. **Workflow** — 3 modos detalhados:
   - **Benchmark (5 passos):** definir 6 campos (métrica, workload,
     baseline, variante, ambiente, threshold), harness por stack
     (pytest-benchmark, go test -count=10, cargo Criterion, vitest
     bench, hyperfine), tabela de estatísticas (mediana + média +
     mínimo + CV% obrigatórios), **bloqueio por CV% com 3 zonas**
     (CV% > 20% = fim; 15–20% = pedir mais; ≤ 15% = publicável).
   - **ADR (MADR):** template completo com Deciders, Context,
     Decision Drivers, Considered Options (≥ 2), Decision Outcome,
     Positive/Negative Consequences, Pros/Cons of each option
     (incluindo **PORQUÊ foi rejeitada**), Anti-padrão check
     (Monolito Distribuído), Fitness Function (executável, que
     falha), More Information.
   - **Fitness function:** exemplos em Python (pytest-benchmark),
     Go, TypeScript (Vitest bench); assertion real, copy-pasteável,
     que **falha** se atributo regredir.
4. **Mental models you bring** — rigidez estatística (sem números,
   sem afirmação); MADR (alternativas + consequências + fitness);
   fitness functions (Neal Ford); **default = monolito modular**
   (Newman, Brown); anti-padrão Monolito Distribuído (Lewis &
   Fowler); produtor ≠ verificador; ceteris paribus (1 variável
   por vez); defense in depth.
5. **Anti-patterns** — 12 itens em "❌" cobrindo: "X é mais rápido"
   sem CV% < 20%, pular warmup, < 10 amostras, sugerir
   microsserviço sem evidência, ADR com 1 alternativa, ADR sem
   consequências negativas, fitness function que nunca falha,
   aceitar "parece bom", violar ceteris paribus, ignorar Monolito
   Distribuído, misturar papéis, ver contexto pedagógico.
6. **Voz & saídas padrão** — engenheiro empírico, voz do número
   ("CV% = 27% (limite 20%). Mais amostras."), sem floreio; linha
   segura = CV% < 20% + ≥ 2 alternativas no ADR + fitness
   function que falha. **Saídas padrão** consolidadas como
   sub-seção: paths canônicos para `bench.md` / `ADR-NNNN` /
   `<repo>/tests/perf/<atributo>.py`; `recomendação_maestro{}`
   no `bench.md`; Sêneca 24h com comando + trade-off + SLA.

> Nota: a antiga seção "Saída" (7ª H2) foi **fundida** em "Voz & saídas
> padrão" para fechar o budget de 6 seções top-level — os paths
> canônicos aparecem como sub-seção dentro da Voz, em vez de H2
> separada. Conteúdo preservado integralmente.

## Verificação pré-entrega

- [x] **4 arquivos** criados nos 4 caminhos solicitados.
- [x] **Estrutura 7+6** — `agent.md` com 7 `## ` em ambos os pares;
      `PERSONA.md` com 6 `## ` top-level em ambos os pares (8 H2
      adicionais estão dentro do fenced code block do template MADR,
      mesmo padrão da Mneme).
- [x] **pt-BR** — corpo em português, identificadores técnicos
      (paths, comandos CLI, métricas, ferramentas) em forma nativa.
- [x] **Modelo opus** documentado no intro dos 4 arquivos; cross-model
      opus ↔ sonnet obrigatório em alegação consequente.
- [x] **CV% < 20% gate** explícito: frase canônica de bloqueio
      ("Não há evidência estatística para afirmar que X é mais rápido
      que Y. CV% = XX% (limite 20%). Mais amostras ou workload mais
      estável.") + 3 zonas de decisão (> 20% = fim, 15–20% = pedir
      mais, ≤ 15% = publicável).
- [x] **≥ 10 amostras, warmup ≥ 500** explícitos como thresholds
      canônicos, com comandos por stack (pytest-benchmark,
      benchstat, Criterion, vitest, hyperfine).
- [x] **ADRs MADR** com ≥ 2 alternativas, ≥ 1 rejeitada
      explicitamente, consequências negativas, **fitness function
      executável que falha** (não decorativa).
- [x] **Default = monolito modular** + 4 sinais de alerta do
      **Monolito Distribuído** (1 BC + 5 microsserviços, chat
      inter-contextos > 30%, time < 5 devs, deploy coordenado de
      5+ serviços) — alerta ativo, não nota de rodapé.
- [x] **Contexto isolado explícito** — Galileu **NÃO** vê trilha
      pedagógica, unidades dominadas anteriores, histórico do
      aluno, prompts de outros sub-agentes, narrative do
      `mestre_conteudo`; vê só código + workload + pergunta +
      ambiente + DoD.
- [x] **Boundary explícita** vs. `coder`, `promotor`, `critico`,
      `cartografo`, `maestro`, `atena`, `mestre_conteudo`,
      `ouroboros`.
- [x] **Sêneca 24h** para ADR estrutural + Sêneca imediato para
      segurança/irreversibilidade — mesmo padrão do `promotor`.
- [x] **Output paths canônicos** (whiteboard/benchmarks/,
      whiteboard/decisions/ADR-*, `<repo>/tests/perf/`) em ambos
      os pares; engine version usa paths do dojo, mavis version
      genérica.
- [x] **Citação cruzada** entre os 4 agentes irmãos: `01_maestro`,
      `04_cartografo`, `05_mestre_conteudo`, `08_promotor`,
      `09_critico`, `13_ouroboros`, `14_seneca`, `coder`,
      `dev-node`, `dev-rust`, `dev-go`.

## Notes para o verificador

### Path correction
A task especificou `minimaxDojo/agents/10_galileu/`, mas o caminho
canônico real (após a re-organização `engines/` de 2026-05,
documentada em `CLAUDE.md` linhas 12–22) é
`engines/minimaxDojo/agents/10_galileu/`. Usei o caminho real. O
`10_galileu/README.md` e os outros 13 agentes (`01_maestro`–
`14_seneca`) estão todos sob `engines/`.

### Mavis vs engine (não-byte-idênticos, padrão dojo)
Diferente de `socrates` e `sonda` (que ficaram byte-idênticos), os
pares mais recentes (`mneme`, `promotor`, `galileu`) seguem o padrão
"dojo overlay":

| Aspecto | mavis | engine |
|---------|-------|--------|
| Título do `agent.md` | "Galileu — regras operacionais" | "10 — GALILEU (regras operacionais — dojo)" |
| Intro do `PERSONA.md` | mavis-runtime, paths genéricos | dojo overlay, paths relativos `../../prompts/...` |
| Activation triggers no `PERSONA.md` | sem sufixo | com sufixo "(dojo)" |
| Cross-references | `promotor`, `cartografo` (sem número) | `08_promotor`, `04_cartografo` (com número) |

A divergência é **intencional** e segue o padrão estabelecido pelos
pares `07_mneme` e `08_promotor` (que também não são byte-idênticos).
Os arquivos compartilham 100% da **estrutura**, **títulos de seção**,
e **postura**; diferem só no endereçamento contextual.

### Threshold de mutation: NÃO se aplica
Galileu **não roda mutation testing** — é papel do `08_promotor`
(portão empírico da unidade). Galileu roda **benchmarks** (latência,
throughput, RAM, binário size, etc.) e **fitness functions**
(atributos arquiteturais que falham quando regridem — por exemplo,
"p99 < 100ms em carga X"). Os thresholds relevantes para Galileu
são: **CV% < 20%** (não mutation score), **≥ 10 amostras**, **warmup
≥ 500**.

### Anti-padrão Monolito Distribuído é alerta ativo
Diferente de outras notas, a checagem de Monolito Distribuído é
**seção obrigatória** em todo `bench.md` e `ADR-NNNN` produzido por
Galileu (mesmo quando for "N/A — não se aplica"). Sem essa seção,
a análise está incompleta. Isso é explicitado tanto em
`agent.md` (Disciplina de evidência) quanto em `PERSONA.md`
(Workflow / Saídas padrão).

### Default arquitetural
**Default = monolito modular** é repetido 4× nos 4 arquivos
(Identity, Activation triggers, Workflow, Voz, Ambiguidade) por
design — é a postura mais importante do papel, o oposto da moda de
"microsserviço sempre". A ADR só distribui se houver **evidência**
de que o custo de monolito modular superou o custo de distribuir.

### Sibling agents
- `04_cartografo` (desenha trilha) e `10_galileu` (mede e decide
  arquitetura) são pares complementares nas unidades U-008/U-009.
  Cartógrafo decide SE a unidade de arquitetura entra na trilha;
  Galileu mede/ADR quando ela roda.
- `08_promotor` (verifier empírico) e `10_galileu` (lab) são pares
  na qualidade: Galileu produz a evidência (bench.md, ADR); promotor
  fecha o portão (PASS/FAIL). Galileu não fecha o próprio portão.
- `09_critico` (revisão pedagógica PORQUÊ) e `10_galileu` (lab
  empírico) são pares na revisão: crítico revisa o "porquê" do
  código; Galileu mede o "quanto" da arquitetura.

### O que **não** foi feito (intencional)
- Não criei `engines/minimaxDojo/agents/10_galileu/README.md` — já
  existe (14 linhas) e está coerente com o novo `agent.md`/
  `PERSONA.md`.
- Não atualizei o `prompts/per_agent/galileu.md` (system prompt
  canônico) — está completo (222 linhas) e referenciado.
- Não criei `Skill` ou `harness` específico do Galileu — fora do
  escopo desta task.
- Não criei `config.yaml` em `~/.mavis/agents/galileu/` — mesmo
  padrão dos outros agentes (`cartografo`, `promotor` têm
  `config.yaml = {}`).
