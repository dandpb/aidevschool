"""Machine pipeline status: YAML is the seam; Markdown is human narrative only.

OpenClaw reads YAML first, falls back to Markdown bullets for cold start.
Writes only YAML — agents keep free-form notes in the Markdown file.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from engines.openclaw._compat import StrEnum
from engines.openclaw.errors import StateCorruptionError
from engines.openclaw.fsio import atomic_write_text


class Phase(StrEnum):
    SPEC = "spec"
    SPEC_DONE = "spec-done"
    IMPL_DONE = "impl-done"
    REVIEW_DONE = "review-done"
    BENCHMARK_DONE = "benchmark-done"
    CYCLE_COMPLETE = "cycle-complete"


@dataclass
class PipelineStatus:
    cycle_id: str = ""
    current_project: str = ""
    complexity_level: int = 1
    phase: Phase = Phase.SPEC
    awaiting: str = ""
    blockers: list[str] = field(default_factory=list)


def yaml_path_for(md_path: Path) -> Path:
    return md_path.with_suffix(".yaml")


def _from_mapping(data: dict[str, Any], *, source: Path) -> PipelineStatus:
    try:
        complexity = data.get("complexity_level", 1)
        if isinstance(complexity, str):
            complexity = int(complexity.split()[0])
        blockers = data.get("blockers") or []
        if isinstance(blockers, str):
            blockers = [b.strip() for b in blockers.strip("[]").split(",") if b.strip()]
        return PipelineStatus(
            cycle_id=str(data.get("cycle_id", "") or ""),
            current_project=str(data.get("current_project", "") or ""),
            complexity_level=int(complexity),
            phase=Phase(str(data.get("phase", "spec") or "spec")),
            awaiting=str(data.get("awaiting", "") or ""),
            blockers=list(blockers),
        )
    except (ValueError, TypeError, IndexError) as exc:
        raise StateCorruptionError(
            f"Malformed pipeline status at {source}: {exc}. "
            "Valid phases: " + ", ".join(p.value for p in Phase)
        ) from exc


def _parse_markdown(path: Path) -> PipelineStatus:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise StateCorruptionError(f"Cannot read pipeline status at {path}: {exc}") from exc
    data: dict[str, Any] = {}
    for line in text.splitlines():
        match = re.match(r"-\s+\*\*(\w+)\*\*:\s+`?(.+?)`?\s*$", line)
        if match:
            key, value = match.groups()
            data[key] = value
    return _from_mapping(data, source=path)


def load_status(path: Path) -> PipelineStatus:
    """YAML first; Markdown bullets only when no YAML (migration / cold start)."""
    ypath = yaml_path_for(path)
    if ypath.exists():
        try:
            data = yaml.safe_load(ypath.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError) as exc:
            raise StateCorruptionError(
                f"Cannot read pipeline status YAML at {ypath}: {exc}"
            ) from exc
        if not isinstance(data, dict):
            raise StateCorruptionError(f"pipeline status YAML at {ypath} must be a mapping")
        return _from_mapping(data, source=ypath)
    if not path.exists():
        return PipelineStatus()
    return _parse_markdown(path)


def save_status(status: PipelineStatus, path: Path) -> None:
    """Write machine status to sibling YAML only (does not clobber MD notes)."""
    atomic_write_text(
        yaml_path_for(path),
        yaml.safe_dump(
            {
                "cycle_id": status.cycle_id,
                "current_project": status.current_project,
                "complexity_level": status.complexity_level,
                "phase": status.phase.value,
                "awaiting": status.awaiting,
                "blockers": list(status.blockers),
            },
            sort_keys=False,
            allow_unicode=True,
        ),
    )
