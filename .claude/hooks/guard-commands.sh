#!/usr/bin/env bash
# AI-native SDLC hook (PreToolUse: Bash)
# Deterministic guardrails for git/secret safety:
#  - no force-push / history rewrite on shared branches
#    (incl. +refspec, +:refspec force-delete, --force=<value>, and remote
#    branch deletion :refspec/--delete/-d)
#  - no staging or committing of credential files
# Defense-in-depth: regex-level, deliberately conservative — a compound command
# that pushes and then deletes a branch elsewhere (long or short -d form) is
# blocked; split the command. Single/double quotes are stripped from the
# command before matching, so quoting a refspec or flag (":main", "+main",
# '--force') cannot evade the token boundaries below.
set -euo pipefail

INPUT="$(cat)"
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"

[ -z "$CMD" ] && exit 0

# Quote normalization (AID-513): remove ' and " so quoted refspecs/flags
# cannot sit between a required token boundary and the token itself.
CMD="${CMD//\"/}"
CMD="${CMD//\'/}"

# 1. Force-push / remote history rewrite / remote branch deletion
#    --force=<v> via ([[:space:]=]|$); +refspec needs a non-digit ref start
#    (avoids false-blocks like `git commit -m "push +1 fix"`); :refspec
#    deletion takes an optional leading + (force-delete) and requires
#    whitespace before it (post quote-normalization); --delete/-d are the
#    long/short forms. `--force-if-includes` (safety option) stays allowed.
if printf '%s' "$CMD" | grep -qE 'git[[:space:]].*push.*(--force(-with-lease)?([[:space:]=]|$)|-f([[:space:]]|$)|-d([[:space:]]|$)|[[:space:]]\+[A-Za-z_*][^[:space:]]*|[[:space:]]\+?:[A-Za-z0-9_*][^[:space:]]*|--delete([[:space:]]|$))'; then
  >&2 echo "BLOCKED: force-push / remote rewrite / remote branch deletion detected."
  >&2 echo "The commit chain is the audit trail of the AI-native SDLC — it must not be rewritten."
  >&2 echo "If this is genuinely required, the owner must run it personally."
  exit 2
fi

# 2. Staging/committing credential-shaped files
#    id_rsa as a path component (start, after space, or after slash: ./id_rsa,
#    secrets/id_rsa) — not just as a bare leading token.
if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+(add|commit)[^;|&]*(\./)?\.?env[^/[:space:]]*|(^|[[:space:]/])id_rsa|[[:space:]][^[:space:]]*\.pem([[:space:]]|$)|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+'; then
  >&2 echo "BLOCKED: command appears to stage, commit, or inline a credential (.env, key, or token)."
  >&2 echo "Secrets never enter the diff. Use environment injection outside the repo."
  exit 2
fi

exit 0
