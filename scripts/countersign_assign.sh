#!/usr/bin/env bash
# countersign_assign.sh — the COUNTERSIGN ASSIGNMENT DOOR with dedup (AID-2844).
#
# Finding 1 of AID-2840 (race AID-2832/2833/2834, 2026-09-26 ~07:17Z): the same
# re-pin #2 of PR #545 (head 72dd25b8) was assigned in 3 near-simultaneous
# issues created by 3 different agents (producer 07:14:47Z, QA 07:17:28Z, SM
# 07:17:33Z). Three parallel heartbeats ran the SAME verification, 2 redundant
# countersign comments landed on the PR, and one landed 1s AFTER the merge —
# becoming the operative citation of the post-merge audit re-run and a
# permanent red audit artifact (AID-2840).
#
# Guard (binding, docs/sdlc/README.md §Dedup de assignment): AT MOST ONE OPEN
# countersign issue per (PR, head). Every creator (producer relaying, QA
# self-assigning, SM re-tasking) MUST route countersign assignment through
# this door instead of creating issues by hand:
#
#   1. it scans OPEN Paperclip issues (todo/in_progress/in_review/blocked)
#      for the canonical dedup key `[CS PR#<n>@<full-40-hex-head>]`, with a
#      legacy fallback (title mentions countersign + `#<pr>` + head-8hex) so
#      pre-key issues like the AID-2832/33/34 trio still dedup;
#   2. if an open issue exists it REFUSES to create: it bumps the OLDEST
#      match with a dedup comment (REUSE) and, when that issue looks stalled
#      (no update for --stall-minutes), the same comment escalates on the
#      issue itself — duplication is never the escalation path;
#   3. only when no open issue pins the key does it create the new one, with
#      the key embedded in the title so the next lookup is mechanical;
#   4. transport/API errors fail CLOSED (exit 1): the caller must retry or
#      escalate to the FPE — never fall back to manual creation.
#
# Usage:
#   scripts/countersign_assign.sh --check --pr <N> --head <40hex>
#   scripts/countersign_assign.sh --pr <N> --head <40hex> --assignee <agentId> \
#        --title <t> --body-file <f> [--parent <uuid>] [--status todo] \
#        [--no-bump] [--stall-minutes 45] [--provenance '<trailer>']
#   scripts/countersign_assign.sh --self-test
#
# Env: PAPERCLIP_API_BASE (default http://localhost:3100),
#      PAPERCLIP_API_KEY (required), PAPERCLIP_COMPANY_ID (required).
#
# Exit: 0 acted (CREATED or REUSED; --check prints the verdict),
#       1 refused (validation/transport/API failure — do NOT create manually),
#       2 usage error.

set -uo pipefail

API_BASE="${PAPERCLIP_API_BASE:-http://localhost:3100}"

usage() { sed -n '2,33p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
die_refused() { echo "REFUSED: $*" >&2; exit 1; }

# key_for PR HEAD -> canonical dedup key `[CS PR#<n>@<head40>]`
key_for() { printf '[CS PR#%s@%s]' "$1" "$2"; }

# matches_key TITLE PR HEAD40 -> 0 if title carries the canonical key
matches_key() {
  printf '%s' "$1" | grep -Eqi -e "\[CS PR#$2@$3\]"
}

# matches_legacy TITLE PR HEAD7 -> 0 if title looks like a pre-key countersign
# assignment for the same (PR, head): countersign marker + `#<pr>` + head-7
# (short-sha lengths vary in the wild — AID-2832 used 7 hex, AID-2833/2834
# used 8 — so the tier matches the 7-char prefix, which covers both). This is
# the tier that would have caught the AID-2832/33/34 race: none of those
# titles carried a key, all three carried `PR #545` + `72dd25b`.
matches_legacy() {
  printf '%s' "$1" | grep -Eqi -e "countersign" -e "re-pin" \
    && printf '%s' "$1" | grep -Eqi -e "#$2\b" -e "PR $2\b" \
    && printf '%s' "$1" | grep -Eqi -e "$3"
}

HEAD_RE='^[0-9a-fA-F]{40}$'

PR=""
HEAD=""
HEAD7=""
CHECK=0
SELF_TEST=0
ASSIGNEE=""
TITLE=""
BODY_FILE=""
PARENT=""
STATUS="todo"
NO_BUMP=0
STALL_MINUTES=45
PROVENANCE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --pr) PR="${2:?}"; shift 2 ;;
    --head) HEAD="${2:?}"; HEAD7="$(printf '%s' "${2:?}" | cut -c1-7)"; shift 2 ;;
    --check) CHECK=1; shift ;;
    --self-test) SELF_TEST=1; shift ;;
    --assignee) ASSIGNEE="${2:?}"; shift 2 ;;
    --title) TITLE="${2:?}"; shift 2 ;;
    --body-file) BODY_FILE="${2:?}"; shift 2 ;;
    --parent) PARENT="${2:?}"; shift 2 ;;
    --status) STATUS="${2:?}"; shift 2 ;;
    --no-bump) NO_BUMP=1; shift ;;
    --stall-minutes) STALL_MINUTES="${2:?}"; shift 2 ;;
    --provenance) PROVENANCE="${2:?}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done

# ---------------------------------------------------------------- self-test --
# Offline fixtures (AID-2818 style): the matcher against the REAL titles of
# the race that motivated this guard, plus key rendering and head validation.
if [ $SELF_TEST -eq 1 ]; then
  pass=0; fail=0
  st() { if [ "$2" = "$3" ]; then echo "PASS [$1] '$3'"; pass=$((pass+1))
         else echo "FAIL [$1] expected '$2' got '$3'"; fail=$((fail+1)); fi; }
  H40="72dd25b86a41be599c5e43109590128b385208bf"; H7="72dd25b"
  st "key-render" "[CS PR#545@$H40]" "$(key_for 545 "$H40")"
  st "key-match-hit" 0 "$(matches_key "COUNTERSIGN QA [CS PR#545@$H40]" 545 "$H40"; echo $?)"
  st "key-match-miss-other-head" 1 "$(matches_key "[CS PR#545@$(printf 'a%.0s' $(seq 1 40))]" 545 "$H40"; echo $?)"
  st "legacy-2832" 0 "$(matches_legacy "COUNTERSIGN QA (re-pin #2) — PR #545 head 72dd25b (update-branch #2 pós #537): re-pin + re-runs" 545 "$H7"; echo $?)"
  st "legacy-2833" 0 "$(matches_legacy "COUNTERSIGN QA (delta) — PR #545 novo head 72dd25b8 (update-branch #2: base PR #537): delta-revalidação + countersign fresco" 545 "$H7"; echo $?)"
  st "legacy-2834" 0 "$(matches_legacy "COUNTERSIGN re-pin PR #545 — head moveu para 72dd25b8 (2º pin-break): delta-revalidar pure-merge + countersign fresco" 545 "$H7"; echo $?)"
  st "legacy-miss-other-pr" 1 "$(matches_legacy "COUNTERSIGN QA — PR #546 head 72dd25b8: re-pin" 545 "$H7"; echo $?)"
  st "legacy-miss-no-countersign" 1 "$(matches_legacy "FIX engine — PR #545 head 72dd25b8: bug" 545 "$H7"; echo $?)"
  st "head-valid" 0 "$(printf '%s' "$H40" | grep -Eq "$HEAD_RE"; echo $?)"
  st "head-invalid-short" 1 "$(printf '%s' "$H7" | grep -Eq "$HEAD_RE"; echo $?)"
  echo "countersign_assign self-test: $pass passed, $fail failed"
  [ $fail -eq 0 ] || exit 1
  exit 0
fi

# -------------------------------------------------------------- validation --
[ -n "$PR" ] && [ -n "$HEAD" ] || usage
printf '%s' "$PR" | grep -Eq '^[0-9]+$' || die_refused "--pr must be numeric (got '$PR')"
printf '%s' "$HEAD" | grep -Eq "$HEAD_RE" || die_refused "--head must be a full 40-hex sha (got '$HEAD')"
KEY="$(key_for "$PR" "$HEAD")"

if [ $CHECK -eq 0 ]; then
  [ -n "$ASSIGNEE" ] || die_refused "assign mode requires --assignee <agentId>"
  [ -n "$TITLE" ] || die_refused "assign mode requires --title"
  [ -f "$BODY_FILE" ] || die_refused "assign mode requires an existing --body-file (got '$BODY_FILE')"
fi
[ -n "${PAPERCLIP_API_KEY:-}" ] || die_refused "PAPERCLIP_API_KEY not set — cannot verify dedup; do NOT create manually (retry or escalate to FPE)"
[ -n "${PAPERCLIP_COMPANY_ID:-}" ] || die_refused "PAPERCLIP_COMPANY_ID not set — cannot verify dedup; do NOT create manually (retry or escalate to FPE)"

api() { # $1=method $2=path $3=body-file(optional)
  local out
  if [ -n "${3:-}" ]; then
    out="$(curl -sS -m 45 -X "$1" -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
      -H 'Content-Type: application/json' --data @"$3" "$API_BASE$2")" || return 1
  else
    out="$(curl -sS -m 45 -X "$1" -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
      "$API_BASE$2")" || return 1
  fi
  printf '%s' "$out" | jq -e 'type != "object" or (has("error")|not)' >/dev/null 2>&1 \
    || { printf '%s\n' "$out" >&2; return 1; }
  printf '%s' "$out"
}

# ------------------------------------------------------------------- scan --
# OPEN = todo/in_progress/in_review/blocked. Transport failure fails CLOSED.
OPEN_JSON="$(api GET "/api/companies/$PAPERCLIP_COMPANY_ID/issues?status=todo,in_progress,in_review,blocked&limit=200")" \
  || die_refused "cannot list open issues (transport/API error above) — do NOT create manually; retry or escalate to FPE"

# matches: jq filter emitting `identifier\u001fcreatedAt\u001ftitle` for every
# open issue whose title matches tier-1 (canonical key) or tier-2 (legacy).
# Tier-1 uses `contains`, NOT `test`: the key carries regex-special `[...]`
# and a character-class read matched nearly every title (AID-641 false
# positive caught by the first live --check smoke, AID-2844).
MATCHES="$(printf '%s' "$OPEN_JSON" | jq -r --arg pr "$PR" --arg head7 "$HEAD7" --arg key "$KEY" '
  .[]
  | select(
      ((.title // "") | ascii_downcase | contains($key | ascii_downcase))
      or (((.title | test("countersign"; "i")) or (.title | test("re-pin"; "i")))
          and (.title | test("#\($pr)\\b"; "i"))
          and (.title | test($head7; "i")))
    )
  | [.identifier, .createdAt, .title] | @tsv')"

# stale siblings: open countersign issues for the SAME PR under a DIFFERENT
# head (superseded pin-break tasking never closed) — hygiene warning only.
SIBLINGS="$(printf '%s' "$OPEN_JSON" | jq -r --arg pr "$PR" --arg head7 "$HEAD7" '
  .[]
  | select((.title | test("countersign"; "i"))
      and (.title | test("#\($pr)\\b"; "i"))
      and (.title | test($head7; "i") | not))
  | .identifier')"

REUSE_ID=""; REUSE_UUID=""; REUSE_AGE_MIN=""
if [ -n "$MATCHES" ]; then
  # Oldest match wins: the original tasking is the canonical holder.
  REUSE_ROW="$(printf '%s\n' "$MATCHES" | sort -t$'\t' -k2 | head -1)"
  REUSE_ID="$(printf '%s' "$REUSE_ROW" | cut -f1)"
  REUSE_UUID="$(printf '%s' "$OPEN_JSON" | jq -r --arg id "$REUSE_ID" '.[] | select(.identifier==$id) | .id')"
  NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  UPD_ISO="$(printf '%s' "$OPEN_JSON" | jq -r --arg id "$REUSE_ID" '.[] | select(.identifier==$id) | (.updatedAt // .createdAt)')"
  REUSE_AGE_MIN=$(( ( $(date -u -d "$NOW_ISO" +%s) - $(date -u -d "$UPD_ISO" +%s) ) / 60 ))
fi

report_reuse() { # $1 = action taken (BUMPED|NOTED|CHECK)
  echo "DEDUP REUSE $REUSE_ID ($KEY) — $1"
  [ -z "$SIBLINGS" ] || echo "WARN stale siblings for PR #$PR under other heads (close them): $(echo "$SIBLINGS" | tr '\n' ' ')"
}

# ------------------------------------------------------------------ check --
if [ $CHECK -eq 1 ]; then
  if [ -n "$REUSE_ID" ]; then
    STALLED=""
    [ "$REUSE_AGE_MIN" -gt "$STALL_MINUTES" ] 2>/dev/null && STALLED=" STALLED(no update ${REUSE_AGE_MIN}min > ${STALL_MINUTES}min — escalate on the issue, do not duplicate)"
    report_reuse "CHECK$STALLED"
  else
    echo "DEDUP CREATE ($KEY) — no open countersign issue pins this (PR, head)"
    [ -z "$SIBLINGS" ] || echo "WARN stale siblings for PR #$PR under other heads (close them): $(echo "$SIBLINGS" | tr '\n' ' ')"
  fi
  exit 0
fi

# ------------------------------------------------------------------ reuse --
if [ -n "$REUSE_ID" ]; then
  if [ $NO_BUMP -eq 0 ]; then
    ESC=""
    if [ "$REUSE_AGE_MIN" -gt "$STALL_MINUTES" ] 2>/dev/null; then
      ESC="

**STALLED:** sem update há ${REUSE_AGE_MIN}min (> ${STALL_MINUTES}min). Escalada na própria issue (AID-2844): ping ao assignee; sem resposta em 1 heartbeat, escalar FPE → CEO. Duplicar NÃO é caminho de escalação."
    fi
    BUMP_FILE="$(mktemp)"
    { printf '%s' "**[DEDUP AID-2844 — assignment de countersign]** Novo pedido de assignment de countersign para a chave \`$KEY\` foi deduplicado por \`scripts/countersign_assign.sh\`: esta issue (a mais antiga aberta para a chave) permanece a única portadora. NÃO criar nova issue para o mesmo (PR, head).$ESC"
      [ -n "$PROVENANCE" ] && printf '\n\n%s' "$PROVENANCE"
      echo
    } | jq -Rs '{body: .}' > "$BUMP_FILE"
    api POST "/api/issues/$REUSE_UUID/comments" "$BUMP_FILE" >/dev/null \
      || die_refused "reuse verdict ok ($REUSE_ID) but bump comment failed — do NOT create a new issue; retry the bump or escalate to FPE"
    rm -f "$BUMP_FILE"
    report_reuse "BUMPED on $REUSE_ID"
  else
    report_reuse "NOTED (--no-bump)"
  fi
  exit 0
fi

# ----------------------------------------------------------------- create --
FINAL_TITLE="$TITLE"
matches_key "$TITLE" "$PR" "$HEAD" || FINAL_TITLE="$TITLE $KEY"

BODY_TMP="$(mktemp)"
{ cat "$BODY_FILE"
  echo ""
  echo "---"
  echo "Dedup-key: \`$KEY\` — máx. 1 issue de countersign ABERTA por (PR, head) (AID-2844, \`scripts/countersign_assign.sh\`)."
  [ -n "$PROVENANCE" ] && echo "" && echo "$PROVENANCE"
} > "$BODY_TMP"

CREATE_FILE="$(mktemp)"
jq -n --arg t "$FINAL_TITLE" --arg d "$(cat "$BODY_TMP")" --arg s "$STATUS" \
  --arg a "$ASSIGNEE" --arg p "$PARENT" \
  '{title:$t, description:$d, status:$s, assigneeAgentId:$a}
   + (if $p=="" then {} else {parentId:$p} end)' > "$CREATE_FILE"
CREATED="$(api POST "/api/companies/$PAPERCLIP_COMPANY_ID/issues" "$CREATE_FILE")" \
  || die_refused "creation call failed — verify by listing open issues for key '$KEY' BEFORE retrying (a retry that skips --check can duplicate; when in doubt run --check first)"
rm -f "$BODY_TMP" "$CREATE_FILE"

NEW_ID="$(printf '%s' "$CREATED" | jq -r '.identifier // empty')"
NEW_UUID="$(printf '%s' "$CREATED" | jq -r '.id // empty')"
[ -n "$NEW_ID" ] || die_refused "created but response lacks identifier — run --check to confirm before ANY retry"
echo "DEDUP CREATED $NEW_ID ($KEY) assignee=$ASSIGNEE"
[ -z "$SIBLINGS" ] || echo "WARN stale siblings for PR #$PR under other heads (close them): $(echo "$SIBLINGS" | tr '\n' ' ')"
exit 0
