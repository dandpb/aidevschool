#!/usr/bin/env bash
# AI-native SDLC hook (PreToolUse: Edit|Write)
# Playbook Stage 4: "an agent fixing code must not be able to weaken the check
# on that code." Creating NEW test files is allowed (failing-test-first flow);
# modifying or deleting EXISTING test files during a fix is blocked.
# Override: set SDLC_ALLOW_TEST_EDIT=1 with explicit owner approval.
set -euo pipefail

INPUT="$(cat)"
TOOL="$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')"

[ -z "$FILE" ] && exit 0

BASE="$(basename "$FILE")"
IS_TEST=0
case "$BASE" in
  test_*.py|*_test.py|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*.test.js|*.spec.js|*_test.go|test_*.sh) IS_TEST=1 ;;
esac
[[ "$FILE" == */tests/* || "$FILE" == */__tests__/* ]] && IS_TEST=1
[ "$IS_TEST" = "0" ] && exit 0

if [ "${SDLC_ALLOW_TEST_EDIT:-0}" = "1" ]; then
  exit 0
fi

if [ ! -e "$FILE" ]; then
  # New test file — allowed. Failing-test-first is the encouraged flow.
  exit 0
fi

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  >&2 echo "BLOCKED: '$FILE' is an existing test file and this session is changing code that those tests check."
  >&2 echo "Fix the code, not the test. Weakening a check to pass it defeats the evidence gate."
  >&2 echo "If the test itself is genuinely wrong, get explicit owner approval and rerun with SDLC_ALLOW_TEST_EDIT=1."
  exit 2
fi

exit 0
