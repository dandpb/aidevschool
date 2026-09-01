#!/usr/bin/env bash
# AI-native SDLC hook (PostToolUse: Edit|Write)
# Keeps the verify-your-own-work loop visible: after each source edit, print
# the single command that verifies the touched surface (from AGENTS.md
# COMMANDS). Advisory only — fast, scoped to the file that changed.
set -euo pipefail

INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')"

[ -z "$FILE" ] && exit 0

suggest() { echo "sdlc: before reporting done, run and paste output → $1"; exit 0; }

case "$FILE" in
  *engines/codexDojo/*)                  suggest "cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build" ;;
  *engines/codexdojo-os-prototype/*)     suggest "cd engines/codexdojo-os-prototype && npm run lint && npm run test && npm run build && npm run test:smoke" ;;
  *engines/literacyDojo/*|*curriculum/ai-literacy/*) suggest "regenerate read model, then: cd engines/literacyDojo && npm run lint && npm run test && npm run build" ;;
  *engines/miniTown/*)                   suggest "cd engines/miniTown && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke" ;;
  *engines/pixelDojo/*)                  suggest "cd engines/pixelDojo && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke" ;;
  *engines/voxelDojo/*)                  suggest "cd engines/voxelDojo && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke" ;;
  *engines/minimaxDojo/*)                suggest "make test-core" ;;
  *engines/openclaw/*)                   suggest "python3 -m pytest engines/openclaw/tests/" ;;
  *learner/*)                            suggest "make test-substrate && python3 -m learner.substrate" ;;
  *curriculum/*)                         suggest "the project's own test suite (see curriculum/<project>/README)" ;;
  *) exit 0 ;;
esac
