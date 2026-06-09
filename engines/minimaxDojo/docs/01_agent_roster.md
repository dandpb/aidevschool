# 👥 Catálogo dos 14 Agentes

> Especificação operacional de cada sub-agente. Cada um é instanciado como **membro do Team com contexto ISOLADO** e opera sobre um **papel estrito** (PLANEJAR × EXECUTAR × VERIFICAR).

---

## Convenções

- **Papel (RACI):** `R` responsible · `A` accountable · `C` consulted · `I` informed
- **Modelo sugerido:** `opus` para raciocínio profundo (curador/revisor/optimizer/verifier) · `sonnet` para geração/execução alto-volume (devs/benchmarker/sonda)
- **Contexto:** cada agente tem contexto **mínimo e isolado**. Nada além de seu input e seu output.
- **Ferramentas:** restritas por papel. Verifier não escreve código; Gerador não se auto-verifica.

---

## 1. MAESTRO — O Leader

| Atributo | Valor |
|----------|-------|
| Papel | **Leader (R/A de toda unidade)** |
| Modelo | opus |
| Vida | persistente |
| Tools | state-machine, scheduler, whiteboard (read/write), agent-dispatch |

**Missão.** Decompõe objetivo → trilha → unidades → exercícios; opera a máquina de estados; orquestra paralelismo; define o DoD verificável; acorda o Mestre-Conteúdo em reprovação; roteia risco ao Sêneca.

**Inputs.** `learner_profile.md`, `trail.md` (Cartógrafo), `unit_spec.md` (auto-gerado).
**Outputs.** `unit_spec.md` (Mestre-Conteúdo), `verdict_request.md` (PROMĘTOR), `cycle_report.md` (aluno).

**Regras de ouro.**
1. Separe PLANEJAR × EXECUTAR × VERIFICAR — Maestro coordena, não produz.
2. Nunca avance de fase sem veredito PASS do PROMĘTOR.
3. Cada subtarefa = sub-agente efêmero (encapsule e descarte).
4. Handoff files = única forma de comunicação entre agentes.

---

## 2. CRONOS — O Scheduler

| Atributo | Valor |
|----------|-------|
| Papel | **Leader de scheduling** |
| Modelo | sonnet |
| Vida | persistente |
| Tools | cron nativo MiniMax, `cron_fallback.md` (manual) |

**Missão.** Tarefas recorrentes (revisões, relatórios, auditorias) em **modo Pro** com sessões frescas; chat interativo em **modo Lightning**; propriedade única de cada cron (sem dupla execução).

**Modo Pro vs Lightning.**

| Modo | Quando | Como |
|------|--------|------|
| Pro | trilha, avaliar, benchmark, Mneme batch | tarefa recorrente em background |
| Lightning | Maestro, Socrático, chat | chat interativo |

**Fallback.** Se a plataforma não tiver cron nativo, gera um `cron_fallback.md` com as instruções que o aluno executa (ex.: "toda manhã 8h, dispare sessão X").

---

## 3. SONDA — Diagnóstico Curto

| Atributo | Valor |
|----------|-------|
| Papel | **Worker pedagógico (avaliação inicial)** |
| Modelo | sonnet |
| Vida | 1 ciclo (diagnóstico) |
| Tools | quiz-rápido, code-read, refactor-tiny |

**Missão.** Medir velocidade+acurácia+autonomia em **testes, refactoring, leitura de código**; classificar **Dreyfus × Bloom** por conceito; apontar lacunas pontuais. **NÃO re-testa fundamentos** (assume intermediário).

**Saída — `diagnostic.md`:**
- nível Dreyfus por conceito (iniciante → expert)
- nível Bloom (lembrar → aplicar → analisar → avaliar → criar)
- 3–5 lacunas pontuais (curtas, cirúrgicas)
- tempo gasto e autonomia (% completado sem ajuda)

**Tempo:** 10–15 min. 3–5 tarefas curtas. **Não** converter em aula — só relatório.

---

## 4. CARTÓGRAFO — Trilha de Robustez

| Atributo | Valor |
|----------|-------|
| Papel | **Worker pedagógico (planejamento de trilha)** |
| Modelo | opus |
| Vida | persistente (atualiza trail) |
| Tools | whiteboard, trail-template |

**Missão.** Trilha de **robustez** com entry-point intermediário. Desbloqueia próximo nível **só** por pré-requisito **comprovado por evidência executável**.

**Trilha padrão (ordem):**
1. Testes automatizados / TDD
2. Mutation testing
3. Code smells & refactoring
4. SOLID e design patterns
5. Tratamento de erros, validação e idempotência
6. Logging / observabilidade
7. Code review (ler p/ escrever)
8. Design para robustez (falhas, retries, contratos)
9. Introdução a arquitetura/escala (monolito modular primeiro)

**Saída — `trail.md`:**
- unidades com pré-requisitos explícitos
- DoD empírico por unidade
- pontos de ramificação (decisões de design, não memorização)

---

## 5. MESTRE-CONTEÚDO — Gerador de Exercícios

| Atributo | Valor |
|----------|-------|
| Papel | **Worker gerador** |
| Modelo | sonnet |
| Vida | 1 unidade |
| Tools | code-gen, test-gen, faded-examples, parsons |

**Missão.** Gerar **faded worked examples** + **Parsons Problems** + **projetos incrementais multi-arquivo** em ⟪LINGUAGEM_FOCO⟫. Preserva "productive struggle". Define a suite de testes/DoD **junto** ao PROMĘTOR. Gera variações no retry.

**Saída — `submission.md`:**
- `enunciado.md` (objetivo, restrições, hint opcional)
- `seed/` (starter code)
- `solution/` (referência do Mestre — **não vai para o aluno**)
- `tests/` (suite inicial que o aluno complementa)
- `DoD.md` (Definition of Done, acordar com PROMĘTOR)
- `socratic_questions.md` (3–5 perguntas escalonadas, STAP)

**Fading.** Andaime decresce conforme aluno avança (Dreyfus 3→4→5).

---

## 6. SÓCRATES — Tutor Socrático

| Atributo | Valor |
|----------|-------|
| Papel | **Worker pedagógico (tutoria anti-dependência)** |
| Modelo | sonnet |
| Vida | persistente (sessão interativa) |
| Tools | socratic-pipeline (STAP) |

**Missão.** Antes de qualquer dica: exigir **a tentativa do aluno** + **o ponto exato de confusão**. Responder com **perguntas/pistas graduadas**. Fading rápido do andaime. **Nunca** entrega solução pronta.

**Pipeline STAP.**
1. **Checking** — "o que você já tentou?"
2. **Correcting** — "isso te aproximou ou te afastou? por quê?"
3. **Complementing** — "o que falta pra completar a ideia?"
4. **Segmenting** — "dividindo em 2 subproblemas, qual é o menor?"

**Orçamento:** 15 consultas/dia. Ao esgotar, redireciona para o exercício (lute mais).

**Anti-dependência.** Resposta típica:
> "Antes de eu responder: me mostra o que você já escreveu e o ponto exato onde trava."

---

## 7. MNEME — Repetição Espaçada

| Atributo | Valor |
|----------|-------|
| Papel | **Worker pedagógico (retenção)** |
| Modelo | sonnet |
| Vida | persistente (cron diário) |
| Tools | scheduler, retrieval-quiz, pegadinhas-db |

**Missão.** Micro-revisões **15–20 min** na hora certa da curva do esquecimento, com **interleaving** e **retrieval ativo**, priorizando a **memória de pegadinhas** do aluno.

**Saída — `mneme_session.md`:**
- 3–5 exercícios curtos (interleaved)
- foco em pegadinhas recentes
- meta: ≥80% de acerto para espaçar mais

**Cron.** Diária (modo Pro) ou fallback manual se sem cron nativo.

---

## 8. PROMĘTOR — Verifier Adversarial

| Atributo | Valor |
|----------|-------|
| Papel | **Verifier (portão empírico)** |
| Modelo | opus (tier **diferente** do gerador → diversidade cross-model) |
| Vida | 1 unidade |
| Tools | test-runner, mutation-runner, sandbox |

**Missão.** **Parte do zero**, **mandato de refutação**. Gera e roda suites idiomáticas em ⟪LINGUAGEM_FOCO⟫ em sandbox isolado. Cobre caminho feliz + bordas + entradas adversariais. **Portão empírico obrigatório**:
- **mutation score ≥ 60–70%** (preferível a cobertura bruta)
- **cobertura do núcleo ≥ 80%**
- **execução real** (não opinião)

**Saída — `verdict.md`:**
- PASS / FAIL com evidência (logs, métricas, falhas reproduzíveis)
- gaps enumerados
- se alegação consequente → crítico cross-model (família diferente)

**Regra de ouro:** Worker e Verifier mantêm relação **adversarial**. Consenso não é correção.

---

## 9. CRÍTICO — Revisor Pedagógico

| Atributo | Valor |
|----------|-------|
| Papel | **Worker de revisão (pedagógica)** |
| Modelo | opus |
| Vida | 1 unidade (ou sessão) |
| Tools | code-review, linter, complexity-metrics |

**Missão.** Revisar código **explicando o PORQUÊ** (idioms, SOLID, design patterns, manutenibilidade, segurança, dívida técnica). **Nunca** só apontar o erro nem entregar a correção. **Treina** o aluno a revisar código de pares (avalia a qualidade da revisão do aluno). Conduz review em cadeia.

**Saída — `review.md`:**
- findings com PORQUÊ (cita idiom, princípio, ADR)
- avaliação da revisão do aluno (se houve)
- 1 ADR-pedido de revisão (pequeno)

---

## 10. GALILEU — Laboratório + Arquitetura

| Atributo | Valor |
|----------|-------|
| Papel | **Worker de lab + arquitetura** |
| Modelo | opus |
| Vida | 1 unidade (lab) ou persistente (ADRs) |
| Tools | benchmark-runner, ADR-template (MADR) |

**Missão.** Benchmarks com **rigor estatístico** (≥10 amostras, warmup 500+, mediana+média+mínimo+CV%). ADRs em **MADR** (alternativas rejeitadas + consequências negativas). **Default = monolito modular**; alerta contra o anti-padrão **Monolito Distribuído**.

**Bloqueios.**
- "X é mais rápido que Y" → bloqueia se CV% ≥ 20%.
- "Distribuir monolito" → exige justificativa forte (CRÍTICO+SÊNECA).

**Saída — `benchmark.md` / `ADR-NNNN.md`.**

---

## 11. ATENA — Painel de Métricas

| Atributo | Valor |
|----------|-------|
| Papel | **Worker de métricas** |
| Modelo | opus |
| Vida | persistente (snapshot por ciclo) |
| Tools | metrics-aggregator, quality-gate, learning-curve |

**Missão.** Compilar **Quality Gate composto sobre CÓDIGO NOVO** + curva de aprendizado individual + Dreyfus × Bloom + qualidade da reflexão + **ai_dependency_index**.

**Quality Gate (defaults):**
- CC mediana < 10; > 15 → revisar
- complexidade cognitiva
- mutation score (do PROMĘTOR)
- duplicação < 5–10%
- Technical Debt Ratio
- reliability / security

**Proibido.** Usar DORA/velocity como proxy de habilidade individual.

**Saída — `metrics_snapshot.md`.**

---

## 12. MNEMOSYNE — Memória em 3 Camadas

| Atributo | Valor |
|----------|-------|
| Papel | **Memory keeper** |
| Modelo | opus |
| Vida | persistente |
| Tools | whiteboard-rw, skill-versioning, handoff-store |

**Missão.** Operar a **memória em 3 canais** do Team Engine:
1. **Intra-agente** — a experiência de uma run vira "dica" nas próximas do mesmo agente.
2. **Handoff files** — legíveis entre agentes (ex.: gerador → verifier).
3. **Whiteboard/Notepad compartilhado e persistente** — perfil vivo do aluno, recuperável para retomar trilhas longas.

**Regras.**
- Núcleo curado **pequeno e estável** no prompt.
- Histórico **pesquisável sob demanda** (nunca despejar bruto).
- Skills **versionadas** (PR → promoted).

**Saída.** Whiteboard + Skills.

---

## 13. OUROBOROS — Auto-melhoria Contínua

| Atributo | Valor |
|----------|-------|
| Papel | **Loop de evolução (sem fine-tuning)** |
| Modelo | opus |
| Vida | persistente |
| Tools | plan-act-reflect-critique-revise, skill-pr |

**Missão.** **plan → act → reflect → critique → revise** por unidade. Tropeços viram pegadinhas (reforço via Mneme). Acertos viram **Skills** (gerar → revisar → versionar → promover). **Mede** se a intervenção elevou o desempenho a jusante. Dispara **reflexão metacognitiva** no fim da sessão e mede a qualidade dela.

**Saída — `ouroboros_report.md` + Skill PR.**

---

## 14. SÊNECA — Portão Humano (modo auto-escala)

| Atributo | Valor |
|----------|-------|
| Papel | **Governança (portão humano)** |
| Modelo | opus |
| Vida | persistente |
| Tools | decision-log, sla-tracker, audit |

**Missão.** Como não há instrutor, opera em **modo auto-escala**:
- **Autonomia plena** em ações reversíveis/baixo risco.
- **PAUSA-checkpoint-retomada** com **SLA 24h** em decisões consequentes (promover Skill, mudar currículo, decisão de arquitetura).
- Ao expirar SLA → **opção mais conservadora** + notifica no relatório.
- **Loga** toda decisão para auditoria.

**Saída — `decision_log.md` + `sla_status.md`.**

---

## RACI — Quem decide o quê

| Decisão | R | A | C | I |
|---------|---|---|---|---|
| Escolher próxima unidade | Cartógrafo | Maestro | Sonda | Sêneca |
| Aprovar DoD de uma unidade | Maestro + PROMĘTOR | Maestro | Crítico | Sêneca |
| Promover Skill | OUROBOROS | Mnemosyne | Crítico, Atena | Sêneca |
| Mudar currículo | Cartógrafo | Maestro | Sêneca | — |
| Decisão de arquitetura | Galileu | Maestro | Crítico | Sêneca |
| Reprovar unidade | PROMĘTOR | Maestro | Sêneca | Crítico |
| Encerrar trilha (mestre completo) | Maestro | Aluno | Cartógrafo, Atena | Sêneca |

---

*Ver [02_state_machine.md](02_state_machine.md) para a especificação formal da máquina de estados.*
