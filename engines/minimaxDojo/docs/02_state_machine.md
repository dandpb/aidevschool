# ⚙️ Máquina de Estados — Especificação Formal

> A "certeza de conclusão" **nunca** fica no LLM. Esta máquina de estados determinística governa toda unidade de aprendizagem e todo portão empírico.

---

## 1. Estados de uma Unidade

```
ESTADO_UNIDADE ::= APRESENTANDO
                 | PRATICANDO
                 | AVALIANDO
                 | DOMINADO
                 | FALHA_BLOQUEIO   (Sêneca escalado)
```

### 1.1 Tabela de Transições

| De | Evento | Para | Pré-condição | Ação |
|----|--------|------|--------------|------|
| (novo) | `maestro.criar` | `APRESENTANDO` | trail.md existe, pré-requisito OK | Mestre-Conteúdo gera `enunciado.md` + `DoD.md` |
| `APRESENTANDO` | `aluno.aceita` | `PRATICANDO` | aluno escreveu 1ª linha | Maestro abre timer + socratic_questions |
| `APRESENTANDO` | `aluno.recusa` | (sai) | — | retorna à fila do Cartógrafo |
| `PRATICANDO` | `aluno.submete` | `AVALIANDO` | submission.md existe | Maestro dispara PROMĘTOR + Crítico |
| `PRATICANDO` | `timeout` | `AVALIANDO` | tempo > `MAX_PRATICANDO` | submission parcial → PROMĘTOR avalia mesmo assim |
| `AVALIANDO` | `prometor.PASS` ∧ `critico.OK` | `DOMINADO` | mutation ≥ 0.65, cobertura ≥ 0.80 | Mnemosyne atualiza whiteboard |
| `AVALIANDO` | `prometor.FAIL` ∧ `retries < 3` | `APRESENTANDO` (retry) | — | Mestre-Conteúdo gera variação; Sócrates re-engaja |
| `AVALIANDO` | `prometor.FAIL` ∧ `retries = 3` | `FALHA_BLOQUEIO` | esgotado | Sêneca (SLA 24h, conservador) |
| `FALHA_BLOQUEIO` | `seneca.PASS` | `APRESENTANDO` (nova abordagem) | Sêneca aprovou nova rota | re-apresenta com design diferente |
| `FALHA_BLOQUEIO` | `seneca.FAIL` | (trilha suspensa) | — | Mnemosyne marca bloqueio; OUROBOROS propõe revisão |
| `DOMINADO` | `mneme.dispara` | (micro-revisão) | curva do esquecimento | MNEME gera retrieval ativo |

### 1.2 Invariantes

- **I1.** Transição para `DOMINADO` **requer** veredito positivo do **PROMĘTOR** com evidência executável.
- **I2.** PROMĘTOR **nunca** recebe contexto do Mestre-Conteúdo.
- **I3.** `retries` ≤ 3 por unidade; ao esgotar, **SÊNECA** decide.
- **I4.** `timeout` em `PRATICANDO` não cancela — submete parcial e avalia.
- **I5.** Toda decisão é **logada** em `event_log/events.ndjson`.

---

## 2. Sub-máquina de AVALIANDO (Portão Empírico)

```
ESTADO_AVALIACAO ::= PRODUCING
                    | VERIFYING
                    | DONE
```

| De | Evento | Para | Ação |
|----|--------|------|------|
| (entra) | `maestro.dispatch` | `PRODUCING` | Mestre-Conteúdo entrega `submission.md` |
| `PRODUCING` | `mestre.done` | `VERIFYING` | Maestro dispara PROMĘTOR (zero contexto) |
| `VERIFYING` | `prometor.PASS` | `DONE` | Maestro dispara Crítico (cadeia) |
| `VERIFYING` | `prometor.FAIL` | `PRODUCING` (wake-up) | Mestre-Conteúdo gera variação |
| `DONE` | `critico.OK` | (saída → DOMINADO) | Mnemosyne + Atena atualizam |
| `DONE` | `critico.PEDIR_MUDANCA` | `PRODUCING` (pequeno) | Mestre-Conteúdo ajusta |

---

## 3. Máquina de Decisões Consequentes (SÊNECA)

```
DECISAO_CONSEQUENTE ::= PENDENTE
                       | APROVADA_AUTO       (opção conservadora)
                       | APROVADA_ALUNO
                       | REJEITADA
```

| Tipo de Decisão | Modo Sêneca | SLA |
|------------------|-------------|-----|
| Promover Skill a `active` | PAUSA → 24h → conservadora | 24h |
| Mudar pré-requisito da trilha | PAUSA → 24h → conservadora | 24h |
| Decisão de arquitetura (Galileu) | PAUSA → 24h → conservadora | 24h |
| Reprovar unidade com 3 retries | PAUSA → 24h → conservadora | 24h |
| Ajustar quota de Sócrates | auto | 0 |
| Ajustar horário de Mneme | auto | 0 |
| Decisões reversíveis (rename, refactor local) | auto | 0 |

> **Default conservador** = "manter estado atual, suspender mudança, pedir re-confirmação do aluno".

---

## 4. Máquina de Skill (OUROBOROS + Mnemosyne)

```
SKILL_STATE ::= draft
              | review          (Crítico + Atena olham)
              | versioned
              | promoted        (entra no system prompt do agente)
              | deprecated      (rollback)
```

| De | Evento | Para | Pré-condição |
|----|--------|------|--------------|
| (novo) | `ouroboros.propoe` | `draft` | veio de tropeço OU acerto recorrente |
| `draft` | `ouroboros.solicita_review` | `review` | Crítico + Atena aceitaram revisar |
| `review` | `critico.APROVA` ∧ `atena.APROVA` | `versioned` | tem evidência (métrica melhorou) |
| `versioned` | `mnemosyne.promove` | `promoted` | ≥ 3 usos sem regressão |
| `promoted` | `mnemosyne.detecta_regressao` | `deprecated` | Métrica piorou após promoção |
| `deprecated` | (manual) | `draft` | nova revisão com fix |

---

## 5. Máquina de Mneme (Revisão Espaçada)

```
MNEME_STATE ::= IDLE
              | APRESENTANDO
              | AGUARDANDO_RESPOSTA
              | AVALIANDO_RETRIEVAL
              | ATUALIZANDO_INTERVALO
```

**Curva padrão de intervalos** (em dias, ajustada por acerto):

```
acerto ≥ 80% → próximo intervalo = atual × 2.5
acerto 60–79% → próximo intervalo = atual × 1.5
acerto < 60%  → próximo intervalo = max(atual / 2, 1)
```

**Interleaving.** A cada sessão, ≥ 30% dos exercícios são de **unidades anteriores** (não a atual).

---

## 6. Estado Global do Aluno (TaskState)

Vive em `whiteboard/learner_profile.md`. Atualizado por Mnemosyne.

```yaml
learner:
  id: ...
  linguagem_foco: ...
  tempo_semanal: 5h
  nivel_global:
    dreyfus: advanced_beginner
    bloom: apply
  unidades:
    - id: U-001
      estado: DOMINADO
      retries: 0
      dreyfus: competent
      bloom: apply
      mutation_score: 0.72
      cobertura_nucleo: 0.91
      last_seen: 2025-XX-XX
      next_review: 2025-XX-XX (intervalo: 7d)
    - id: U-002
      estado: PRATICANDO
      retries: 1
      ...
  pegadinhas_top:
    - "esquecer de fechar o arquivo em finally/with"
    - "mutate input em vez de retornar novo"
  skills_ativas:
    - SKILL-007 (refactor extract-method)
  ai_dependency_index: 0.34
  socrates_quota_today: 7 / 15
```

---

## 7. Eventos Auditáveis (formato NDJSON)

```json
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"maestro","ev":"unit.start","unit":"U-002","payload":{...}}
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"mestre-conteudo","ev":"submission.delivered","unit":"U-002","path":"..."}
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"prometor","ev":"verdict","unit":"U-002","verdict":"FAIL","mutation":0.42,"cobertura":0.71,"gaps":[...]}
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"maestro","ev":"retry","unit":"U-002","n":1}
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"critico","ev":"review.delivered","unit":"U-002","findings":N}
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"mnemosyne","ev":"whiteboard.updated","key":"learner_profile"}
{"ts":"2025-XX-XXThh:mm:ssZ","agente":"seneca","ev":"sla.opened","decisao":"promote_skill","id":"SKILL-007"}
```

---

## 8. Implementação (referência)

A máquina de estados pode ser implementada em qualquer runtime determinístico. Em Python, o esqueleto é:

```python
class UnitStateMachine:
    ESTADOS = {"APRESENTANDO","PRATICANDO","AVALIANDO","DOMINADO","FALHA_BLOQUEIO"}

    def __init__(self, unit_id, trail, gates, max_retries=3):
        self.unit_id = unit_id
        self.trail = trail
        self.gates = gates
        self.max_retries = max_retries
        self.estado = "APRESENTANDO"
        self.retries = 0

    def transicao(self, evento, payload):
        if (self.estado, evento) not in TRANSICOES_PERMITIDAS:
            raise DeterminismError(f"transição inválida {(self.estado, evento)}")
        novo = TRANSICOES_PERMITIDAS[(self.estado, evento)]
        self.estado = novo
        log_evento(self.unit_id, evento, novo, payload)
        return novo
```

> O importante é que o **runtime** (não o LLM) garanta as transições. O Maestro propõe, o runtime confirma.

---

*Ver [04_empirical_gates.md](04_empirical_gates.md) para o conteúdo dos portões empíricos.*
