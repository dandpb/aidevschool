#!/usr/bin/env bash
# N=10 CV-strict matrix. The N=3 re-run surfaced winner-claim instability
# (rust baseline p99 CV ~87%, rust endurance p99 CV ~132%), so we scale up
# to the original IDEIAS target of N=10 and gate every comparative claim on
# CV < 20%. Per engines/codexDojo/ecosystem/EVALUATION_MODELS.md, latency /
# memory comparative claims require CV% < 20%; anything above 30% invalidates
# the claim outright. Between 20-30% is BORDERLINE — flagged but not blocking.
set -euo pipefail

PROJ="/Users/danielbarreto/Development/aidevschool/projects/01_rate_limiter"
SCEN_DIR="$PROJ/benchmarks/scenarios"
RES_DIR="$PROJ/benchmarks/results-N10-cv-strict"
AGG="$RES_DIR/aggregated.json"
export PATH=/opt/homebrew/bin:$PATH

# image, internal-port
declare -A IMGS=([go]="rl-go 8080" [rust]="rl-rust 8082" [node]="rl-node 8081")
declare -A HOST_PORT=([go]=18080 [rust]=8082 [node]=8081)
declare -A C_NAME=([go]=rl-go-bench [rust]=rl-rust-bench [node]=rl-node-bench)

# IDEIAS target was N=10. Override via MATRIX_N env var.
N=${MATRIX_N:-10}
SCENARIOS=(baseline stress spike endurance)

# Clean all results dirs
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
echo "All runs complete. Aggregating → $AGG"

# Aggregate per-run metrics in the same shape as results-N3-optimized.
python3 - <<PY
import json, math, os, statistics
from pathlib import Path

RES = Path("$RES_DIR")
LANGS = ["go", "rust", "node"]
SCEN = ["baseline", "stress", "spike", "endurance"]
METRIC_KEYS = ("p50", "p90", "p95", "p99")

per_run = {l: {s: [] for s in SCEN} for l in LANGS}
agg = {l: {s: {} for s in SCEN} for l in LANGS}

def parse_pct(s):
    if s is None: return None
    return float(s)

for l in LANGS:
    for s in SCEN:
        for run in range(1, $N + 1):
            sp = RES / l / f"{s}_run{run}_summary.json"
            tp = RES / l / f"{s}_run{run}_stats.json"
            if not sp.exists():
                continue
            sd = json.loads(sp.read_text())
            m = sd.get("metrics", {})
            dur = m.get("http_req_duration", {})
            checks = m.get("checks", {})
            failed_m = m.get("http_req_failed", {})
            n_req = m.get("http_reqs", {}).get("count", 0)
            try:
                stats = json.loads(tp.read_text()) if tp.exists() else {}
            except Exception:
                stats = {}
            per_run[l][s].append({
                "run": run,
                "metrics": {
                    "n_requests": n_req,
                    "duration_avg": dur.get("avg"),
                    "duration_min": dur.get("min"),
                    "duration_max": dur.get("max"),
                    "p50": parse_pct(dur.get("med")),
                    "p90": parse_pct(dur.get("p(90)")),
                    "p95": parse_pct(dur.get("p(95)")),
                    "p99": parse_pct(dur.get("p(99)")),
                    "failed": failed_m.get("fails", 0),
                    "checks_pass": checks.get("passes", 0),
                    "checks_fail": checks.get("fails", 0),
                },
                "stats": {
                    "cpu_pct": stats.get("CPUPerc", "").rstrip("%") if stats else "",
                    "mem_mb": stats.get("MemUsage", "").split("/")[0].strip() if stats and stats.get("MemUsage") else "",
                    "mem_pct": stats.get("MemPerc", "").rstrip("%") if stats else "",
                    "container": stats.get("Name", ""),
                },
            })
        runs = per_run[l][s]
        if not runs:
            continue
        for key in (*[f"duration_{k}" for k in ("avg","min","max")], *METRIC_KEYS, "failed", "n_requests", "checks_pass", "checks_fail"):
            vals = [r["metrics"].get(key) for r in runs if isinstance(r["metrics"].get(key), (int, float))]
            if vals:
                med = statistics.median(vals)
                std = statistics.pstdev(vals) if len(vals) > 1 else 0.0
                agg[l][s][f"{key}_median"] = round(med, 4)
                agg[l][s][f"{key}_stddev"] = round(std, 4)
        agg[l][s]["n_runs"] = len(runs)
        passes = sum(r["metrics"]["checks_pass"] for r in runs)
        fails = sum(r["metrics"]["checks_fail"] for r in runs)
        agg[l][s]["checks_total_passes"] = passes
        agg[l][s]["checks_total_fails"] = fails
        agg[l][s]["checks_pass_rate"] = round(passes / (passes + fails), 6) if (passes + fails) else 0.0
        total_reqs = sum(r["metrics"]["n_requests"] for r in runs)
        total_failed = sum(r["metrics"]["failed"] for r in runs)
        agg[l][s]["error_rate_pct"] = round(100.0 * total_failed / total_reqs, 4) if total_reqs else 0.0
        cpus = [r["stats"].get("cpu_pct") for r in runs if r["stats"].get("cpu_pct") not in ("", None)]
        mems = [r["stats"].get("mem_mb") for r in runs if r["stats"].get("mem_mb") not in ("", None)]
        try:
            cpu_f = [float(x) for x in cpus]; mem_f = [float(x) for x in mems]
            agg[l][s]["cpu_pct_median"] = round(statistics.median(cpu_f), 4)
            agg[l][s]["cpu_pct_stddev"] = round(statistics.pstdev(cpu_f), 4) if len(cpu_f) > 1 else 0.0
            agg[l][s]["mem_mb_median"] = round(statistics.median(mem_f), 2)
            agg[l][s]["mem_mb_stddev"] = round(statistics.pstdev(mem_f), 2) if len(mem_f) > 1 else 0.0
        except Exception:
            pass

out = {"per_run": per_run, "aggregated": agg}
RES.mkdir(parents=True, exist_ok=True)
Path("$AGG").write_text(json.dumps(out, indent=2))
print(f"wrote {Path('$AGG')}")
PY

echo
echo "================ CV-STRICT VERDICT ================"
python3 - <<PY
import json, statistics
from pathlib import Path

agg = json.loads(Path("$AGG").read_text())["aggregated"]
LANGS = ["go", "rust", "node"]
SCEN = ["baseline", "stress", "spike", "endurance"]
METRICS = ("p50", "p95", "p99")

def cv_pct(median, std):
    if not median or median == 0: return None
    return 100.0 * std / median

def status(cv):
    if cv is None: return "N/A"
    if cv < 20: return "PASS"
    if cv < 30: return "BORDERLINE"
    return "FAIL"

rows = []
fail = False
print()
hdr = f"{'lang':<6} {'scenario':<10} {'metric':<6} {'median_ms':>10} {'cv_pct':>8} {'status':<10}"
print(hdr)
print("-" * len(hdr))
for l in LANGS:
    for s in SCEN:
        for m in METRICS:
            med = agg[l][s].get(f"{m}_median")
            std = agg[l][s].get(f"{m}_stddev")
            cv = cv_pct(med, std)
            st = status(cv)
            if st == "FAIL": fail = True
            print(f"{l:<6} {s:<10} {m:<6} {med if med is not None else 'N/A':>10} {cv if cv is not None else 'N/A':>8} {st:<10}")
            rows.append((l, s, m, med, cv, st))

print()
print("Final table — lang × scenario × {p99_median, p99_cv, status}:")
ft = f"{'lang':<6} {'scenario':<10} {'p99_median':>11} {'p99_cv%':>9} {'status':<10}"
print(ft)
print("-" * len(ft))
for (l, s, m, med, cv, st) in rows:
    if m != "p99": continue
    print(f"{l:<6} {s:<10} {med if med is not None else 'N/A':>11} {cv if cv is not None else 'N/A':>9} {st:<10}")

print()
# Strict gate: exit 0 iff every winner-claim metric has CV < 20%.
# BORDERLINE (20-30%) and FAIL (>= 30%) both exit 1.
non_pass = [r for r in rows if r[5] != "PASS"]
if non_pass:
    n_fail = sum(1 for r in non_pass if r[5] == "FAIL")
    n_border = sum(1 for r in non_pass if r[5] == "BORDERLINE")
    print(f"OVERALL: FAIL — {n_fail} metric(s) >= 30% CV, {n_border} metric(s) 20-30% CV. Exit 1.")
    raise SystemExit(1)
print("OVERALL: PASS — all winner-claim metrics CV < 20%.")
raise SystemExit(0)
PY
