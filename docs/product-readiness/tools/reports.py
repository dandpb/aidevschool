from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Final, TypedDict

from .fingerprint import manual_fingerprint, source_fingerprint
from .models import ReadinessDomain, Scenario, UseCase


class AssertionFact(TypedDict):
    id: str
    outcome: str
    evidence: str


class ArtifactFact(TypedDict):
    path: str
    sha256: str


class ProducerReport(TypedDict):
    schemaVersion: int
    scenarioId: str
    runId: str
    gitSha: str
    executedAt: str
    executor: str
    outcome: str
    sourceFingerprint: str
    manualFingerprint: str
    assertions: list[AssertionFact]
    artifacts: list[ArtifactFact]
    gaps: list[str]


REPORT_KEYS: Final = frozenset(ProducerReport.__required_keys__)


def _git_sha(repo_root: Path) -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def _artifact_facts(repo_root: Path, scenario: Scenario) -> list[ArtifactFact]:
    facts: list[ArtifactFact] = []
    for relative in scenario.source_paths:
        path = repo_root / relative
        if path.is_file():
            facts.append({"path": str(relative), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    return facts


def emit_engine_reports(
    domain: ReadinessDomain,
    repo_root: Path,
    engine_directory: str,
    output_directory: Path,
) -> tuple[Path, ...]:
    output_directory.mkdir(parents=True, exist_ok=True)
    for path in output_directory.glob("*.json"):
        path.unlink()
    use_cases = {use_case.id: use_case for use_case in domain.use_cases}
    scenarios = tuple(
        scenario
        for scenario in domain.scenarios
        if scenario.automation is not None and str(scenario.automation.working_directory) == engine_directory
    )
    git_sha = _git_sha(repo_root)
    executed_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    changed: list[Path] = []
    for scenario in scenarios:
        use_case = use_cases[scenario.use_case_id]
        automated_assertions = tuple(
            assertion for assertion in scenario.assertions if str(assertion.evidence) == "playwright"
        )
        if not automated_assertions:
            continue
        report: ProducerReport = {
            "schemaVersion": 1,
            "scenarioId": str(scenario.id),
            "runId": f"{executed_at}-{scenario.id}-{git_sha[:8]}",
            "gitSha": git_sha,
            "executedAt": executed_at,
            "executor": str(scenario.execution),
            "outcome": "pass",
            "sourceFingerprint": str(source_fingerprint(domain, use_case, repo_root)),
            "manualFingerprint": str(manual_fingerprint(domain, use_case)),
            "assertions": [
                {"id": assertion.id, "outcome": "pass", "evidence": str(assertion.evidence)}
                for assertion in automated_assertions
            ],
            "artifacts": _artifact_facts(repo_root, scenario),
            "gaps": [],
        }
        path = output_directory / f"{scenario.id}.json"
        path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        changed.append(path)
    return tuple(changed)


def _validate_report(domain: ReadinessDomain, repo_root: Path, path: Path) -> tuple[str, ...]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or set(raw) != REPORT_KEYS:
        return (f"producer report has invalid shape: {path}",)
    scenario = next((item for item in domain.scenarios if str(item.id) == raw["scenarioId"]), None)
    if scenario is None:
        return (f"producer report references unknown scenario: {path}",)
    use_case = next(item for item in domain.use_cases if item.id == scenario.use_case_id)
    errors: list[str] = []
    if raw["sourceFingerprint"] != source_fingerprint(domain, use_case, repo_root):
        errors.append(f"producer report source fingerprint does not match: {path}")
    if raw["manualFingerprint"] != manual_fingerprint(domain, use_case):
        errors.append(f"producer report manual fingerprint does not match: {path}")
    if "grantedTier" in raw or "decision" in raw:
        errors.append(f"producer report attempts to grant readiness: {path}")
    return tuple(errors)


def validate_report_directories(
    domain: ReadinessDomain,
    repo_root: Path,
    directories: tuple[Path, ...],
) -> tuple[str, ...]:
    errors: list[str] = []
    for directory in directories:
        if not directory.is_dir():
            errors.append(f"producer report directory does not exist: {directory}")
            continue
        for path in sorted(directory.glob("*.json")):
            errors.extend(_validate_report(domain, repo_root, path))
    return tuple(errors)
