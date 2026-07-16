from __future__ import annotations

from pathlib import Path
from typing import Mapping

from learner.substrate.fsio import atomic_write_text


def check_views(views: Mapping[Path, str]) -> list[Path]:
    drift: list[Path] = []
    for path, expected in views.items():
        try:
            actual = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            drift.append(path)
            continue
        if actual != expected:
            drift.append(path)
    return drift


def write_views(views: Mapping[Path, str]) -> None:
    for path, content in views.items():
        atomic_write_text(path, content)
