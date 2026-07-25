"""Bounded subprocess execution without a shell."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass(frozen=True, slots=True)
class ProcessResult:
    returncode: int
    stdout: bytes
    stderr: bytes
    stdout_truncated: bool
    stderr_truncated: bool
    timed_out: bool
    cancelled: bool


def _drain(stream, cap: int, target: list[bytes], truncated: list[bool]) -> None:
    retained = bytearray()
    while True:
        chunk = stream.read(65536)
        if not chunk:
            break
        available = cap - len(retained)
        if available > 0:
            retained.extend(chunk[:available])
        if len(chunk) > available:
            truncated[0] = True
    target.append(bytes(retained))


def run_process(
    argv: list[str], stdin_message: dict, *, cwd: Path, env: dict[str, str], timeout: int,
    grace: int, stdout_cap: int, stderr_cap: int,
    cancelled: Callable[[], bool] = lambda: False,
) -> ProcessResult:
    process = subprocess.Popen(
        argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        cwd=cwd, env=env, shell=False, start_new_session=True,
    )
    assert process.stdin and process.stdout and process.stderr
    out: list[bytes] = []
    err: list[bytes] = []
    out_truncated = [False]
    err_truncated = [False]
    threads = [
        threading.Thread(target=_drain, args=(process.stdout, stdout_cap, out, out_truncated), daemon=True),
        threading.Thread(target=_drain, args=(process.stderr, stderr_cap, err, err_truncated), daemon=True),
    ]
    timed_out = was_cancelled = False
    started: list[threading.Thread] = []
    try:
        for thread in threads:
            thread.start()
            started.append(thread)
        try:
            process.stdin.write((json.dumps(stdin_message, separators=(",", ":")) + "\n").encode())
            process.stdin.close()
        except (BrokenPipeError, OSError):
            pass
        deadline = time.monotonic() + timeout
        while process.poll() is None:
            was_cancelled = cancelled()
            timed_out = time.monotonic() >= deadline
            if was_cancelled or timed_out:
                break
            time.sleep(0.02)
    finally:
        if process.poll() is None:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                process.wait(grace)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        process.wait()
        for thread in started:
            thread.join()
    return ProcessResult(
        process.returncode, out[0], err[0], out_truncated[0], err_truncated[0],
        timed_out, was_cancelled,
    )
