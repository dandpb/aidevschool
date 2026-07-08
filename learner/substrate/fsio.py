"""Atomic filesystem helpers for the learner substrate.

Canonical state and derived views must never be half-written: a crash mid-write
leaves the previous file intact. Kept free of engine-specific errors so any
caller under `learner/` or the shared verifier can use it.
"""

from __future__ import annotations

import contextlib
import os
import tempfile
from pathlib import Path


def atomic_write_text(path: Path, text: str) -> None:
    """Write ``text`` to ``path`` via temp-file-then-``os.replace``.

    The rename is atomic on POSIX, so a crash mid-write leaves the previous
    file intact. Parent directories are created as needed.
    """
    path = Path(path)
    tmp_name = ""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(
            dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
        )
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(tmp_name, path)
    except OSError:
        if tmp_name:
            with contextlib.suppress(OSError):
                os.unlink(tmp_name)
        raise
