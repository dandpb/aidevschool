"""Structured pipeline-status module for the polyglot 5-phase cycle.

Machine-readable state lives in a sibling YAML file next to the human Markdown
narrative. Markdown remains the human audit trail (agent notes, long blockers);
YAML is the seam openclaw and tools read/write without regex-over-prose.
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
    """Structured twin of the Markdown status file."""
    return md_path.with_suffix(".yaml")


def _status_to_mapping(status: PipelineStatus) -> dict[str, Any]:
    return {
        "cycle_id": status.cycle_id,
        "current_project": status.current_project,
        "complexity_level": status.complexity_level,
        "phase": status.phase.value,
        "awaiting": status.awaiting,
        "blockers": list(status.blockers),
    }


def _status_from_mapping(data: dict[str, Any], *, source: Path) -> PipelineStatus:
    try:
        complexity = data.get("complexity_level", 1)
        if isinstance(complexity, str):
            complexity = int(complexity.split()[0])
        blockers = data.get("blockers") or []
        if isinstance(blockers, str):
            blockers = [
                b.strip()
                for b in blockers.strip("[]").split(",")
                if b.strip()
            ]
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
        raise StateCorruptionError(
            f"Cannot read pipeline status at {path}: {exc}"
        ) from exc
    data: dict[str, Any] = {}
    for line in text.splitlines():
        match = re.match(r"-\s+\*\*(\w+)\*\*:\s+`?(.+?)`?\s*$", line)
        if match:
            key, value = match.groups()
            data[key] = value
    return _status_from_mapping(data, source=path)


def load_status(path: Path) -> PipelineStatus:
    """Load structured status: prefer sibling YAML, fall back to Markdown bullets."""
    ypath = yaml_path_for(path)
    if ypath.exists():
        try:
            raw = ypath.read_text(encoding="utf-8")
            data = yaml.safe_load(raw) or {}
        except (OSError, yaml.YAMLError) as exc:
            raise StateCorruptionError(
                f"Cannot read pipeline status YAML at {ypath}: {exc}"
            ) from exc
        if not isinstance(data, dict):
            raise StateCorruptionError(
                f"pipeline status YAML at {ypath} must be a mapping"
            )
        return _status_from_mapping(data, source=ypath)
    if not path.exists():
        return PipelineStatus()
    return _parse_markdown(path)


def _patch_markdown_bullets(text: str, status: PipelineStatus) -> str:
    """Update only the structured bullet lines; preserve agent narrative."""
    replacements = {
        "cycle_id": status.cycle_id,
        "current_project": f"`{status.current_project}`",
        "complexity_level": str(status.complexity_level),
        "phase": status.phase.value,
        "awaiting": f"`{status.awaiting}`",
        "blockers": str(status.blockers),
    }
    lines: list[str] = []
    for line in text.splitlines():
        match = re.match(r"(-\s+\*\*(\w+)\*\*:\s+)(.*)$", line)
        if match and match.group(2) in replacements:
            lines.append(f"{match.group(1)}{replacements[match.group(2)]}")
        else:
            lines.append(line)
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")


def _default_markdown(status: PipelineStatus) -> str:
    return f"""# Pipeline Status — MiniMax Evolution Engine

> Estado do **pipeline de software** do ciclo atual. (A jornada de aprendizado fica em
> `learning_state.yaml`, na mesma pasta.) Caminhos relativos à raiz do ecossistema.
> Structured twin: `{status.cycle_id and 'pipeline_status.yaml' or 'pipeline_status.yaml'}`.
> Atualizado por cada agente ao fim da sua fase.

- **cycle_id**: {status.cycle_id}
- **current_project**: `{status.current_project}`
- **complexity_level**: {status.complexity_level}
- **phase**: {status.phase.value}
- **awaiting**: `{status.awaiting}`
- **agents**:
  - (atualizado pelo runner / agentes)
- **blockers**: {status.blockers}

## Transições
`spec` → `spec-done` → `impl-done` → `review-done` → `benchmark-done` → `cycle-complete`
"""


def save_status(status: PipelineStatus, path: Path) -> None:
    """Atomically write YAML (seam) and patch Markdown narrative bullets."""
    ypath = yaml_path_for(path)
    mapping = _status_to_mapping(status)
    atomic_write_text(
        ypath,
        yaml.safe_dump(mapping, sort_keys=False, allow_unicode=True),
    )
    if path.exists():
        text = path.read_text(encoding="utf-8")
        atomic_write_text(path, _patch_markdown_bullets(text, status))
    else:
        atomic_write_text(path, _default_markdown(status))


# Re-export helper used by tests that introspect structure.
def status_as_dict(status: PipelineStatus) -> dict[str, Any]:
    return _status_to_mapping(status)
