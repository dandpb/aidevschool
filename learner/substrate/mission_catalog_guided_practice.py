from __future__ import annotations

import hashlib
import json
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

# Frozen source contracts (AID-3595): packages whose shape is declared by a
# ratified `*-source-contract.json` under `tools/fixtures/` (AID-3593 /
# AID-3617 line) are loaded through that contract instead of the inline
# pg-d01 allowlist above. The contract pins every source byte (learner and
# provenance-only), freezes the learner-facing allowlist (order included)
# and carries the structured anchors — the loader reuses the SAME
# `compute_content_version` formula and asserts the contract-declared
# contentVersion, so there is no second parser or hash on this path.
SOURCE_CONTRACT_SCHEMA = "aidevschool/sequencia-dev-guiada/source-contract@1"
SOURCE_CONTRACT_SUFFIX = "-source-contract.json"
_SOURCE_CONTRACT_FIXTURES = ("tools", "fixtures")

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


def _parse_rubric_row(line: str, practice_id: str) -> dict[str, str] | None:
    if not line.startswith("| c-"):
        return None
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
    return {"id": criterion_id, "criterion": criterion, "perCheck": per_check}


def _parse_rubric_criteria(rubrica: str, practice_id: str) -> list[dict[str, str]]:
    criteria = [
        row
        for row in (
            _parse_rubric_row(line, practice_id) for line in rubrica.split("\n")
        )
        if row is not None
    ]
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


def _read_learner_sources(
    package_dir: Path,
    allowlist: tuple[str, ...] | list[str] = GUIDED_PRACTICE_LEARNER_FILES,
) -> dict[str, str]:
    sources: dict[str, str] = {}
    for relative in allowlist:
        try:
            sources[relative] = (package_dir / relative).read_text(encoding="utf-8")
        except FileNotFoundError as exc:
            raise MissionCatalogError(
                f"guided-practice package {package_dir.name!r} is missing"
                f" learner-facing file {relative!r}"
            ) from exc
    return sources


def _parse_heading(enunciado: str, package_dir_name: str) -> tuple[str, str]:
    heading = _HEADING.search(enunciado)
    if heading is None:
        raise MissionCatalogError(
            f"guided-practice package {package_dir_name!r} enunciado has no"
            " '# <id> — <title>' heading"
        )
    practice_id, title = heading.group(1), heading.group(2).strip()
    if not package_dir_name.startswith(f"{practice_id}-"):
        raise MissionCatalogError(
            f"guided-practice package directory {package_dir_name!r} must start"
            f" with practice id {practice_id!r}"
        )
    return practice_id, title


def _parse_identity(enunciado: str, package_dir_name: str) -> tuple[str, str, str]:
    practice_id, title = _parse_heading(enunciado, package_dir_name)
    anchor = _ANCHOR.search(enunciado)
    if anchor is None:
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has no anchor lesson marker"
        )
    return practice_id, title, anchor.group(1)


def _require_dev_track(enunciado: str, practice_id: str) -> None:
    track = _TRACK.search(enunciado)
    if track is None or track.group(1) != "Dev":
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} must declare 'Trilha: Dev'"
        )


def _load_inline_practice(package_dir: Path) -> dict[str, Any]:
    sources = _read_learner_sources(package_dir)
    enunciado = sources["enunciado.md"]
    practice_id, title, anchor_lesson_id = _parse_identity(
        enunciado, package_dir.name
    )
    _require_dev_track(enunciado, practice_id)
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
        "anchor_lesson_id": anchor_lesson_id,
        "track_id": "dev",
        "estimated_minutes": minutes["max"],
        "target_minutes": minutes,
        "rubric_criteria": [criterion["id"] for criterion in criteria],
        "content_version": compute_content_version(package_dir.name, sources),
    }


def _string_list(value: Any, label: str) -> list[str]:
    if (
        not isinstance(value, list)
        or not value
        or any(not isinstance(item, str) or not item for item in value)
    ):
        raise MissionCatalogError(
            f"{label} must be a non-empty list of non-empty strings"
        )
    return value


def _read_source_contract(path: Path) -> dict[str, Any]:
    try:
        contract = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise MissionCatalogError(
            f"guided-practice source contract {path.name!r} is unreadable: {exc}"
        ) from exc
    if not isinstance(contract, dict) or contract.get("schema") != SOURCE_CONTRACT_SCHEMA:
        raise MissionCatalogError(
            f"guided-practice source contract {path.name!r} must declare schema"
            f" {SOURCE_CONTRACT_SCHEMA!r}"
        )
    return contract


def _load_source_contracts(root: Path) -> dict[str, dict[str, Any]]:
    fixtures_dir = root.joinpath(*_SOURCE_CONTRACT_FIXTURES)
    if not fixtures_dir.is_dir():
        return {}
    contracts: dict[str, dict[str, Any]] = {}
    for path in sorted(fixtures_dir.glob(f"*{SOURCE_CONTRACT_SUFFIX}")):
        contract = _read_source_contract(path)
        package = _mapping(contract.get("package"), f"source contract {path.name!r}")
        package_id = _nonempty_string(package.get("id"), f"{path.name} package.id")
        if package_id in contracts:
            raise MissionCatalogError(
                f"duplicate guided-practice source contract for {package_id!r}"
            )
        contracts[package_id] = contract
    return contracts


def _pinned_relative_path(entry: dict[str, Any], label: str) -> Path:
    relative = _nonempty_string(entry.get("path"), f"{label}.files[].path")
    relative_path = Path(relative)
    if relative_path.is_absolute() or ".." in relative_path.parts:
        raise MissionCatalogError(
            f"{label}.files[].path must stay inside the package ({relative!r})"
        )
    return relative_path


def _pinned_file_bytes(
    package_dir: Path, relative_path: Path, label: str
) -> bytes:
    try:
        return (package_dir / relative_path).read_bytes()
    except FileNotFoundError as exc:
        raise MissionCatalogError(
            f"{label} is missing pinned source file {str(relative_path)!r}"
        ) from exc


def _verify_pinned_file(package_dir: Path, entry: Any, label: str) -> None:
    if not isinstance(entry, dict):
        raise MissionCatalogError(f"{label}.files entries must be mappings")
    expected_sha = _nonempty_string(entry.get("sha256"), f"{label}.files[].sha256")
    expected_bytes = entry.get("bytes")
    if (
        not isinstance(expected_bytes, int)
        or isinstance(expected_bytes, bool)
        or expected_bytes < 0
    ):
        raise MissionCatalogError(
            f"{label}.files[].bytes must be a non-negative integer"
            f" ({entry.get('path')!r})"
        )
    relative_path = _pinned_relative_path(entry, label)
    data = _pinned_file_bytes(package_dir, relative_path, label)
    actual_sha = hashlib.sha256(data).hexdigest()
    if actual_sha != expected_sha or len(data) != expected_bytes:
        raise MissionCatalogError(
            f"source byte change detected in {label} file {str(relative_path)!r}"
            f" (expected sha256 {expected_sha}, got {actual_sha})"
        )


def _verify_source_contract_pins(
    package_dir: Path, contract: dict[str, Any], label: str
) -> None:
    pinned = contract.get("files")
    if not isinstance(pinned, list) or not pinned:
        raise MissionCatalogError(f"{label}.files must be a non-empty list")
    for entry in pinned:
        _verify_pinned_file(package_dir, entry, label)


def _contract_allowlist(contract: dict[str, Any], label: str) -> list[str]:
    interface = _mapping(
        contract.get("sourceInterface"), f"{label}.sourceInterface"
    )
    allowlist = _string_list(
        interface.get("learnerVisibleFiles"),
        f"{label}.sourceInterface.learnerVisibleFiles",
    )
    package = _mapping(contract.get("package"), f"{label}.package")
    basis = _mapping(
        package.get("contentVersionBasis"),
        f"{label}.package.contentVersionBasis",
    )
    basis_allowlist = _string_list(
        basis.get("allowlist"), f"{label}.package.contentVersionBasis.allowlist"
    )
    if allowlist != basis_allowlist:
        raise MissionCatalogError(
            f"{label} allowlist disagreement between sourceInterface and"
            " contentVersionBasis"
        )
    provenance_only = _string_list(
        interface.get("provenanceOnlyFiles"),
        f"{label}.sourceInterface.provenanceOnlyFiles",
    )
    overlap = sorted(set(allowlist) & set(provenance_only))
    if overlap:
        raise MissionCatalogError(
            f"{label} learner/provenance-only lists must be disjoint: {overlap}"
        )
    return allowlist


def _contract_anchor_lesson_id(contract: dict[str, Any], label: str) -> str:
    package = _mapping(contract.get("package"), f"{label}.package")
    anchors = _mapping(package.get("anchors"), f"{label}.package.anchors")
    lesson = _mapping(
        anchors.get("prerequisiteLesson"),
        f"{label}.package.anchors.prerequisiteLesson",
    )
    lesson_id = _nonempty_string(
        lesson.get("id"), f"{label}.package.anchors.prerequisiteLesson.id"
    )
    if not re.fullmatch(r"l\d+", lesson_id):
        raise MissionCatalogError(
            f"{label} prerequisiteLesson.id must be a lesson id (l<number>),"
            f" got {lesson_id!r}"
        )
    return lesson_id


def _contract_rubric_criteria(contract: dict[str, Any], label: str) -> list[str]:
    structure = _mapping(contract.get("structure"), f"{label}.structure")
    return _string_list(structure.get("criteriaIds"), f"{label}.structure.criteriaIds")


def _load_contract_practice(
    package_dir: Path, contract: dict[str, Any]
) -> dict[str, Any]:
    label = f"guided-practice source contract for {package_dir.name!r}"
    package = _mapping(contract.get("package"), f"{label}.package")
    _verify_source_contract_pins(package_dir, contract, label)
    allowlist = _contract_allowlist(contract, label)
    sources = _read_learner_sources(package_dir, allowlist)
    enunciado = sources["enunciado.md"]
    practice_id, title = _parse_heading(enunciado, package_dir.name)
    declared_practice_id = _nonempty_string(
        package.get("practiceId"), f"{label}.package.practiceId"
    )
    if declared_practice_id != practice_id:
        raise MissionCatalogError(
            f"{label} declares practiceId {declared_practice_id!r} but the"
            f" enunciado identity heading says {practice_id!r}"
        )
    _require_dev_track(enunciado, practice_id)
    objective = _section_under(enunciado, "Objetivo observável")
    if not objective:
        raise MissionCatalogError(
            f"guided-practice package {practice_id!r} has an empty objective"
        )
    minutes = _parse_minutes(enunciado, practice_id)
    content_version = compute_content_version(package_dir.name, sources)
    declared_version = _nonempty_string(
        package.get("contentVersion"), f"{label}.package.contentVersion"
    )
    if content_version != declared_version:
        raise MissionCatalogError(
            f"{label} contentVersion {declared_version!r} does not match the"
            " parity formula over its frozen learner files"
            f" ({content_version!r})"
        )
    return {
        "practice_id": practice_id,
        "package_dir": package_dir.name,
        "title": title,
        "objective": objective,
        "anchor_lesson_id": _contract_anchor_lesson_id(contract, label),
        "track_id": "dev",
        "estimated_minutes": minutes["max"],
        "target_minutes": minutes,
        "rubric_criteria": _contract_rubric_criteria(contract, label),
        "content_version": content_version,
    }


def _load_practice(
    package_dir: Path, contract: dict[str, Any] | None = None
) -> dict[str, Any]:
    if contract is None:
        return _load_inline_practice(package_dir)
    return _load_contract_practice(package_dir, contract)


def load_guided_practice_catalog(root: Path) -> dict[str, dict[str, Any]]:
    if not root.is_dir():
        return {}
    contracts = _load_source_contracts(root)
    practices: dict[str, dict[str, Any]] = {}
    for package_dir in sorted(path for path in root.iterdir() if path.is_dir()):
        if not (package_dir / "enunciado.md").is_file():
            continue
        record = _load_practice(package_dir, contracts.get(package_dir.name))
        if record["practice_id"] in practices:
            raise MissionCatalogError(
                f"duplicate guided practice id {record['practice_id']!r}"
            )
        practices[record["practice_id"]] = record
    return practices


def _validate_guided_identity(
    label: str,
    mission_id: str,
    track_id: str,
    unit_id: str,
    runtime: dict[str, Any],
    practice: dict[str, Any],
) -> None:
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


def _validate_guided_content_pin(
    label: str,
    runtime: dict[str, Any],
    declared_prerequisites: list[str],
    practice: dict[str, Any],
) -> None:
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
    _validate_guided_identity(
        label, mission_id, track_id, unit_id, runtime, practice
    )
    _validate_guided_content_pin(
        label, runtime, declared_prerequisites, practice
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
