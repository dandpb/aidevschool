#!/usr/bin/env bash
# AID-2674 — deterministic publish of the SDLC Quest beta surface.
# Verifies every published file against the engine's SHA256SUMS.txt at the
# requested revision, assembles the publish dir (game files + netlify.toml)
# and deploys it to Netlify. Run from anywhere inside the repo checkout.
# Required env: NETLIFY_AUTH_TOKEN. Optional: NETLIFY_SITE_ID (default:
# the aidevschool-sdlcquest site recorded in README.md), REV (default:
# origin/main). Free tier only; no build step; never weakens checks.
set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-caa23a84-68dc-4c8d-87fe-e0e21566fa4f}"
REV="${REV:-origin/main}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="engines/sdlc-quest"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v git >/dev/null || { echo "git required" >&2; exit 1; }
command -v npx >/dev/null || { echo "npx required" >&2; exit 1; }
[ -n "${NETLIFY_AUTH_TOKEN:-}" ] || { echo "NETLIFY_AUTH_TOKEN not set" >&2; exit 1; }

cd "$HERE/../../.."
REV_SHA="$(git rev-parse --short=8 "$REV")"
echo "==> source revision $REV ($REV_SHA)"

PUBLISH_FILES="index.html sdlc-quest.html $(git ls-tree -r --name-only "$REV" -- "$ENGINE/src" | sed "s|^$ENGINE/||")"
MANIFEST="$(git show "$REV:$ENGINE/SHA256SUMS.txt")"

mkdir -p "$WORK/src"
for rel in $PUBLISH_FILES; do
  pinned="$(printf '%s\n' "$MANIFEST" | awk -v f="$rel" '$2==f {print $1}')"
  [ -n "$pinned" ] || { echo "FAIL: $rel not pinned in SHA256SUMS.txt @ $REV" >&2; exit 1; }
  git show "$REV:$ENGINE/$rel" > "$WORK/$rel"
  actual="$(sha256sum "$WORK/$rel" | awk '{print $1}')"
  [ "$actual" = "$pinned" ] || { echo "FAIL: $rel sha256 mismatch (manifest $pinned != actual $actual)" >&2; exit 1; }
done
echo "==> all published files match SHA256SUMS.txt @ $REV"
cp "$HERE/netlify.toml" "$WORK/netlify.toml"

# AID-2704/F1: the CLI resolves netlify.toml from the working directory, not
# from --dir. Deploy from $WORK so the copied config (headers) is discovered;
# running from the repo root silently deployed without any headers.
( cd "$WORK" && npx --yes netlify deploy --prod --dir . --site "$SITE_ID" )
echo "==> published revision $REV ($REV_SHA) to site $SITE_ID"

# AID-2704/F1: prove the security headers are live on the edge right after
# publishing — a deploy that lost its config must fail the pipeline, not pass.
BASE_URL="${BETA_URL:-https://aidevschool-sdlcquest.netlify.app}"
sleep 3
check_header() {
  local path="$1" header="$2"
  curl -fsSI --max-time 30 "${BASE_URL}${path}" | tr -d '\r' | grep -qi "^${header}" \
    || { echo "FAIL: ${header%%:*} missing on ${BASE_URL}${path}" >&2; exit 1; }
}
for p in / /index.html /sdlc-quest.html; do
  check_header "$p" 'X-Robots-Tag: noindex'
  check_header "$p" 'X-Content-Type-Options: nosniff'
  check_header "$p" 'Referrer-Policy: no-referrer'
done
for p in / /index.html; do
  check_header "$p" 'Content-Security-Policy: '
done
echo "==> security headers verified live on $BASE_URL"
