#!/usr/bin/env bash
# AI-native SDLC hook (PreToolUse: Bash)
# Deterministic guardrails for git/secret safety:
#  - no force-push / history rewrite on shared branches
#  - no staging or committing of credential files
set -euo pipefail

INPUT="$(cat)"
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"

[ -z "$CMD" ] && exit 0

# 1. Force-push / remote history rewrite
if printf '%s' "$CMD" | grep -qE 'git[[:space:]].*push.*(--force(-with-lease)?|-f)([[:space:]]|$)|git[[:space:]].*push[[:space:]]+.*:-'; then
  >&2 echo "BLOCKED: force-push / remote history rewrite detected."
  >&2 echo "The commit chain is the audit trail of the AI-native SDLC — it must not be rewritten."
  >&2 echo "If this is genuinely required, the owner must run it personally."
  exit 2
fi

# 2. Staging/committing credential-shaped files
if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+(add|commit)[^;|&]*(\./)?\.?env[^/[:space:]]*|[[:space:]]id_rsa[^[:space:]]*|[[:space:]][^[:space:]]*\.pem([[:space:]]|$)|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+'; then
  >&2 echo "BLOCKED: command appears to stage, commit, or inline a credential (.env, key, or token)."
  >&2 echo "Secrets never enter the diff. Use environment injection outside the repo."
  exit 2
fi

exit 0
