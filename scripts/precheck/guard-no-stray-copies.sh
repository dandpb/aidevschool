#!/usr/bin/env bash
# Stray precheck-copy guard (AID-1831, audit AID-1526 §3.1 follow-up).
#
# The canonical promotion precheck lives in scripts/precheck/ (AID-1556:
# versioned baseline + self-test + per-wave anchor configs). The historical
# copy-per-wave pattern — a new precheck-<sha>.mjs per wave, drifted silently
# from AID-821 to AID-935 — must not come back. This guard fails CI when a
# NEW precheck-*.mjs appears anywhere outside scripts/precheck/, and freezes
# the pre-existing historical receipts in a baseline (same ratchet model as
# scripts/python_complexity_baseline.txt: the list may only shrink).
#
# The recipe for a new wave is scripts/precheck/README.md §"Adding a wave":
# copy the closest WAVE CONFIG (waves/<AID>-<pin7>.json), adjust anchors,
# --dry-run, PR. Receipts (txt/md) under _work-products/<onda>/ stay allowed —
# only new gate SCRIPT copies are blocked.
#
# Usage:
#   scripts/precheck/guard-no-stray-copies.sh [--repo <dir>] [--baseline <file>]
#   scripts/precheck/guard-no-stray-copies.sh --self-test
#
# Exit: 0 clean, 1 stray copies found, 2 usage/environment error.

set -uo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
DEFAULT_BASELINE="$(dirname "$SCRIPT_PATH")/stray-copies-baseline.txt"
BASELINE="$DEFAULT_BASELINE"
REPO_ARG=""
SELF_TEST=0

usage() {
  sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO_ARG="${2:?}"; shift 2 ;;
    --baseline) BASELINE="${2:?}"; shift 2 ;;
    --self-test) SELF_TEST=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done

run_guard() { # $1=repo dir, $2=baseline file -> 0/1
  local repo="$1" baseline="$2"
  local root
  root="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)" || {
    echo "ERROR: not a git repository: $repo" >&2
    return 2
  }
  [ -f "$baseline" ] || {
    echo "ERROR: baseline file missing: $baseline" >&2
    return 2
  }

  # Tracked files that look like a precheck gate script, outside the
  # canonical scripts/precheck/ tree.
  local -a strays=()
  local p
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in
      scripts/precheck/*) continue ;;
    esac
    if ! grep -qxF "$p" "$baseline"; then
      strays+=("$p")
    fi
  done < <(git -C "$root" ls-files | grep -E '(^|/)precheck[^/]*\.mjs$' || true)

  if [ "${#strays[@]}" -gt 0 ]; then
    local s
    for s in "${strays[@]}"; do
      echo "::error::stray precheck copy: $s (canonical gate is scripts/precheck/ — see scripts/precheck/README.md \"Adding a wave\"; historical receipts are frozen in $(basename "$baseline"))"
      echo "VIOLATION: stray precheck copy: $s" >&2
    done
    echo "precheck-stray-guard: ${#strays[@]} stray copy(ies) — see above" >&2
    return 1
  fi
  echo "precheck-stray-guard: clean (no precheck gate scripts outside scripts/precheck/ beyond the frozen baseline)"
  return 0
}

self_test() {
  local T pass=0 fail=0
  T="$(mktemp -d "${TMPDIR:-/tmp}/precheck-stray-guard.XXXXXX")"
  local R="$T/repo"
  git init -q "$R"
  local GITC="git -C $R -c user.name=selftest -c user.email=selftest@example.invalid"
  mkdir -p "$R/scripts/precheck" "$R/_work-products/AID-1"
  printf 'export {}\n' > "$R/scripts/precheck/precheck.mjs"
  printf '// historical receipt copy\n' > "$R/_work-products/AID-1/precheck-aaaaaaa.mjs"
  printf '_work-products/AID-1/precheck-aaaaaaa.mjs\n' > "$T/baseline.txt"
  $GITC add -A >/dev/null && $GITC commit -qm base

  local out rc

  # 1. baseline-conformant tree passes.
  out="$(bash "$SCRIPT_PATH" --repo "$R" --baseline "$T/baseline.txt" 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then pass=$((pass+1)); echo "PASS [frozen historical copy allowed] rc=$rc"
  else fail=$((fail+1)); echo "FAIL [frozen historical copy allowed] rc=$rc"; printf '%s\n' "$out" | sed 's/^/    | /'; fi

  # 2. a NEW stray copy at the repo root fails (the AID-462 root-relic shape).
  printf '// new drifted copy\n' > "$R/precheck-bbbbbbb.mjs"
  $GITC add -A >/dev/null && $GITC commit -qm "add stray copy"
  out="$(bash "$SCRIPT_PATH" --repo "$R" --baseline "$T/baseline.txt" 2>&1)"; rc=$?
  if [ "$rc" -eq 1 ]; then pass=$((pass+1)); echo "PASS [new stray copy fails] rc=$rc"
  else fail=$((fail+1)); echo "FAIL [new stray copy fails] rc=$rc expected 1"; printf '%s\n' "$out" | sed 's/^/    | /'; fi
  git -C "$R" rm -q precheck-bbbbbbb.mjs && $GITC commit -qm "remove stray copy"

  # 3. canonical-tree additions pass (the wave-recipe shape: new files under
  #    scripts/precheck/, e.g. wave configs or lib changes, never strays).
  mkdir -p "$R/scripts/precheck/waves"
  printf '{}\n' > "$R/scripts/precheck/waves/AID-2-ccccccc.json"
  $GITC add -A >/dev/null && $GITC commit -qm "add wave config"
  out="$(bash "$SCRIPT_PATH" --repo "$R" --baseline "$T/baseline.txt" 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then pass=$((pass+1)); echo "PASS [canonical tree additions allowed] rc=$rc"
  else fail=$((fail+1)); echo "FAIL [canonical tree additions allowed] rc=$rc"; printf '%s\n' "$out" | sed 's/^/    | /'; fi

  # 4. baseline shrink (cleanup of a historical receipt) keeps passing.
  : > "$T/baseline.txt"
  out="$(bash "$SCRIPT_PATH" --repo "$R" --baseline "$T/baseline.txt" 2>&1)"; rc=$?
  if [ "$rc" -eq 1 ]; then pass=$((pass+1)); echo "PASS [empty baseline re-flags unfrozen copies] rc=$rc"
  else fail=$((fail+1)); echo "FAIL [empty baseline re-flags unfrozen copies] rc=$rc expected 1"; printf '%s\n' "$out" | sed 's/^/    | /'; fi

  rm -rf "$T"
  echo "self-test: $pass passed, $fail failed"
  [ "$fail" -eq 0 ] || return 1
  return 0
}

if [ "$SELF_TEST" -eq 1 ]; then
  self_test
  exit $?
fi

run_guard "${REPO_ARG:-.}" "$BASELINE"
exit $?
