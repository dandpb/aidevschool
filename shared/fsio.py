"""Atomic filesystem writes and guarded path resolution.

``atomic_write_text`` moved from ``learner/substrate/fsio.py`` and
``resolve_contained`` was lifted from ``curriculum/_shared/evidence.py`` into
this neutral home (2026-09-13): canonical state, derived views, and evidence
files must never be half-written, and containment checks must not live inside
one context's judgment module.
"""

from __future__ import annotations

import contextlib
import os
import tempfile
from pathlib import Path

from shared.errors import StateCorruptionError


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


def resolve_contained(path: Path, base: Path) -> Path:
    """Resolve ``path`` against ``base`` and refuse anything that escapes it.

    Symlinks are resolved before the containment check, so a link pointing
    outside ``base`` is rejected rather than followed out. Semantics and
    message lifted verbatim from ``curriculum/_shared/evidence._resolve_contained``.
    """
    resolved_base = base.resolve()
    resolved = path.resolve() if path.is_absolute() else (resolved_base / path).resolve()
    if not resolved.is_relative_to(resolved_base):
        raise StateCorruptionError(f"path {path!s} escapes root {resolved_base!s}")
    return resolved


__all__ = ["atomic_write_text", "resolve_contained"]
