from __future__ import annotations

from ..contracts import WorkflowError


def canonical_relative_path(path: str) -> str:
    segments = path.split("/")
    if (
        not path
        or path.startswith("/")
        or path.endswith("/")
        or "\\" in path
        or any(segment in {"", ".", ".."} for segment in segments)
    ):
        raise WorkflowError(f"path must be a canonical relative POSIX path: {path!r}")
    return path
