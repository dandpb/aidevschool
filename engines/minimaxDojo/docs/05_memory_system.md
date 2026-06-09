# 🧠 Sistema de Memória (Mnemosyne)

> Memória em **3 camadas** mapeadas nos canais do MiniMax Team Engine. **Núcleo curado pequeno e estável no prompt**; **histórico pesquisável sob demanda**; **Skills versionadas**. Nunca despejar memória bruta.

---

## 1. As 3 Camadas

```
┌──────────────────────────────────────────────────────────┐
│ CAMADA 1 — INTRA-AGENTE (state ephemeral)                 │
│   "a experiência de uma run vira dica na próxima do       │
│    mesmo agente"                                           │
│   Ex.: Mestre-Conteúdo lembra que aluno travou em         │
│   property-based testing; gera variação com mais andaime. │
├──────────────────────────────────────────────────────────┤
│ CAMADA 2 — HANDOFF FILES (entre agentes)                 │
│   arquivos .md legíveis,schemas fixos,gerados 1x por     │
│   handoff, lidos por outro agente em outra sessão.        │
│   Ex.: unit_spec.md (Maestro→Mestre), submission.md      │
│   (Mestre→PROMĘTOR), verdict.md (PROMĘTOR→Maestro).     │
├──────────────────────────────────────────────────────────┤
│ CAMADA 3 — WHITEBOARD / NOTEPAD (compartilhado, persistente)│
│   Perfil vivo do aluno, recuperável entre sessões longas.│
│   TaskState + Dreyfus×Bloom + pegadinhas + decision      │
│   records + event log + Skills.                          │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Whiteboard — Estrutura

```
whiteboard/
├── learner_profile.md         # Perfil vivo (TaskState completo)
├── decisions/
│   ├── ADR-0001-escolha-mutation-runner.md
│   ├── ADR-0002-exception-vs-result.md
│   └── ...
├── event_log/
│   ├── events-2025-W20.ndjson
│   ├── events-2025-W21.ndjson
│   └── ...
├── skills/
│   ├── SKILL-007-extract-method.md          (state: draft)
│   ├── SKILL-012-property-based-ids.md      (state: promoted)
│   └── ...
├── handoffs/                   # última semana; mais antigo arquivado
│   ├── U-007.submission.md
│   ├── U-007.verdict.md
│   └── ...
└── context_pack.md             # snapshot mínimo (curado) p/ injetar no prompt
```

### 2.1 `learner_profile.md` (template)

```yaml
---
id: aluno-001
created: 2025-XX-XX
updated: 2025-XX-XX
---

# Perfil do Aluno

## Estado Global
- linguagem_foco: <LINGUAGEM_FOCO>
- tempo_semanal: 5h
- dreyfus_global: advanced_beginner
- bloom_global: apply
- ai_dependency_index: 0.34
- socrates_quota_today: 7 / 15

## Unidades
| ID | Título | Estado | Dreyfus | Bloom | Mutation | Cobertura | Última | Próxima revisão |
|----|--------|--------|---------|-------|----------|-----------|--------|------------------|
| U-001 | TDD baby steps | DOMINADO | competent | apply | 0.72 | 0.91 | 2025-XX-XX | +7d |
| U-002 | Mutation testing | PRATICANDO | advanced_beginner | analyze | 0.42 | 0.85 | — | — |
| U-003 | Code smells | APRESENTANDO | — | — | — | — | — | — |

## Lacunas Comprovadas (Sonda)
1. Confuso em property-based testing (mutation sobrevive em IDs)
2. Não diferencia exception tipada de "raise Exception"
3. Review aponta o quê, mas raramente o porquê

## Pegadinhas (top 5)
1. mock que retorna valor esperado
2. try/except: pass
3. retry sem jitter
4. ADR com 1 alternativa só
5. print em vez de logger

## Skills Ativas
- SKILL-007 (extract method)
- SKILL-012 (property-based IDs)

## Próxima Unidade
U-003 (Code smells & refactoring) — pré-req U-002 OK quando mutation ≥ 0.65
```

### 2.2 `event_log/events-<semana>.ndjson`

```json
{"ts":"2025-05-12T08:01:00Z","agente":"maestro","ev":"unit.start","unit":"U-002","payload":{}}
{"ts":"2025-05-12T08:12:30Z","agente":"mestre-conteudo","ev":"submission.delivered","unit":"U-002"}
{"ts":"2025-05-12T08:13:00Z","agente":"prometor","ev":"verdict","unit":"U-002","verdict":"FAIL","mutation":0.42,"gaps":["GAP-01","GAP-02"]}
{"ts":"2025-05-12T08:14:00Z","agente":"maestro","ev":"retry","unit":"U-002","n":1}
{"ts":"2025-05-12T08:30:00Z","agente":"ouroboros","ev":"pegadinha.recorded","key":"mock-returns-expected","from":"U-002"}
{"ts":"2025-05-12T08:30:00Z","agente":"mnemosyne","ev":"whiteboard.updated","key":"learner_profile"}
```

### 2.3 `skills/SKILL-NNN-titulo.md` (template)

```markdown
---
id: SKILL-007
titulo: Extract Method para reduzir CC > 10
estado: promoted            # draft | review | versioned | promoted | deprecated
versao: 3
criado: 2025-XX-XX
promovido: 2025-XX-XX
agentes_que_usam: [mestre-conteudo, critico]
evidencia: mutation_score_subiu_de_0.55_para_0.68_em_3_usos
---

# SKILL-007 — Extract Method para reduzir CC > 10

## Quando aplicar
- Função com CC > 10
- Múltiplos níveis de abstração na mesma função
- Teste do aluno tem 5+ asserts "porque a função faz tudo"

## Como aplicar
1. Identificar blocos com 1 responsabilidade clara
2. Extrair mantendo **comportamento** (verificar com suíte)
3. Nomear pelo **o que faz**, não pelo **como**
4. Cobrir função extraída com teste próprio
5. Verificar CC da original e da nova

## Anti-aplicação
- Não extrair 1-liners só pra "diminuir CC"
- Não extrair se a função extraída tem dependência implícita do contexto
- Não extrair antes de ter teste

## Evidência
- U-003: CC 14 → 7, mutation 0.55 → 0.68
- U-007: usado em review (3 achados)

## Histórico
- v1: 2025-XX-XX (draft)
- v2: 2025-XX-XX (review → versioned)
- v3: 2025-XX-XX (promoted após 3 usos sem regressão)
```

---

## 3. Política de Curadoria do Núcleo

### 3.1 O que vai **sempre** no system prompt
- Princípio central (state machine + portão empírico)
- Lista dos 14 agentes (1 linha cada)
- Trilha atual (unidades desbloqueadas + próximas)
- **3–5 pegadinhas mais recentes** (rotativas, não cumulativas)
- **3–5 skills ativas** (rotativas)
- ai_dependency_index

### 3.2 O que vai **sob demanda**
- Histórico completo de unidades
- Histórico de eventos
- Skills deprecated
- ADRs antigos
- Pegadinhas resolvidas há > 30 dias

### 3.3 Compactação Semanal (CRONOS + Mnemosyne)
- Domingos: compacta `event_log` da semana em `events-<semana>.ndjson`
- Move handoffs com > 7 dias para `whiteboard/archive/`
- Re-avalia pegadinhas resolvidas (> 30 dias sem aparecer)
- Re-avalia skills deprecated (candidatas a remover)

---

## 4. Privacidade e Escopo

- Whiteboard é **do aluno** — não compartilhar entre alunos.
- Handoffs podem conter código de exemplo: manter no escopo do aluno.
- Skills versionadas **são** compartilháveis (são padrões pedagógicos, não dados do aluno).
- Auditoria (Sêneca) tem acesso **read-only** ao whiteboard.

---

*Ver [06_metrics_quality_gate.md](06_metrics_quality_gate.md) para como a Atena consome o whiteboard.*
