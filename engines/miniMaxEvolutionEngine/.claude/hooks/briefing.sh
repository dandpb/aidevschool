#!/usr/bin/env bash
# SessionStart briefing: injeta o estado do pipeline + learning gate no contexto da sessão.
# Registrado em .claude/settings.json. Usa jq para serializar JSON com segurança.
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# O módulo os_adapter só é importável a partir da raiz do repositório. Quando o Claude Code
# é aberto na raiz do próprio engine (modo documentado no README "Run it"), CLAUDE_PROJECT_DIR
# aponta para o engine dir; resolva o toplevel do git para manter o briefing funcional.
if ! (cd "$ROOT" && python3 -c "import engines.miniMaxEvolutionEngine.os_adapter" >/dev/null 2>&1); then
  TOP="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
  ROOT="${TOP:-$ROOT}"
fi

status="$(cd "$ROOT" && python3 -m engines.miniMaxEvolutionEngine.os_adapter 2>/dev/null \
  || echo "(os_adapter indisponível: execute a partir da raiz do repositório)")"
gate="$(cat "$ROOT/learner/learning_state.yaml" 2>/dev/null || echo '(learner/learning_state.yaml ausente)')"

ctx="🥋 AI DevSchool — Ágora Continuum (Claude Code)

Você é o ORQUESTRADOR (Maestro/Mavis). Delegue aos subagents e rode o portão do verificador entre
as fases. RESPEITE o learning gate: o aprendiz tenta e é avaliado antes de a IA implementar.

=== Pipeline (YAML-first machine state; Markdown only cold-start narrative) ===
${status}

=== Learning gate (learner/learning_state.yaml) ===
${gate}

=== Supervisor status/recovery (read-only first) ===
Rode rtk python3 -m engines.miniMaxEvolutionEngine.supervisor status para ver action, reason, pending
request, lease, retries e blocker. Use reconcile/fail/block/resume somente como recuperação explícita.
SessionStart nunca inicia tick, poll, execute ou processo de modelo autônomo.

Próximo passo? Rode /devschool-status para o workflow recomendado e supervisor status para o estado
operacional, sem escrever nos arquivos canônicos."

if command -v jq >/dev/null 2>&1; then
  jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
else
  # Fallback sem jq: stdout simples (a maioria dos runners do SessionStart o anexa ao contexto).
  printf '%s\n' "$ctx"
fi
