#!/usr/bin/env python3
"""
analyze_results.py — read raw k6 JSON output streams + docker stats JSON
snapshots and compute per-(lang, scenario) metrics including p50/p99
which k6 v2 doesn't emit in summary-export by default.

Outputs:
  - benchmarks/results/aggregated.json   (machine-readable)
  - markdown table to stdout             (for the report)
"""
import json
import statistics
import re
from pathlib import Path

PROJ = Path("/Users/danielbarreto/Development/aidevschool/projects/01_rate_limiter")
RES = PROJ / "benchmarks" / "results-N3-optimized"
LANGS = ["go", "rust", "node"]
SCEN = ["baseline", "stress", "spike", "endurance"]
N = 3

# Docker stats -> container name -> which language
NAME_TO_LANG = {
    "rl-go-bench": "go",
    "rl-rust-bench": "rust",
    "rl-node-bench": "node",
}

def compute_percentiles(values, percentiles=(50, 90, 95, 99)):
    if not values:
        return {f"p{p}": 0.0 for p in percentiles}
    s = sorted(values)
    n = len(s)
    return {f"p{p}": s[min(int(n * p / 100), n - 1)] for p in percentiles}

def parse_raw_k6_json(path):
    """Read the streaming JSON output and collect http_req_duration points."""
    durations = []
    failed = 0
    total = 0
    checks_pass = 0
    checks_fail = 0
    if not path.exists():
        return None
    with open(path) as f:
        for line in f:
            try:
                d = json.loads(line)
                t = d.get("type")
                m = d.get("metric")
                if t == "Point":
                    if m == "http_req_duration":
                        v = d.get("data", {}).get("value")
                        if v is not None:
                            durations.append(v)
                    elif m == "http_req_failed":
                        v = d.get("data", {}).get("value")
                        if v is not None:
                            if v: failed += 1
                            total += 1
                    elif m == "checks":
                        v = d.get("data", {}).get("value")
                        if v is not None:
                            if v: checks_pass += 1
                            else: checks_fail += 1
            except Exception:
                pass
    if not durations:
        return None
    pctls = compute_percentiles(durations)
    return {
        "n_requests": len(durations),
        "duration_avg": sum(durations) / len(durations),
        "duration_min": min(durations),
        "duration_max": max(durations),
        "p50": pctls["p50"],
        "p90": pctls["p90"],
        "p95": pctls["p95"],
        "p99": pctls["p99"],
        "failed": failed,
        "checks_pass": checks_pass,
        "checks_fail": checks_fail,
    }

def parse_stats_json(path):
    if not path.exists():
        return None
    try:
        with open(path) as f:
            snap = json.loads(f.read().strip())
        cpu = float(snap.get("CPUPerc", "0%").rstrip("%"))
        mem = snap.get("MemUsage", "0B / 0B").split("/")[0].strip()
        num = float(re.sub(r"[^0-9.]", "", mem))
        unit = re.sub(r"[0-9.\s]", "", mem)
        mult = {"B":1,"KiB":1024,"MiB":1024**2,"GiB":1024**3,"KB":1000,"MB":1000**2,"GB":1000**3}.get(unit, 1)
        return {
            "cpu_pct": cpu,
            "mem_mb": num * mult / (1024**2),
            "mem_pct": float(snap.get("MemPerc", "0%").rstrip("%")),
            "container": snap.get("Name", "?"),
        }
    except Exception as e:
        return {"error": str(e)}

def main():
    out = {"per_run": {}, "aggregated": {}}

    # First pass: find what actually exists
    for lang in LANGS:
        for sc in SCEN:
            runs = []
            for run in range(1, N+1):
                raw_path = RES / lang / f"{sc}_run{run}.json"
                stats_path = RES / lang / f"{sc}_run{run}_stats.json"
                m = parse_raw_k6_json(raw_path)
                s = parse_stats_json(stats_path)
                if m:
                    runs.append({"run": run, "metrics": m, "stats": s})
            out["per_run"].setdefault(lang, {})[sc] = runs

            if not runs:
                out["aggregated"].setdefault(lang, {})[sc] = {"missing": True, "n_runs": 0}
                continue

            # Aggregate
            agg = {"n_runs": len(runs)}
            for k in ["duration_avg", "duration_min", "duration_max", "p50", "p90", "p95", "p99",
                      "failed", "n_requests", "checks_pass", "checks_fail"]:
                vals = [r["metrics"][k] for r in runs]
                agg[f"{k}_median"] = round(statistics.median(vals), 4)
                agg[f"{k}_stddev"] = round(statistics.pstdev(vals) if len(vals) > 1 else 0.0, 4)
            # Compute delivered RPS from n_requests / duration (we don't know exact scenario duration here)
            agg["checks_total_passes"] = sum(r["metrics"]["checks_pass"] for r in runs)
            agg["checks_total_fails"] = sum(r["metrics"]["checks_fail"] for r in runs)
            agg["checks_pass_rate"] = agg["checks_total_passes"] / max(1, agg["checks_total_passes"] + agg["checks_total_fails"])
            agg["error_rate_pct"] = 100.0 * agg["failed_median"] / max(1, agg["n_requests_median"])
            # Stats
            for k in ["cpu_pct", "mem_mb", "mem_pct"]:
                vals = [r["stats"][k] for r in runs if r["stats"] and k in r["stats"]]
                if vals:
                    agg[f"{k}_median"] = round(statistics.median(vals), 2)
                    agg[f"{k}_stddev"] = round(statistics.pstdev(vals) if len(vals) > 1 else 0.0, 2)
            out["aggregated"].setdefault(lang, {})[sc] = agg

    out_path = RES / "aggregated.json"
    out_path.write_text(json.dumps(out, indent=2))
    print(f"Wrote {out_path}")

    # Markdown table
    print("\n=== Per-run raw table ===")
    print(f"{'lang':6}{'scen':10}{'run':4}{'reqs':>8}{'avg_ms':>8}{'p50':>7}{'p90':>7}{'p95':>7}{'p99':>7}{'max':>7}{'err%':>6}{'cpu%':>6}{'mem_MB':>8}{'checks':>7}")
    for lang in LANGS:
        for sc in SCEN:
            runs = out["per_run"].get(lang, {}).get(sc, [])
            for r in runs:
                m = r["metrics"]; s = r["stats"] or {}
                err = 100.0 * m["failed"] / max(1, m["n_requests"])
                ck = m["checks_pass"] / max(1, m["checks_pass"] + m["checks_fail"]) * 100
                print(
                    f"{lang:6}{sc:10}{r['run']:<4}"
                    f"{m['n_requests']:>8}"
                    f"{m['duration_avg']:>8.2f}"
                    f"{m['p50']:>7.2f}"
                    f"{m['p90']:>7.2f}"
                    f"{m['p95']:>7.2f}"
                    f"{m['p99']:>7.2f}"
                    f"{m['duration_max']:>7.2f}"
                    f"{err:>6.1f}"
                    f"{s.get('cpu_pct', 0):>6.1f}"
                    f"{s.get('mem_mb', 0):>8.1f}"
                    f"{ck:>6.1f}%"
                )
            if not runs:
                print(f"{lang:6}{sc:10}    -- no data --")

if __name__ == "__main__":
    main()
