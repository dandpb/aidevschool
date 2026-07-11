#!/usr/bin/env bash
# SessionStart briefing: injeta o estado do pipeline + learning gate no contexto da sessão.
# Registrado em .claude/settings.json. Usa jq para serializar JSON com segurança.
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

status="$(cd "$ROOT" && python3 -m engines.miniMaxEvolutionEngine.os_adapter)"
gate="$(cat "$ROOT/learner/learning_state.yaml" 2>/dev/null || echo '(learner/learning_state.yaml ausente)')"

ctx="🥋 AI DevSchool — Ágora Continuum (Claude Code)

Você é o ORQUESTRADOR (Maestro/Mavis). Delegue aos subagents e rode o portão do verificador entre
as fases. RESPEITE o learning gate: o aprendiz tenta e é avaliado antes de a IA implementar.

=== Pipeline (YAML-first machine state; Markdown only cold-start narrative) ===
${status}

=== Learning gate (learner/learning_state.yaml) ===
${gate}

Próximo passo? Rode /devschool-status para um resumo e a ação recomendada."

if command -v jq >/dev/null 2>&1; then
  jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
else
  # Fallback sem jq: stdout simples (a maioria dos runners do SessionStart o anexa ao contexto).
  printf '%s\n' "$ctx"
fi
