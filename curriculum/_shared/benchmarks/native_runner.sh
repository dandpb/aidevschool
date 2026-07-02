#!/usr/bin/env bash
# Native (no-Docker) benchmark runner for aidevschool curriculum HTTP projects.
#
# Builds + starts ONE language impl, runs k6 against it, captures peak RSS,
# and emits a JSON summary on stdout. Designed to be called once per language
# per project; the caller aggregates the three JSON blobs into the report.
#
# Usage:
#   native_runner.sh <project_dir> <lang> <port> <k6_script>
#
# Requires: go/rust/node + k6 on PATH (brew). Uses /usr/bin/time for RSS.
set -euo pipefail

PROJECT_DIR="$1"; LANG_IMPL="$2"; PORT="$3"; K6_SCRIPT="$4"
IMPL_DIR="${PROJECT_DIR}/${LANG_IMPL}-impl"
BIN="/tmp/bench-${LANG_IMPL}-$$"
LOG="/tmp/bench-${LANG_IMPL}-$$.log"
PID=""

cleanup() {
  [[ -n "$PID" ]] && kill "$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
  rm -f "$BIN" "$LOG" "${BIN}.time"
}
trap cleanup EXIT

echo "→ [$LANG_IMPL] building..." >&2
case "$LANG_IMPL" in
  go)
    ( cd "$IMPL_DIR" && go build -o "$BIN" ./cmd/*/ 2>>"$LOG" )
    ;;
  rust)
    ( cd "$IMPL_DIR" && cargo build --release 2>>"$LOG" )
    BIN="$(find "$IMPL_DIR/target/release" -maxdepth 1 -type f ! -name '*.d' ! -name '*.rlib' -perm +111 | head -1)"
    [[ -n "$BIN" ]] || { echo "rust binary not found" >&2; exit 1; }
    ;;
  node)
    ( cd "$IMPL_DIR" && npm ci --silent 2>>"$LOG" && npm run build --silent 2>>"$LOG" )
    ;;
  *) echo "unknown lang: $LANG_IMPL" >&2; exit 1 ;;
esac

echo "→ [$LANG_IMPL] starting on :$PORT..." >&2
# Start the server once, wrapped in /usr/bin/time to capture peak RSS.
case "$LANG_IMPL" in
  go | rust)
    ( PORT="$PORT" /usr/bin/time -l -p "$BIN" >>"$LOG" 2>&1 ) & PID=$!
    ;;
  node)
    ( cd "$IMPL_DIR" && PORT="$PORT" /usr/bin/time -l -p node dist/src/main.js >>"$LOG" 2>&1 ) & PID=$!
    ;;
esac

# wait for readiness
ready=0
for i in $(seq 1 50); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/health" 2>/dev/null || true)
  [[ "$code" =~ ^(200|404|405|429)$ ]] && { ready=1; break; }
  sleep 0.2
done
[[ "$ready" -eq 1 ]] || { echo "[$LANG_IMPL] did not become ready" >&2; cat "$LOG" >&2; exit 1; }
echo "→ [$LANG_IMPL] ready, running k6..." >&2

SUMMARY="/tmp/bench-${LANG_IMPL}-$$.summary.json"
TARGET_PORT="$PORT" k6 run --quiet --summary-export="$SUMMARY" "$K6_SCRIPT" >>"$LOG" 2>&1 || true

sleep 0.5
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true

# peak RSS in bytes (macOS /usr/bin/time -l prints "<bytes>  maximum resident set size")
PEAK_RSS=$(grep -i 'maximum resident set size' "$LOG" 2>/dev/null | awk '{print $1}' || true)
PEAK_RSS_MB=$(awk -v r="${PEAK_RSS:-0}" 'BEGIN{printf "%.1f", r/1048576}')

# Extract metrics from k6 summary (k6 v2 emits >1 JSON object; take the first).
python3 - "$SUMMARY" "$LANG_IMPL" "$PEAK_RSS_MB" <<'PY'
import json, sys, re
summary_path, lang, rss = sys.argv[1], sys.argv[2], sys.argv[3]
raw = open(summary_path).read()
# k6 v2 may concatenate JSON objects; decode just the first.
try:
    dec = json.JSONDecoder()
    s, _ = dec.raw_decode(raw.lstrip())
except Exception as e:
    print(json.dumps({"lang": lang, "error": f"k6 summary parse failed: {e}"})); sys.exit(0)
m = s.get("metrics", {})
def get(name, key="avg"):
    v = m.get(name, {})
    return v.get(key) if isinstance(v, dict) else None
dur = m.get("http_req_duration", {})
out = {
    "lang": lang,
    "rps": get("http_reqs", "rate"),
    "avg_ms": dur.get("avg"),
    "min_ms": dur.get("min"),
    "max_ms": dur.get("max"),
    "p50_ms": dur.get("med"),
    "p90_ms": dur.get("p(90)"),
    "p95_ms": dur.get("p(95)"),
    "p99_ms": dur.get("p(99)"),
    "fail_rate": get("http_req_failed", "value"),
    "checks_pass": m.get("checks", {}).get("passes"),
    "checks_fail": m.get("checks", {}).get("fails"),
    "iterations": get("iterations", "count"),
    "peak_rss_mb": float(rss) if rss else None,
    "vus_max": get("vus_max"),
}
print(json.dumps(out))
PY
