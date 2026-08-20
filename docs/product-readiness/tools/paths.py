from __future__ import annotations

import re
from pathlib import Path
from typing import Final

from .models import RepoPath


EXCLUDED_PARTS: Final = {
    "node_modules",
    "dist",
    "coverage",
    "test-results",
    "playwright-report",
    ".codegraph",
    "graphify-out",
    "__pycache__",
}
GENERATED_MARKERS: Final = ("AUTO-GENERATED", "AUTO-GERADO", "@substrate-generated")


def is_generated_file(path: Path) -> bool:
    try:
        prefix = path.read_text(encoding="utf-8")[:512]
    except UnicodeDecodeError:
        return False
    return any(marker in prefix for marker in GENERATED_MARKERS)


def validate_repo_path(repo_root: Path, relative: RepoPath) -> str | None:
    path = Path(relative)
    if path.is_absolute():
        return f"repository path must be relative: {relative}"
    if any(part in EXCLUDED_PARTS for part in path.parts):
        return f"repository path uses excluded output: {relative}"
    candidate = repo_root / path
    try:
        resolved = candidate.resolve(strict=True)
    except FileNotFoundError:
        return f"repository path does not exist: {relative}"
    if not resolved.is_relative_to(repo_root.resolve()):
        return f"repository path escapes the checkout: {relative}"
    return None


def markdown_anchor_exists(path: Path, anchor: str) -> bool:
    if not path.is_file():
        return False
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = line.lstrip("#").strip() if line.startswith("#") else ""
        slug = re.sub(r"[^a-z0-9 -]", "", heading.lower()).replace(" ", "-")
        if slug == anchor:
            return True
    return False
