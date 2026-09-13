#!/usr/bin/env bash
# Cross-engine integration harness (AID-1738 §5.2; ORDEM AID-1714/r3-B).
#
# This is the named, reusable home of the cross-engine steps that used to live
# ad-hoc inside the CI job `codexdojo-os (TS)` (.github/workflows/ci.yml).
# That job is the ONLY place where the TS engines are exercised together
# (onboarding receipt AID-1716 §2); with this harness the integration contract
# is owned here, invoked identically by CI and by local first-class runs.
#
# Contract + usage: scripts/integration/README.md
# Required check unchanged: the CI job keeps id `codexdojo-os` /
# name `codexdojo-os (TS)` and only orchestrates this script.
#
# Exit: 0 all requested phases passed; 1 any step failed (fail-closed,
# `set -euo pipefail`); 2 usage error (unknown phase/flag).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OS_DIR="$REPO_ROOT/engines/codexdojo-os-prototype"

PHASES_ALL=(deps contracts blobs-proof schema-drift build smoke report)

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//' >&2
  cat >&2 <<'EOF'

Usage:
  scripts/integration/cross-engine.sh [flags] [phase ...]

Phases (default: all, in this order):
  deps          npm ci (self, unless --skip-self-install) + the 5 sibling TS
                workspaces (codexDojo/pixelDojo/voxelDojo via pnpm, miniTown
                via pnpm, dojoToday via npm) + `pip install -e` repo root
  contracts     learner/gate contract tests via glob (AID-1601)
  blobs-proof   AID-947 end-to-end Blobs proof (local @netlify/blobs server)
  schema-drift  AID-473 F2 schema-drift monitor over synthetic fixtures
  build         OS build with the same-origin pilot URLs baked in (Vite env)
  smoke         browser install (skippable) + bundle-missions + Playwright
                pilot smoke + 3 desktop smokes (retry policy: env knob)
  report        readiness-report.mjs (READINESS_TEST_RUN=passed)

Flags:
  --skip-self-install   skip the OS `npm ci` in deps (caller already installed,
                        e.g. the CI job which runs lint/test first)
  -h, --help            this help

Environment:
  INTEGRATION_PLAYWRIGHT_RETRIES   Playwright --retries for the smoke phase.
                                   CI sets 1 (deterministic retry policy,
                                   AID-571/AID-1658); local default 0 — never
                                   raise retries to mask a flake.
  INTEGRATION_SKIP_BROWSER_INSTALL =1 skips `npx playwright install --with-deps
                                   chromium` (local machines with browsers
                                   already installed / no sudo for --with-deps).
EOF
  exit 2
}

SKIP_SELF_INSTALL=0
REQUESTED=()
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-self-install) SKIP_SELF_INSTALL=1; shift ;;
    -h|--help) usage ;;
    --*) echo "unknown flag: $1" >&2; usage ;;
    *) REQUESTED+=("$1"); shift ;;
  esac
done
if [ ${#REQUESTED[@]} -eq 0 ]; then
  REQUESTED=("${PHASES_ALL[@]}")
fi
for phase in "${REQUESTED[@]}"; do
  case " ${PHASES_ALL[*]} " in
    *" $phase "*) ;;
    *) echo "unknown phase: $phase" >&2; usage ;;
  esac
done

# CI images provide `python` via setup-python; local machines may only have
# `python3`. The harness accepts either and pins the one it found.
if command -v python >/dev/null 2>&1; then PY=python; else PY=python3; fi

banner() { printf '\n===== [cross-engine] %s =====\n' "$1"; }

phase_deps() {
  banner "deps: sibling TS workspaces + shared Python substrate"
  if [ "$SKIP_SELF_INSTALL" -ne 1 ]; then
    (cd "$OS_DIR" && npm ci)
  fi
  # The integrated OS bridge dispatches fixed, independent Python verifiers,
  # so the runtime needs the shared substrate installed (CI job isolation:
  # the Python job cannot prepare this runtime for us).
  (cd "$OS_DIR" && pnpm --dir ../codexDojo install --frozen-lockfile)
  (cd "$OS_DIR" && pnpm --dir ../pixelDojo install --frozen-lockfile)
  (cd "$OS_DIR" && pnpm --dir ../voxelDojo install --frozen-lockfile)
  (cd "$OS_DIR" && pnpm --dir ../miniTown install --frozen-lockfile)
  (cd "$OS_DIR" && npm ci --prefix ../dojoToday)
  "$PY" -m pip install -e "$REPO_ROOT"
}

phase_contracts() {
  banner "contracts: learner/gate contract tests (glob)"
  # All learner/gate contract tests run via glob (AID-1601, hardening-top10
  # R1): manual enumeration had silently orphaned 3 collector contracts
  # (edge_semantics, funnel_aggregation_v2, schema_drift_monitor_v2), so a
  # golden-rule contract regression could pass CI unnoticed. The glob wires
  # every *.test.mjs in learner/gate/tests (17 today) and auto-wires future
  # ones (precedent: AID-415, AID-470, AID-913, AID-941, AID-947, AID-987,
  # AID-1525 — per-test rationale lives in each file's header).
  (cd "$OS_DIR" && node --test ../../learner/gate/tests/*.test.mjs)
}

phase_blobs_proof() {
  banner "blobs-proof: AID-947 end-to-end durable proof"
  # Real local Blobs server (@netlify/blobs/server) + the collector's DEFAULT
  # export — duplicate identical POSTs must collapse to one export line.
  (cd "$OS_DIR" && npm ci --prefix ../../learner/gate/netlify-functions --ignore-scripts --no-audit --no-fund)
  (cd "$OS_DIR" && node ../../learner/gate/analytics/verify_deployed_blobs.mjs)
}

phase_schema_drift() {
  banner "schema-drift: AID-473 F2 monitor over synthetic fixtures"
  # Contract tests cover classification; this CLI run also fails high on the
  # fixture inputs (real pilot NDJSON never lands in the repo; the fixtures
  # are checked against events.ts by fixtureSchemaDrift.test.ts).
  (cd "$OS_DIR" && node ../../learner/gate/analytics/schema_drift_monitor.mjs \
    --input ../../learner/gate/tests/fixtures/analytics/synthetic,../../learner/gate/tests/fixtures/analytics/synthetic-v4)
}

phase_build() {
  banner "build: OS dist with same-origin pilot URLs (Vite import.meta.env)"
  # Build with the same-origin pilot URLs baked in (Vite reads
  # import.meta.env at build time), so the smoke phase can reuse this dist/
  # without a rebuild.
  (cd "$OS_DIR" && \
    VITE_LITERACYDOJO_URL=/apps/literacydojo/ \
    VITE_WAREHOUSE_URL=/apps/warehouse/ \
    VITE_WORMHOLE_URL=/apps/wormhole/ \
    VITE_RELAY_STATION_URL=/apps/relay-station/ \
    VITE_PIPELINE_PLANT_URL=/apps/pipeline-plant/ \
    VITE_CHECKPOINT_CITY_URL=/apps/checkpoint-city/ \
    VITE_TIMELINE_TOWER_URL=/apps/timeline-tower/ \
    VITE_DOCKING_BAY_URL=/apps/docking-bay/ \
    npm run build)
}

phase_smoke() {
  banner "smoke: bundle-missions + Playwright pilot & desktop smokes"
  local retries="${INTEGRATION_PLAYWRIGHT_RETRIES:-0}"
  echo "cross-engine: Playwright --retries=$retries (CI pins 1; local default 0 — AID-571/AID-1658)"
  if [ "${INTEGRATION_SKIP_BROWSER_INSTALL:-0}" != "1" ]; then
    (cd "$OS_DIR" && npx playwright install --with-deps chromium)
  else
    echo "cross-engine: browser install skipped (INTEGRATION_SKIP_BROWSER_INSTALL=1)"
  fi
  # P5: prove the static pilot build mounts missions from its own origin.
  # The build phase already produced dist/ (and gates typecheck), so we
  # bundle the mission runtimes and run Playwright directly instead of
  # test:smoke:pilot, which would rebuild the OS a second time.
  (cd "$OS_DIR" && node scripts/bundle-missions.mjs)
  # AID-571 (Auditoria #5 A5-F4): deterministic retry policy for the
  # codexdojo-os Playwright smokes. Both known flakes (#154 job 100028707657,
  # #227 job 100052442436) were root-caused to test-side timing fragility
  # and fixed in the specs; --retries=1 (CI) covers the residual transient
  # class WITHOUT ad-hoc manual rerun-failed-jobs: a retried test surfaces
  # as a named "flaky" entry in this log (plus its trace) — that listing is
  # the durable trace the audit required — while a real regression fails
  # twice and still fails the job. Recurrence of the flaky listing on the
  # same test escalates to quarantine + automatic issue (do not raise
  # retries).
  (cd "$OS_DIR" && npx playwright test --retries="$retries" --config=playwright.pilot.config.ts)
  (cd "$OS_DIR" && npx playwright test --retries="$retries" --project=desktop-1280 \
    tests/chapter-continuity.smoke.spec.ts \
    tests/renderer-fallback.smoke.spec.ts \
    tests/readiness-recovery.smoke.spec.ts)
}

phase_report() {
  banner "report: readiness-report.mjs (producer facts for the claims gate)"
  (cd "$OS_DIR" && READINESS_TEST_RUN=passed node scripts/readiness-report.mjs)
}

for phase in "${REQUESTED[@]}"; do
  "phase_${phase//-/_}"
done
echo "cross-engine: requested phases completed: ${REQUESTED[*]}"
