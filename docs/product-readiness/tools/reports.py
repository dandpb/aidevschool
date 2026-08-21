from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Final, TypedDict

from .fingerprint import manual_fingerprint, source_fingerprint
from .models import ReadinessDomain, Scenario


class AssertionFact(TypedDict):
    id: str
    outcome: str
    evidence: str


class ArtifactFact(TypedDict):
    path: str
    sha256: str


class GapFact(TypedDict):
    id: str
    severity: str
    summary: str
    owner: str | None
    disposition: str | None


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
    gaps: list[GapFact]


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
    scenario_ids: tuple[str, ...] | None = None,
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
    selected_scenario_ids = None if scenario_ids is None else set(scenario_ids)
    git_sha = _git_sha(repo_root)
    executed_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    changed: list[Path] = []
    for scenario in scenarios:
        if selected_scenario_ids is not None and str(scenario.id) not in selected_scenario_ids:
            continue
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
            # A producer can only assert the browser assertions it just ran.
            # Mixed scenarios still require an independent observation before
            # the assessor can grant the intended tier.
            "executor": "automated",
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


from .aggregation import (  # noqa: E402,F401
    ReportSnapshot,
    snapshot_report_directories,
    validate_report_directories,
)
from .candidate import CandidateRequest, build_candidate_report  # noqa: E402,F401
