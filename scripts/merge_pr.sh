#!/usr/bin/env bash
# merge_pr.sh — the SINGLE MERGE DOOR (AID-2768; CEO decision AID-2763).
#
# Class F (merge without an independent pre-merge verdict — F1 #529, F2 #531,
# F3 #533, merged 94s after a guard HELD citing a VOID countersign) happened
# because `gh pr merge` was a raw call any actor (including the producer on
# the shared credential) could make while the SDLC guard's citation check was
# green-for-the-wrong-reasons. Merges now go through THIS wrapper only:
#
#   1. it refuses to run from anything but an up-to-date main checkout, so
#      the gate logic it enforces is main's, not the PR branch's;
#   2. it re-runs scripts/countersign_gate_check.py LIVE at merge time —
#      the operative citation must come from an AGENT distinct from the
#      producer, pin the CURRENT full 40-hex head, resolve, be the LAST
#      citation, and have no VOID/HELD marker or reopen event after it;
#   3. it requires the 'countersign-gate' check-run to be present AND
#      success on the head (protocol AID-1618 item 2: absence is also a
#      failure state), plus 'SDLC guardrails (diff)';
#   4. it refuses bypass flags (--admin) — enforce_admins is on and the
#      required check cannot be skipped;
#   5. only then it calls the merge API, citing the operative countersign
#      line in the merge commit body.
#
# Runtime enforcement: raw `gh pr merge` is blocked by
# .claude/hooks/guard-commands.sh in Claude runtimes; the required
# 'countersign-gate' status check blocks it on the GitHub side for every
# other actor. The only escape hatch is editing branch protection itself —
# an admin-settings action outside the merge path, recorded in the audit log.
#
# Usage:
#   scripts/merge_pr.sh <PR#> [--merge|--squash|--rebase] [--subject <s>] [--extra-body <b>]
#
# Exit: 0 merged, 1 refused (gate/checks/state), 2 usage or environment error.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$SCRIPT_DIR/countersign_gate_check.py"
SELF="$SCRIPT_DIR/merge_pr.sh"

usage() { sed -n '2,35p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

PR=""
METHOD="--merge"
SUBJECT=""
EXTRA_BODY=""
while [ $# -gt 0 ]; do
  case "$1" in
    [0-9]*) PR="$1"; shift ;;
    --merge|--squash|--rebase) METHOD="$1"; shift ;;
    --admin|--force) echo "REFUSED: '$1' — the countersign gate has no bypass (AID-2768)." >&2; exit 1 ;;
    --subject) SUBJECT="${2:?}"; shift 2 ;;
    --extra-body) EXTRA_BODY="${2:?}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done
[ -n "$PR" ] || usage
command -v gh >/dev/null 2>&1 || { echo "ERROR: gh CLI required" >&2; exit 2; }
[ -f "$GATE" ] || { echo "ERROR: gate script missing: $GATE" >&2; exit 2; }

# --- 1. up-to-date main checkout (gate logic must be main's version) -------
git fetch -q origin main 2>/dev/null || { echo "ERROR: cannot fetch origin/main" >&2; exit 2; }
for f in "$GATE" "$SELF"; do
  if ! git diff --quiet origin/main -- "$(realpath --relative-to="$(git rev-parse --show-toplevel)" "$f" 2>/dev/null || echo "$f")"; then
    echo "REFUSED: $f differs from origin/main — run the merge door from an up-to-date main checkout (AID-2768 §1)." >&2
    exit 1
  fi
done

# --- 2. live countersign gate at merge time ---------------------------------
echo "== countersign gate (live, merge time) =="
if ! python3 "$GATE" --pr "$PR"; then
  echo "REFUSED: countersign gate FAILED — merge blocked (AID-2768). Post a fresh independent countersign comment:" >&2
  echo "  Countersign: <AID|GH>-<n> verdict <commentId> head=<full-40-hex-head>" >&2
  echo "  Provenance: agent=<slug> task=<AID|GH>-<n> run=<runId> session=<sessionId>" >&2
  exit 1
fi

# --- 3. required check-runs present AND success on the head -----------------
HEAD_SHA="$(gh pr view "$PR" --json headRefOid -q .headRefOid)"
SLUG="$(git remote get-url origin | sed -E 's#.*[:/]([^/:]+/[^/]+?)(\.git)?$#\1#')"
checks_json="$(gh api "repos/$SLUG/commits/$HEAD_SHA/check-runs" --paginate 2>/dev/null)"
gate_state="$(printf '%s' "$checks_json" | jq -r '[.[] | select(.name=="countersign-gate")][0].conclusion // "absent"')"
guard_state="$(printf '%s' "$checks_json" | jq -r '[.[] | select(.name=="SDLC guardrails (diff)")][0].conclusion // "absent"')"
if [ "$gate_state" != "success" ] || [ "$guard_state" != "success" ]; then
  echo "REFUSED: required checks on head $HEAD_SHA — countersign-gate=$gate_state, SDLC guardrails (diff)=$guard_state." >&2
  echo "Absence is also a failure state (AID-1618 item 2). Wait for CI / re-run the gate." >&2
  exit 1
fi

# --- 4. PR mergeable ---------------------------------------------------------
state="$(gh pr view "$PR" --json state,mergeable,mergeStateStatus -q '.state + " " + (.mergeable|tostring) + " " + .mergeStateStatus')"
case "$state" in
  OPEN*) ;;
  *) echo "REFUSED: PR not OPEN/mergeable ($state)" >&2; exit 1 ;;
esac

# --- 5. merge, citing the operative countersign line -------------------------
CITE="$(python3 "$GATE" --pr "$PR" --print-citation 2>/dev/null || true)"
BODY="Merged via scripts/merge_pr.sh (single merge door, AID-2768): operative countersign verified live at merge time — countersign agent distinct from producer, head pinned, no VOID/HELD/reopen supersession."
[ -n "$CITE" ] && BODY="$BODY

$CITE"
[ -n "$EXTRA_BODY" ] && BODY="$BODY

$EXTRA_BODY"

echo "== merging PR #$PR ($METHOD) =="
if [ -n "$SUBJECT" ]; then
  gh pr merge "$PR" "$METHOD" --subject "$SUBJECT" --body "$BODY"
else
  gh pr merge "$PR" "$METHOD" --body "$BODY"
fi
rc=$?
if [ $rc -eq 0 ]; then
  echo "== merged. Post-merge obligations: push-run main receipt, Paperclip receipt on the dispatch issue, close/flip the carrier issue (protocol AID-1618 §1)."
fi
exit $rc
