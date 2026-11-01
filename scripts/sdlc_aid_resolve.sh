#!/usr/bin/env bash
# AID/GH existence resolver for the SDLC guard countersign gate (AID-2318).
#
# Contract (invoked by scripts/sdlc_guard_check.sh via SDLC_GUARD_AID_RESOLVER):
#   sdlc_aid_resolve.sh <AID-<n> | GH-<n>>
# Exit codes:
#   0  the cited issue exists (citation resolvable)
#   1  the cited issue does not exist
#   2  environment/transport error
#   3  credentials rejected
#   4  not configured (missing PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN for AID-)
#   5  usage error
#
# GH-<n>  resolves against this repository's GitHub issues via gh (GH_TOKEN).
# AID-<n> resolves against the Paperclip board via
#         PAPERCLIP_API_URL + PAPERCLIP_API_TOKEN (board API key).
# The guard treats every nonzero exit as "did not resolve" (fail-closed),
# so the distinction above only shapes the diagnostic on stderr.
#
# Transport retry (AID-3056, follow-up PR #585/AID-3055): an AID- lookup
# ending in HTTP 000 (curl timeout/connfail) is retried ONCE after a short
# backoff (SDLC_AID_RESOLVE_RETRY_DELAY, default 5s) — a transient runner->
# board failure reddened a required gate once per ~2 runs and cost a manual
# rerun. Semantic codes (200/401/403/404) are never retried; two
# consecutive 000s still exit 2 (fail-closed unchanged).

set -uo pipefail

# AID-3056 (follow-up PR #585/AID-3055): hermetic self-test — pins the
# transport-retry contract with a stubbed curl (no network, no secrets):
#   000-then-200 resolves on the single retry (exit 0, 2 curl calls)
#   double-000 stays fail-closed (exit 2, exactly 2 curl calls)
#   404/403 are NEVER retried (stable facts; exit 1/3 on the 1st call)
#   200 first try never retries (exit 0, 1 curl call)
run_self_test() {
  local tmp rc=0
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/aid-resolve-selftest.XXXXXX")"
  cat > "$tmp/curl" <<'STUB'
#!/usr/bin/env bash
# Stub curl (AID-3056 self-test): emits one HTTP code per invocation and
# counts calls in $STUB_CURL_CALLS so the test can assert retry semantics.
n=$(( $(cat "${STUB_CURL_CALLS}" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "${STUB_CURL_CALLS}"
case "${STUB_CURL_MODE:-}" in
  pass)               echo 200 ;;
  fail_once_then_pass) [ "$n" -ge 2 ] && echo 200 || echo 000 ;;
  fail_always)        echo 000 ;;
  notfound)           echo 404 ;;
  rejected)           echo 403 ;;
  *)                  echo 000 ;;
esac
STUB
  chmod +x "$tmp/curl"

  check() { # name expected_rc expected_calls mode
    local name="$1" want_rc="$2" want_calls="$3" mode="$4" got_rc got_calls
    rm -f "$tmp/calls"
    PATH="$tmp:$PATH" STUB_CURL_CALLS="$tmp/calls" STUB_CURL_MODE="$mode" \
      SDLC_AID_RESOLVE_RETRY_DELAY=0 PAPERCLIP_API_URL="https://board.invalid" \
      PAPERCLIP_API_TOKEN=stub-token \
      bash "$0" AID-3056 >/dev/null 2>&1
    got_rc=$?
    got_calls="$(cat "$tmp/calls" 2>/dev/null || echo 0)"
    if [ "$got_rc" = "$want_rc" ] && [ "$got_calls" = "$want_calls" ]; then
      echo "PASS [$name] rc=$got_rc calls=$got_calls"
    else
      echo "FAIL [$name] rc=$got_rc (want $want_rc) calls=$got_calls (want $want_calls)"
      rc=1
    fi
  }

  check "first-try 200 resolves (no retry)"              0 1 pass
  check "single 000 retried once -> resolves"            0 2 fail_once_then_pass
  check "double 000 fails closed (exit 2)"               2 2 fail_always
  check "404 not retried (stable fact)"                  1 1 notfound
  check "403 not retried (credentials rejected)"         3 1 rejected
  rm -rf "$tmp"
  if [ "$rc" -eq 0 ]; then
    echo "sdlc_aid_resolve self-test: ALL PASS"
  else
    echo "sdlc_aid_resolve self-test: FAILURES"
  fi
  return "$rc"
}

id="${1:-}"
if [ "$id" = "--self-test" ]; then
  run_self_test
  exit $?
fi
[ $# -eq 1 ] || { echo "usage: sdlc_aid_resolve.sh <AID-<n>|GH-<n>>" >&2; exit 5; }

case "$id" in
  GH-[1-9][0-9]*)
    command -v gh >/dev/null 2>&1 || { echo "resolve: gh CLI not available" >&2; exit 2; }
    # gh api -i prints the raw HTTP status line first (e.g. "HTTP/2.0 200 OK"):
    # take the status CODE (2nd field), not every digit on the line.
    code="$(gh api -i "repos/dandpb/aidevschool/issues/${id#GH-}" 2>/dev/null | head -1 | awk '{print $2}')"
    case "$code" in
      200) exit 0 ;;
      404) echo "resolve: GitHub issue ${id} not found" >&2; exit 1 ;;
      401|403) echo "resolve: gh credentials rejected (HTTP $code)" >&2; exit 3 ;;
      *) echo "resolve: GitHub transport error (HTTP ${code:-none})" >&2; exit 2 ;;
    esac
    ;;
  AID-[1-9][0-9]*)
    [ -n "${PAPERCLIP_API_URL:-}" ] && [ -n "${PAPERCLIP_API_TOKEN:-}" ] || {
      echo "resolve: PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN not configured (set them to resolve ${id})" >&2
      exit 4
    }
    # Normalize to https: the board redirects http->https and curl drops the
    # Authorization header across that redirect (origin change), which would
    # turn every lookup into a spurious 401. -L stays as a backstop.
    url="${PAPERCLIP_API_URL%/}"
    case "$url" in http://*) url="https://${url#http://}" ;; esac
    fetch_code() {
      curl -sL -o /dev/null -w '%{http_code}' -m 20 \
        -H "Authorization: Bearer ${PAPERCLIP_API_TOKEN}" \
        "${url}/api/issues/${id}" 2>/dev/null
    }
    code="$(fetch_code)"
    # AID-3056 (follow-up PR #585/AID-3055): ONE short-backoff retry on
    # TRANSPORT failure only (HTTP 000 = timeout/connfail; observed 1/2
    # runs on PR #585 run 36291186382 job 108541465380, clean on the
    # manual rerun). Semantic codes (200/401/403/404) are never retried —
    # auth/not-found are stable facts and retrying only delays the
    # fail-closed red. Two consecutive 000s still exit 2 (fail-closed).
    if [ "$code" = "000" ]; then
      sleep "${SDLC_AID_RESOLVE_RETRY_DELAY:-5}"
      code="$(fetch_code)"
    fi
    case "$code" in
      200) exit 0 ;;
      404) echo "resolve: Paperclip issue ${id} not found" >&2; exit 1 ;;
      401|403) echo "resolve: Paperclip credentials rejected (HTTP $code)" >&2; exit 3 ;;
      *) echo "resolve: Paperclip transport error (HTTP ${code:-none})" >&2; exit 2 ;;
    esac
    ;;
  *)
    echo "usage: citation id must look like AID-<n> or GH-<n> (got '${id}')" >&2
    exit 5
    ;;
esac
