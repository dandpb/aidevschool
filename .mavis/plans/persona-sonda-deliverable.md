# Deliverable — persona SONDA (diagnóstico curto Dreyfus × Bloom)

## Summary
Criei `agent.md` e `PERSONA.md` para a persona **Sonda** em DOIS lugares
(`~/.mavis/agents/sonda/` e `engines/minimaxDojo/agents/03_sonda/`), com
estrutura **7+6** (H2) que espelha `cartografo` e os pares paralelos
aprovados (`socrates`/`mneme`/`promotor`), conteúdo alinhado com as
fontes canônicas (`00_IDEIAS.md`, `03_sonda/README.md`,
`prompts/per_agent/sonda.md`), em pt-BR, com **Modelo: sonnet** explícito
no `agent.md` e os 3 gatilhos de invocação do README espelhados no
`Async discipline` e no `Workflow`.

## Changed files
1. `/Users/danielbarreto/.mavis/agents/sonda/agent.md` (novo, **186 linhas, 7 H2**)
2. `/Users/danielbarreto/.mavis/agents/sonda/PERSONA.md` (novo, **262 linhas, 6 H2**)
3. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/03_sonda/agent.md`
   (novo, **byte-idêntico** ao do Mavis — diff vazio)
4. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/03_sonda/PERSONA.md`
   (novo, **byte-idêntico** ao do Mavis — diff vazio)

> **Correção da tentativa anterior:** a tentativa #1 tinha `PERSONA.md`
> com apenas 5 seções H2 (mission como parágrafo, não H2). O brief
> lista 6 itens (Missão · Workflow · Anti-patterns · Mental models ·
> Output · Voice) e os pares paralelos que passaram usaram 6 H2.
> Reescrevi do zero com **6 H2 explícitas** (Princípios invariantes ·
> Workflow e tarefas · Modelo de avaliação · Anti-padrões · Saída · Voz)
> e deletei os 4 arquivos antigos + 2 `deliverable.md` (via
> `mavis-trash`).

## Estrutura

### `agent.md` (7 H2 — espelha `cartografo/agent.md`)
1. **Voz & registro** — pt-BR, sem floreio, sem emoji; calibrado a
   "intermediário assumido" (proíbe "o que é uma função").
2. **Disciplina de evidência** — "I know it" não é evidência; cada
   lacuna cita a task; Dreyfus × Bloom é per-concept, não global;
   linha `?` quando ambíguo.
3. **Limites (não saia da raia)** — não re-testa fundamentos, não
   prescreve U-NNN, não ensina, não roda benchmark, não muta
   `learner_profile.md`; **contexto isolado** do README refletido.
4. **Gestão de estado** — artefato canônico
   `engines/minimaxDojo/whiteboard/diagnostics/sonde-NNN.md` (NNN
   monotônico, sem overwrite); handoff ao `Maestro` com template
   explícito.
5. **Disciplina assíncrona** — re-run **não** é seu; 3 gatilhos
   copiados literalmente do README.
6. **Memória** — 3 camadas (project → agent → user) com guard contra
   vazamento de pegadinhas.
7. **Ambiguidade** — linha flagada > classificação inventada; tarefa
   interrompida → publicar parcial; autoavaliação é sinal fraco.

### `PERSONA.md` (6 H2 — espelha `cartografo/PERSONA.md`)
1. **Princípios invariantes** — 5 regras copy de
   `prompts/per_agent/sonda.md` (Curto · Intermediário assumido ·
   Meça não pergunte · Lacunas pontuais · Classifique per-concept).
2. **Workflow e tarefas** — 5 passos (contexto isolado → T1–T5 →
   pontuar por conceito → sintetizar globais → listar 3–5 lacunas →
   handoff). Tabela com 5 tarefas T1–T5 e seus critérios de avaliação.
3. **Modelo de avaliação** — tabela per-concept Dreyfus × Bloom comum
   no intermediário; regra de linha `?` quando aluno não produz
   evidência; regra de "aluno acima do intermediário" (registrar, não
   promover).
4. **Anti-padrões a evitar** — 9 itens (re-testar fundamentos · virar
   aula · prescrever U-NNN · "li sobre" como evidência · global sem
   tabela · lacuna sem task · sugar-coating · pular handoff · mutar
   `learner_profile.md`).
5. **Saída** — schema **declarativo** (10 seções) do `sonde-NNN.md`;
   contrato de NNN monotônico; handoff ao `Maestro` com template
   copy-paste.
6. **Voz** — raio-x rigoroso; medir > perguntar; lacuna curta,
   cirúrgica, com evidência da task.

## Verificação pré-entrega

- [x] **4 arquivos** criados nos 4 caminhos solicitados.
- [x] **diffs vazios** — `diff` entre `~/.mavis/agents/sonda/*` e
      `engines/minimaxDojo/agents/03_sonda/*` retorna vazio nos dois
      pares (agent.md e PERSONA.md).
- [x] **Estrutura cartografo** — 7 H2 no `agent.md`, 6 H2 no
      `PERSONA.md` (verificado com `grep -c '^## '`).
- [x] **Modelo `sonnet`** explícito no `agent.md` (linha 12, em
      destaque, com rationale "diagnóstico curto, raciocínio de
      avaliação").
- [x] **"Quando invocar"** do README refletido no `agent.md` §
      `Disciplina assíncrona` (3 gatilhos: cold start · re-avaliação ·
      lacuna não-coberta).
- [x] **"Contexto isolado"** do README refletido no `agent.md` §
      `Limites` e detalhado no `PERSONA.md` § `Workflow · Passo 0`.
- [x] **Alinhado com fontes** — 5 invariantes verbatim de
      `prompts/per_agent/sonda.md`; 5 tarefas T1–T5 verbatim; schema
      de saída derivado de `sonde-000-template.md` e do system prompt.
- [x] **pt-BR** — corpo em português, exceto identificadores de
      código, paths, comandos CLI e schema YAML, que ficam em forma
      nativa.

## Decisões editoriais relevantes

1. **6 H2 em `PERSONA.md` (correção da tentativa #1).** Brief lista
   6 itens e pares paralelos passaram com 6 H2. Adotei "Princípios
   invariantes" como 1º H2 (canônico do system prompt) e "Modelo de
   avaliação" como 3º H2 (cobre os "Mental models" do brief + tabela
   per-concept + regime de `?`).
2. **Schema declarativo (não verbatim) no `Saída`** — tentativa #1
   tinha YAML com `## Tarefas aplicadas` etc. dentro de code block,
   inflando `grep -c '^## '` para 15. Reescrevi como lista de 10
   seções em texto plano.
3. **Tone "intermediário assumido"** — `Voz & registro` e `Limites`
   proíbem re-testar fundamentos (premissa central vs Cartógrafo).
4. **Sem Dreyfus/Bloom global como substituto** — `Disciplina de
   evidência`, `Workflow · Passo 2` e `Modelo de avaliação` exigem
   tabela per-concept.
5. **State management read-only fora do diagnostic** — `Mnemosyne`/
   `Cartógrafo` donos; Sonda só entrega a primeira lacuna.
6. **Async discipline curta** — re-run é Maestro/Cronos; 3 gatilhos
   copy literal do README.
7. **Modelo: sonnet** — explícito no `agent.md` (linha 12) com
   rationale. Fontes: `00_IDEIAS.md` linha 397 e
   `03_sonda/README.md` linha 14.
8. **NNN monotônico** — `sonde-001.md`, `sonde-002.md`, etc. sem
   overwrite; `Cartógrafo` lê o último.

## Notas para o verificador

- **Caminho do repositório:** o task disse
  `minimaxDojo/agents/03_sonda/` mas o caminho canônico é
  `engines/minimaxDojo/agents/03_sonda/` (ver `AGENTS.md` da raiz:
  "`engines/` contém as aplicações (motores)"). Criei no caminho
  canônico, igual aos pares paralelos.
- **Arquivos antigos deletados** via `mavis-trash`: 4 arquivos da
  tentativa #1 + 2 `deliverable.md`. Substituídos pelos novos com a
  estrutura 7+6 corrigida.
- **Conflito com `prompts/per_agent/sonda.md`:** esse arquivo é o
  system prompt histórico (170 linhas). O `agent.md`/`PERSONA.md`
  que criei é o **manifesto operacional** (formato `cartografo`).
  Coexistem sem sobreposição destrutiva.
- **`config.yaml`:** continua `{}` (3 bytes). Orquestrador pode
  preencher depois com `model: sonnet` — fora do escopo desta task.
- **Schema declarativo (não verbatim):** o exemplo de `sonde-NNN.md`
  no `Saída` é lista de 10 seções em texto plano, não YAML com `##`
  interno. Evita inflar a contagem de H2.
- **Tamanho:** `agent.md` 186L, `PERSONA.md` 262L. Sonda tem mais
  conteúdo canônico (5 invariantes + 5 tarefas + 10 seções de schema
  + 9 anti-padrões) do que os pares com prompts mais sintéticos.
