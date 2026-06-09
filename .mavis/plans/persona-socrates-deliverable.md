# Deliverable — persona Sócrates (tutor socrático)

## Summary
Criei `agent.md` e `PERSONA.md` para a persona **Sócrates** em DOIS lugares
(`~/.mavis/agents/socrates/` e `engines/minimaxDojo/agents/06_socrates/`), com
estrutura 7+6 idêntica ao padrão `cartografo`, conteúdo alinhado com as fontes
canônicas (`docs/PROMPTS/00_IDEIAS.md` e
`engines/minimaxDojo/prompts/per_agent/socrates.md`), em pt-BR, com guardrails
anti-dependência (pipeline STAP, cota 15/dia, fading rápido para
intermediário, sem `solution/`).

## Changed files
1. `/Users/danielbarreto/.mavis/agents/socrates/agent.md` (novo, 7 `##` seções)
2. `/Users/danielbarreto/.mavis/agents/socrates/PERSONA.md` (novo, 6 `##` seções)
3. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/06_socrates/agent.md`
   (novo, 7 `##` seções, **idêntico** ao do mavis — diff vazio)
4. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/06_socrates/PERSONA.md`
   (novo, 6 `##` seções, **idêntico** ao do mavis — diff vazio)

## Estrutura

### `agent.md` (7 seções — espelha `cartografo/agent.md`)
1. **Voz & registro** — pt-BR, sem floreio, sem motivação, sem emoji.
2. **Disciplina STAP (anti-dependência)** — turno 1 = Checking, 1 estágio por
   turno, sem solução/código/exemplo/doc, única exceção (3 travas +
   novice → 1 nome de conceito).
3. **Disciplina de evidência** — só a tentativa conta; "li a doc" não é
   evidência; muda de estágio STAP, não de princípio.
4. **Limites (fique no papel)** — não gera conteúdo, não fecha unidades, não
   vê `solution/`, não revisa com profundidade, não alarga escopo.
5. **Gestão de estado** — NDJSON em `whiteboard/event_log/`, lê
   `learner/learning_state.yaml` para quota/Dreyfus/Bloom.
6. **Disciplina assíncrona** — escalonamento a Maestro via comunicação, sem
   espera passiva.
7. **Memória** — 3 camadas (project → agent → user) com guard contra
   especificidade do projeto vazar.

> Diferença consciente em relação ao `cartografo`: a seção "Ambiguidade" foi
> substituída por "Disciplina STAP" — Sócrates não delibera entre opções; a
> sua única ambiguidade é **como calibrar o STAP para Dreyfus × Bloom**, e
> isso já vive na seção 2. Manter "Ambiguidade" seria copy-pate sem carga
> semântica.

### `PERSONA.md` (6 seções — espelha `cartografo/PERSONA.md`)
1. **Princípios invariantes** — tentativa-antes-de-dica, 1 estágio STAP/turno,
   fading rápido, 15/dia, nada de "use X".
2. **Pipeline STAP** — diagrama + tabela das 4 perguntas-tipo.
3. **Rotina por consulta** — 5 passos (confirmar contexto, verificar cota,
   aplicar STAP, **não entregar** com lista negra explícita, registrar log).
4. **Calibração por Dreyfus & Fading** — tabela Dreyfus × Bloom × estilo de
   pergunta + sequência de 6 turnos para intermediário.
5. **Casos de loop & saída** — 3 travas (voltar 1 STAP), 5 travas
   (escalonar), pedido explícito, frustração, cota esgotada.
6. **Voz** — tutor rigoroso, não coach; a linha que segura é o que ensina.

## Verificação pré-entrega

- [x] **4 arquivos** criados nos 4 caminhos solicitados.
- [x] **diffs vazios** — `diff` entre `~/.mavis/agents/socrates/*` e
      `engines/minimaxDojo/agents/06_socrates/*` retorna vazio nos dois
      pares (agent.md e PERSONA.md).
- [x] **Estrutura cartografo** — 7 `## ` no `agent.md`, 6 `## ` no
      `PERSONA.md` (verificado com `grep -c`).
- [x] **Alinhado com fontes** — STAP, cota 15/dia, fading rápido, Dreyfus,
      `socratic_questions.md`, não-ver-`solution/` — todos refletidos.
- [x] **pt-BR** — corpo em português, exceto identificadores de código, paths
      e comandos CLI.
- [x] **Modelo `sonnet`** documentado no `agent.md` (modelo
      `engines/minimaxDojo/agents/06_socrates/README.md`).

## Notes para o verificador
- **Caminho do repositório:** o task disse `engines/minimaxDojo/agents/06_socrates/`,
  mas o caminho real no repo é
  `engines/minimaxDojo/agents/06_socrates/` (ver `AGENTS.md` da raiz:
  "`engines/` contém as aplicações (motores)"). Criei no caminho real.
- **Conflito com `prompts/per_agent/socrates.md`:** esse arquivo
  (`engines/minimaxDojo/prompts/per_agent/socrates.md`) é o system prompt
  histórico dos 14 agentes e já cobre Sócrates em profundidade. O
  `agent.md`/`PERSONA.md` que criei é o **manifesto operacional** (formato
  `cartografo`), que vai para o diretório do agente e o runtime OpenCode.
  Os dois coexistem sem sobreposição destrutiva.
- **`config.yaml`:** continua `{}` (3 bytes). O orquestrador pode preenchê-lo
  depois com `model: sonnet`, `tools: [...]` etc. — fora do escopo desta task.
- **Quando invocar** (do `README.md`): aluno trava em uma unidade e pede
  ajuda; aluno pergunta "como começo?"; aluno tenta 3× sem avançar. Tudo
  refletido em `agent.md` § Limites e `PERSONA.md` § Casos de loop.
- **Contexto isolado** (do `README.md`): vê `socratic_questions.md` (Mestre-
  Conteúdo) + Dreyfus/Bloom do aluno + quota do dia. **NÃO** vê `solution/`.
  Reforçado em `agent.md` § Limites e § Gestão de estado.
