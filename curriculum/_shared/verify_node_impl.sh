#!/usr/bin/env bash
# Verification contract runner for curriculum node-impl tracks (AID-5012).
#
# Runs the four-step executable evidence contract for one project:
#   1. install  (npm ci --include=dev, lockfile-committed per AID-1670)
#   2. lint     (npm run lint)
#   3. build    (npm run build)
#   4. test     (npm test)
# and prints one PASS/FAIL line per step plus a final verdict. Exit 0 only
# when every step exits 0. Designed for catalog "implemented" evidence
# receipts (see curriculum/catalog.md and curriculum/BACKLOG_STATUS.md).
#
# Usage:
#   verify_node_impl.sh <node-impl-dir> [--no-install]
#
# Notes:
# - --no-install skips step 1 when node_modules is already provisioned
#   (CI often pre-installs); the verdict line then records install=skipped.
# - Some sandboxes set omit=dev in ~/.npmrc; --include=dev overrides it so
#   devDependencies (vitest/tsc/eslint) are actually installed.
set -uo pipefail

IMPL_DIR="${1:-}"
SKIP_INSTALL="${2:-}"
STEPS_OK=0
STEPS_TOTAL=0

usage() { echo "usage: verify_node_impl.sh <node-impl-dir> [--no-install]" >&2; exit 2; }
[[ -d "$IMPL_DIR" ]] || usage
[[ -f "${IMPL_DIR}/package.json" ]] || { echo "no package.json in ${IMPL_DIR}" >&2; exit 2; }

run_step() {
  local name="$1"; shift
  STEPS_TOTAL=$((STEPS_TOTAL + 1))
  if "$@" > "/tmp/verify-node-impl-${name}.log" 2>&1; then
    echo "PASS install=${SKIP_INSTALL} step=${name}" >&2
    STEPS_OK=$((STEPS_OK + 1))
  else
    echo "FAIL install=${SKIP_INSTALL} step=${name} (log: /tmp/verify-node-impl-${name}.log)" >&2
  fi
}

cd "$IMPL_DIR" || exit 2

if [[ "$SKIP_INSTALL" == "--no-install" ]]; then
  STEPS_TOTAL=$((STEPS_TOTAL + 1)); STEPS_OK=$((STEPS_OK + 1))
  echo "PASS install=skipped step=install" >&2
else
  run_step install npm ci --include=dev
fi
run_step lint npm run lint
run_step build npm run build
run_step test npm test

if [[ "$STEPS_OK" -eq "$STEPS_TOTAL" ]]; then
  echo "VERDICT PASS project=${IMPL_DIR} steps=${STEPS_OK}/${STEPS_TOTAL} date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  exit 0
fi
echo "VERDICT FAIL project=${IMPL_DIR} steps=${STEPS_OK}/${STEPS_TOTAL} date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
exit 1
