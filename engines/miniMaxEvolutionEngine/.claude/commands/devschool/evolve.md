---
description: Loop de auto-melhoria do Ouroboros ao fim do ciclo — reflect→critique→revise, transforma tropeços em pegadinhas (Mneme) e acertos em Skills (PR). Mede Δ a jusante antes de aceitar melhoria.
argument-hint: "(sem args)"
---

Estado:
!`cat learner/pipeline_status.md 2>/dev/null || echo "(sem status)"`

Pré-condição: ciclo atual com `prometor.PASS` + `critico.OK` (unidade em DOMINADO ou caminho).
Você é o **Orquestrador (Maestro)**. Este comando dispara o subagent **`ouroboros`**.

1. Leia `whiteboard/reflexao_aluno` (se existir) e `whiteboard/metrics_snapshot.md` (da Atena).
2. Despache o subagent **`ouroboros`** com o contexto da unidade recém-dominada:
   - o que foi aprendido (PLAN), o que foi feito (ACT), a reflexão do aluno (REFLECT),
   - o Δ de desempenho a jusante (CRITIQUE — antes/depois da métrica real, não atividade).
3. Aplique as saídas do Ouroboros:
   - **Tropeços recorrentes** → `whiteboard/pegadinhas/<chave>.md` + dispare `mneme` para
     agendar revisão espaçada.
   - **Acertos recorrentes (≥3 usos sem regressão)** → `whiteboard/skills/SKILL-NNN-titulo.md`
     como PR draft (status: `draft`). **Não promova** — promoção é decisão do Sêneca (SLA 24h).
4. Se Δ a jusante ≤ 0 (a intervenção não melhorou o desempenho real) **por 2+ ciclos seguidos**,
   escale ao **Sêneca** (mudança pedagógica, SLA 24h).
5. Logue tudo em `whiteboard/event_log/events-<semana>.ndjson` com
   `{"ev":"ouroboros.revise","unit":<id>,"pegadinhas":[...],"skills_draft":[...]}`.

> Regra de ouro: o sistema só se considera "melhorando" quando o sinal mostra que a intervenção
> elevou o desempenho real — não por métricas de atividade.
