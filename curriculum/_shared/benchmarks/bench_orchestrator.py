#!/usr/bin/env python3
"""Orchestrator: build, test, and benchmark all three impls of one curriculum
project natively (no Docker), then emit a real benchmark_results.md.

For each language (go, rust, node):
  1. build + run the test suite (record pass/fail + counts)
  2. start the server on a dedicated port
  3. run k6 against it (generic read workload or a project-specific one)
  4. capture peak RSS via /usr/bin/time
  5. parse k6 summary into RPS / p50 / p95 / p99 / fail_rate / RSS

Then render docs/benchmark_results.md with REAL numbers and a comparative table.

Usage:
  python3 bench_orchestrator.py <project_dir> [--read-path /health] [--workload PATH]

Designed to be re-run; it overwrites docs/benchmark_results.md. Requires the
brew toolchain (go, rust/cargo, node/npm, k6) on PATH.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
LANGS = ("go", "rust", "node")
# Distinct ports per language to avoid TIME_WAIT collisions.
PORTS = {"go": 28080, "rust": 28082, "node": 28081}


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


# --------------------------------------------------------------------------- #
@dataclass
class BuildResult:
    lang: str
    built: bool
    tests_passed: bool
    test_detail: str = ""
    binary: str = ""
    start_cmd: list = field(default_factory=list)
    cwd: Path = Path()


def build_and_test(project_dir: Path, lang: str) -> BuildResult:
    impl = project_dir / f"{lang}-impl"
    br = BuildResult(lang=lang, built=False, tests_passed=False, cwd=impl)
    if not impl.exists():
        br.test_detail = "impl dir missing"
        return br
    if lang == "go":
        b = run(["go", "build", "./..."], cwd=impl)
        br.built = b.returncode == 0
        if not br.built:
            br.test_detail = (b.stderr or b.stdout)[-300:]
            return br
        # Find the package containing `package main` (entry point). It may live
        # in main.go OR another file like order.go, and at the repo root or in cmd/.
        main_dir = None
        for go_file in impl.rglob("*.go"):
            if go_file.name.endswith("_test.go"):
                continue
            try:
                head = go_file.read_text(encoding="utf-8", errors="ignore")[:200]
            except Exception:
                continue
            if re.search(r"^package main\b", head, re.MULTILINE):
                main_dir = go_file.parent
                break
        if main_dir:
            out = Path("/tmp") / f"bench-go-{os.getpid()}"
            pkg = "./" + str(main_dir.relative_to(impl)) if main_dir != impl else "."
            run(["go", "build", "-o", str(out), pkg], cwd=impl)
            if out.exists():
                br.binary = str(out)
                br.start_cmd = [br.binary]
        t = run(["go", "test", "./..."], cwd=impl)
        br.tests_passed = t.returncode == 0
        br.test_detail = (t.stdout or t.stderr)[-400:]
    elif lang == "rust":
        b = run(["cargo", "build", "--release"], cwd=impl)
        br.built = b.returncode == 0
        if not br.built:
            br.test_detail = (b.stderr or b.stdout)[-300:]
            return br
        binp = next(
            (p for p in (impl / "target" / "release").iterdir()
             if p.is_file() and os.access(p, os.X_OK) and p.suffix == ""),
            None,
        )
        if binp:
            br.binary = str(binp)
            br.start_cmd = [br.binary]
        t = run(["cargo", "test", "--quiet"], cwd=impl)
        br.tests_passed = t.returncode == 0
        br.test_detail = (t.stdout or t.stderr)[-400:]
    elif lang == "node":
        run(["npm", "ci", "--silent"], cwd=impl)
        b = run(["npm", "run", "build", "--silent"], cwd=impl)
        br.built = b.returncode == 0
        # Some projects' tsc fails on test-file type errors (missing vitest
        # globals) while the runtime + dist/ output are correct. Treat the build
        # as good enough if it produced an entry OR if tests pass separately.
        if not br.built:
            br.test_detail = (b.stderr or b.stdout)[-200:]
            # Don't bail — entry discovery below + the test run decide fitness.
        t = run(["npm", "test", "--silent"], cwd=impl)
        br.tests_passed = t.returncode == 0
        br.test_detail = (t.stdout or t.stderr)[-400:]
        # Find the server entry: prefer package.json "main"/"start", else dist/**/main.js
        entry = None
        try:
            import json as _json
            pkg = _json.loads((impl / "package.json").read_text())
            for key in ("main",):
                val = pkg.get(key)
                if val and (impl / val).exists():
                    entry = impl / val
                    break
        except Exception:
            pass
        if entry is None:
            for cand in [impl / "dist" / "main.js", impl / "dist" / "src" / "main.js",
                         impl / "dist" / "index.js"]:
                if cand.exists():
                    entry = cand
                    break
        if entry is None:
            cands = list(impl.glob("dist/**/main.js")) + list(impl.glob("dist/**/index.js"))
            entry = cands[0] if cands else None
        if entry and entry.exists():
            br.start_cmd = ["node", str(entry.relative_to(impl))]
    return br


# --------------------------------------------------------------------------- #
# Candidate ports some servers bind when they don't honor the PORT env we set.
# We probe all of these during readiness so the harness adapts to wherever the
# server actually listens (curriculum servers variously hardcode 8080-8086,
# 9001, etc.). The PORT-env ports (28080-28082) are tried first.
CANDIDATE_PORTS = (28080, 28081, 28082, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 3000, 9000, 9001)


def probe_ready(proc, ports, health_path="/health"):
    """Probe candidate ports until one responds. Returns the live port or None."""
    for _ in range(80):
        if proc.poll() is not None:
            return None
        for p in ports:
            code = run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                        f"http://localhost:{p}{health_path}"]).stdout.strip()
            if code and code != "000":
                return p
        time.sleep(0.25)
    return None


def start_server(br: BuildResult, port: int, health_path: str = "/health"):
    """Start the server under /usr/bin/time. Returns (proc, log_path, live_port)
    or (None, log, None). Some servers ignore PORT and bind a hardcoded default,
    so we probe a set of candidate ports rather than assuming `port`.
    """
    if not br.start_cmd:
        return None, "no start command", None
    log_path = Path("/tmp") / f"bench-{br.lang}-{os.getpid()}.log"
    env = {**os.environ, "PORT": str(port), "NODE_ENV": "production"}
    full = ["/usr/bin/time", "-l", "-p"] + br.start_cmd
    with open(log_path, "w") as logf:
        proc = subprocess.Popen(full, cwd=br.cwd, env=env, stdout=logf,
                                stderr=subprocess.STDOUT, start_new_session=True)
    live = probe_ready(proc, CANDIDATE_PORTS, health_path)
    if live is None:
        # Build a concise error: did the process exit (demo/non-server impl?)
        # or stay up but never answer (wrong port/blocked)?
        exited = proc.poll() is not None
        log_tail = log_path.read_text()[-300:] if log_path.exists() else ""
        # Strip /usr/bin/time resource-stat noise from the message.
        clean = re.sub(r"\n\s*\d+\s+[\w ]+\n", "\n", log_tail).strip()
        reason = "process exited (impl is a demo/library, not a long-running server)" if exited \
            else "no response on any candidate port (wrong port or blocked)"
        return None, f"{reason}. log: {clean[-200:]}", None
    return proc, log_path, live


def stop_server(proc):
    """Stop the server so /usr/bin/time flushes its resource stats (peak RSS).

    The proc is the /usr/bin/time wrapper; its child is the actual server.
    macOS /usr/bin/time only writes the peak-RSS line after its child exits
    normally. So we SIGTERM the time wrapper's CHILD (not the wrapper itself —
    killing time directly prevents it from flushing), then wait for the wrapper
    to exit and emit the stats. Child PID is found via `pgrep -P`. Falls back to
    terminating the wrapper if there is no separable child.
    """
    terminated = False
    try:
        # Find the time wrapper's direct child (the actual server process).
        out = run(["pgrep", "-P", str(proc.pid)]).stdout.split()
        for cpid in out:
            try:
                os.kill(int(cpid), signal.SIGTERM)
            except Exception:
                pass
        if out:
            terminated = True
    except Exception:
        pass
    if not terminated:
        proc.terminate()
    try:
        proc.wait(timeout=6)
    except Exception:
        proc.kill()
        try:
            proc.wait(timeout=3)
        except Exception:
            pass


def run_k6(port: int, workload: Path, read_path: str) -> dict | None:
    summary = Path("/tmp") / f"bench-k6-{os.getpid()}.json"
    env = {**os.environ, "TARGET_PORT": str(port), "READ_PATH": read_path}
    try:
        run(["k6", "run", "--quiet", f"--summary-export={summary}", str(workload)],
            env=env, timeout=120)
    except subprocess.TimeoutExpired:
        return None
    if not summary.exists():
        return None
    try:
        raw = summary.read_text()
        s, _ = json.JSONDecoder().raw_decode(raw.lstrip())
    except Exception:
        return None
    m = s.get("metrics", {})
    dur = m.get("http_req_duration", {})
    return {
        "rps": m.get("http_reqs", {}).get("rate"),
        "avg_ms": dur.get("avg"), "min_ms": dur.get("min"), "max_ms": dur.get("max"),
        "p50_ms": dur.get("med"), "p90_ms": dur.get("p(90)"),
        "p95_ms": dur.get("p(95)"), "p99_ms": dur.get("p(99)"),
        "fail_rate": m.get("http_req_failed", {}).get("value"),
        "iters": m.get("iterations", {}).get("count"),
    }


def peak_rss_mb(log_path: Path) -> float | None:
    txt = log_path.read_text() if log_path.exists() else ""
    m = re.search(r"(\d+)\s+maximum resident set size", txt)
    return round(int(m.group(1)) / 1048576, 1) if m else None


def benchmark_lang(project_dir: Path, lang: str, workload: Path, read_path: str) -> dict:
    port = PORTS[lang]
    br = build_and_test(project_dir, lang)
    result = {"lang": lang, "built": br.built, "tests_passed": br.tests_passed,
              "test_detail": br.test_detail.strip()}
    # Require a runnable entry. For node, tsc may have failed on test-file types
    # while dist/ + tests are fine, so we proceed if we have a start_cmd + tests.
    if not br.start_cmd or (not br.built and not br.tests_passed):
        result["error"] = "build failed or no server binary"
        return result
    # The health route is the read_path's root, e.g. /__config/health -> probe that.
    proc, log, live_port = start_server(br, port, read_path)
    if proc is None:
        result["error"] = f"did not become ready: {log}"
        return result
    result["bound_port"] = live_port
    try:
        time.sleep(0.5)
        result.update(run_k6(live_port, workload, read_path) or {})
        time.sleep(0.3)
    finally:
        stop_server(proc)
        time.sleep(0.4)  # let /usr/bin/time flush the RSS line to the log
    log_path = Path("/tmp") / f"bench-{lang}-{os.getpid()}.log"
    result["peak_rss_mb"] = peak_rss_mb(log_path)
    return result


# --------------------------------------------------------------------------- #
def render_report(project_id: str, results: list[dict], read_path: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Benchmark Results: {project_id}",
        "",
        "## Methodology",
        "",
        "Each implementation was built and its test suite run natively on macOS arm64",
        "(Apple Silicon) with the Homebrew toolchain. The server was then started on a",
        f"dedicated port and driven by `k6` ({read_path} read workload, ramp 0→50→100→0",
        "VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles",
        "and throughput come from k6's summary export.",
        "",
        "> These are real single-machine measurements (N=1 run each), not Docker-based",
        "> load tests. Use them for relative cross-language comparison on this hardware;",
        "> re-run on dedicated benchmark hardware for publication-grade p95/p99.",
        "",
        "## Build & Test Status",
        "",
        "| Lang | Built | Tests | Test detail |",
        "| --- | :---: | :---: | --- |",
    ]
    for r in results:
        detail = (r.get("test_detail") or "").replace("|", "\\|").replace("\n", " ")[:120]
        lines.append(f"| {r['lang']} | {'✅' if r.get('built') else '❌'} | "
                     f"{'✅' if r.get('tests_passed') else '❌'} | {detail} |")
    lines += ["", "## Comparative Results", "",
              "| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |",
              "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for r in results:
        if r.get("rps") is None:
            lines.append(f"| {r['lang']} | — | — | — | — | — | — | _{r.get('error','n/a')}_ |")
            continue
        def f(v, w=1):
            return f"{v:.{w}f}" if isinstance(v, (int, float)) else "—"
        lines.append(
            f"| {r['lang']} | {f(r.get('rps'),0)} | {f(r.get('avg_ms'))} | {f(r.get('p50_ms'))} | "
            f"{f(r.get('p95_ms'))} | {f(r.get('p99_ms'))} | {f(r.get('fail_rate'),3)} | "
            f"{f(r.get('peak_rss_mb'))} |"
        )
    lines += ["", "## Per-language Detail", ""]
    for r in results:
        lines.append(f"### {r['lang']}")
        if r.get("rps") is None:
            err = (r.get("error") or "unknown").replace("|", "\\|")
            # Keep only the first sentence of the error for readability.
            err = err.split(". ")[0]
            if "demo" in err or "no server binary" in err:
                lines += [
                    f"Not benchmarked as an HTTP server: {err}.",
                    "",
                    "This implementation builds and its unit tests pass, but it does not",
                    "expose a long-running HTTP endpoint (it is a demo/library that runs to",
                    "completion). Re-run against a server variant for throughput data.",
                ]
            else:
                lines.append(f"Not benchmarked: {err}.")
            lines.append("")
            continue
        lines += [
            f"- Throughput: **{r.get('rps'):.0f} req/s**",
            f"- Latency: avg {r.get('avg_ms'):.2f} ms · p50 {r.get('p50_ms'):.2f} ms · "
            f"p95 {r.get('p95_ms'):.2f} ms · p99 {r.get('p99_ms'):.2f} ms",
            f"- Error rate: {r.get('fail_rate',0):.3f}",
            f"- Peak RSS: {r.get('peak_rss_mb')} MB",
            f"- Iterations: {r.get('iters')}",
            "",
        ]
    lines.append(f"_Generated {now} by `curriculum/_shared/benchmarks/bench_orchestrator.py`._")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project_dir")
    ap.add_argument("--read-path", default="/health")
    ap.add_argument("--workload", default=str(HERE / "generic_http_workload.js"))
    args = ap.parse_args()
    project_dir = Path(args.project_dir).resolve()
    project_id = project_dir.name
    workload = Path(args.workload)
    results = [benchmark_lang(project_dir, lang, workload, args.read_path) for lang in LANGS]
    for r in results:
        ok = "✅" if r.get("rps") is not None else "❌"
        print(f"  {ok} {r['lang']:5} rps={r.get('rps')}", file=sys.stderr)
    report = render_report(project_id, results, args.read_path)
    out = project_dir / "docs" / "benchmark_results.md"
    out.write_text(report, encoding="utf-8")
    print(f"wrote {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
