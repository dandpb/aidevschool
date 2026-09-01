#!/usr/bin/env bash
# SDLC guardrail check over a PR diff (AID-537, wiring the AID-394 hooks).
#
# The hooks in .claude/hooks/ are Claude Code PreToolUse events: no active
# runtime in this company executes them (audit AID-400 Reg#4). This wrapper
# gives the same guardrails a runtime-agnostic home by replaying each changed
# path of the PR diff through the real hook scripts:
#
#   protect-paths.sh   every changed path (A/M/D) is fed as an Edit event;
#                      derived/generated paths (dist/, .mavis/, node_modules/,
#                      ...) must not enter the diff.
#   protect-tests.sh   every changed path is fed as an Edit event run from a
#                      worktree of the merge base, so the hook's "existing
#                      file" test reflects the pre-change tree: modifying an
#                      existing test needs an override; new test files pass
#                      (failing-test-first stays the encouraged flow).
#                      Deletions are also violations here: the hook's stated
#                      intent is "modifying or deleting EXISTING test files
#                      is blocked", but runtime deletions go through Bash and
#                      bypass the Edit|Write|MultiEdit matcher — the diff
#                      closes that gap.
#   guard-commands.sh  added/modified paths are fed as `git add -- <path>`
#                      synthetic commands (credential-shaped paths must not
#                      enter the diff), and added lines are pre-filtered for
#                      token shapes and confirmed through the hook as
#                      `git commit -m <token>` events (secrets never enter
#                      the diff). No override exists for this class, matching
#                      the hook ("secrets never enter the diff").
#
# Declarative overrides (owner acceptance required, AID-531 precedent
# comment 244c2f4c): a commit in the PR range carrying a trailer
#   SDLC-Allow-Test-Edit: <task-record reference>
#   SDLC-Allow-Derived-Edit: <task-record reference>
# downgrades the corresponding violation to a visible ::warning:: annotation.
# The declaration becomes acceptance at the merge gate: main requires an
# approval from someone other than the last pusher.
#
# Usage (CI): bash scripts/ci/sdlc_guard_check.sh
#   SDLC_GUARD_BASE_REF  base ref for the diff (default: main; the workflow
#                        passes the PR base ref). origin/<ref> must exist,
#                        so actions/checkout must use fetch-depth: 0.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.claude/hooks"
BASE_REF="${SDLC_GUARD_BASE_REF:-main}"

fail() { echo "::error::sdlc-guard: $*"; exit 1; }

for h in protect-paths.sh protect-tests.sh guard-commands.sh; do
  [ -f "$HOOKS_DIR/$h" ] || fail "hook $h missing under .claude/hooks/"
done
command -v jq >/dev/null || fail "jq is required"

BASE_COMMIT="$(git rev-parse --verify --quiet "origin/${BASE_REF}^{commit}" || true)"
[ -n "$BASE_COMMIT" ] || fail "origin/${BASE_REF} not found; checkout needs fetch-depth: 0"
MERGE_BASE="$(git merge-base "$BASE_COMMIT" HEAD)"
echo "sdlc-guard: base=origin/${BASE_REF} (${BASE_COMMIT:0:12}) merge-base=${MERGE_BASE:0:12} head=$(git rev-parse --short HEAD)"

# Declarative overrides: trailer scan over the PR commit range.
ALLOW_TEST_EDIT=0
ALLOW_DERIVED_EDIT=0
if git log --format='%B' "$MERGE_BASE..HEAD" | grep -qE '^SDLC-Allow-Test-Edit: .+'; then
  ALLOW_TEST_EDIT=1
  echo "sdlc-guard: override declared (SDLC-Allow-Test-Edit trailer) — test-edit violations downgrade to warnings"
fi
if git log --format='%B' "$MERGE_BASE..HEAD" | grep -qE '^SDLC-Allow-Derived-Edit: .+'; then
  ALLOW_DERIVED_EDIT=1
  echo "sdlc-guard: override declared (SDLC-Allow-Derived-Edit trailer) — derived-path violations downgrade to warnings"
fi

# Pristine worktree of the merge base so protect-tests.sh sees the
# pre-change tree (file existed ⇒ modification/deletion; absent ⇒ new file).
BASE_WT="$(mktemp -d)"
git worktree add --detach --quiet "$BASE_WT" "$MERGE_BASE" 2>/dev/null
cleanup() { git worktree remove --force --quiet "$BASE_WT" 2>/dev/null || rm -rf "$BASE_WT"; }
trap cleanup EXIT

VIOLATIONS=0
WARNINGS=0
HOOK_MSG=""

# run_hook <hook> <cwd> <json> — sets HOOK_MSG to the hook's stderr and
# returns the hook's exit code (0 allow, 2 block).
run_hook() {
  local hook="$1" cwd="$2" json="$3" rc=0
  HOOK_MSG="$(cd "$cwd" && printf '%s' "$json" | bash "$HOOKS_DIR/$hook" 2>&1 >/dev/null)" || rc=$?
  return "$rc"
}

record_violation() { # $1 class, $2 override_flag(0/1), $3 path
  local class="$1" override="$2" path="$3"
  if [ "$override" = "1" ]; then
    WARNINGS=$((WARNINGS + 1))
    echo "::warning::sdlc-guard OVERRIDE DECLARED (${class}): ${path}"
  else
    VIOLATIONS=$((VIOLATIONS + 1))
    echo "::error::sdlc-guard VIOLATION (${class}): ${path}"
  fi
  printf '%s\n' "$HOOK_MSG" | sed 's/^/  /'
}

check_hook_rc() { # $1 rc, $2 hook name, $3 path
  [ "$1" = "0" ] || [ "$1" = "2" ] || fail "$2 returned rc=$1 on '$3' (expected 0 or 2)"
}

# Token shapes worth confirming through guard-commands.sh (high precision:
# these never match prose or the hook's own regex literals, which have a
# '[' right after the prefix).
TOKEN_RE='gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+'

while IFS= read -r -d '' status && IFS= read -r -d '' path; do
  case "$status" in
    A|M|D|T) ;;
    *) fail "unhandled diff status '${status}' for '${path}'" ;;
  esac

  # 1. protect-paths.sh — derived/generated path check, every status.
  payload="$(jq -nc --arg p "$path" '{tool_name:"Edit", tool_input:{file_path:$p}}')"
  rc=0; run_hook protect-paths.sh "$REPO_ROOT" "$payload" || rc=$?
  check_hook_rc "$rc" protect-paths.sh "$path"
  [ "$rc" = "2" ] && record_violation "derived-path" "$ALLOW_DERIVED_EDIT" "$path"

  # 2. protect-tests.sh — existing-test edit/deletion check (base worktree).
  payload="$(jq -nc --arg p "$path" '{tool_name:"Edit", tool_input:{file_path:$p}}')"
  rc=0; run_hook protect-tests.sh "$BASE_WT" "$payload" || rc=$?
  check_hook_rc "$rc" protect-tests.sh "$path"
  [ "$rc" = "2" ] && record_violation "test-edit" "$ALLOW_TEST_EDIT" "$path"

  # 3. guard-commands.sh — credential-shaped paths (A/M only: a deletion
  #    cannot stage a credential into the tree).
  if [ "$status" != "D" ]; then
    payload="$(jq -nc --arg c "git add -- $path" '{tool_name:"Bash", tool_input:{command:$c}}')"
    rc=0; run_hook guard-commands.sh "$REPO_ROOT" "$payload" || rc=$?
    check_hook_rc "$rc" guard-commands.sh "$path"
    [ "$rc" = "2" ] && record_violation "credential-path" 0 "$path"

    # 3b. credential tokens in added content: pre-filter, then confirm
    #     through the hook (authoritative regexes live there).
    while IFS= read -r token; do
      [ -n "$token" ] || continue
      payload="$(jq -nc --arg c "git commit -m $token" '{tool_name:"Bash", tool_input:{command:$c}}')"
      rc=0; run_hook guard-commands.sh "$REPO_ROOT" "$payload" || rc=$?
      check_hook_rc "$rc" guard-commands.sh "$path"
      [ "$rc" = "2" ] && record_violation "credential-token" 0 "$path"
    done < <(git diff "$MERGE_BASE" HEAD -- "$path" | sed -n 's/^+//p' | grep -oE "$TOKEN_RE" | sort -u || true)
  fi
done < <(git diff --name-status --no-renames -z "$MERGE_BASE" HEAD)

echo
echo "sdlc-guard summary: ${VIOLATIONS} violation(s), ${WARNINGS} overridden warning(s)"
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "::error::sdlc-guard: ${VIOLATIONS} guardrail violation(s) in this diff (see above). Fix the diff, or declare an owner-approved override trailer (SDLC-Allow-Test-Edit / SDLC-Allow-Derived-Edit) in a commit message."
  exit 1
fi
echo "sdlc-guard: clean"
exit 0
