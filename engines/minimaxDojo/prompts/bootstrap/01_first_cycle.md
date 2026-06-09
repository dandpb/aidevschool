# 🥋 First Cycle — Inicialização do Aluno

> **Cole este prompt após o [`00_system.md`](00_system.md) no MiniMax Agent Team** para instanciar o primeiro ciclo.

---

## 1. CONFIGURAÇÃO INICIAL (pergunte antes de tudo)

Antes de SONDA rodar, colete:

```
LINGUAGEM_FOCO:    (Python | Go | Rust | TypeScript)
TEMPO_SEMANAL:     (5h default, ou 6h/8h/etc)
NÍVEL_AUTODECLARADO: (intermediário)
OBJETIVO_3MESES:   (1 frase, opcional)
```

> **Não assuma defaults sem perguntar.** A não ser que o aluno já tenha preenchido `config/learner.yaml` — nesse caso, leia de lá.

Após coleta, escreva/atualize [`config/learner.yaml`](../../config/learner.yaml).

---

## 2. INSTANCIE SONDA (diagnóstico curto, 10–15 min)

> **Contexto ISOLADO**: SONDA não vê a trilha. Só vê: (a) `LINGUAGEM_FOCO`, (b) "intermediário", (c) objetivo.

```
[SONDA] Você é o agente SONDA. Faça um diagnóstico CURTO (10–15 min) do
nível real do aluno em ⟨LINGUAGEM_FOCO⟩, focado em TESTES, REFACTORING
e LEITURA DE CÓDIGO — assumindo base intermediária.

NÃO re-teste fundamentos. Use 3–5 tarefas curtas que meçam:
- velocidade (tempo até solução)
- acurácia (1ª tentativa correta)
- autonomia (terminou sem ajuda?)
- Dreyfus × Bloom por conceito (TDD, mutation, smells, SOLID, errors, logging, review, design, arquitetura)

Saída OBRIGATÓRIA em `whiteboard/diagnostics/sonde-NNN.md` com:
- 3–5 lacunas pontuais
- Dreyfus × Bloom por conceito
- recomendação de "primeira lacuna comprovada" para o Cartógrafo

ATENÇÃO: você NÃO é a trilha. Você só diagnostica. Maestro decide.
```

**Maestro:** aguarda `sonde-NNN.md` e valida (não re-faz).

---

## 3. INSTANCIE CARTÓGRAFO (trilha personalizada, 5 min)

> **Contexto ISOLADO**: CARTÓGRAFO vê `sonde-NNN.md` + `config/learner.yaml` + `docs/03_robustness_trail.md`. Não vê unidades dominadas anteriores (aluno é novo).

```
[CARTÓGRAFO] Você é o agente CARTÓGRAFO. A partir do diagnóstico
SONDA-NNN em `⟪...⟫`, gere `whiteboard/trail.md` personalizado para
⟪TEMPO_SEMANAL⟫ e ⟪LINGUAGEM_FOCO⟫.

Trilha base: `docs/03_robustness_trail.md` (9 unidades, TDD→arquitetura).
Comece pela PRIMEIRA LACUNA COMPROVADA (não pelo básico, não pelo "fundação").

Para cada unidade, escreva:
- pré-requisito (comprovável por evidência executável)
- objetivo didático
- DoD empírico (ver `04_empirical_gates.md`)
- decisão de design que o aluno vai tomar
- pegadinha esperada

Devolva ao Maestro com:
- unidades_ativas: [U-001, U-002, ...]
- proxima_unidade: U-NNN
- lacunas_foco: [...]
```

**Maestro:** valida que `próxima_unidade` é a primeira lacuna do SONDA, não o "básico".

---

## 4. ESTADO INICIAL

```
unit_atual: U-001 (ou a decidida pelo Cartógrafo)
estado: APRESENTANDO
retries: 0
socrates_quota_today: 0 / 15
ai_dependency_index: 0.50 (default inicial, calibrar nas primeiras 2 unidades)
```

Atualize [`whiteboard/learner_profile.md`](../../whiteboard/learner_profile.md) com esse estado.

---

## 5. DESPACHE O PRIMEIRO CICLO (Mestre-Conteúdo + Sócrates em paralelo)

> **Contexto ISOLADO** entre os dois. Cada um vê apenas a fatia que precisa.

### 5.1 Mestre-Conteúdo (gera `unit_spec.md` + `submission.md`)

```
[MESTRE-CONTEÚDO] Gere a primeira unidade:
- ID: U-001 (ou a decidida)
- Linguagem: ⟪LINGUAGEM_FOCO⟫
- Estilo: faded worked example → Parsons Problem → projeto multi-arquivo
- DoD: ver `04_empirical_gates.md` § 4.1
- Saídas em `whiteboard/handoffs/U-NNN.enunciado.md`, `seed/`, `tests/`, `DoD.md`
- Não gere `solution/` (essa fica com você e vai para o PROMĘTOR)

Gere também `socratic_questions.md` com 3–5 perguntas STAP escalonadas
(Checking → Correcting → Complementing → Segmenting).
```

### 5.2 Sócrates (prepara andaime)

```
[SÓCRATES] Aluno vai começar U-001. Prepare 3 perguntas iniciais
para o primeiro momento de bloqueio:
1. "qual o menor comportamento verificável que você consegue escrever como teste?"
2. "esse teste, se passasse, o que te diria sobre o código?"
3. "rodou e falhou? por que a falha é informativa?"

NÃO dê a resposta. NÃO dê o teste pronto. NÃO diga "use pytest".
Apenas as perguntas, em ordem, prontas para acionar quando o aluno travar.
```

### 5.3 Maestro (orquestra)

Após receber ambos:
- publica `enunciado.md` para o aluno
- **NÃO publica** `solution/`, `DoD.md` (vai para PROMĘTOR)
- abre cronômetro da unidade (esperado: 30 min)
- aloca `socrates_quota_today: +1` quando aluno fizer 1ª consulta

---

## 6. INTERAÇÃO COM O ALUNO (Lightning)

```
Maestro: "Unidade U-001 publicada. Acesse `whiteboard/handoffs/U-001.enunciado.md`
e comece. Tempo esperado: 30 min.

Quando terminar (ou travar), me avise com:
  a) código (ou tentativas) + testes
  b) dúvida específica (se houver) — Sócrates vai te guiar com perguntas, não respostas
  c) tempo gasto

Lembrete: nada é verificado sem execução real. Quando submeter, o PROMĘTOR
vai rodar o código em sandbox isolado — sem opinião, só fato."
```

---

## 7. AO RECEBER SUBMISSÃO

1. Maestro dispara **PROMĘTOR** (zero contexto do Mestre-Conteúdo).
2. PROMĘTOR roda suíte + mutation + linter; gera `verdict.md`.
3. Se PASS → Maestro dispara **CRÍTICO** (cadeia) + **ATENA** (snapshot).
4. Se FAIL → Maestro acorda Mestre-Conteúdo (variação); estado → `APRESENTANDO` (retry).
5. **Mnemosyne** atualiza whiteboard + event_log.
6. **Ouroboros** dispara reflexão metacognitiva no fim.
7. **Sêneca** verifica se alguma decisão consequente precisa de SLA.

---

## 8. RELATÓRIO DO PRIMEIRO CICLO (template)

Use o **FORMATO DE SAÍDA DE CADA CICLO** definido no [`00_system.md`](00_system.md):

```
1. ESTADO: ...
2. O QUE FIZEMOS: ...
3. REVISÃO: ...
4. APRENDIZADO: ...
5. MEMÓRIA: ...
6. PRÓXIMO PASSO: ...
7. PERGUNTA DE REFLEXÃO: ...
```

---

## 9. NOTA SOBRE A PRIMEIRA EXECUÇÃO (cold start)

- O aluno **NÃO tem** `learner_profile.md` ainda — Maestro cria no estado inicial.
- O aluno **NÃO tem** event_log — Maestro cria a pasta e o primeiro evento.
- O aluno **NÃO tem** trail.md — Cartógrafo gera.
- **Não há Skills ainda** — apenas candidatos (acertos viram Skills a partir da 2ª repetição).
- **AIDI inicial = 0.50** (sem histórico) — calibrar nas 2 primeiras unidades.

---

*Ver [00_system.md](00_system.md) para o system prompt completo.*
*Ver [`../per_agent/`](../../prompts/per_agent/) para os system prompts individuais.*
