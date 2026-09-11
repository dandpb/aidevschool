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
from product_readiness_tools.models import EvidenceKind  # noqa: E402
from product_readiness_tools.regrant import RegrantBranchError, require_regrant_branch  # noqa: E402


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

    CI checks out detached HEAD and local runs may sit on main; both are
    refused by the guard, so the harness pins a temporary branch at HEAD and
    restores the exact previous state (branch name or detached) afterwards.
    Switching between refs at the same commit never touches the worktree.
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
    """Deterministically undo regrant writes: drop new files, reset modified ones.

    Scoped to the exact write surface of `write_assessment` + `write_views`
    (`evidence/results.ndjson`, matrix `README.md`, `assessments/`), so it can
    never revert unrelated in-flight work under docs/product-readiness.
    """
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


def _run_regrant(report: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CLI), "regrant", "--propose", "--input", str(report)],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def _tmp_git_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "guard-repo"
    repo.mkdir()
    _git("init", "-b", "main", cwd=repo)
    (repo / "keep.txt").write_text("guard fixture", encoding="utf-8")
    _git("add", ".", cwd=repo)
    _git("-c", "user.email=guard@test", "-c", "user.name=guard", "commit", "-m", "init", cwd=repo)
    return repo


def test_guard_refuses_main_branch(tmp_path: Path) -> None:
    repo = _tmp_git_repo(tmp_path)
    with pytest.raises(RegrantBranchError, match="re-grant branch"):
        require_regrant_branch(repo)


def test_guard_refuses_detached_head(tmp_path: Path) -> None:
    repo = _tmp_git_repo(tmp_path)
    _git("checkout", "-q", "--detach", cwd=repo)
    with pytest.raises(RegrantBranchError, match="re-grant branch"):
        require_regrant_branch(repo)


def test_guard_allows_regrant_branch(tmp_path: Path) -> None:
    repo = _tmp_git_repo(tmp_path)
    _git("checkout", "-q", "-B", "regrant/auto-20991231-00000000", cwd=repo)
    assert require_regrant_branch(repo) == "regrant/auto-20991231-00000000"


def test_cli_guard_exits_2_without_writes(tmp_path: Path) -> None:
    # Given a valid candidate but a detached checkout (R2)
    report = _current_report(tmp_path)
    status_before = _git("status", "--porcelain")
    branch = _current_branch()
    _git("checkout", "-q", "--detach")
    try:
        result = _run_regrant(report)

        # Then the write-branch guard refuses with exit 2 and writes nothing
        assert result.returncode == 2
        assert "regrant writes must land on a re-grant branch, not main" in result.stderr
    finally:
        if branch:
            _git("checkout", "-q", branch)
        else:
            _git("checkout", "-q", "--detach")
    assert _git("status", "--porcelain") == status_before


def test_automated_candidate_pends_observation_without_writes(tmp_path: Path) -> None:
    # Given a CI-only candidate (executor automated) on a re-grant branch
    report = _current_report(tmp_path, executor="automated")
    results = READINESS_ROOT / "evidence" / "results.ndjson"
    assessments = READINESS_ROOT / "assessments"
    results_before = results.read_bytes()
    assessments_before = sorted(path.name for path in assessments.iterdir())

    with _regrant_write_branch():
        result = _run_regrant(report)

    # Then the proposal pends independent observation with a per-use-case checklist
    assert result.returncode == 3
    assert "REGRANT PENDING: awaiting independent observation" in result.stdout
    assert LITERACY_USE_CASE in result.stdout
    assert "lacks independent evidence" in result.stdout
    assert "- [ ]" in result.stdout
    # And nothing was written
    assert results.read_bytes() == results_before
    assert sorted(path.name for path in assessments.iterdir()) == assessments_before


def test_defective_candidate_exits_1_without_writes(tmp_path: Path) -> None:
    # Given a candidate whose source fingerprint diverges from the checkout
    report = _current_report(tmp_path, corrupt_source=True)
    results = READINESS_ROOT / "evidence" / "results.ndjson"
    results_before = results.read_bytes()
    assessments_before = sorted(path.name for path in (READINESS_ROOT / "assessments").iterdir())

    with _regrant_write_branch():
        result = _run_regrant(report)

    # Then the defect is reported as INVALID with exit 1 and no PR material exists
    assert result.returncode == 1
    assert "INVALID:" in result.stderr
    assert "source fingerprint is stale" in result.stderr
    assert results.read_bytes() == results_before
    assert sorted(path.name for path in (READINESS_ROOT / "assessments").iterdir()) == assessments_before


def test_independent_candidate_writes_and_restores(tmp_path: Path) -> None:
    # Given a complete independent report (executor mixed) on a disposable branch
    if _dirty():
        pytest.skip("clean tree required (spec §3.4 deterministic restore, R5)")
    report = _current_report(tmp_path)

    with _regrant_write_branch():
        result = _run_regrant(report)

        # Then the write path lands assessment + results + rendered views (exit 0)
        assert result.returncode == 0, result.stderr
        assert "Wrote " in result.stdout
        assert "Rendered " in result.stdout
        _restore_tree()

    # And the tree is byte-identical to the pre-test state afterwards
    assert not _dirty(), _git("status", "--porcelain")


def test_every_use_case_keeps_a_non_playwright_assertion() -> None:
    # Contract R1 (AID-1357): every use case must keep at least one scenario
    # with at least one assertion whose evidence is not playwright. This data
    # property is what makes `regrant --propose` exit 3 for CI-only candidates
    # — the bot can never write an assessment. A new 100% playwright use case
    # must fail here instead of quietly enabling the factory to self-grant.
    domain = load_domain(READINESS_ROOT)
    scenarios = {scenario.id: scenario for scenario in domain.scenarios}
    for use_case in domain.use_cases:
        independent = any(
            any(
                assertion.evidence is not EvidenceKind.PLAYWRIGHT
                for assertion in scenarios[scenario_id].assertions
            )
            for scenario_id in use_case.scenario_ids
        )
        assert independent, (
            f"use case {use_case.id} has no scenario with independent (non-playwright) "
            "evidence; a CI-only candidate could write an assessment via regrant"
        )
