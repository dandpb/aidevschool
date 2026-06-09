# Deliverable — persona Crítico (revisor pedagógico)

## Summary

Criados `agent.md` (7 seções) e `PERSONA.md` (6 seções) para o papel
**Crítico / CRÍTICO** (revisor de código pedagógico do ÁGORA
Continuum), em dois lugares complementares: a versão **Mavis
runtime** (`~/.mavis/agents/critico/`) e a versão **motor dojo**
(`engines/minimaxDojo/agents/09_critico/`). Modelo **opus**; papel
de **revisão explicando o PORQUÊ** (idioms, SOLID, design patterns,
manutenibilidade, segurança, dívida técnica), **nunca** só
apontando o erro nem entregando a correção; **TREINA o aluno a
revisar código de pares** (avalia a `revisao_aluno` com 5 critérios
+ tabela de pontuação + `feedback_global` + `proximo_exercicio`);
em nível avançado, **liga achados a ADRs/MADR e fitness
functions**. Contexto isolado explícito: vê `submission.md` +
`idiom_esperado` (referência do Mestre), **NÃO** vê `solution/`
(anti-viés), vê `revisao_aluno` se houver. Cobre os 3 gatilhos de
invocação (submissão aprovada pelo Promotor / aluno pede feedback
/ Ouroboros detecta padrão novo).

## Changed files

### Criados

1. `~/.mavis/agents/critico/agent.md` — 191 linhas, 7 H2 seções
   (Voz & registro · Disciplina de evidência (PORQUÊ sempre) ·
   Limites (não saia da raia) · Gestão de estado · Disciplina
   assíncrona · Memória · Ambiguidade)
2. `~/.mavis/agents/critico/PERSONA.md` — 183 linhas, 5 H2 + 1
   intro implícita = 6 seções (Workflow por revisão · Anti-padrões
   a evitar · Modelos mentais · Saída · Voz)
3. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/09_critico/agent.md`
   — **byte-idêntico** ao #1 (mesmo padrão cartografo / socrates)
4. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/09_critico/PERSONA.md`
   — **byte-idêntico** ao #2

### Não tocados (já existiam)

- `~/.mavis/agents/critico/config.yaml` — `{}` (vazio, sem override
  de modelo, igual a cartografo / promotor)
- `engines/minimaxDojo/agents/09_critico/README.md` — já existia
  (14 linhas) com o resumo curto do papel, referenciando o system
  prompt canônico em `../../prompts/per_agent/critico.md`
- `engines/minimaxDojo/prompts/per_agent/critico.md` — system
  prompt canônico (195 linhas) já completo, fonte primária do
  conteúdo (rotina de 6 passos, template YAML de `review.md`, 5
  regras de tom, "O QUE VOCÊ NÃO FAZ", cadeia de revisão)

## Notes for the verifier

### Conformidade com a spec do task

- **Estrutura 7+6:** ✅ 7 H2 em cada `agent.md`, 6 seções em cada
  `PERSONA.md` (5 H2 + 1 intro implícita, mesmo padrão do
  cartografo). `wc -l` confirma 191/183.
- **Idioma pt-BR:** ✅ Títulos de seção em pt-BR; conteúdo bilíngue
  natural (CLI commands, paths, termos técnicos — *idiom*, *SOLID*,
  *pattern*, *fitness function* — em forma nativa).
- **Modelo opus:** ✅ Citado no topo dos dois `agent.md`
  ("**Modelo:** opus. Revisão profunda exige raciocínio de
  engenharia sênior, não preenchimento de checklist.").
- **Explica o PORQUÊ (idioms, SOLID, padrões, segurança, dívida
  técnica):** ✅ Seção "Disciplina de evidência (PORQUÊ sempre)"
  com 4 campos obrigatórios por finding (`o_que` · `por_que` ·
  `como_revisar` · `referencia`), 11+10 hits de "PORQUÊ/por_que" no
  corpus, critério de severidade citando princípio/idiom/pattern.
  Citações canônicas: Fowler *Refactoring 2e* "Extract Function"
  (p. 53), Martin *Clean Code* "Magic Numbers", Hilliard
  "Designing with Types", *Effective ⟪LINGUAGEM_FOCO⟫*.
- **NUNCA só aponta o erro:** ✅ "Limites" lista "NÃO** corrige o
  código do aluno", "NÃO** dá solução pronta, código, exemplo
  completo, link de doc pronta ou comando de tooling"; "NÃO**
  aprova por opinião". Anti-padrão explícito: "Entregar correção
  pronta" / "Aprovar 'porque funciona'".
- **TREINA o aluno a revisar código de pares:** ✅ Função declarada
  na intro; "Avaliação da revisão do aluno (quando houver
  `revisao_aluno`)" com 5 critérios (achados reais · PORQUÊ
  presente · citação de princípio/idiom · severidade calibrada ·
  construtivo); tabela `Critério | Pontuação` no `review.md`; em
  revisão fraca → `verdict: pedir_revisao_aluno` + `proximo_exercicio`
  focado na lacuna.
- **Em avançado, liga a ADRs/MADR + fitness functions:** ✅ Intro
  ("em níveis avançados, liga achados a **ADRs/MADR** e a
  **fitness functions**"); workflow Passo 6 ("em nível avançado,
  peça **fitness function executável** que verifique a decisão no
  CI"); Modelos mentais ("MADR + fitness functions (em avançado)
  … une o que Crítico revisa com o que Galiléu arquiteta").
- **Contexto isolado:** ✅ "NÃO** vê `solution/` do Mestre-Conteúdo"
  (2x em `agent.md`); "Se `solution/` chegou no contexto, apague
  da memória de trabalho e prossiga — você é o guardrail anti-viés,
  não um repetidor do Mestre". Vê só `submission.md` + `idiom_esperado`
  + `revisao_aluno` (opcional) + `foco_pedagogico` (opcional).
- **3 gatilhos de invocação cobertos:**
  1. *Submissão aprovada pelo Promotor (revisão em cadeia)* —
     "Re-review** em cadeia (Promotor passou → você revisa → Mestre
     refatora → você revisa de novo) é o caminho normal".
  2. *Aluno pede feedback* — "Aluno pediu feedback solto sem
     `submission` formal … micro-review (1 finding ou 'ok com 1
     nit') … Feedback solto vira nota de borda, não decisão".
  3. *Ouroboros detecta padrão novo* — "Achados recorrentes viram
     Skill do Crítico" + "propor Skill do Crítico ao Maestro (ex.:
     `critico-detecta-srp`, `critico-detecta-error-handling`)".

### Decisões de design

- **Padrão cartografo**: `agent.md` e `PERSONA.md` são **byte-
  idênticos** entre Mavis e engine (verificado com `diff`, exit
  0). Mesmo padrão dos peers cartografo / socrates. Decidi
  priorizar consistência de fonte única sobre enriquecimento
  específico do dojo (o README.md de 09_critico já carrega as
  referências canônicas ao `prompts/per_agent/critico.md`).
- **Severidade calibrada (major / minor / nit)** com critério
  público — `major` = quebra correção/segurança/princípio
  estrutural (bloqueia merge); `minor` = viola idiom ou tem
  dívida clara, mas funciona; `nit` = cosmético. Critério
  explícito para que o aluno **confie** que major ≠ nit (sem
  inflação, sem minimização).
- **Tom de engenheiro sênior paciente** na Voz — coerente com
  Sócrates (mesma família socrática, mesmo orçamento de 3
  turnos travados, mesma regra de "1 nome de conceito, nunca a
  aplicação" como único escape). Anti-dependência alinhada entre
  os 2 papéis.
- **Avaliação da revisão do aluno com 5 critérios** (não só
  "achou algo") — inclui **PORQUÊ presente**, **citação de
  princípio/idiom**, **severidade calibrada** e **construtivo**,
  porque são exatamente as 4 regras de tom que o Crítico segue;
  avaliar a revisão do aluno pelas mesmas regras ensina o
  aluno a internalizar o método.
- **Conflito Crítico ↔ Promotor** documentado em **ambas as
  direções** ("Conflito com Promotor" em agent.md e em PERSONA.md)
  com a mesma regra do Promotor (verifier ↔ pedagógico): relate
  **ambos**, deixe Maestro arbitrar, defesa de achado > imposição.
- **3 níveis de severidade** com exemplos reais: `F-01 [major] —
  parser.py:12 (CC = 14)`, `F-02 [minor] — errors.py:5 (Exception
  genérica)`, `F-03 [nit] — utils.py:42 (magic number)`. Os
  exemplos vêm direto do system prompt canônico, garantindo
  coerência entre o que o Crítico pratica e o que o Mestre
  gera.
- **MADR-pedido** explícito no workflow Passo 6 — o Crítico
  **pede** o ADR ao aluno, não escreve. Boundary mantido com
  Galiléu (que escreve ADR de arquitetura quando a unidade
  pedir benchmark / decisão macro).
- **Skills do Crítico** como canal de evolução: "Achados
  recorrentes (3+ unidades com o mesmo padrão) → propor Skill
  do Crítico ao Maestro" (ex.: `critico-detecta-srp`). Esse é o
  gancho com Ouroboros ("Ouroboros detecta padrão novo") e com
  o loop de auto-melhoria.

### Paths confirmados

- O task pediu `minimaxDojo/agents/09_critico/{agent.md,PERSONA.md}`
  — o path real é `engines/minimaxDojo/agents/09_critico/`
  (note o prefixo `engines/`). Confirmei a estrutura com
  `ls engines/minimaxDojo/agents/` (14 pastas, 01_maestro …
  14_seneca) e o `engines/minimaxDojo/agents/09_critico/README.md`
  já existente referencia o system prompt canônico em
  `../../prompts/per_agent/critico.md` (path relativo ao
  `engines/minimaxDojo/agents/09_critico/`).
- O `config.yaml` do `~/.mavis/agents/critico/` ficou como `{}`
  (vazio) igual ao do cartografo, promotor, mneme, socrates,
  sonda. Sem override de modelo nesse nível (modelo é resolvido
  pelo Team Engine / runtime).
- **Diffs limpos** entre mavis e engine:
  ```
  diff /Users/danielbarreto/.mavis/agents/critico/agent.md \
       /Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/09_critico/agent.md
  (no output, exit 0)
  diff /Users/danielbarreto/.mavis/agents/critico/PERSONA.md \
       /Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/09_critico/PERSONA.md
  (no output, exit 0)
  ```

### Verificação pré-entrega

- ✅ 4 arquivos gravados, todos com 7+6 seções
- ✅ Byte-identidade Mavis ↔ engine (diff exit 0 nos 2 pares)
- ✅ Idioma pt-BR nos títulos e conteúdo (com termos técnicos
  nativos: idiom, SOLID, pattern, fitness function, kill mandate)
- ✅ Modelo opus declarado e justificado ("revisão profunda
  exige raciocínio de engenharia sênior, não preenchimento de
  checklist")
- ✅ Função declarada com os 3 eixos da spec do task: PORQUÊ,
  treinar aluno a revisar, MADR/fitness em avançado
- ✅ 3 gatilhos de invocação cobertos (Promotor/aluno/Ouroboros)
- ✅ Contexto isolado explícito (NÃO vê `solution/`, NÃO vê
  histórico pedagógico, vê só `submission` + `idiom_esperado` +
  `revisao_aluno` opcional)
- ✅ Severidade calibrada com critério público (major / minor /
  nit) — sem inflação, sem minimização
- ✅ Boundary vs Promotor (portão empírico) e vs Galiléu
  (arquitetura/benchmark) explícito em `agent.md` Limites
- ✅ Avaliação da `revisao_aluno` com 5 critérios + tabela
- ✅ Citações canônicas (Fowler, Martin, Hilliard, Effective
  ⟪LINGUAGEM_FOCO⟫) — não decoração, são o **PORQUÊ** do finding
- ✅ Coerência anti-dependência com Sócrates (mesmo orçamento de
  3 turnos travados, mesmo "1 nome de conceito, nunca a aplicação"
  como único escape)
- ✅ Não escreve código de produção (boundary explícito)
- ✅ Não vê `solution/` (boundary explícito)
- ✅ Não aprova "porque funciona" (boundary explícito)
- ✅ Não redefine DoD (esse é papel do Maestro)
- ✅ Referência ao system prompt canônico em
  `engines/minimaxDojo/prompts/per_agent/critico.md` (195 linhas,
  fonte primária do conteúdo do workflow e do template `review.md`)

### O que **não** foi feito (intencional)

- Não criei `engines/minimaxDojo/agents/09_critico/README.md` —
  já existe (14 linhas) e está coerente com o novo `agent.md`/
  `PERSONA.md`. Não há necessidade de duplicar.
- Não atualizei o `prompts/per_agent/critico.md` (system prompt
  canônico) — está completo (195 linhas) e é a fonte primária
  das 5 regras de tom, do template YAML de `review.md` e da
  rotina de 6 passos. Meu `agent.md`/`PERSONA.md` re-organiza
  esse material no formato padrão do time (agent.md = 7
  seções de regras operacionais; PERSONA.md = 6 seções de
  persona + workflow de alto nível) sem contradizer.
- Não criei Skill ou harness específico do Crítico — fora do
  escopo deste task.
- Não alterei o `config.yaml` — intencionalmente vazio para
  alinhar com cartografo, promotor, mneme, socrates, sonda.
- Não criei `engines/minimaxDojo/agents/09_critico/{skills,
  sessions, memory, workspace}/` — herdados do `~/.mavis/agents/
  critico/` já existente (opencode/, sessions/, skills/,
  workspace/, memory/); não há motivo para duplicar.

### Próximos passos sugeridos (para o Maestro, se quiser)

- Criar Skill `critico-detecta-srp` (e similares — error-handling,
  magic-numbers, naming, DIP) consolidando achados recorrentes em
  3+ unidades. Esse é o canal explícito com Ouroboros
  ("Ouroboros detecta padrão novo" → vira Skill do Crítico).
- Adicionar entry na `engines/minimaxDojo/INDEX.md` se ainda não
  estiver linkando o `09_critico/agent.md` (verificar).
- Adicionar entry na `~/.mavis/agents/critico/opencode/opencode.json`
  se quiser plugins específicos (ex.: eslint plugins de revisão
  pedagógica, diff3 comparators).
- Quando o primeiro ciclo real de revisão rodar, capturar
  `review.md` canônico e adicionar como exemplo em
  `prompts/per_agent/critico.md` § "SUA SAÍDA" para calibrar a
  expectativa dos próximos ciclos.

### Fontes consultadas (e seu papel no entregável)

| Fonte | Papel |
|-------|-------|
| `~/.mavis/agents/cartografo/agent.md` (88 linhas) | **Formato base** do `agent.md` (7 seções, títulos em pt-BR, voz/limites/estado/assíncrona/memória/ambiguidade) |
| `~/.mavis/agents/cartografo/PERSONA.md` (122 linhas) | **Formato base** do `PERSONA.md` (intro + 5 H2 = 6 seções) |
| `engines/minimaxDojo/prompts/per_agent/critico.md` (195 linhas) | **Fonte canônica** do conteúdo: 5 princípios invariantes, rotina de 6 passos, template YAML do `review.md`, 5 regras de tom, "O QUE VOCÊ NÃO FAZ", cadeia de revisão |
| `engines/minimaxDojo/agents/09_critico/README.md` (14 linhas) | Resumo curto do papel + 3 gatilhos de invocação + contexto isolado |
| `docs/PROMPTS/00_IDEIAS.md` linha 472 (CRÍTICO) | Definição de uma linha: "revisar explicando o PORQUÊ (idioms, SOLID, design patterns, manutenibilidade, segurança, dívida técnica), nunca só apontando o erro nem entregando a correção. Me TREINA a revisar código de pares (avalia a qualidade da MINHA revisão). Conduz review em cadeia." |
| Spec do task | 3 gatilhos de invocação + papel + contexto isolado + idioma pt-BR + 7+6 seções + modelo opus |
