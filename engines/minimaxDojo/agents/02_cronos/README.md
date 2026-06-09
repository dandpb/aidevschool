# 02 — CRONOS

> **Scheduler de longa duração** — gerencia tarefas recorrentes em background (Pro) e chat interativo (Lightning).

**System prompt:** [`../../prompts/per_agent/cronos.md`](../../prompts/per_agent/cronos.md)

**Quando invocar:**
- Agendar nova tarefa recorrente
- Auditar crons (semanal)
- Reagir a conflito de scheduling

**Contexto isolado:** Acesso ao `cron_registry.yaml` + `event_log`. Não escreve em outras partes do whiteboard.

**Modelo sugerido:** sonnet (tarefas de scheduling simples)
