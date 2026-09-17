import hashlib
import json
import os
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path

import pytest

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.fingerprint import manual_fingerprint, source_fingerprint  # noqa: E402
from product_readiness_tools.load import load_domain  # noqa: E402


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"
CLI = READINESS_ROOT / "tools" / "cli.py"
FIXTURE = READINESS_ROOT / "tests" / "fixtures" / "literacy-pass-report.json"
LITERACY_USE_CASE = "literacy-standalone-first-lesson"


def _git(*arguments: str, cwd: Path = REPO_ROOT) -> str:
    return subprocess.run(
        ["git", *arguments], cwd=cwd, check=True, capture_output=True, text=True
    ).stdout.strip()


def _current_branch() -> str:
    return _git("branch", "--show-current")


def _dirty() -> bool:
    return bool(_git("status", "--porcelain"))


@contextmanager
def _regrant_write_branch():
    """Run CLI regrant paths from a non-main, non-detached branch (AID-1357 R2).

    Same contract as test_regrant.py: pin a temporary branch at HEAD (the
    guard refuses main/detached) and restore the exact previous state after.
    """
    branch = _current_branch()
    if branch and branch != "main":
        yield branch
        return
    temporary = f"regrant/test-{os.getpid()}"
    _git("checkout", "-q", "-B", temporary)
    try:
        yield temporary
    finally:
        if branch:
            _git("checkout", "-q", branch)
        else:
            _git("checkout", "-q", "--detach")
        _git("branch", "-qD", temporary)


def _restore_tree() -> None:
    """Deterministically undo regrant writes (same surface as test_regrant.py)."""
    results = READINESS_ROOT / "evidence" / "results.ndjson"
    _git("checkout", "--", str(results.relative_to(REPO_ROOT)))
    _git("checkout", "--", "README.md", cwd=READINESS_ROOT)
    for path in sorted((READINESS_ROOT / "assessments").iterdir(), reverse=True):
        tracked = subprocess.run(
            ["git", "ls-files", "--error-unmatch", str(path.relative_to(REPO_ROOT))],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        if tracked.returncode == 0:
            _git("checkout", "--", str(path.relative_to(REPO_ROOT)))
        else:
            path.unlink(missing_ok=True)


def _current_report(
    tmp_path: Path, *, executor: str | None = None, corrupt_source: bool = False
) -> Path:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    checkout = _git("rev-parse", "HEAD")
    domain = load_domain(READINESS_ROOT)
    use_case = next(item for item in domain.use_cases if item.id == LITERACY_USE_CASE)
    source_digest = str(source_fingerprint(domain, use_case, REPO_ROOT))
    manual_digest = str(manual_fingerprint(domain, use_case))
    payload["gitSha"] = checkout
    for result in payload["results"]:
        result["gitSha"] = checkout
        if executor is not None:
            result["executor"] = executor
        result["sourceFingerprint"] = "0" * 64 if corrupt_source else source_digest
        result["manualFingerprint"] = manual_digest
        for artifact in result["artifacts"]:
            artifact_path = REPO_ROOT / artifact["path"]
            artifact["sha256"] = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    report = tmp_path / "candidate.json"
    report.write_text(json.dumps(payload), encoding="utf-8")
    return report


def _run_regrant(
    report: Path, proposal_state: Path | None = None
) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, str(CLI), "regrant", "--propose", "--input", str(report)]
    if proposal_state is not None:
        command += ["--proposal-state", str(proposal_state)]
    return subprocess.run(
        command, cwd=READINESS_ROOT, check=False, capture_output=True, text=True
    )


def test_pending_proposal_writes_state_manifest_without_assessment_writes(
    tmp_path: Path,
) -> None:
    # Given a CI-only candidate (executor automated) on a re-grant branch
    report = _current_report(tmp_path, executor="automated")
    results = READINESS_ROOT / "evidence" / "results.ndjson"
    assessments = READINESS_ROOT / "assessments"
    results_before = results.read_bytes()
    assessments_before = sorted(path.name for path in assessments.iterdir())
    manifest = tmp_path / "regrant-proposal.json"

    with _regrant_write_branch() as branch:
        result = _run_regrant(report, proposal_state=manifest)

    # Then the state manifest documents the pending observation (R1)
    assert result.returncode == 3
    data = json.loads(manifest.read_text(encoding="utf-8"))
    assert data["schemaVersion"] == 1
    assert data["status"] == "pending-observation"
    assert data["assessmentId"] == json.loads(report.read_text(encoding="utf-8"))["assessmentId"]
    assert data["gitSha"] == _git("rev-parse", "HEAD")
    assert data["branch"] == branch
    assert isinstance(data["generatedAt"], str) and data["generatedAt"]
    assert [entry["id"] for entry in data["useCases"]] == [LITERACY_USE_CASE]
    pending_reasons = data["useCases"][0]["pending"]
    assert pending_reasons and any(
        "lacks independent evidence" in reason for reason in pending_reasons
    )
    # And no assessment/results writes happened (bot never writes while pending)
    assert results.read_bytes() == results_before
    assert sorted(path.name for path in assessments.iterdir()) == assessments_before


def test_written_proposal_writes_state_manifest_and_restores(tmp_path: Path) -> None:
    # Given a complete independent report (executor mixed) on a disposable branch
    if _dirty():
        pytest.skip("clean tree required (spec §3.4 deterministic restore)")
    report = _current_report(tmp_path)
    manifest = tmp_path / "regrant-proposal.json"

    with _regrant_write_branch():
        result = _run_regrant(report, proposal_state=manifest)

        # Then the write path lands the manifest first, documenting why there
        # is no observation phase: status written, empty checklist (R1)
        assert result.returncode == 0, result.stderr
        assert "Wrote " in result.stdout
        data = json.loads(manifest.read_text(encoding="utf-8"))
        assert data["schemaVersion"] == 1
        assert data["status"] == "written"
        assert data["useCases"] == []
        assert data["assessmentId"] == json.loads(report.read_text(encoding="utf-8"))["assessmentId"]
        assert data["gitSha"] == _git("rev-parse", "HEAD")
        _restore_tree()

    # And the tree is byte-identical to the pre-test state afterwards
    assert not _dirty(), _git("status", "--porcelain")


def test_without_state_flag_no_manifest_is_created(tmp_path: Path) -> None:
    # Given a pending candidate proposed without --proposal-state
    report = _current_report(tmp_path, executor="automated")
    manifest = tmp_path / "regrant-proposal.json"

    with _regrant_write_branch():
        result = _run_regrant(report)

    # Then behavior is byte-identical to the pre-AID-2203 CLI: exit 3, no file
    assert result.returncode == 3
    assert "REGRANT PENDING: awaiting independent observation" in result.stdout
    assert not manifest.exists()


def test_defect_and_guard_paths_write_no_manifest(tmp_path: Path) -> None:
    # Given a defective candidate (stale source fingerprint) — exit 1
    defective = _current_report(tmp_path, corrupt_source=True)
    manifest = tmp_path / "regrant-proposal.json"
    with _regrant_write_branch():
        result = _run_regrant(defective, proposal_state=manifest)
    assert result.returncode == 1
    assert not manifest.exists()

    # And a valid candidate on a detached HEAD (write-branch guard) — exit 2
    report = _current_report(tmp_path)
    status_before = _git("status", "--porcelain")
    branch = _current_branch()
    _git("checkout", "-q", "--detach")
    try:
        result = _run_regrant(report, proposal_state=manifest)
        assert result.returncode == 2
        assert "regrant writes must land on a re-grant branch" in result.stderr
        assert not manifest.exists()
        # And malformed flag shapes are usage errors — exit 2, no manifest
        malformed = subprocess.run(
            [
                sys.executable, str(CLI), "regrant", "--propose", "--input", str(report),
                "--proposal-state",
            ],
            cwd=READINESS_ROOT, check=False, capture_output=True, text=True,
        )
        assert malformed.returncode == 2
        assert not manifest.exists()
    finally:
        if branch:
            _git("checkout", "-q", branch)
        else:
            _git("checkout", "-q", "--detach")
    assert _git("status", "--porcelain") == status_before
