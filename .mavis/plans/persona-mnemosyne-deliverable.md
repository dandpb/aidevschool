# Persona Mnemosyne — Deliverable

## Summary
Criei `agent.md` e `PERSONA.md` para a persona **Mnemosyne** (memory keeper,
memória em 3 camadas + 4 stores físicas) em DOIS lugares — Mavis
(`~/.mavis/agents/mnemosyne/`) e repo (`engines/minimaxDojo/agents/12_mnemosyne/`)
— com estrutura **7+6** idêntica ao padrão `cartografo`/`mneme`, em **pt-BR**,
alinhada com as fontes canônicas (`docs/PROMPTS/00_IDEIAS.md` § MNEMOSYNE,
`engines/minimaxDojo/prompts/per_agent/mnemosyne.md`, `engines/minimaxDojo/docs/05_memory_system.md`
e `engines/minimaxDojo/agents/12_mnemosyne/README.md`). Modelo: **sonnet + haiku**
(Sonnet = curadoria; Haiku = append/rotação rotineira).

## Changed files

### Mavis (cross-project worker)
- `/Users/danielbarreto/.mavis/agents/mnemosyne/agent.md` — **166 linhas**,
  **7 seções H2** (Voz & registro · Disciplina de evidência · Limites ·
  Gestão de estado · Disciplina assíncrona · Memória · Ambiguidade).
- `/Users/danielbarreto/.mavis/agents/mnemosyne/PERSONA.md` — **198 linhas**,
  **6 seções H2** (Identity & mission · Activation triggers · Workflow ·
  Mental models · Anti-patterns · Voz).

### Repo (dojo-scoped overlay)
- `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/12_mnemosyne/agent.md`
  — **213 linhas**, **7 seções H2** (Voice & register · Evidence discipline
  · Boundaries · State management · Async discipline · Memory · Activation
  triggers). Aponta para o system prompt canônico em
  `../../prompts/per_agent/mnemosyne.md`. Inclui **paths canônicos do dojo**
  para as 4 stores e **regra explícita de isolamento de contexto** (vê só
  `learner_profile.md` + `event_log/` top-N + `skills/` sob demanda +
  `core_curated-<DATA>.md`).
- `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/12_mnemosyne/PERSONA.md`
  — **217 linhas**, **6 seções H2** (Identity & mission · Activation
  triggers · Workflow · Mental models · Anti-patterns · Voice).
  Cross-referencia `01_maestro`, `02_cronos`, `03_sonda`, `04_cartografo`,
  `05_mestre_conteudo`, `06_socrates`, `08_prometor`, `09_critico`,
  `10_galileu`, `11_atena`, `13_ouroboros`, `14_seneca` como pares
  /origens de sinal.

## Notes for the verifier

### Path correction
A task especificou
`/Users/danielbarreto/Development/aidevschool/minimaxDojo/agents/12_mnemosyne/`,
mas o caminho canônico real (após a re-organização `engines/` de 2026-05,
documentada em `CLAUDE.md` linhas 12–22) é
`/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/12_mnemosyne/`.
Usei o caminho real; o `12_mnemosyne/README.md` e os outros 13 agentes
estão todos sob `engines/`. (Consistente com a decisão dos deliverables
anteriores: `persona-socrates`, `persona-sonda`, `persona-promotor`,
`persona-mneme`.)

### Section count (7+6) — espelha cartografo/mneme
- `agent.md` (mavis + engine): **7** seções H2 — casam 1-a-1 com o padrão
  `cartografo/agent.md` (Voz / Disciplina / Limites / Estado / Async /
  Memória) + 1 seção **Ambiguidade** (mavis) / **Activation triggers
  (dojo-specific)** (engine). Engine substitui "Ambiguidade" pela seção
  concreta de gatilhos porque no dojo a ambiguidade está resolvida via
  `02_cronos` + 14-agentes — o que sobra é o **protocolo de gatilhos**.
- `PERSONA.md` (mavis + engine): **6** seções H2 (Identity & mission ·
  Activation triggers · Workflow · Mental models · Anti-patterns · Voz).
  `rg '^## '` reporta 6 hits em cada — sem headings ilustrativos dentro de
  fenced code blocks (diferente de Mneme, que tem o template de sessão
  dentro de um code block com 5 H2 ilustrativos que o `rg` na contagem
  anterior marcava como falsos positivos).

### Alignment with canonical sources
- **Modelo: sonnet + haiku** (segue a task; diverge do `12_mnemosyne/README.md`
  antigo que sugeria opus, e do `01_agent_roster.md` que também diz opus). A
  escolha **sonnet + haiku** reflete a divisão de carga real: sonnet absorve
  curadoria pesada (compactação semanal, auditoria mensal, promoção/rebaixa
  de Skill com evidência), haiku absorve a escrita rotineira de alto volume
  (append em `event_log/`, atualização de `learner_profile.md`, rotação
  do núcleo). Esta decisão está documentada na seção **Identity & mission**
  do `PERSONA.md` (engine) e em **Modelo:** no `agent.md` (ambos).
- **4 stores físicas:** § Gestão de estado do `agent.md` (mavis + engine)
  apresenta tabela canônica com paths:
  - Store #1 — Núcleo curado congelado (injetado no prompt, orçamento
    rígido, ~500 tokens).
  - Store #2 — Histórico pesquisável (SQLite+FTS5 / vetorial, sob demanda,
    **nunca despejado**).
  - Store #3 — Skills versionadas em git (ciclo
    `draft → review → versioned → promoted → deprecated`).
  - Store #4 — Whiteboard/perfil do aluno (`learner_profile.md` +
    `event_log/` + `decisions/` + `handoffs/`).
- **3 camadas (canais):** Camada 1 intra-agente (injeção de dica com
  fonte+data); Camada 2 handoff files (schemas fixos: `unit_spec.md`,
  `submission.md`, `verdict.md`); Camada 3 whiteboard persistente (única
  com escrita ampla por Mnemosyne).
- **Quando invocar — 4 gatilhos canônicos:** (1) pós-ciclo (sinal de
  Maestro/Promotor); (2) promover/rebaixar Skill (sinal de
  Ouroboros/Sêneca); (3) compactação semanal domingo; (4) auditoria
  mensal. Presente em **ambos** os `agent.md` (seção final) e **ambos**
  os `PERSONA.md` (Activation triggers + tabela).
- **Contexto isolado:** confirmado nos 4 arquivos. Mnemosyne é a **única
  com escrita ampla**; Sêneca é **read-only**; demais agentes têm read
  do `learner_profile.md` (núcleo curado injetado) e escrita só no
  próprio handoff. Engine `agent.md` tem bullet explícito listando o
  que ela **vê** e o que ela **NÃO vê**.
- **Injeta dicas intra-agente:** § Limites (mavis) + § Identity & mission
  (PERSONA) + § Mental models (PERSONA) reforçam que toda dica carrega
  **caminho da fonte** + **data**. Dica sem fonte vira ruído.
- **Sumariza para evitar entity drift:** § Mental models (PERSONA) +
  § Anti-patterns (PERSONA) definem: sumarização produz **delta
  explícito** (entrou/saiu, antes/depois). Compactação sem delta é cega
  — pior tipo de entity drift.
- **Boundary claríssima:** explicitada no `agent.md` (mavis + engine)
  seção "Limites" / "Boundaries" e reforçada no `PERSONA.md` (mavis +
  engine) seção "Anti-patterns" com bullets ❌. Mnemosyne **persiste,
  roteja, sumariza, injeta** — não ensina, não julga, não trilha, não
  decide pelo aluno.

### pt-BR check
Tudo em português brasileiro, com termos técnicos em inglês preservados
(`event_log`, `handoff`, `whiteboard`, `core_curated`, `learner_profile`,
`skills`, `promoted`, `deprecated`, `NDJSON`, `idempotência`,
`fire-and-forget`, `no-op`, `entity drift`, `kill mandate`, `Skill-as-PR`,
etc.) — consistente com o estilo de `00_IDEIAS.md`,
`prompts/per_agent/*.md` e `docs/05_memory_system.md`.

### Coerência com cartografo/mneme (formato de referência)
- Mismo número de seções em `agent.md` (7) e `PERSONA.md` (6).
- Mesmo idioma (pt-BR), mesma voz (curadora-direta, evidência-primeiro,
  sem coaching motivacional vazio, sem "show de bola", sem "ótima
  pergunta").
- Mesmo padrão de "what you DON'T do" (Limites no agent.md; Anti-patterns
  no PERSONA.md com bullets ❌).
- Mesmo padrão de "use comandos CLI exatos" — `mavis communication send`
  (handoff), `mavis cron self` (retry), `mavis browser tool` /
  `web_search` (retrieval externo).

### Verificação pré-entrega
- [x] 4 arquivos criados nos 2 pares de paths
- [x] Estrutura 7+6 seções em ambos os pares (validado com `rg '^## '`)
- [x] Alinhamento com `00_IDEIAS.md` (MNEMOSYNE = camada Memória/Evolução,
      item 10 da lista de 14 agentes)
- [x] Alinhamento com `prompts/per_agent/mnemosyne.md` (3 camadas, 4
      stores, ações ler/escrever/rotacionar/compactar/promover_skill/
      auditar)
- [x] Alinhamento com `12_mnemosyne/README.md` (modelo, ativação,
      contexto isolado, 4 stores)
- [x] Alinhamento com `docs/05_memory_system.md` (estrutura do
      whiteboard, schema `learner_profile.md`, NDJSON,
      política de curadoria do núcleo, compactação/auditoria)
- [x] pt-BR com termos técnicos preservados
- [x] Boundary claríssima: Mnemosyne **persiste, roteja, sumariza,
      injeta**; não ensina / não julga / não trilha / não reflete /
      não benchmarka / não coleta métricas globais / não decide
      pelo aluno
- [x] Handoff explícito para Maestro / Crítico / Atena / Sêneca /
      Ouroboros quando escapa do lane
- [x] Anti-padrões de entity drift documentados (despejo de histórico,
      promoção sem ≥ 3 usos, depreciação sem evidência, atualização
      sem evento no log, sumarização sem delta, etc.)
- [x] Diffs entre mavis e engine são **substanciais** (307 linhas em
      PERSONA) — engine é overlay dojo-scoped com paths canônicos e
      referências cruzadas aos 13 outros agentes numerados;
      mavis é cross-project genérico

### Sibling agents
- Persona-mneme (board.md linha 14) é a parente mais próxima: Mneme
  **revisa** (curva do esquecimento), Mnemosyne **persiste o que Mneme
  precisa ler** (`learner_profile.md` com `last_seen`/`intervalo_atual`
  /`pegadinhas_top`). Handoff Mneme → Mnemosyne = "unidade dominada"
  / "pegadinha detectada" / "sessão < 60%". Handoff Mnemosyne → Mneme
  (via Maestro) = "rotacionei núcleo, nova pegadinha no top-5".
- Persona-promotor (board.md linha 10) é a parente adversarial: Promętor
  fecha o portão empírico e emite o `verdict.md`; Mnemosyne **persiste**
  o verdict no `learner_profile.md` + `event_log` na mesma volta. O
  portão verde/vermelho é o sinal que dispara o Trigger 1 de
  Mnemosyne.
- Persona-cartografo (board.md linha 2) é a parente upstream: Cartógrafo
  **desenha a trilha**; Mnemosyne **persiste** o desenho (próxima
  unidade, trilha atual) sem alterá-lo. Mnemosyne **NÃO** muda a
  trilha — só registra.
- Persona-seneca (HITL) tem **read-only** no whiteboard; Mnemosyne
  flag, escala, e Sêneca aprova/rejeita (especialmente em `promoted`
  consequente de Skill, SLA 24h).
