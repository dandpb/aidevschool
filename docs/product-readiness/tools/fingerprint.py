from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Iterable

from .models import ReadinessDomain, RepoPath, Scenario, Sha256Digest, UseCase
from .paths import EXCLUDED_PARTS, is_generated_file


def _files(repo_root: Path, relative_paths: Iterable[RepoPath]) -> tuple[Path, ...]:
    files: set[Path] = set()
    for relative in relative_paths:
        candidate = repo_root / relative
        if candidate.is_file():
            files.add(candidate)
            continue
        for path in candidate.rglob("*"):
            if (
                path.is_file()
                and not any(part in EXCLUDED_PARTS for part in path.relative_to(repo_root).parts)
                and not is_generated_file(path)
            ):
                files.add(path)
    return tuple(sorted(files, key=lambda path: path.relative_to(repo_root).as_posix()))


def _digest_entries(entries: Iterable[tuple[str, bytes]]) -> Sha256Digest:
    digest = hashlib.sha256()
    for name, content in sorted(entries):
        encoded_name = name.encode("utf-8")
        digest.update(len(encoded_name).to_bytes(8, "big"))
        digest.update(encoded_name)
        digest.update(len(content).to_bytes(8, "big"))
        digest.update(content)
    return Sha256Digest(digest.hexdigest())


def fingerprint_paths(repo_root: Path, paths: tuple[RepoPath, ...]) -> Sha256Digest:
    return _digest_entries(
        (path.relative_to(repo_root).as_posix(), path.read_bytes()) for path in _files(repo_root, paths)
    )


def _selected_scenarios(domain: ReadinessDomain, use_case: UseCase) -> tuple[Scenario, ...]:
    selected = set(use_case.scenario_ids)
    return tuple(scenario for scenario in domain.scenarios if scenario.id in selected)


def source_fingerprint(domain: ReadinessDomain, use_case: UseCase, repo_root: Path) -> Sha256Digest:
    readiness_root = Path(domain.root)
    scenarios = _selected_scenarios(domain, use_case)
    canonical = [readiness_root / "policy.yaml", readiness_root / "inventory.yaml"]
    canonical.extend(readiness_root / "scenarios" / f"{scenario.id}.yaml" for scenario in scenarios)
    declared = use_case.source_paths + tuple(path for scenario in scenarios for path in scenario.source_paths)
    entries = [(path.relative_to(repo_root).as_posix(), path.read_bytes()) for path in canonical]
    entries.extend((path.relative_to(repo_root).as_posix(), path.read_bytes()) for path in _files(repo_root, declared))
    return _digest_entries(entries)


def _manual_section(path: Path, anchor: str) -> bytes:
    lines = path.read_text(encoding="utf-8").splitlines()
    start = None
    level = 0
    selected: list[str] = []
    for index, line in enumerate(lines):
        if not line.startswith("#"):
            continue
        heading_level = len(line) - len(line.lstrip("#"))
        heading = line[heading_level:].strip()
        slug = re.sub(r"[^a-z0-9 -]", "", heading.lower()).replace(" ", "-")
        if slug == anchor:
            start = index
            level = heading_level
            break
    if start is None:
        return b""
    for line in lines[start:]:
        current_level = len(line) - len(line.lstrip("#")) if line.startswith("#") else 0
        if selected and current_level and current_level <= level:
            break
        selected.append(line)
    return ("\n".join(selected) + "\n").encode("utf-8")


def manual_fingerprint(domain: ReadinessDomain, use_case: UseCase) -> Sha256Digest:
    readiness_root = Path(domain.root)
    entries: list[tuple[str, bytes]] = []
    for reference in (use_case.manual_refs.student, use_case.manual_refs.facilitator):
        relative, anchor = reference.split("#", 1)
        entries.append((reference, _manual_section(readiness_root / relative, anchor)))
    return _digest_entries(entries)
