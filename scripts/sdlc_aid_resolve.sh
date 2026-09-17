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

set -uo pipefail

id="${1:-}"
[ $# -eq 1 ] || { echo "usage: sdlc_aid_resolve.sh <AID-<n>|GH-<n>>" >&2; exit 5; }

case "$id" in
  GH-[1-9][0-9]*)
    command -v gh >/dev/null 2>&1 || { echo "resolve: gh CLI not available" >&2; exit 2; }
    code="$(gh api -i "repos/dandpb/aidevschool/issues/${id#GH-}" 2>/dev/null | head -1 | tr -dc '0-9')"
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
    local url="${PAPERCLIP_API_URL%/}"
    case "$url" in http://*) url="https://${url#http://}" ;; esac
    code="$(curl -sL -o /dev/null -w '%{http_code}' -m 20 \
      -H "Authorization: Bearer ${PAPERCLIP_API_TOKEN}" \
      "${url}/api/issues/${id}" 2>/dev/null)"
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
