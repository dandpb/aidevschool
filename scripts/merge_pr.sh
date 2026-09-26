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

# check_state (AID-2818): gh api …/check-runs returns an OBJECT
# {"total_count":N,"check_runs":[…]} (one object per page under --paginate).
# The extraction must flatten .check_runs[] across pages and treat "no such
# check" as "absent" (absence is also a failure state, AID-1618 item 2).
# Iterating the object's values ([.[]]) indexes the total_count NUMBER with
# "name" and aborts jq — which read as empty states and spuriously REFUSED
# PR #545's merge with both checks green (SM AID-2799 §4, 06:44Z).
check_state() { # $1=checks-json $2=check name -> prints conclusion or "absent"
  printf '%s' "$1" | jq -rs --arg n "$2" \
    '[ .[] | .check_runs[]? | select(.name==$n) ][0].conclusion // "absent"'
}

# repo_slug (AID-2836): owner/repo from an origin remote URL. POSIX ERE has
# NO lazy quantifier: the pre-fix 's#.*[:/]([^/:]+/[^/]+?)(\.git)?$#\1#'
# matched greedy, the optional (\.git)? group stayed empty, and remotes
# ending in '.git' yielded 'owner/repo.git' → gh api 404 → stderr discarded
# → both checks read 'absent' while CI was green (SM AID-2799 §4, w2812
# repro; first real §3 exercise refused PR #545's merge). Strip the '.git'
# suffix EXPLICITLY, then reduce to the last two path segments. Runtime §3
# prefers the authoritative 'gh repo view'; this parser is the offline
# fallback and what the self-test pins for BOTH remote forms.
repo_slug() { # $1=origin remote URL -> owner/repo ('.git' stripped)
  printf '%s' "$1" | sed -E -e 's#[/ ]+$##' -e 's#\.git$##' -e 's#^.*[:/]([^/:]+/[^/]+)$#\1#'
}

PR=""
METHOD="--merge"
SUBJECT=""
EXTRA_BODY=""
SELF_TEST=0
while [ $# -gt 0 ]; do
  case "$1" in
    [0-9]*) PR="$1"; shift ;;
    --merge|--squash|--rebase) METHOD="$1"; shift ;;
    --admin|--force) echo "REFUSED: '$1' — the countersign gate has no bypass (AID-2768)." >&2; exit 1 ;;
    --subject) SUBJECT="${2:?}"; shift 2 ;;
    --extra-body) EXTRA_BODY="${2:?}"; shift 2 ;;
    --self-test) SELF_TEST=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done

# Self-test (AID-2818): §3's extraction against the REAL endpoint shape —
# an object {"total_count":N,"check_runs":[…]} per page (gh --paginate
# concatenates them) — plus the absent case. The pre-fix expression ([.[] |
# select(…)]) indexed the total_count NUMBER with "name" and aborted jq,
# which read as empty states and spuriously refused a green PR.
if [ $SELF_TEST -eq 1 ]; then
  pass=0; fail=0
  mk_page() { # $1=name,$2=conclusion,$3=started -> one check-runs page object
    printf '{"total_count":1,"check_runs":[{"name":"%s","conclusion":"%s","started_at":"%s"}]}' "$1" "$2" "$3"
  }
  st_check() { # $1=label $2=expected $3=actual
    if [ "$2" = "$3" ]; then echo "PASS [$1] '$3'"; pass=$((pass+1))
    else echo "FAIL [$1] expected '$2' got '$3'"; fail=$((fail+1)); fi
  }
  two_pages="$(mk_page "countersign-gate" "success" "t1")$(mk_page "SDLC guardrails (diff)" "success" "t2")"
  st_check "object shape extracts countersign-gate" "success" "$(check_state "$two_pages" "countersign-gate")"
  st_check "object shape extracts guardrails"       "success" "$(check_state "$two_pages" "SDLC guardrails (diff)")"
  st_check "missing check reads absent"             "absent"  "$(check_state "$two_pages" "no-such-check")"
  empty_obj='{"total_count":0,"check_runs":[]}'
  st_check "empty check_runs reads absent"          "absent"  "$(check_state "$empty_obj" "countersign-gate")"
  fail_page="$(mk_page "countersign-gate" "failure" "t3")"
  st_check "red conclusion survives extraction"     "failure" "$(check_state "$fail_page" "countersign-gate")"
  # AID-2836: slug extraction must handle BOTH remote forms — with '.git'
  # (the 404-on-gh-api latent defect: the pre-fix ERE kept the suffix) and
  # bare — across https/scp/ssh URL shapes.
  st_check "slug https remote with .git"   "dandpb/aidevschool" "$(repo_slug "https://github.com/dandpb/aidevschool.git")"
  st_check "slug https remote bare"        "dandpb/aidevschool" "$(repo_slug "https://github.com/dandpb/aidevschool")"
  st_check "slug scp remote with .git"     "dandpb/aidevschool" "$(repo_slug "git@github.com:dandpb/aidevschool.git")"
  st_check "slug scp remote bare"          "dandpb/aidevschool" "$(repo_slug "git@github.com:dandpb/aidevschool")"
  st_check "slug ssh remote with .git"     "dandpb/aidevschool" "$(repo_slug "ssh://git@github.com/dandpb/aidevschool.git")"
  st_check "slug trailing slash tolerated" "dandpb/aidevschool" "$(repo_slug "https://github.com/dandpb/aidevschool/")"
  echo "merge_pr self-test (§3 extraction): $pass passed, $fail failed"
  [ $fail -eq 0 ] || exit 1
  exit 0
fi
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
# (extraction via check_state, defined near the header — AID-2818;
#  slug + transport visibility — AID-2836)
HEAD_SHA="$(gh pr view "$PR" --json headRefOid -q .headRefOid)"
[ -n "$HEAD_SHA" ] || { echo "REFUSED: §3 cannot resolve PR head (gh pr view headRefOid empty)." >&2; exit 1; }
# Authoritative slug first (gh repo view resolves canonical owner/repo for
# either remote form); explicit '.git'-stripping parser as offline fallback
# (repo_slug above). Pre-fix, a remote ending in '.git' kept the suffix in
# the slug and §3 404'd on every call.
SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
[ -n "$SLUG" ] || SLUG="$(repo_slug "$(git remote get-url origin)")"
[ -n "$SLUG" ] || { echo "REFUSED: §3 cannot resolve repository slug (gh repo view and remote parse both empty)." >&2; exit 1; }
# Transport failures must be distinguishable from 'absent' (AID-2836): the
# pre-fix '2>/dev/null' turned a 404 into empty json, check_state read
# 'absent' for both checks, and the door fail-closed REFUSING a green PR
# with a misleading reason. Now the gh api stderr is captured and reported.
api_err="$(mktemp)"
checks_json="$(gh api "repos/$SLUG/commits/$HEAD_SHA/check-runs" --paginate 2>"$api_err")"; api_rc=$?
if [ "$api_rc" -ne 0 ]; then
  echo "REFUSED: §3 gh api check-runs TRANSPORT FAILURE (rc=$api_rc, slug=$SLUG, head=$HEAD_SHA) — NOT 'absent': fix the transport and re-run the door." >&2
  sed 's/^/  | /' "$api_err" >&2
  rm -f "$api_err"
  exit 1
fi
rm -f "$api_err"
gate_state="$(check_state "$checks_json" "countersign-gate")"
guard_state="$(check_state "$checks_json" "SDLC guardrails (diff)")"
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
