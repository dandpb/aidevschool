#!/usr/bin/env bash
# SDLC guardrail diff checker (AID-537, audit AID-400 Registro #4).
#
# The .claude/hooks/*.sh guardrails (protect-paths / protect-tests /
# guard-commands) are PreToolUse hooks: only a Claude Code runtime executes
# them. This wrapper makes the SAME canonical hook scripts enforce the
# committed diff, so a violating change fails CI no matter which runtime
# produced it (opencode, Claude Code, a human editor, ...).
#
# How it maps diff -> hook inputs (the hooks stay the single source of truth;
# this script only synthesizes their stdin contract):
#
#   protect-paths.sh  every Added/Modified path is fed as an Edit tool_input
#                     (pure path-pattern check). Deletions are skipped:
#                     removing a derived artifact is cleanup, not hand-editing.
#   protect-tests.sh  every Added/Modified/Deleted path is fed as an Edit
#                     tool_input against an "existence mirror": paths that
#                     existed in the base are materialized under a temp root,
#                     added paths are not. That reproduces the hook's
#                     new-test-allowed / existing-test-blocked semantics.
#   guard-commands.sh the credential rule is mapped post-hoc: each changed
#                     path is fed as `git add <path>`, and added diff lines
#                     that look like real tokens (gho_…, github_pat_…) are fed
#                     as commands. The force-push rule guards a live git
#                     operation and cannot be checked after the fact; it stays
#                     a runtime/owner concern.
#
# Owner-approved overrides (same trust model as the live env-var overrides):
# a commit in the range carrying a trailer
#     SDLC-ALLOW-TEST-EDIT: AID-<n>
#     SDLC-ALLOW-DERIVED-EDIT: AID-<n>
# suppresses the corresponding check for that range. The trailer is only the
# audit hook — the cited AID issue must record the actual owner acceptance,
# and the reviewer verifies that. The credential rule has NO override.
#
# Usage:
#   scripts/sdlc_guard_check.sh [--base <ref>] [--head <ref>] [--repo <dir>]
#   scripts/sdlc_guard_check.sh --self-test
#
# Exit: 0 clean, 1 violations, 2 usage/environment error.

set -uo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
BASE_REF="origin/main"
HEAD_REF="HEAD"
REPO_ARG=""
SELF_TEST=0

usage() {
  sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE_REF="${2:?}"; shift 2 ;;
    --head) HEAD_REF="${2:?}"; shift 2 ;;
    --repo) REPO_ARG="${2:?}"; shift 2 ;;
    --self-test) SELF_TEST=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done

REPO_ROOT="$(git -C "${REPO_ARG:-.}" rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: not a git repository: ${REPO_ARG:-.}" >&2
  exit 2
}
HOOKS_DIR="$REPO_ROOT/.claude/hooks"
for hook in protect-paths.sh protect-tests.sh guard-commands.sh; do
  [ -f "$HOOKS_DIR/$hook" ] || {
    echo "ERROR: canonical hook missing: $HOOKS_DIR/$hook" >&2
    exit 2
  }
done
command -v jq >/dev/null || { echo "ERROR: jq is required (the hooks parse JSON with it)" >&2; exit 2; }

# ---------------------------------------------------------------------------
# Core check: runs the three canonical hooks against the diff range.
# Sets FAILURES (count) and prints one ::error line per violation.
# ---------------------------------------------------------------------------
run_checks() {
  local base_ref="$1" head_ref="$2"
  local base_sha mbase
  base_sha="$(git -C "$REPO_ROOT" rev-parse --verify -q "$base_ref^{commit}")" || {
    echo "ERROR: cannot resolve base ref '$base_ref'" >&2
    return 2
  }
  mbase="$(git -C "$REPO_ROOT" merge-base "$base_sha" "$head_ref" 2>/dev/null)" || {
    echo "ERROR: no merge-base between '$base_ref' and '$head_ref'" >&2
    return 2
  }
  [ -n "$mbase" ] || { echo "ERROR: empty merge-base" >&2; return 2; }

  # Owner-approved override trailers present anywhere in the commit range.
  local range_bodies allow_test=0 allow_derived=0
  range_bodies="$(git -C "$REPO_ROOT" log --format='%B' "$mbase..$head_ref")" || return 2
  if printf '%s' "$range_bodies" | grep -qE '^SDLC-ALLOW-TEST-EDIT: AID-[0-9]+'; then
    allow_test=1
    echo "::notice::SDLC-ALLOW-TEST-EDIT trailer found in commit range — owner-approved test edit (verify the cited AID issue records the acceptance)"
  fi
  if printf '%s' "$range_bodies" | grep -qE '^SDLC-ALLOW-DERIVED-EDIT: AID-[0-9]+'; then
    allow_derived=1
    echo "::notice::SDLC-ALLOW-DERIVED-EDIT trailer found in commit range — owner-approved derived-path edit (verify the cited AID issue records the acceptance)"
  fi

  local mirror
  mirror="$(mktemp -d "${TMPDIR:-/tmp}/sdlc-guard-mirror.XXXXXX")"
  trap 'rm -rf "$mirror"' RETURN

  # Existence mirror: paths that existed in the base get materialized so
  # protect-tests.sh sees them as "existing test files". Added paths stay
  # absent, which is exactly the hook's new-file allowance.
  local -a added=() modified=() deleted=()
  local st path
  while read -r -d '' st && read -r -d '' path; do
    case "$st" in
      A) added+=("$path") ;;
      M) modified+=("$path"); mkdir -p "$mirror/$(dirname "$path")"; : > "$mirror/$path" ;;
      D) deleted+=("$path"); mkdir -p "$mirror/$(dirname "$path")"; : > "$mirror/$path" ;;
      *) echo "::warning::unhandled diff status '$st' for '$path' (skipped)" ;;
    esac
  done < <(git -C "$REPO_ROOT" diff --name-status --no-renames --diff-filter=ADM -z "$mbase" "$head_ref")

  local -a violations=()
  local hook_rc hook_out

  feed_hook() { # $1=hook $2=tool $3=file -> sets hook_rc/hook_out
    local input
    input="$(jq -nc --arg t "$2" --arg f "$3" '{tool_name:$t, tool_input:{file_path:$f}}')"
    hook_out="$(printf '%s' "$input" | bash "$HOOKS_DIR/$1" 2>&1)"; hook_rc=$?
  }

  feed_command_hook() { # $1=command -> sets hook_rc/hook_out
    local input
    input="$(jq -nc --arg c "$1" '{tool_input:{command:$c}}')"
    hook_out="$(printf '%s' "$input" | bash "$HOOKS_DIR/guard-commands.sh" 2>&1)"; hook_rc=$?
  }

  local f
  # 1. protect-paths on added+modified (deletions are cleanup, see header).
  if [ "$allow_derived" -eq 0 ]; then
    for f in "${added[@]}" "${modified[@]}"; do
      [ -n "$f" ] || continue
      feed_hook protect-paths.sh Edit "$mirror/$f"
      if [ "$hook_rc" -eq 2 ]; then violations+=("protect-paths: $f :: $(printf '%s' "$hook_out" | head -1)")
      elif [ "$hook_rc" -ne 0 ]; then violations+=("protect-paths: $f :: hook error rc=$hook_rc: $(printf '%s' "$hook_out" | head -1)")
      fi
    done
  else
    echo "notice: derived-path check skipped for this range (owner-approved trailer)"
  fi

  # 2. protect-tests on added+modified+deleted (existence mirror gives the
  #    new-vs-existing semantics; deletions are materialized = blocked).
  if [ "$allow_test" -eq 0 ]; then
    for f in "${added[@]}" "${modified[@]}" "${deleted[@]}"; do
      [ -n "$f" ] || continue
      feed_hook protect-tests.sh Edit "$mirror/$f"
      if [ "$hook_rc" -eq 2 ]; then violations+=("protect-tests: $f :: $(printf '%s' "$hook_out" | head -1)")
      elif [ "$hook_rc" -ne 0 ]; then violations+=("protect-tests: $f :: hook error rc=$hook_rc: $(printf '%s' "$hook_out" | head -1)")
      fi
    done
  else
    echo "notice: test-edit check skipped for this range (owner-approved trailer)"
  fi

  # 3. guard-commands credential mapping. No override: secrets never enter
  #    the diff.
  for f in "${added[@]}" "${modified[@]}"; do
    [ -n "$f" ] || continue
    feed_command_hook "git add $f"
    if [ "$hook_rc" -eq 2 ]; then violations+=("guard-commands: $f :: credential-shaped path (no override)")
    elif [ "$hook_rc" -ne 0 ]; then violations+=("guard-commands: $f :: hook error rc=$hook_rc: $(printf '%s' "$hook_out" | head -1)")
    fi
  done
  # Added lines that contain token-shaped secrets. The tokens are built at
  # runtime in the self-test on purpose: a literal token in this file would
  # trip this very scan on the checker's own PR.
  local line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    if printf '%s' "$line" | grep -qE 'gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+'; then
      feed_command_hook "$line"
      if [ "$hook_rc" -eq 2 ]; then violations+=("guard-commands: added diff line :: committed secret token (no override)")
      fi
    fi
  done < <(git -C "$REPO_ROOT" diff --diff-filter=AM -U0 "$mbase" "$head_ref" | grep '^+' | grep -v '^+++')

  # Report.
  local total=$(( ${#added[@]} + ${#modified[@]} + ${#deleted[@]} ))
  echo "sdlc-guard: ${#added[@]} added, ${#modified[@]} modified, ${#deleted[@]} deleted file(s) vs $mbase"
  if [ "${#violations[@]}" -gt 0 ]; then
    local v
    for v in "${violations[@]}"; do
      echo "::error::$v"
      echo "VIOLATION: $v" >&2
    done
    echo "sdlc-guard: ${#violations[@]} violation(s) — see above"
    return 1
  fi
  echo "sdlc-guard: clean (protect-paths, protect-tests, guard-commands all pass)"
  return 0
}

# ---------------------------------------------------------------------------
# Self-test: synthetic repositories exercising every mapped rule, including
# the owner-override trailers. Runs the REAL hooks (copied into the scratch
# repo) so the check proves the enforcement path end to end.
# ---------------------------------------------------------------------------
self_test() {
  local T R pass=0 fail=0
  T="$(mktemp -d "${TMPDIR:-/tmp}/sdlc-guard-selftest.XXXXXX")"
  R="$T/repo"
  git init -q "$R"
  mkdir -p "$R/.claude"
  cp -r "$HOOKS_DIR" "$R/.claude/hooks"

  local GITC="git -C $R -c user.name=selftest -c user.email=selftest@example.invalid"

  mkdir -p "$R/tests/unit" "$R/dist" "$R/.loops" "$R/src"
  printf 'def test_a():\n    assert True\n' > "$R/tests/unit/test_a.py"
  printf 'generated\n' > "$R/dist/generated.js"
  printf 'loop memory\n' > "$R/.loops/memory.md"
  printf 'app\n' > "$R/src/app.py"
  $GITC add -A >/dev/null
  $GITC commit -qm "base"
  local base_sha
  base_sha=$($GITC rev-parse HEAD)

  # scenario <name> <expected-rc> <commit-message> -- <setup-cmds...>
  scenario() {
    local name="$1" expected="$2" msg="$3"; shift 3; [ "${1:-}" = "--" ] && shift
    local br="st-$RANDOM"
    $GITC checkout -q -b "$br" "$base_sha"
    local c
    for c in "$@"; do ( cd "$R" && eval "$c" ); done
    $GITC add -A >/dev/null
    $GITC commit -qm "$msg"
    local out rc
    out="$(bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$br" 2>&1)"; rc=$?
    if [ "$rc" -eq "$expected" ]; then
      echo "PASS [$name] rc=$rc (expected $expected)"
      pass=$((pass+1))
    else
      echo "FAIL [$name] rc=$rc expected $expected"
      printf '%s\n' "$out" | sed 's/^/    | /'
      fail=$((fail+1))
    fi
    $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
    $GITC branch -qD "$br" >/dev/null
  }

  # Runtime-built token: never a literal in this file (see comment above).
  local FAKE_TOKEN="gho_$(printf 'a%.0s' $(seq 1 30))"

  scenario "clean add + new test file allowed"        0 "clean" -- \
    "printf 'x\n' > src/new.py" \
    "mkdir -p tests/unit && printf 'def test_new():\n    assert True\n' > tests/unit/test_new.py"
  scenario "modify existing test"                     1 "touch test" -- \
    "printf 'def test_a():\n    assert False\n' > tests/unit/test_a.py"
  scenario "delete existing test"                     1 "drop test" -- \
    "rm tests/unit/test_a.py"
  scenario "edit derived dist/ artifact"              1 "hand-edit dist" -- \
    "printf 'hand edited\n' >> dist/generated.js"
  scenario "edit derived .loops/ memory"              1 "hand-edit loops" -- \
    "printf 'hand edited\n' >> .loops/memory.md"
  scenario "add credential-shaped path (.env)"        1 "oops env" -- \
    "mkdir -p config && printf 'SECRET=1\n' > config/.env"
  scenario "add credential-shaped path (id_rsa)"      1 "oops key" -- \
    "mkdir -p keys && printf 'bogus\n' > keys/id_rsa"
  scenario "commit secret token in content"           1 "oops token" -- \
    "printf 'token = %s\n' \"$FAKE_TOKEN\" > src/creds.py"
  scenario "owner-approved test edit (trailer)"       0 "fix test

SDLC-ALLOW-TEST-EDIT: AID-9001" -- \
    "printf 'def test_a():\n    assert 1 == 1\n' > tests/unit/test_a.py"
  scenario "owner-approved derived edit (trailer)"    0 "regen loops

SDLC-ALLOW-DERIVED-EDIT: AID-9002" -- \
    "printf 'regenerated\n' > .loops/memory.md"

  rm -rf "$T"
  echo "self-test: $pass passed, $fail failed"
  [ "$fail" -eq 0 ] || return 1
  return 0
}

if [ "$SELF_TEST" -eq 1 ]; then
  self_test
  exit $?
fi

run_checks "$BASE_REF" "$HEAD_REF"
exit $?
