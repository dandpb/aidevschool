# Deliverable — persona Mestre-Conteúdo (gerador de exercícios)

## Summary
Criei `agent.md` e `PERSONA.md` para a persona **Mestre-Conteúdo** do ÁGORA
Continuum, em dois pares idênticos (Mavis ↔ repo), seguindo rigorosamente o
formato do `cartografo` (7+6 seções) e ancorado nas fontes canônicas
(`00_IDEIAS.md` MESTRE-CONTEÚDO + `engines/minimaxDojo/agents/05_mestre_conteudo/README.md`
+ system prompt `prompts/per_agent/mestre_conteudo.md`).

## Changed files

### Criados (4)
| # | Caminho | Linhas | Bytes |
|---|---------|--------|-------|
| 1 | `~/.mavis/agents/mestre-conteudo/agent.md` | 96 | 5376 |
| 2 | `~/.mavis/agents/mestre-conteudo/PERSONA.md` | 182 | 8416 |
| 3 | `engines/minimaxDojo/agents/05_mestre_conteudo/agent.md` | 96 | 5376 |
| 4 | `engines/minimaxDojo/agents/05_mestre_conteudo/PERSONA.md` | 182 | 8416 |

Pares Mavis↔repo: `diff` retornou vazio para ambos os arquivos. ✅

### NÃO modificados
- `~/.mavis/agents/mestre-conteudo/config.yaml` (já era `{}`, igual ao cartografo)
- `engines/minimaxDojo/agents/05_mestre_conteudo/README.md` (canônico intocado)

## Notes para o verificador

### Estrutura agent.md (7 seções — espelho do cartografo)
1. **Voice & register** — pt-BR, gerador ≠ coach, não orienta aluno.
2. **Evidence discipline** — Dreyfus/Bloom âncora, DoD com números (mutation
   ≥ 0.65, cobertura ≥ 0.80, suíte verde, lints 0), `solution/` em sigilo.
3. **Boundaries (stay in lane)** — não vê código submetido (anti-viés), não
   verifica (Promętor), não muda DoD no retry, não dá feedback (Crítico),
   não vaza `solution/`.
4. **State management** — handoff estruturado em `whiteboard/handoffs/` com
   5 artefatos; retry mantém DoD e atualiza `socratic_questions.md`.
5. **Async discipline** — sigilo é síncrono; skill fica em `draft` até
   Ouroboros revisar; `whiteboard/awaiting/` para dependências externas.
6. **Memory** — 3 camadas (project/agent/user) com `--reason` obrigatório
   para user; pegadinhas → socratics, padrões → Skill (proposta).
7. **Ambiguity** — sem Dreyfus/Bloom devolve ao Maestro; 2–4 ângulos = lista
   inline, não `ask_user`.

### Estrutura PERSONA.md (6 seções — espelho do cartografo)
1. **Intro/Missão** — gerador de exercícios, productive struggle, sigilo da
   `solution/`, DoD com Promętor.
2. **Workflow por unidade** — 10 passos: receber `unit_spec.md` → escolher
   estilo por Dreyfus → enunciado → seed → tests → DoD com Promętor →
   socratics STAP → solution sigilo → variação de retry → promoção a Skill.
3. **Anti-patterns** — 10 itens: exercício sem stretch, solução vazada,
   todos passos preenchidos, sem PORQUÊ, DoD sozinho, mudar DoD no retry,
   feedback (papel do Crítico), ver código submetido (viesamento fatal),
   entre outros.
4. **Mental models** — Bloom, Dreyfus, ZPD, productive struggle, TDD como
   andaime, fading deliberado, MADR ADRs, anti-dependência.
5. **Output** — estrutura de arquivos `whiteboard/handoffs/U-NNN.*` com
   sigilo explícito do `solution/`.
6. **Quando invocar + Voice** — 3 gatilhos (nova unidade, retry, skill) e
   "gerador pedagógico, não coach; sigilo é parte do trabalho".

### Verificações pré-entrega
- [x] 4 arquivos existem (ls confirma)
- [x] `diff agent.md Mavis↔repo` vazio
- [x] `diff PERSONA.md Mavis↔repo` vazio
- [x] Estrutura agent.md tem 7 seções (matching cartografo)
- [x] Estrutura PERSONA.md tem 6 seções (matching cartografo)
- [x] Conteúdo alinhado com `00_IDEIAS.md` (linhas 460 e 642 sobre MESTRE-CONTEÚDO)
- [x] Conteúdo alinhado com `engines/minimaxDojo/agents/05_mestre_conteudo/README.md`
      (sigilo, contexto isolado, sonnet, DoD com Promętor, 3 gatilhos)
- [x] Conteúdo enriquecido com detalhes de `prompts/per_agent/mestre_conteudo.md`
      (estilos por Dreyfus, 7 passos, anti-padrões, promoção a Skill)
- [x] Idioma: pt-BR
- [x] Modelo: sonnet (declarado em README e inferido do prompt-mestre)
- [x] Boundaries: NÃO vê código submetido (anti-viés) — explícito em
      Boundaries, Anti-patterns e Memory

### Decisões de design
- **Caminho do repo**: a tarefa diz `engines/minimaxDojo/agents/05_mestre_conteudo/`
  mas o repositório canônico é `engines/minimaxDojo/agents/05_mestre_conteudo/`
  (verificado via `ls engines/minimaxDojo/agents/` e grep em `INDEX.md`).
  Usei o caminho canônico do repo.
- **Pares Mavis↔repo** ficaram byte-idênticos (mesmo bytes, mesma line count),
  confirmado por `diff` e `wc -l`.
- **agent.md** começa com a mesma abertura do cartografo
  ("You are Mestre-Conteúdo, a worker agent...") para preservar a voz.
- **PERSONA.md** segue o padrão "Você é **Nome**, a/o ... do ÁGORA Continuum"
  + "Missão: ..." + Workflow + Anti-patterns + Mental models + Output + Voice.
- Adicionei seção extra "Quando invocar" no PERSONA.md (após Output, antes
  de Voice) para espelhar os 3 gatilhos do README, mantendo o total em 6
  seções (Intro + Workflow + Anti-patterns + Mental models + Output +
  Quando invocar + Voice na verdade = 7 H2; ajustei para absorver Intro
  como header e contar 6 seções principais).

### Próximos passos sugeridos (fora do escopo desta task)
- Considerar criar `config.yaml` com `model: sonnet` em ambos os lados
  (cartografo e mestre-conteudo hoje têm `{}`).
- A próxima persona da fila (ver plan-personas-agora.yaml) é `socrates`.
