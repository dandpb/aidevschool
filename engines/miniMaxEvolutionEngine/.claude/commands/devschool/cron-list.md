---
description: Lista e audita os crons ativos do Ágora Continuum (mneme.daily, ouroboros.reflect, seneca.audit, mnemosyne.compact, etc). Dispara o subagent cronos em modo listar/auditar. Use quando quiser ver o que está agendado ou rodar a auditoria semanal.
argument-hint: "[acao: listar | auditar]"
---

Registry vivo:
!`cat whiteboard/cron_registry.yaml 2>/dev/null || echo "(sem cron_registry)"`

Se $ARGUMENTS = `auditar`, dispare o subagent **`cronos`** (via Task) com `acao: auditar`.
Senão, dispare com `acao: listar` (default).

Re-leia `engines/minimaxDojo/prompts/per_agent/cronos.md` para:
- Schema do `cron_registry.yaml` (id, frequencia, modo, dono, sessao, ultima_execucao,
  proxima_execucao, output)
- Regras de propriedade única (1 dono, 1 output, 1 gatilho — sem sobreposição)
- Critérios da auditoria semanal:
  - Crons ativos vs total: ≥ 80% ativos
  - Crons duplicados: 0
  - Crons órfãos (sem output): 0
  - Crons atrasados: < 10%
  - Fallback executado corretamente: 100% (se aplicável)
- Saída: `whiteboard/cron_audit.md` + notifica Sêneca se violar

Quando o `cronos` retornar:
- `listar`: apresente a tabela de crons ativos (id, frequencia, dono, próxima execução).
- `auditar`: apresente os critérios + o veredicto (PASS/FAIL por critério). Se algum violar,
  notifique Sêneca (decisão consequente: ajustar frequência, cancelar cron, abrir ADR).

Cronos **NÃO executa** o trabalho — agenda e audita. O dono (Mneme, Mnemosyne, Sêneca, etc.)
é quem faz. Esta separação é o que impede dupla execução.

Sem cron nativo? Veja o fallback em `engines/minimaxDojo/prompts/per_agent/cronos.md` § FALLBACK
— gera `whiteboard/cron_fallback.md` com instruções que o aprendiz dispara manualmente.
