# ⚖️ Governança Sêneca — Portão Humano no Loop

> Como **não há instrutor humano**, Sêneca opera em **modo auto-escala**: autonomia plena em ações reversíveis/baixo risco, e **PAUSA-checkpoint-retomada com SLA 24h** em decisões consequentes. Ao expirar o SLA, segue a opção mais conservadora.

---

## 1. Dois Modos

| Modo | Quando | Decisor |
|------|--------|---------|
| **auto-escala** | ação reversível OU baixo risco OU já prevista no plano | Sêneca decide |
| **PAUSA-checkpoint** | decisão consequente (ver §3) | Sêneca abre SLA, expira, escolhe conservador, notifica |

> Toda decisão — qualquer modo — é **logada** em `event_log` + `sla_status.md`. Auditável.

---

## 2. Modo Auto-escala (decide e segue)

### 2.1 Categorias

| Categoria | Exemplos |
|-----------|----------|
| Pedagógica de rotina | ajustar fading do andaime; trocar exercício por variação equivalente |
| Scheduling | reagendar Mneme se conflito; ajustar warmup de Galileu |
| Métricas | ajustar threshold local de CC se unidade didática justifica |
| Reflexão | aceitar resposta "ok" como score 1 sem escalar |
| Whiteboard | rotacionar pegadinhas do núcleo, arquivar eventos antigos |

### 2.2 Princípio

> **Se a decisão pode ser revertida sem perda significativa para o aluno, é auto-escala.** Sêneca decide e segue, **mas loga** para auditoria.

---

## 3. Modo PAUSA-checkpoint (SLA 24h)

### 3.1 Decisões Consequentes (lista negra de "auto")

| Decisão | Risco se errada |
|---------|-----------------|
| Promover Skill de `versioned` para `promoted` | Skill vira system prompt; má escolha degrada todas as runas |
| Mudar pré-requisito da trilha | Trilha "abre buraco" entre unidades |
| Decisão arquitetural (Galileu) | Custo alto de reverter |
| Reprovar unidade com 3 retries esgotados | Pode bloquear aluno dias |
| Pular unidade da trilha (avanço direto) | Lacuna fica permanente |
| Adicionar **nova** unidade à trilha | Aumenta escopo sem evidência |
| Mudar linguagem foco no meio do ciclo | Reset parcial do trabalho |
| Ajustar quota do Sócrates fora de ±20% | Anti-dependência quebrada |
| Aplicar decisão de carreira (ex.: "dominar paralelismo") | Sem pré-req, frustra |

### 3.2 Protocolo

```
1. Sêneca detecta decisão consequente
2. Gera decision_record.md (contexto, opções, recomendação)
3. Adiciona em sla_status.md com:
     - id
     - tipo
     - aberto_em
     - expira_em  (aberto + 24h)
     - opções: [{label, summary, default_conservador: bool}]
     - default_se_sla_expira: opção mais conservadora
4. MAESTRO inclui no cycle_report (próximo ciclo) como "PAUSA ABERTA"
5. Aluno vê no relatório; pode responder antes da expiração
6. Ao expirar:
     - Sêneca aplica default conservador
     - loga decisão automática + motivo
     - notifica: "SLA expirou em <timestamp>; aplicada opção conservadora"
7. Decisão fica auditável em event_log
```

### 3.3 Opções Conservadoras por Padrão

| Decisão | Opção conservadora |
|---------|-------------------|
| Promover Skill | **manter** `versioned` por mais 1 ciclo |
| Mudar pré-requisito | **manter** pré-req atual |
| Decisão arquitetural | **manter** decisão anterior; abrir ADR-novo |
| Reprovar 3 retries | **suspender** trilha; pedir re-confirmação |
| Pular unidade | **não pular** |
| Nova unidade | **não adicionar**; abrir PR para fila |
| Mudar linguagem | **não mudar** |
| Quota Sócrates | **manter** quota atual |
| Decisão de carreira | **re-abrir** com Sonda nova |

### 3.4 SLA Reduzido (4h) para Decisões Críticas

| Decisão | SLA |
|---------|-----|
| Skill com regressão detectada (rollback) | 4h (não esperar 24h) |
| Bloqueio de produção (Mnemosyne detecta) | 4h |
| Quebra de segurança detectada (CRÍTICO) | imediato (Sêneca executa rollback) |

---

## 4. `sla_status.md` (template)

```markdown
# SLA Status — <data>

## Abertos
| ID | Decisão | Aberto | Expira | Default se expirar |
|----|---------|--------|--------|---------------------|
| SLA-2025-05-12-01 | Promover SKILL-007 a promoted | 2025-05-12 08:00 | 2025-05-13 08:00 | manter versioned |
| SLA-2025-05-11-03 | Adicionar unidade sobre DDD | 2025-05-11 19:00 | 2025-05-12 19:00 | não adicionar |

## Encerrados hoje
| ID | Decisão | Decidido em | Decisão | Motivo |
|----|---------|-------------|---------|--------|
| SLA-2025-05-11-02 | Mudar pré-req U-005 | 2025-05-12 07:30 (aluno confirmou) | manter | aluno entendeu o porquê |
| SLA-2025-05-10-04 | Promover SKILL-005 | 2025-05-11 19:00 (SLA expirou) | manter versioned | conservador; reavaliar 7d |
```

---

## 5. `decisions/ADR-NNNN-titulo.md` (MADR)

```markdown
# ADR-0007 — Manter mutation runner X (não migrar para Y)

* Status: accepted
* Date: 2025-XX-XX
* Deciders: Sêneca (SLA expirado), Maestro, Crítico

## Context and Problem Statement
A unidade U-002 está usando mutation runner X. Y é mais rápido, mas exige
configuração de X para resultados equivalentes. Precisamos decidir agora?

## Considered Options
1. Manter X
2. Migrar para Y
3. Híbrido (manter X em U-002, avaliar Y em U-005)

## Decision Outcome
Chosen option: 1 (manter X), porque **decisão consequente + conservador**.

### Positive Consequences
- Zero risco de regressão em suíte
- Continuidade da trilha

### Negative Consequences
- Velocidade de mutation 2× pior que Y (aceitável: 30 min, não é gargalo)

## Pros and Cons of the Options

### Manter X
- ✅ Zero risco
- ✅ Já conhecido pelo aluno
- ❌ Velocidade pior

### Migrar para Y
- ✅ 2× mais rápido
- ❌ Risco de configuração (1h de overhead)
- ❌ Aluno teria que reaprender a interface

### Híbrido
- ✅ Adia decisão para U-005
- ❌ Inconsistência na trilha (X e Y rodando)

## More Information
- Histórico em event_log
- Bench informal: X leva 28min, Y leva 13min (sem justificativa para 1h de overhead)
```

---

## 6. Modo "Aluno responde SLA" (UX)

Sêneca gera a pergunta no `cycle_report.md` (próxima seção "PRÓXIMO PASSO"):

```
⚠️ PAUSA ABERTA — SLA-2025-05-12-01
Decisão: promover SKILL-007 a promoted?
Opções:
  a) promover
  b) manter versioned (default conservador)
  c) pedir mais evidência
Você pode responder antes de 2025-05-13 08:00 UTC.
Se não responder, Sêneca aplica (b) automaticamente.
```

---

## 7. Quando Sêneca **Escala Imediatamente** (sem SLA)

- Skill promoveu e métrica **piorou** → rollback + alerta
- Trilha libera unidade com pré-req **quebrado** → suspender
- Quota Sócrates **zerada** (aluno não pode mais perguntar) → restaurar
- Mnemosyne detecta **inconsistência** no whiteboard → pausar Maestro

---

*Ver [02_state_machine.md](02_state_machine.md) §3 para a máquina de decisões Sêneca.*
