import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"
REPORT = READINESS_ROOT / "tests" / "fixtures" / "literacy-pass-report.json"


def test_assess_dry_run_shows_scope_and_changes_without_mutation() -> None:
    # Given a complete independent LiteracyDojo report
    evidence_before = (READINESS_ROOT / "evidence" / "results.ndjson").read_bytes()
    assessments_before = tuple((READINESS_ROOT / "assessments").iterdir())

    # When assess runs in dry-run mode
    result = subprocess.run(
        [sys.executable, str(READINESS_ROOT / "tools" / "cli.py"), "assess", "--input", str(REPORT), "--dry-run"],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    # Then scope, expiry, fingerprints, blockers, and generated changes are visible without writes
    assert result.returncode == 0, result.stderr
    assert "revalidateBy" in result.stdout
    assert "sourceFingerprint=" in result.stdout
    assert "manualFingerprint=" in result.stdout
    assert "Severe-gap blockers: none" in result.stdout
    assert "Proposed generated changes" in result.stdout
    assert "Dry run: no tracked files were changed" in result.stdout
    assert (READINESS_ROOT / "evidence" / "results.ndjson").read_bytes() == evidence_before
    assert tuple((READINESS_ROOT / "assessments").iterdir()) == assessments_before
