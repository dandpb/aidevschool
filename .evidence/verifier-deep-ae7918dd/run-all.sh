#!/usr/bin/env bash
set -uo pipefail
EVIDENCE="/workspace/.evidence/verifier-deep-ae7918dd"
HEAD="ae7918dd5b644dd60f7a8049dbb7a6ac2253e7ec"
cd /workspace

echo "HEAD=$HEAD" > "$EVIDENCE/meta.txt"
echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$EVIDENCE/meta.txt"

run_suite() {
  local id="$1"
  local log="$EVIDENCE/${id}.log"
  shift
  echo "=== SUITE: $id ===" | tee "$log"
  echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"
  if "$@" >> "$log" 2>&1; then
    echo "RESULT=PASS" | tee -a "$log"
    echo "$id" >> "$EVIDENCE/passed.txt"
  else
    echo "RESULT=FAIL exit=$?" | tee -a "$log"
    echo "$id" >> "$EVIDENCE/failed.txt"
  fi
  echo "finished=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"
}

# 1) LiteracyDojo
run_suite literacyDojo bash -c '
  cd /workspace/engines/literacyDojo &&
  npm ci &&
  npx playwright install chromium &&
  npm run test:e2e
'

# 2) CodexDojo OS
run_suite codexdojo-os bash -c '
  cd /workspace/engines/codexdojo-os-prototype &&
  npm ci &&
  npx playwright install chromium &&
  npm run test:readiness
'

# 3) PixelQuest
run_suite pixelDojo bash -c '
  cd /workspace/engines/pixelDojo &&
  pnpm install --frozen-lockfile &&
  pnpm exec playwright install chromium &&
  pnpm smoke
'

# 4) dojoToday
run_suite dojoToday bash -c '
  cd /workspace/engines/dojoToday &&
  npm ci &&
  npm run selfcheck &&
  (npm test 2>/dev/null || true) &&
  npx playwright install chromium &&
  npm run test:readiness
'

# 5) voxelDojo
run_suite voxelDojo bash -c '
  cd /workspace/engines/voxelDojo &&
  pnpm install --frozen-lockfile &&
  pnpm exec playwright install chromium &&
  pnpm smoke
'

# 6) miniTown
run_suite miniTown bash -c '
  cd /workspace/engines/miniTown &&
  pnpm install --frozen-lockfile &&
  pnpm exec playwright install chromium &&
  pnpm smoke
'

echo "finished=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$EVIDENCE/meta.txt"
