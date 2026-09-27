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
# Countersign gate (AID-2318 Stage 1 + AID-2428 Stage 2, CEO gate AID-2316 c):
# in PR context, a citation of the verdict that authorizes the merge is
# required on its own line in the PR body or any PR comment
#     Countersign: <AID-ID> verdict <ref>
# when the diff touches process-authority paths (Stage 1, any author) OR the
# PR author is a bot/agent account (Stage 2, ANY diff — no engine-only
# exemption: producer ≠ verifier is never waived, precedent #483/AID-2333;
# the 1st post-Stage-1 bot merge #495/ccd42d6f shipped with zero canonical
# lines). <ref> points at the verdict record (Paperclip comment id or SHA);
# the cited AID must resolve via $SDLC_GUARD_AID_RESOLVER (CI wires it to
# scripts/sdlc_aid_resolve.sh: GitHub for GH-<n>, Paperclip for AID-<n>).
# Stage 2 ordering: the verdict must be posted strictly BEFORE the merge —
# on a merged PR only comment citations with createdAt < mergedAt count, and
# a body-trailer citation there has no verifiable posting time (fail-closed;
# the API does not expose body-edit timestamps). Pre-merge runs accept body
# or comment lines: anything visible now is, by construction, pre-merge.
# Fail-closed in every ambiguity (no citation source, no resolver,
# unresolvable id) — same direction as the rest of this script (AID-2292).
#
# Provenance trailer (AID-2493, advisory — notice-only): the GitHub
# credential is shared by every agent session, so a process comment (verdict,
# countersign citation, producer registry) is not attributable from the GitHub
# side alone (AID-2490 forensics needed heartbeat-run logs). Every
# agent-posted process comment on a PR therefore carries the canonical
# trailer line
#     Provenance: agent=<slug> task=<AID-ID|GH-n> run=<runId> session=<sessionId>
# In PR context the guard parses the trailer whenever present (auditable
# ::notice with the parsed fields) and notices its absence/malformation in
# process comments — a comment containing a 'Countersign:' line or a verdict
# heading ('# … Veredito/Verdict'). Deliberately NOT a violation: this is the
# immediate mitigation while per-agent credentials are pending (secret
# founder AID-2423 is the complete solution); escalating to fail-closed is a
# recorded later decision, not this change.
#
# Owner-approved overrides (same trust model as the live env-var overrides):
# a commit in the range carrying a trailer
#     SDLC-ALLOW-TEST-EDIT: AID-<n> (or GH-<n> for this GitHub repository)
#     SDLC-ALLOW-DERIVED-EDIT: AID-<n> (or GH-<n>)
# suppresses the corresponding check for that range. The trailer is only the
# audit hook — the cited AID/GitHub issue must record the actual owner acceptance,
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
  # AID-2292: never use `printf ... | grep -q` here. grep -q exits on the
  # first match; when the bodies exceed the pipe buffer (Linux 64KiB, up to
  # 1MiB) the writer dies with SIGPIPE and pipefail turns rc 0 into 141, so
  # the `if` reads the trailer as ABSENT (fail-closed, env-dependent). The
  # count_matches helper scans the whole input via grep -c (no early exit,
  # no writer race) and is deterministic in any bash/pipe-buffer size.
  count_matches() { # $1=ERE, $2=text -> prints match count, rc always 0
    local n
    n="$(printf '%s' "$2" | grep -cE "$1")" || true
    printf '%s' "${n:-0}"
  }
  local range_bodies allow_test=0 allow_derived=0
  range_bodies="$(git -C "$REPO_ROOT" log --format='%B' "$mbase..$head_ref")" || return 2
  if [ "$(count_matches '^SDLC-ALLOW-TEST-EDIT: (AID|GH)-[1-9][0-9]*[[:space:]]*$' "$range_bodies")" -gt 0 ]; then
    allow_test=1
    echo "::notice::SDLC-ALLOW-TEST-EDIT trailer found in commit range — owner-approved test edit (verify the cited AID/GitHub issue records the acceptance)"
  fi
  if [ "$(count_matches '^SDLC-ALLOW-DERIVED-EDIT: (AID|GH)-[1-9][0-9]*[[:space:]]*$' "$range_bodies")" -gt 0 ]; then
    allow_derived=1
    echo "::notice::SDLC-ALLOW-DERIVED-EDIT trailer found in commit range — owner-approved derived-path edit (verify the cited AID/GitHub issue records the acceptance)"
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
    if [ "$(count_matches 'gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+' "$line")" -gt 0 ]; then
      feed_command_hook "$line"
      if [ "$hook_rc" -eq 2 ]; then violations+=("guard-commands: added diff line :: committed secret token (no override)")
      fi
    fi
  done < <(git -C "$REPO_ROOT" diff --diff-filter=AM -U0 "$mbase" "$head_ref" | grep '^+' | grep -v '^+++')

  # Process-authority paths (AID-2318): changing these changes how the process
  # itself is enforced, so the verdict chain must be cited on the PR.
  is_process_authority() { # $1=path
    case "$1" in
      scripts/sdlc_guard_check.sh|scripts/sdlc_aid_resolve.sh|intent/README.md) return 0 ;;
      docs/sdlc/*|.github/workflows/*) return 0 ;;
      *) return 1 ;;
    esac
  }

  # PR context: pull_request event or a PR ref. Push runs of main (post-merge)
  # are NOT PR context — the gate already ran pre-merge as a required context.
  pr_context() {
    case "${GITHUB_EVENT_NAME:-}" in pull_request|pull_request_target) return 0 ;; esac
    case "${GITHUB_REF:-}" in refs/pull/*/merge|refs/pull/*/head) return 0 ;; esac
    return 1
  }

  # PR conversation context (AID-2318 Stage 1 + AID-2428 Stage 2): one JSON
  # document with everything the gate needs — author (bot detection), body +
  # comments (citation sources), mergedAt + per-comment createdAt (ordering).
  # Canonical source: gh pr view --json author,body,comments,mergedAt.
  # Deterministic/hermetic overrides, first match wins:
  #   SDLC_PR_CONTEXT_FILE   full JSON in that same shape (Stage 2)
  #   SDLC_COUNTERSIGN_FILE  Stage 1 flat text — read as an unmerged,
  #                          human-attributed body (no ordering/author data;
  #                          authority-path scenarios only)
  pr_context_json() {
    if [ -n "${SDLC_PR_CONTEXT_FILE:-}" ] && [ -f "${SDLC_PR_CONTEXT_FILE}" ]; then
      cat "${SDLC_PR_CONTEXT_FILE}"
      return 0
    fi
    if [ -n "${SDLC_COUNTERSIGN_FILE:-}" ] && [ -f "${SDLC_COUNTERSIGN_FILE}" ]; then
      jq -nc --rawfile b "${SDLC_COUNTERSIGN_FILE}" \
        '{author:{__typename:"User",login:"sdlc-countersign-file"},body:$b,mergedAt:null,comments:[]}'
      return 0
    fi
    command -v gh >/dev/null 2>&1 || return 1
    local prn=""
    case "${GITHUB_REF:-}" in
      refs/pull/*/merge|refs/pull/*/head) prn="${GITHUB_REF#refs/pull/}"; prn="${prn%%/*}" ;;
    esac
    if [ -z "$prn" ] && [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
      prn="$(jq -r '.number // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null)"
    fi
    [ -n "$prn" ] || return 1
    gh pr view "$prn" --json author,body,comments,mergedAt 2>/dev/null || return 1
  }

  # 4. Countersign citation gate (AID-2318 Stage 1 + AID-2428 Stage 2). In PR
  #    context the citation 'Countersign: <AID-ID> verdict <ref>' is required
  #    when the diff touches process-authority paths (any author) OR the PR
  #    author is a bot/agent account (any diff). The citation must resolve AND
  #    be posted strictly BEFORE the merge (see header). First valid citation
  #    wins; anything else is a violation.
  if pr_context; then
    local -a authority_paths=()
    for f in "${added[@]}" "${modified[@]}" "${deleted[@]}"; do
      [ -n "$f" ] || continue
      is_process_authority "$f" && authority_paths+=("$f")
    done
    local ctx="" ctx_rc=0
    ctx="$(pr_context_json 2>/dev/null)" || ctx_rc=1
    # AID-2481: bot detection is a UNION of every signal the known author
    # shapes expose, so a shape change on any single source can never again
    # silently un-bot an author (fail-closed). Signals:
    #   __typename == "Bot"   classic gh pr view / GraphQL shape
    #   is_bot == true        new gh pr view --json author shape
    #                         ({is_bot:true, login:"app/<slug>"})
    #   login suffix "[bot]"  classic Bot API logins (github-actions[bot])
    #   login prefix "app/"   app-slug logins of the new shape; '/' cannot
    #                         appear in a human GitHub login
    local pr_author_type="Unknown" pr_author_login="" pr_author_is_bot="false" pr_merged_at=""
    if [ "$ctx_rc" -eq 0 ]; then
      pr_author_type="$(printf '%s' "$ctx" | jq -r '.author.__typename // "Unknown"')"
      pr_author_login="$(printf '%s' "$ctx" | jq -r '.author.login // ""')"
      pr_author_is_bot="$(printf '%s' "$ctx" | jq -r '.author.is_bot // false')"
      pr_merged_at="$(printf '%s' "$ctx" | jq -r '.mergedAt // ""')"
    elif [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
      # No conversation source (gh missing/failed), but the event payload
      # still names the author — enough to trigger, not to verify.
      pr_author_type="$(jq -r '.pull_request.user.type // "Unknown"' "${GITHUB_EVENT_PATH}" 2>/dev/null)"
      pr_author_login="$(jq -r '.pull_request.user.login // ""' "${GITHUB_EVENT_PATH}" 2>/dev/null)"
      pr_author_is_bot="$(jq -r '.pull_request.user.is_bot // false' "${GITHUB_EVENT_PATH}" 2>/dev/null)"
    fi
    local is_bot=0
    case "$pr_author_type" in Bot) is_bot=1 ;; esac
    case "$pr_author_login" in *"[bot]"|"app/"*) is_bot=1 ;; esac
    case "$pr_author_is_bot" in true|True) is_bot=1 ;; esac
    if [ "${#authority_paths[@]}" -gt 0 ] || [ "$is_bot" -eq 1 ]; then
      local cs_scope
      if [ "${#authority_paths[@]}" -gt 0 ]; then
        cs_scope="${#authority_paths[@]} process-authority path(s): ${authority_paths[0]}"
      else
        cs_scope="bot/agent PR author '${pr_author_login:-unknown}' (Stage 2: any diff)"
      fi
      local cs_ok=0 cs_bad="" cs_aid="" cs_err="" cs_ord_rej=0 cs_body_merged=0
      local resolver="${SDLC_GUARD_AID_RESOLVER:-}"
      local citation_re='Countersign: (AID|GH)-[1-9][0-9]* verdict [A-Za-z0-9][A-Za-z0-9._:-]*[[:space:]]*$'
      local TAB
      TAB="$(printf '\t')"
      if [ "$ctx_rc" -ne 0 ]; then
        : > "$mirror/pr_citations"
      else
        # TSV "<when>\t<citation line>": when = comment createdAt, or "body".
        printf '%s' "$ctx" | jq -r '
          (.body // "" | split("\n")[] | select(test("^Countersign:")) | "body\t" + .),
          (.comments[]? | .createdAt as $t | (.body // "" | split("\n")[]? | select(test("^Countersign:")) | $t + "\t" + .))' \
          > "$mirror/pr_citations" 2>/dev/null || : > "$mirror/pr_citations"
        local cs_t cs_line
        while IFS="$TAB" read -r cs_t cs_line; do
          [ -n "$cs_line" ] || continue
          cs_aid="$(printf '%s' "$cs_line" | sed -E 's/^Countersign: ((AID|GH)-[1-9][0-9]*) verdict .*$/\1/')"
          cs_bad="$cs_line"
          cs_err=""
          # Ordering (AID-2428): verdict posted strictly before the merge.
          # ISO-8601 Z timestamps compare lexicographically == chronologically.
          if [ -n "$pr_merged_at" ]; then
            if [ "$cs_t" = "body" ]; then cs_body_merged=1; continue; fi
            if [ ! "$cs_t" \< "$pr_merged_at" ]; then cs_ord_rej=1; continue; fi
          fi
          if [ -n "$resolver" ]; then
            if cs_err="$(bash "$resolver" "$cs_aid" 2>&1 >/dev/null)"; then
              cs_ok=1
              echo "::notice::countersign citation accepted (AID-2318/AID-2428 gate): $cs_line (posted: $cs_t)"
              break
            fi
            cs_err="${cs_err%%$'\n'*}"
          fi
        done < <(grep -E "^[^${TAB}]*${TAB}${citation_re}" "$mirror/pr_citations" || true)
      fi
      if [ "$cs_ok" -ne 1 ]; then
        if [ "$ctx_rc" -ne 0 ]; then
          violations+=("countersign: $cs_scope :: no PR context source available (SDLC_PR_CONTEXT_FILE, SDLC_COUNTERSIGN_FILE or gh pr view) — cannot verify (AID-2318/AID-2428)")
        elif [ "$cs_ord_rej" -eq 1 ]; then
          violations+=("countersign: $cs_scope :: citation posted at/after merge (merged_at $pr_merged_at) '$cs_bad' — the verdict must be posted BEFORE the merge (AID-2428)")
        elif [ "$cs_body_merged" -eq 1 ]; then
          violations+=("countersign: $cs_scope :: body-trailer citation on a merged PR has no verifiable posting time '$cs_bad' — cite a pre-merge PR comment instead (AID-2428)")
        elif [ -n "$cs_bad" ] && [ -z "$resolver" ]; then
          violations+=("countersign: $cs_scope :: citation found but SDLC_GUARD_AID_RESOLVER is not configured — cannot verify '$cs_bad' (AID-2318)")
        elif [ -n "$cs_bad" ]; then
          local cs_why=""
          [ -n "$cs_err" ] && cs_why=" — resolver: $cs_err"
          violations+=("countersign: $cs_scope :: cited AID did not resolve '$cs_bad'$cs_why — cite an existing verdict carrier as 'Countersign: <AID-ID> verdict <commentId|SHA>' (AID-2318)")
        else
          violations+=("countersign: $cs_scope :: no 'Countersign: <AID-ID> verdict <ref>' line in PR body/comments — post the countersign verdict citation first (AID-2318)")
        fi
      fi
    fi
  fi

  # 5. Provenance trailer (AID-2493, advisory/notice-only — see header).
  #    Runs in PR context whenever a conversation source resolved, regardless
  #    of the check-4 trigger: it can never redden a build, so scope is the
  #    whole conversation. Accepted trailers emit the parsed fields; process
  #    comments without a valid trailer get a notice; malformed trailers are
  #    named (the line is shown so the author can fix the exact keys).
  if pr_context && [ "$ctx_rc" -eq 0 ]; then
    local prov_re='Provenance: agent=[A-Za-z0-9_][A-Za-z0-9._-]* task=(AID|GH)-[1-9][0-9]* run=[A-Za-z0-9_][A-Za-z0-9._:-]{3,} session=[A-Za-z0-9_][A-Za-z0-9._:-]*[[:space:]]*$'
    local TAB
    TAB="$(printf '\t')"
    # Pass A: every valid trailer line, TSV "<when>\t<line>".
    printf '%s' "$ctx" | jq -r '
      (.body // "" | split("\n")[]? | select(test("^Provenance:")) | select(test("'"$prov_re"'")) | "body\t" + .),
      (.comments[]? | .createdAt as $t | (.body // "" | split("\n")[]? | select(test("^Provenance:")) | select(test("'"$prov_re"'")) | ($t // "comment") + "\t" + .))' \
      2>/dev/null | while IFS="$TAB" read -r pv_t pv_line; do
        [ -n "$pv_line" ] || continue
        echo "::notice::provenance trailer accepted (AID-2493): ${pv_line#Provenance: } (posted: $pv_t)"
      done
    # Pass B: per body/comment flags — is it a process comment (Countersign
    # line or verdict heading), does it hold a valid trailer, does it hold
    # any Provenance-shaped line. TSV fields: when, proc, valid, any, line.
    printf '%s' "$ctx" | jq -r '
      [ {when: "body", body: (.body // "")} ] +
      [ .comments[]? | {when: (.createdAt // "comment"), body: (.body // "")} ] |
      map((.body | split("\n")) as $ls | {
        when: .when,
        proc: ((($ls | map(select(test("^Countersign:"))) | length) > 0) or ((($ls | map(select(test("^#+[[:space:]]+.*(eredito|erdict)"))) | length) > 0))),
        valid: ((($ls | map(select(test("'"$prov_re"'"))) | length) > 0)),
        any: ((($ls | map(select(test("^Provenance:"))) | length) > 0)),
        line: (($ls | map(select(test("^Provenance:"))) | .[0]) // ($ls | map(select(. != "")) | .[0]) // "")
      } | select(.proc and (.valid | not)) |
        [(.when // "-"), "P", (if .valid then "V" else "-" end), (if .any then "M" else "-" end), .line] | @tsv)[]' \
      2>/dev/null | while IFS="$TAB" read -r pv_t _pv_p _pv_v pv_any pv_line; do
        [ -n "$pv_line" ] || continue
        if [ "$pv_any" = "M" ]; then
          echo "::notice::provenance trailer malformed in process comment (AID-2493): '$pv_line' (posted: $pv_t) — expected keys agent= task= run= session= on one 'Provenance:' line"
        else
          echo "::notice::provenance trailer missing in process comment (AID-2493): '${pv_line:0:60}' (posted: $pv_t) — add 'Provenance: agent=<slug> task=<AID-ID> run=<runId> session=<sessionId>'"
        fi
      done
  fi

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
# repo) so the check proves the enforcement path end to end. Every scenario
# runs the guard hermetically: the runner's own CI PR environment must not
# leak into fixtures (AID-2473).
# ---------------------------------------------------------------------------
self_test() {
  local T R pass=0 fail=0
  T="$(mktemp -d "${TMPDIR:-/tmp}/sdlc-guard-selftest.XXXXXX")"
  R="$T/repo"
  git init -q "$R"
  mkdir -p "$R/.claude"
  cp -r "$HOOKS_DIR" "$R/.claude/hooks"

  local GITC="git -C $R -c user.name=selftest -c user.email=selftest@example.invalid"

  mkdir -p "$R/tests/unit" "$R/dist" "$R/.loops" "$R/src" "$R/scripts" "$R/demo/test"
  printf 'def test_a():\n    assert True\n' > "$R/tests/unit/test_a.py"
  printf 'generated\n' > "$R/dist/generated.js"
  printf 'loop memory\n' > "$R/.loops/memory.md"
  printf 'app\n' > "$R/src/app.py"
  # AID-2293 (harden F2): .test.mjs/.spec.mjs OUTSIDE */tests/* (and files in a
  # singular */test/ dir) must classify as existing tests once edited/deleted.
  printf 'import assert from "node:assert"\n' > "$R/scripts/complexity.test.mjs"
  printf 'import assert from "node:assert"\n' > "$R/scripts/pilot.spec.mjs"
  printf 'export function helper() { return 1 }\n' > "$R/demo/test/run.mjs"
  $GITC add -A >/dev/null
  $GITC commit -qm "base"
  local base_sha
  base_sha=$($GITC rev-parse HEAD)

  # scenario <name> <expected-rc> <commit-message> -- <setup-cmds...>
  # The message goes through a file (git commit -F): -m cannot carry the
  # >1MiB regression bodies below (single-arg kernel limit), and real
  # large bodies reach git the same way (editor/-F).
  #
  # AID-2473: the guard child runs hermetic. The self-test itself executes
  # on a PR in CI, where GITHUB_EVENT_NAME/GITHUB_EVENT_PATH/GITHUB_REF
  # name the runner's OWN PR (on a bot PR the event payload carries the bot
  # author). Those ambient channels used to leak into every fixture:
  # scenarios without their own PR context flipped into PR context, the
  # payload's bot author tripped Stage 2 ("enough to trigger, not to
  # verify"), and the fixture — no PR context source — failed closed: 9
  # scenarios red on bot PR #501, killing the job (set -e) before the real
  # scan ever ran. Scrub the three ambient channels; scenarios that DO mean
  # PR context re-inject GITHUB_EVENT_NAME via SCENARIO_EVENT_NAME
  # (pr_scenario/pr2_scenario below) and carry deterministic SDLC_* context
  # files, so they stay hermetic by construction.
  scenario() {
    local name="$1" expected="$2" msg="$3"; shift 3; [ "${1:-}" = "--" ] && shift
    local br="st-$RANDOM"
    $GITC checkout -q -b "$br" "$base_sha"
    local c
    for c in "$@"; do ( cd "$R" && eval "$c" ); done
    $GITC add -A >/dev/null
    printf '%s\n' "$msg" > "$T/commit-msg"
    $GITC commit -qF "$T/commit-msg"
    local out rc
    local -a guard_env=(env -u GITHUB_EVENT_NAME -u GITHUB_EVENT_PATH -u GITHUB_REF)
    if [ -n "${SCENARIO_EVENT_NAME:-}" ]; then
      guard_env+=("GITHUB_EVENT_NAME=$SCENARIO_EVENT_NAME")
    fi
    out="$("${guard_env[@]}" bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$br" 2>&1)"; rc=$?
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
  # AID-2293 (harden F2): .mjs classification. These four scenarios failed
  # open before the pattern fix (the hook escaped them: neither the name
  # patterns nor the dir rules matched .test.mjs/.spec.mjs outside */tests/*,
  # and the singular */test/ dir was not classified either).
  scenario "modify existing .test.mjs outside */tests/*"  1 "touch test.mjs" -- \
    "printf 'import assert from \"node:assert\" // weakened\n' > scripts/complexity.test.mjs"
  scenario "delete existing .spec.mjs outside */tests/*"  1 "drop spec.mjs" -- \
    "rm scripts/pilot.spec.mjs"
  scenario "new .test.mjs/.spec.mjs outside */tests/* allowed (failing-test-first)" 0 "add test.mjs" -- \
    "printf 'import assert from \"node:assert\"\n' > scripts/newthing.test.mjs" \
    "printf 'import assert from \"node:assert\"\n' > scripts/newthing.spec.mjs"
  scenario "edit non-test file under singular */test/* dir" 1 "touch demo/test helper" -- \
    "printf 'export function helper() { return 2 }\n' > demo/test/run.mjs"
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

  scenario "owner-approved GitHub test edit"         0 "fix test

SDLC-ALLOW-TEST-EDIT: GH-9003" -- \
    "printf 'def test_a():\n    assert 1 == 1\n' > tests/unit/test_a.py"
  scenario "owner-approved GitHub derived edit"      0 "regen loops

SDLC-ALLOW-DERIVED-EDIT: GH-9004" -- \
    "printf 'regenerated\n' > .loops/memory.md"
  scenario "malformed GitHub approval is rejected"   1 "invalid approval

SDLC-ALLOW-TEST-EDIT: GH-9003-not-an-issue" -- \
    "printf 'def test_a():\n    assert False\n' > tests/unit/test_a.py"
  scenario "GitHub test approval does not allow credentials" 1 "invalid scope

SDLC-ALLOW-TEST-EDIT: GH-9003" -- \
    "mkdir -p config && printf 'SECRET=1\n' > config/.env"

  # AID-2292 regression: `printf | grep -q` under pipefail lost early
  # trailers in large range bodies (SIGPIPE rc=141 read as "absent",
  # fail-closed, env/pipe-buffer dependent). Build a commit body whose
  # trailer sits EARLY and is followed by >1MiB of filler (> Linux max
  # pipe buffer), so the old code fails deterministically in any bash;
  # the count_matches fix must see the trailer every time.
  local big_filler early_trailer_msg
  big_filler="$(printf 'large commit body filler line %05d aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n' {1..12000})"
  early_trailer_msg="fix test, trailer early in a very large body

SDLC-ALLOW-TEST-EDIT: AID-9005

$big_filler"
  printf '%s\n' "$early_trailer_msg" > "$T/early-msg"
  local big_len
  big_len="$(wc -c < "$T/early-msg")"
  [ "$big_len" -gt 1048576 ] || { echo "FAIL [large-body scenario setup: filler ${big_len}B <= 1MiB pipe-buffer max]"; fail=$((fail+1)); }
  scenario "early trailer in >1MiB body still overrides (AID-2292 SIGPIPE)" 0 "$early_trailer_msg" -- \
    "printf 'def test_a():\n    assert 1 == 1\n' > tests/unit/test_a.py"

  # AID-2292, second half of the failure mode: the ::notice itself must be
  # emitted (the PR #471 incident showed rc=1 + 11 false violations + no
  # notice when SIGPIPE ate the trailer). sig_out is tiny (< pipe buffer),
  # so a plain pipe grep is safe here.
  local sig_br="st-sigpipe-$$" sig_out sig_rc
  $GITC checkout -q -b "$sig_br" "$base_sha"
  printf 'def test_a():\n    assert 1 == 1\n' > "$R/tests/unit/test_a.py"
  $GITC add -A >/dev/null
  $GITC commit -qF "$T/early-msg"
  sig_out="$(env -u GITHUB_EVENT_NAME -u GITHUB_EVENT_PATH -u GITHUB_REF \
    bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$sig_br" 2>&1)"; sig_rc=$?
  if [ "$sig_rc" -eq 0 ] && printf '%s' "$sig_out" | grep -q '^::notice::SDLC-ALLOW-TEST-EDIT'; then
    echo "PASS [large-body early trailer emits the override notice] rc=$sig_rc"
    pass=$((pass+1))
  else
    echo "FAIL [large-body early trailer emits the override notice] rc=$sig_rc (expected 0)"
    printf '%s\n' "$sig_out" | sed 's/^/    | /'
    fail=$((fail+1))
  fi
  $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
  $GITC branch -qD "$sig_br" >/dev/null

  # AID-1272 regression: PR head has MERGED an advanced base, then edits a
  # test the base added after the branch point. With the CURRENT base tip the
  # diff must classify the test as modified (blocked, rc=1). With the stale
  # PR-creation sha the same diff read the file as ADDED (rc=0) — the exact
  # downgrade that let a trailer-less edit pass at head and only fail on the
  # main push. The wrapper cannot detect a stale base by itself (the caller
  # knows the real branch tip), so ci.yml resolves origin/<base.ref>; the
  # second assertion below pins the hazard semantics for the record.
  local stale_sha advanced_sha
  stale_sha="$base_sha"
  $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
  mkdir -p "$R/tests/unit"
  printf 'def test_x():\n    assert True\n' > "$R/tests/unit/test_x.py"
  $GITC add -A >/dev/null
  $GITC commit -qm "main adds test_x after the PR opened"
  advanced_sha="$($GITC rev-parse HEAD)"
  $GITC checkout -q -b st-stale-base "$stale_sha"
  $GITC merge -q --no-edit "$advanced_sha" >/dev/null 2>&1
  printf 'def test_x():\n    assert False\n' > "$R/tests/unit/test_x.py"
  $GITC add -A >/dev/null
  $GITC commit -qm "edit main-added test without trailer"
  local out_rc
  out="$(env -u GITHUB_EVENT_NAME -u GITHUB_EVENT_PATH -u GITHUB_REF \
    bash "$SCRIPT_PATH" --repo "$R" --base "$advanced_sha" --head st-stale-base 2>&1)"; out_rc=$?
  if [ "$out_rc" -eq 1 ]; then
    echo "PASS [merged-advance: current base blocks edit of main-added test] rc=$out_rc"
    pass=$((pass+1))
  else
    echo "FAIL [merged-advance: current base blocks edit of main-added test] rc=$out_rc expected 1"
    printf '%s\n' "$out" | sed 's/^/    | /'
    fail=$((fail+1))
  fi
  out="$(env -u GITHUB_EVENT_NAME -u GITHUB_EVENT_PATH -u GITHUB_REF \
    bash "$SCRIPT_PATH" --repo "$R" --base "$stale_sha" --head st-stale-base 2>&1)"; out_rc=$?
  if [ "$out_rc" -eq 0 ]; then
    echo "PASS [stale PR-creation base downgrades M->A (documented hazard; caller must pass the current tip)] rc=$out_rc"
    pass=$((pass+1))
  else
    echo "FAIL [stale PR-creation base downgrades M->A] rc=$out_rc expected 0"
    printf '%s\n' "$out" | sed 's/^/    | /'
    fail=$((fail+1))
  fi
  $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
  $GITC branch -qD st-stale-base >/dev/null

  # AID-2318 (CEO gate AID-2316 c): countersign citation for process-authority
  # paths in PR context. A stub resolver keeps AID-existence hermetic (no
  # network): AID-9006 resolves, anything else does not. PR context is
  # simulated with GITHUB_EVENT_NAME=pull_request + SDLC_COUNTERSIGN_FILE
  # (the deterministic citation source used by CI-wired runs alike).
  local stub="$T/aid_resolver_stub.sh"
  printf '#!/usr/bin/env bash\ncase "$1" in AID-9006) exit 0 ;; *) exit 1 ;; esac\n' > "$stub"
  chmod +x "$stub"
  : > "$T/cs_none"
  printf 'Countersign: AID-9006 verdict 679cf9d3\n' > "$T/cs_valid"
  printf 'Countersign: AID-9999 verdict deadbeef\n' > "$T/cs_ghost"
  pr_scenario() { # scenario + PR-context gate env, scrubbed afterwards
    export SDLC_GUARD_AID_RESOLVER="$stub" SCENARIO_EVENT_NAME=pull_request
    scenario "$@"
    unset SDLC_GUARD_AID_RESOLVER SDLC_COUNTERSIGN_FILE SCENARIO_EVENT_NAME
  }

  # (i) process-authority PR WITHOUT a citation -> fail-closed.
  SDLC_COUNTERSIGN_FILE="$T/cs_none" pr_scenario \
    "process PR without countersign citation fails (AID-2318)" 1 "edit sdlc doc" -- \
    "mkdir -p docs/sdlc && printf '# amended\n' > docs/sdlc/README.md"

  # (iii) citation citing a nonexistent AID -> fail-closed.
  SDLC_COUNTERSIGN_FILE="$T/cs_ghost" pr_scenario \
    "process PR citing nonexistent AID fails (AID-2318)" 1 "edit guard script" -- \
    "printf '# touched\n' >> scripts/sdlc_guard_check.sh"

  # (ii) process-authority PR WITH a valid, resolvable citation -> pass AND
  # emit the audit notice (checked directly, mirroring the SIGPIPE-notice
  # assertion above).
  local cs_br="st-countersign-$$" cs_out cs_rc
  $GITC checkout -q -b "$cs_br" "$base_sha"
  mkdir -p "$R/docs/sdlc"
  printf '# amended\n' > "$R/docs/sdlc/README.md"
  $GITC add -A >/dev/null
  $GITC commit -qm "edit sdlc doc with citation"
  cs_out="$(GITHUB_EVENT_NAME=pull_request SDLC_COUNTERSIGN_FILE="$T/cs_valid" SDLC_GUARD_AID_RESOLVER="$stub" \
    bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$cs_br" 2>&1)"; cs_rc=$?
  if [ "$cs_rc" -eq 0 ] && printf '%s' "$cs_out" | grep -q '^::notice::countersign citation accepted'; then
    echo "PASS [process PR with valid citation passes + notice (AID-2318)] rc=$cs_rc"
    pass=$((pass+1))
  else
    echo "FAIL [process PR with valid citation passes + notice (AID-2318)] rc=$cs_rc (expected 0)"
    printf '%s\n' "$cs_out" | sed 's/^/    | /'
    fail=$((fail+1))
  fi
  $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
  $GITC branch -qD "$cs_br" >/dev/null

  # AID-2428 (Stage 2): citation required for EVERY bot/agent-authored PR
  # (any diff — no engine-only exemption) and the verdict must be posted
  # strictly BEFORE the merge. SDLC_PR_CONTEXT_FILE supplies the full PR
  # context JSON — the same shape `gh pr view --json author,body,comments,
  # mergedAt` returns — so author, comment createdAt and mergedAt are all
  # hermetic. The stub resolver (AID-9006 only) is reused.
  mk_ctx() { # $1=author-type $2=login $3=mergedAt(""=null) $4=body-file $5=comments-json
    jq -nc --arg t "$1" --arg l "$2" --arg m "$3" --rawfile b "$4" --argjson c "$5" \
      '{author:{__typename:$t,login:$l},body:$b,mergedAt:($m|if .=="" then null else . end),comments:$c}'
  }
  pr2_scenario() { # $1=ctx-file; remaining args = scenario args
    local ctxf="$1"; shift
    export SDLC_GUARD_AID_RESOLVER="$stub" SDLC_PR_CONTEXT_FILE="$ctxf" SCENARIO_EVENT_NAME=pull_request
    scenario "$@"
    unset SDLC_GUARD_AID_RESOLVER SDLC_PR_CONTEXT_FILE SCENARIO_EVENT_NAME
  }
  local T2="$T/stage2"
  mkdir -p "$T2"
  : > "$T2/empty"
  mk_ctx Bot "codex[bot]" "" "$T2/empty" '[]' > "$T2/bot_open"
  mk_ctx Bot "codex[bot]" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T07:00:00Z","body":"QA verdict posted\nCountersign: AID-9006 verdict 679cf9d3"}]' > "$T2/bot_cited_premerge"
  mk_ctx Bot "codex[bot]" "2026-09-18T08:00:00Z" "$T2/empty" \
    '[{"createdAt":"2026-09-18T09:00:00Z","body":"Countersign: AID-9006 verdict retrofitted"}]' > "$T2/bot_cited_postmerge"
  mk_ctx User "dandpb" "" "$T2/empty" '[]' > "$T2/human_open"
  mk_ctx User "dandpb" "2026-09-18T08:00:00Z" "$T/cs_valid" '[]' > "$T2/human_body_merged"
  mk_ctx User "dandpb" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T07:30:00Z","body":"Countersign: AID-9006 verdict 679cf9d3"}]' > "$T2/human_authority_cited"

  # AID-2481 regression: `gh pr view --json author` changed shape — bot
  # authors now come back as {"is_bot":true,"login":"app/<slug>"} with NO
  # __typename and NO '[bot]' suffix (observed live on PR #501, gh 2.46),
  # which silently bypassed Stage 2 on real scans. Fixtures pin that exact
  # new shape; the union detection (is_bot flag + app/<slug> login) must
  # re-trip the gate.
  mk_ctx_ghbot() { # $1=mergedAt(""=null) $2=body-file $3=comments-json — new gh author shape
    jq -nc --arg m "$1" --rawfile b "$2" --argjson c "$3" \
      '{author:{is_bot:true,login:"app/github-actions"},body:$b,mergedAt:($m|if .=="" then null else . end),comments:$c}'
  }
  mk_ctx_ghbot "" "$T2/empty" '[]' > "$T2/ghbot_open"
  mk_ctx_ghbot "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T07:10:00Z","body":"QA verdict posted\nCountersign: AID-9006 verdict 679cf9d3"}]' > "$T2/ghbot_cited_premerge"

  # (i) bot/agent PR, engine-only diff, NO citation -> fail (Stage 2 trigger).
  pr2_scenario "$T2/bot_open" "bot PR without countersign citation fails (AID-2428)" 1 "bot engine change" -- \
    "printf 'bot change\n' >> src/app.py"

  # (iii) citation resolvable but posted AFTER mergedAt -> fail (ordering).
  pr2_scenario "$T2/bot_cited_postmerge" "post-merge citation fails ordering (AID-2428)" 1 "merged then cited" -- \
    "printf 'bot change\n' >> src/app.py"

  # (iv) human PR, engine-only diff, no citation -> documented: NOT gated
  # (Stage 2 does not expand to human/founder PRs absent authority paths).
  pr2_scenario "$T2/human_open" "human PR without citation stays ungated (documented)" 0 "human engine change" -- \
    "printf 'human change\n' >> src/app.py"

  # (v) merged PR whose only citation is a body trailer -> ordering
  # unverifiable (API exposes no body-edit time) -> fail-closed. Trigger is
  # the authority path (human author), pinning the Stage-1 rule on the
  # Stage-2 source.
  pr2_scenario "$T2/human_body_merged" "body-trailer citation on merged PR fails (unverifiable order, AID-2428)" 1 "merged body cite" -- \
    "mkdir -p docs/sdlc && printf '# touched\n' > docs/sdlc/README.md"

  # (vi) authority-path PR with a pre-merge comment citation (JSON source) ->
  # pass (Stage-1 semantics preserved on the Stage-2 source).
  pr2_scenario "$T2/human_authority_cited" "authority PR with pre-merge comment citation passes" 0 "doc change cited" -- \
    "mkdir -p docs/sdlc && printf '# touched2\n' > docs/sdlc/README.md"

  # (ii) bot/agent PR with a valid citation posted pre-merge (open PR,
  # comment createdAt visible) -> pass AND emit the audit notice — checked
  # directly, mirroring the Stage-1 notice assertion above.
  local cs2_br="st-countersign2-$$" cs2_out cs2_rc
  $GITC checkout -q -b "$cs2_br" "$base_sha"
  printf 'bot change\n' >> "$R/src/app.py"
  $GITC add -A >/dev/null
  $GITC commit -qm "bot engine change with pre-merge citation"
  cs2_out="$(GITHUB_EVENT_NAME=pull_request SDLC_PR_CONTEXT_FILE="$T2/bot_cited_premerge" SDLC_GUARD_AID_RESOLVER="$stub" \
    bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$cs2_br" 2>&1)"; cs2_rc=$?
  if [ "$cs2_rc" -eq 0 ] && printf '%s' "$cs2_out" | grep -q '^::notice::countersign citation accepted' \
    && printf '%s' "$cs2_out" | grep -q '(posted: 2026-09-18T07:00:00Z)'; then
    echo "PASS [bot PR with pre-merge citation passes + notice (AID-2428)] rc=$cs2_rc"
    pass=$((pass+1))
  else
    echo "FAIL [bot PR with pre-merge citation passes + notice (AID-2428)] rc=$cs2_rc (expected 0)"
    printf '%s\n' "$cs2_out" | sed 's/^/    | /'
    fail=$((fail+1))
  fi
  $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
  $GITC branch -qD "$cs2_br" >/dev/null

  # AID-2493 (provenance trailer, advisory/notice-only): process comments
  # with a canonical trailer emit an accepted notice carrying the parsed
  # fields; process comments without one (or with a malformed trailer) emit
  # missing/malformed notices; plain comments are never flagged; rc stays 0
  # in every case (mitigation phase — nothing reddens). Same hermetic
  # SDLC_PR_CONTEXT_FILE source as Stage 2; human author + engine-only diff
  # keeps check 4 out of the picture.
  local T3="$T/prov"
  mkdir -p "$T3"
  mk_ctx User "dandpb" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T23:00:00Z","body":"Countersign: AID-9006 verdict 679cf9d3\nProvenance: agent=qa-lead task=AID-9006 run=519e2558 session=ses_f4953cf0"}]' > "$T3/ok"
  mk_ctx User "dandpb" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T23:01:00Z","body":"## Veredito QA countersign fresh-context (PRÉ-merge): CONFORME\n\nHead pinado, gates no placar."}]' > "$T3/missing"
  mk_ctx User "dandpb" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T23:02:00Z","body":"Countersign: AID-9006 verdict 679cf9d3\nProvenance: agent=qa-lead run=519e2558"}]' > "$T3/malformed"
  mk_ctx User "dandpb" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T23:03:00Z","body":"## Verdict QA countersign fresh-context: PASS\n\nProvenance: agent=platform-ci task=GH-42 run=01875640 session=_default"}]' > "$T3/ok_en"
  mk_ctx User "dandpb" "" "$T2/empty" \
    '[{"createdAt":"2026-09-18T23:04:00Z","body":"drive-by comment, no process content here"}]' > "$T3/plain"
  prov_scenario() { # $1=ctx-file $2=name $3=must-contain|NOT:must-not-contain
    local ctxf="$1" name="$2" needle="$3" want_absent=0
    case "$needle" in NOT:*) want_absent=1; needle="${needle#NOT:}" ;; esac
    local br="st-prov-$RANDOM" out rc ok=0
    $GITC checkout -q -b "$br" "$base_sha"
    printf 'prov fixture change\n' >> "$R/src/app.py"
    $GITC add -A >/dev/null
    $GITC commit -qm "provenance fixture"
    out="$(GITHUB_EVENT_NAME=pull_request SDLC_PR_CONTEXT_FILE="$ctxf" \
      bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$br" 2>&1)"; rc=$?
    if [ "$rc" -eq 0 ]; then
      if [ "$want_absent" -eq 1 ]; then
        printf '%s' "$out" | grep -q "$needle" || ok=1
      else
        printf '%s' "$out" | grep -q "$needle" && ok=1
      fi
    fi
    if [ "$ok" -eq 1 ]; then
      echo "PASS [$name] rc=$rc"
      pass=$((pass+1))
    else
      echo "FAIL [$name] rc=$rc (expected 0; needle${want_absent:+ NOT} '$needle')"
      printf '%s\n' "$out" | sed 's/^/    | /'
      fail=$((fail+1))
    fi
    $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
    $GITC branch -qD "$br" >/dev/null
  }
  prov_scenario "$T3/ok"        "citation comment with valid trailer -> accepted notice (AID-2493)" \
    "provenance trailer accepted (AID-2493): agent=qa-lead task=AID-9006 run=519e2558 session=ses_f4953cf0 (posted: 2026-09-18T23:00:00Z)"
  prov_scenario "$T3/ok_en"     "EN verdict heading with valid trailer -> accepted notice (AID-2493)" \
    "provenance trailer accepted (AID-2493): agent=platform-ci task=GH-42 run=01875640 session=_default"
  prov_scenario "$T3/missing"   "verdict comment without trailer -> missing notice, rc stays 0 (AID-2493)" \
    "provenance trailer missing in process comment (AID-2493)"
  prov_scenario "$T3/malformed" "citation with malformed trailer -> malformed notice, rc stays 0 (AID-2493)" \
    "provenance trailer malformed in process comment (AID-2493): 'Provenance: agent=qa-lead run=519e2558'"
  prov_scenario "$T3/plain"     "plain comment without trailer -> no provenance notice (AID-2493)" \
    "NOT:provenance trailer"

  # AID-2481 (vii): new-shape gh bot PR (is_bot:true, app/<slug> login, no
  # __typename, no [bot] suffix), engine-only diff, NO citation -> must FAIL
  # (Stage 2 re-triggers via the union detection; this exact fixture was the
  # live bypass on PR #501).
  pr2_scenario "$T2/ghbot_open" "new gh-shape bot PR without citation fails (AID-2481)" 1 "gh-shape bot engine change" -- \
    "printf 'ghbot change\n' >> src/app.py"

  # AID-2481 (viii): same new-shape bot author with a valid pre-merge comment
  # citation -> pass AND emit the audit notice with the posting time.
  local cs3_br="st-countersign3-$$" cs3_out cs3_rc
  $GITC checkout -q -b "$cs3_br" "$base_sha"
  printf 'ghbot change\n' >> "$R/src/app.py"
  $GITC add -A >/dev/null
  $GITC commit -qm "gh-shape bot engine change with pre-merge citation"
  cs3_out="$(GITHUB_EVENT_NAME=pull_request SDLC_PR_CONTEXT_FILE="$T2/ghbot_cited_premerge" SDLC_GUARD_AID_RESOLVER="$stub" \
    bash "$SCRIPT_PATH" --repo "$R" --base "$base_sha" --head "$cs3_br" 2>&1)"; cs3_rc=$?
  if [ "$cs3_rc" -eq 0 ] && printf '%s' "$cs3_out" | grep -q '^::notice::countersign citation accepted' \
    && printf '%s' "$cs3_out" | grep -q '(posted: 2026-09-18T07:10:00Z)'; then
    echo "PASS [new gh-shape bot PR with pre-merge citation passes + notice (AID-2481)] rc=$cs3_rc"
    pass=$((pass+1))
  else
    echo "FAIL [new gh-shape bot PR with pre-merge citation passes + notice (AID-2481)] rc=$cs3_rc (expected 0)"
    printf '%s\n' "$cs3_out" | sed 's/^/    | /'
    fail=$((fail+1))
  fi
  $GITC checkout -q main 2>/dev/null || $GITC checkout -q master
  $GITC branch -qD "$cs3_br" >/dev/null

  # AID-2473 regression: the CI runner executes the self-test step on the
  # PR itself, so GITHUB_EVENT_NAME/GITHUB_EVENT_PATH/GITHUB_REF name the
  # real — possibly bot-authored — PR (on PR #501 the leaked payload author
  # 'github-actions[bot]' tripped Stage 2 in 9 context-less fixtures and
  # killed the job before the real scan). The scenario runner scrubs those
  # channels (see scenario()); this scenario re-leaks them on purpose — a
  # bot event payload plus a PR ref, exactly the runner's own CI state —
  # and asserts a clean engine-only fixture stays ungated. If the scrub
  # ever regresses, the payload's bot author trips Stage 2 with no context
  # source in the fixture and the scenario fails closed.
  local bot_event="$T/bot_event.json"
  jq -nc '{number:501, pull_request:{user:{login:"github-actions[bot]", type:"Bot"}}}' > "$bot_event"
  export GITHUB_EVENT_NAME=pull_request GITHUB_EVENT_PATH="$bot_event" GITHUB_REF="refs/pull/501/merge"
  scenario "ambient CI bot-PR env does not leak into fixtures (AID-2473)" 0 "clean add under bot PR env" -- \
    "printf 'clean under ambient bot PR ci state\n' > src/clean_bot_ci.py"
  unset GITHUB_EVENT_NAME GITHUB_EVENT_PATH GITHUB_REF

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
