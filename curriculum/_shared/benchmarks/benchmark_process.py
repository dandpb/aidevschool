from __future__ import annotations

import os
import re
import signal
import subprocess
import time
from pathlib import Path
from typing import Final, Sequence

from .benchmark_build import BuildResult

CANDIDATE_PORTS: Final = (
    28080,
    28081,
    28082,
    8080,
    8081,
    8082,
    8083,
    8084,
    8085,
    8086,
    3000,
    9000,
    9001,
)


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def probe_ready(
    process: subprocess.Popen[bytes],
    ports: Sequence[int],
    health_path: str = "/health",
) -> int | None:
    for _ in range(80):
        if process.poll() is not None:
            return None
        for port in ports:
            response = _run(
                [
                    "curl",
                    "-s",
                    "-o",
                    "/dev/null",
                    "-w",
                    "%{http_code}",
                    f"http://localhost:{port}{health_path}",
                ]
            )
            code = response.stdout.strip()
            if code and code != "000":
                return port
        time.sleep(0.25)
    return None


def start_server(
    build: BuildResult,
    port: int,
    health_path: str = "/health",
) -> tuple[subprocess.Popen[bytes] | None, Path | str, int | None]:
    if not build.start_cmd:
        return None, "no start command", None

    log_path = Path("/tmp") / f"bench-{build.lang}-{os.getpid()}.log"
    environment = {**os.environ, "PORT": str(port), "NODE_ENV": "production"}
    command = ["/usr/bin/time", "-l", "-p", *build.start_cmd]
    with log_path.open("w") as log_file:
        process = subprocess.Popen(
            command,
            cwd=build.cwd,
            env=environment,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )

    live_port = probe_ready(process, CANDIDATE_PORTS, health_path)
    if live_port is not None:
        return process, log_path, live_port

    exited = process.poll() is not None
    log_tail = log_path.read_text()[-300:] if log_path.exists() else ""
    clean_log = re.sub(r"\n\s*\d+\s+[\w ]+\n", "\n", log_tail).strip()
    reason = (
        "process exited (impl is a demo/library, not a long-running server)"
        if exited
        else "no response on any candidate port (wrong port or blocked)"
    )
    return None, f"{reason}. log: {clean_log[-200:]}", None


def stop_server(process: subprocess.Popen[bytes]) -> None:
    terminated_child = False
    try:
        child_pids = _run(["pgrep", "-P", str(process.pid)]).stdout.split()
    except OSError:
        child_pids = []

    for child_pid in child_pids:
        try:
            os.kill(int(child_pid), signal.SIGTERM)
        except (PermissionError, ProcessLookupError):
            continue
    if child_pids:
        terminated_child = True

    if not terminated_child:
        process.terminate()
    try:
        process.wait(timeout=6)
    except subprocess.TimeoutExpired:
        process.kill()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            return


def peak_rss_mb(log_path: Path) -> float | None:
    contents = log_path.read_text() if log_path.exists() else ""
    match = re.search(r"(\d+)\s+maximum resident set size", contents)
    return round(int(match.group(1)) / 1048576, 1) if match else None
