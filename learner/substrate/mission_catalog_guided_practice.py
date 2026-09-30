from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any, Callable

from learner.substrate.mission_catalog_voxel import (
    MissionCatalogError,
    _mapping,
    _nonempty_string,
)


GUIDED_PRACTICE_UNIT_PREFIX = "sequencia-dev-guiada:"
GUIDED_PRACTICE_CONTENT_PREFIX = "curriculum/sequencia-dev-guiada"

# Parity contract (AID-3534): this allowlist, its order and the contentVersion
# formula below MUST stay byte-compatible with the OS projection script
# `engines/codexdojo-os-prototype/scripts/gen-guided-practice.mjs`
# (SOURCE_FILES + contentVersion, PR #625), so a mission binding and a local
# practice receipt pin the same projected content. `guia-de-correcao/` is
# grader-facing and is never read here. A new package shape versions both
# sides together.
GUIDED_PRACTICE_LEARNER_FILES: tuple[str, ...] = (
    "enunciado.md",
    "exemplo-trabalhado.md",
    "insumos/bugreport.md",
    "insumos/REGRA.md",
    "insumos/fixture/notas.py",
    "insumos/fixture/testes.py",
    "rubrica-v1.md",
)

# guided-practice-evidence v1 (catalog-level contract; event naming and
# telemetry mapping ratified with LEE + Growth on AID-3534). Raw material is
# the deterministic local receipt of the OS guided-practice cycle
# (guidedPracticeCycle.ts, PR #625): evidence per attempt step, rubric
# verdicts and takeaway, all pinned to runtime.contentVersion
# (`<practiceId>@<sha256-12>`). Conclusion requires every rubric criterion
# `met` or `partial` with written justification, every attempt step with
# recorded evidence, and both takeaway answers non-empty. Local evidence is
# never a mastery write.
_HEADING = re.compile(r"^# (\S+) — (.+)$", re.MULTILINE)
_ANCHOR = re.compile(r"\*\*Lição-âncora:\*\*\s*`(l\d+)`")
_TRACK = re.compile(r"\*\*Trilha:\*\*\s*(\S+)")
_MINUTES = re.compile(r"(\d+)\s*[–-]\s*(\d+)\s*min")


def _section_under(text: str, heading: str) -> str:
    lines = text.split("\n")
    start = next(
        (index for index, line in enumerate(lines) if line.strip() == f"## {heading}"),
        None,
    )
    if start is None:
        raise MissionCatalogError(f'section "## {heading}" not found')
    body: list[str] = []
    for line in lines[start + 1 :]:
        if line.startswith("## "):
            break
        body.append(line)
    return "\n".join(body).strip()


def _parse_minutes(enunciado: str, practice_id: str) -> dict[str, int]:
    match = _MINUTES.search(enunciado)
    if match is None:
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has no target duration marker"
        )
    minimum, maximum = int(match.group(1)), int(match.group(2))
    if not (5 <= minimum <= maximum <= 120):
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has implausible duration"
            f" {minimum}-{maximum}"
        )
    return {"min": minimum, "max": maximum}


def _parse_rubric_criteria(rubrica: str, practice_id: str) -> list[dict[str, str]]:
    criteria: list[dict[str, str]] = []
    for line in rubrica.split("\n"):
        if not line.startswith("| c-"):
            continue
        cells = [cell.strip() for cell in line.split("|")]
        if len(cells) < 4:
            raise MissionCatalogError(
                f"guided-practice package {practice_id!r} has a malformed rubric row"
            )
        criterion_id, criterion, per_check = cells[1], cells[2], cells[3]
        if not criterion_id or not criterion or not per_check:
            raise MissionCatalogError(
                f"guided-practice package {practice_id!r} rubric row"
                f" {criterion_id or '?'} has empty cells"
            )
        criteria.append({"id": criterion_id, "criterion": criterion, "perCheck": per_check})
    if not criteria:
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has no rubric criteria"
        )
    return criteria


def compute_content_version(
    package_dir_name: str, sources: dict[str, str]
) -> str:
    entries = [
        (
            f"{GUIDED_PRACTICE_CONTENT_PREFIX}/{package_dir_name}/{relative}",
            hashlib.sha256(text.encode("utf-8")).hexdigest(),
        )
        for relative, text in sources.items()
    ]
    digest = hashlib.sha256(
        "\n".join(f"{path}:{sha}" for path, sha in entries).encode("utf-8")
    ).hexdigest()
    package_id = _HEADING.search(sources["enunciado.md"])
    if package_id is None:
        raise MissionCatalogError("guided-practice enunciado has no identity heading")
    return f"{package_id.group(1)}@{digest[:12]}"


def _load_practice(package_dir: Path) -> dict[str, Any]:
    sources: dict[str, str] = {}
    for relative in GUIDED_PRACTICE_LEARNER_FILES:
        try:
            sources[relative] = (package_dir / relative).read_text(encoding="utf-8")
        except FileNotFoundError as exc:
            raise MissionCatalogError(
                f"guided-practice package {package_dir.name!r} is missing"
                f" learner-facing file {relative!r}"
            ) from exc
    enunciado = sources["enunciado.md"]
    heading = _HEADING.search(enunciado)
    if heading is None:
        raise MissionCatalogError(
            f"guided-practice package {package_dir.name!r} enunciado has no"
            " '# <id> — <title>' heading"
        )
    practice_id, title = heading.group(1), heading.group(2).strip()
    if not package_dir.name.startswith(f"{practice_id}-"):
        raise MissionCatalogError(
            f"guided-practice package directory {package_dir.name!r} must start"
            f" with practice id {practice_id!r}"
        )
    anchor = _ANCHOR.search(enunciado)
    if anchor is None:
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has no anchor lesson marker"
        )
    track = _TRACK.search(enunciado)
    if track is None or track.group(1) != "Dev":
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} must declare 'Trilha: Dev'"
        )
    objective = _section_under(enunciado, "Objetivo observável")
    if not objective:
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has an empty objective"
        )
    minutes = _parse_minutes(enunciado, practice_id)
    criteria = _parse_rubric_criteria(sources["rubrica-v1.md"], practice_id)
    return {
        "practice_id": practice_id,
        "package_dir": package_dir.name,
        "title": title,
        "objective": objective,
        "anchor_lesson_id": anchor.group(1),
        "track_id": "dev",
        "estimated_minutes": minutes["max"],
        "target_minutes": minutes,
        "rubric_criteria": [criterion["id"] for criterion in criteria],
        "content_version": compute_content_version(package_dir.name, sources),
    }


def load_guided_practice_catalog(root: Path) -> dict[str, dict[str, Any]]:
    if not root.is_dir():
        return {}
    practices: dict[str, dict[str, Any]] = {}
    for package_dir in sorted(path for path in root.iterdir() if path.is_dir()):
        if not (package_dir / "enunciado.md").is_file():
            continue
        record = _load_practice(package_dir)
        if record["practice_id"] in practices:
            raise MissionCatalogError(
                f"duplicate guided practice id {record['practice_id']!r}"
            )
        practices[record["practice_id"]] = record
    return practices


def validate_guided_practice_binding(
    binding: dict[str, Any],
    label: str,
    mission_id: str,
    track_id: str,
    unit_id: str,
    runtime: dict[str, Any],
    declared_prerequisites: list[str],
    practice: dict[str, Any],
    validate_evidence: Callable[[Any, str], dict[str, Any]],
) -> dict[str, Any]:
    if track_id != "dev" or runtime["engineId"] != "codexdojo-os":
        raise MissionCatalogError(
            f"{label} guided-practice missions must use the dev track and the"
            " codexdojo-os engine"
        )
    if mission_id != practice["practice_id"]:
        raise MissionCatalogError(
            f"{label}.missionId must preserve guided practice id"
            f" {practice['practice_id']!r}"
        )
    if unit_id != f"{GUIDED_PRACTICE_UNIT_PREFIX}{practice['practice_id']}":
        raise MissionCatalogError(
            f"{label}.curriculum.unitId must be"
            f" {GUIDED_PRACTICE_UNIT_PREFIX}{practice['practice_id']}"
        )
    if runtime["contentVersion"] != practice["content_version"]:
        raise MissionCatalogError(
            f"{label}.runtime.contentVersion must match the canonical"
            f" guided-practice package ({practice['content_version']!r})"
            " — the OS practice app serves exactly that projected content"
        )
    if practice["anchor_lesson_id"] not in declared_prerequisites:
        raise MissionCatalogError(
            f"{label}.prerequisites must include the canonical anchor lesson"
            f" {practice['anchor_lesson_id']!r}"
        )
    version = binding.get("version")
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise MissionCatalogError(f"{label}.version must be a positive integer")
    evidence = validate_evidence(binding.get("evidence"), f"{label}.evidence")
    if evidence["schema"] != "guided-practice-evidence":
        raise MissionCatalogError(
            f"{label}.evidence must use guided-practice-evidence"
        )
    return {
        "lesson_id": None,
        "version": version,
        "estimated_minutes": practice["estimated_minutes"],
        "evidence": evidence,
        "title": practice["title"],
        "objective": practice["objective"],
    }
