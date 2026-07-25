#!/usr/bin/env bash
# Minimal pivot: drop poller, single docker stats JSON snapshot per run.
# Usage: RESULTS_DIR_NAME=results-N3-optimized MATRIX_N=3 ./run_matrix.sh
set -euo pipefail

PROJ="/Users/danielbarreto/Development/aidevschool/projects/01_rate_limiter"
SCEN_DIR="$PROJ/benchmarks/scenarios"
RESULTS_DIR_NAME=${RESULTS_DIR_NAME:-results}
if [[ ! "$RESULTS_DIR_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "ERROR: RESULTS_DIR_NAME must be a single safe directory name" >&2
  exit 2
fi
RES_DIR="$PROJ/benchmarks/$RESULTS_DIR_NAME"
export PATH=/opt/homebrew/bin:$PATH

# image, internal-port
declare -A IMGS=([go]="rl-go 8080" [rust]="rl-rust 8082" [node]="rl-node 8081")
declare -A HOST_PORT=([go]=18080 [rust]=8082 [node]=8081)
declare -A C_NAME=([go]=rl-go-bench [rust]=rl-rust-bench [node]=rl-node-bench)

N=${MATRIX_N:-1}
SCENARIOS=(baseline stress spike endurance)

rm -rf "$RES_DIR"
mkdir -p "$RES_DIR"/{go,rust,node}

# Snapshot stats as JSON
snapshot_stats() {
  local NAME=$1
  local OUT=$2
  docker stats --no-stream --no-trunc --format json "$NAME" > "$OUT" 2>/dev/null || echo "{\"error\":\"no-stats\"}" > "$OUT"
}

cleanup() {
  local cl
  for cl in go rust node; do
    docker rm -f "${C_NAME[$cl]}" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

for lang in go rust node; do
  set -- ${IMGS[$lang]}
  IMG=$1; INT_PORT=$2
  HOST_P=${HOST_PORT[$lang]}; NAME=${C_NAME[$lang]}

  for sc in "${SCENARIOS[@]}"; do
    for run in $(seq 1 $N); do
      echo
      echo "=========================================="
      echo "[$lang] scenario=$sc run=$run/$N  $(date '+%H:%M:%S')"
      echo "=========================================="
      cleanup
      docker run -d --name "$NAME" -p "${HOST_P}:${INT_PORT}" "$IMG" >/dev/null
      READY=0
      for i in $(seq 1 30); do
        CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${HOST_P}/" || true)
        if [ "$CODE" = "200" ] || [ "$CODE" = "429" ]; then READY=1; break; fi
        sleep 0.3
      done
      [ "$READY" != "1" ] && echo "WARN: not ready after 9s"
      sleep 1

      OUT="$RES_DIR/$lang/${sc}_run${run}.json"
      SUMMARY="$RES_DIR/$lang/${sc}_run${run}_summary.json"
      STATS="$RES_DIR/$lang/${sc}_run${run}_stats.json"

      TARGET_PORT=$HOST_P k6 run \
        --summary-export="$SUMMARY" \
        --out "json=$OUT" \
        "$SCEN_DIR/${sc}.js" > "$RES_DIR/$lang/${sc}_run${run}.log" 2>&1 || true

      snapshot_stats "$NAME" "$STATS"
      echo "[$lang/$sc/run$run] done @ $(date '+%H:%M:%S')"
    done
  done
done

echo
echo "All runs complete. Results in $RES_DIR"
