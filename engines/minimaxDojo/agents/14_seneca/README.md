# 14 — SÊNECA

> **Portão Humano no Loop** (modo auto-escala) — autonomia em ações reversíveis; PAUSA-checkpoint com SLA 24h em decisões consequentes.

**System prompt:** [`../../prompts/per_agent/seneca.md`](../../prompts/per_agent/seneca.md)

**Quando invocar:**
- Decisão consequente detectada (abrir SLA)
- Auto-escala em ação reversível (decidir e logar)
- Auditoria semanal (SLAs, ADRs, decisões)
- Escalação imediata (segurança, regressão)

**Contexto isolado:** Acesso **read-only** ao whiteboard completo. Só escreve em `sla_status.md` + `decisions/` + `event_log`.

**Modelo sugerido:** opus (decisão + auditoria)
